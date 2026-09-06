import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authErrorResponse,
  canTouchBooking,
  requireBusinessPermission,
} from '@/lib/auth/guards'
import { BOOKING_SELECT } from '@/lib/auth/redirect'
import { guardApiRequest } from '@/lib/security/http'
import { isUuid } from '@/lib/validation/input'

const VALID_STATUSES = [
  'booked',
  'checked_in',
  'waiting',
  'called',
  'serving',
  'completed',
  'skipped',
  'cancelled',
] as const

type BookingStatus = (typeof VALID_STATUSES)[number]

/** Transisi yang diizinkan agar antrean tidak bisa melompat sembarangan. */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  booked: ['checked_in', 'waiting', 'cancelled'],
  checked_in: ['waiting', 'called', 'serving', 'cancelled'],
  waiting: ['called', 'serving', 'skipped', 'cancelled'],
  called: ['serving', 'skipped', 'waiting', 'cancelled'],
  serving: ['completed', 'cancelled'],
  completed: [],
  skipped: ['waiting'],
  cancelled: [],
}

const TIMESTAMP_FIELD: Partial<Record<BookingStatus, string>> = {
  called: 'called_at',
  serving: 'started_at',
  completed: 'completed_at',
}

/**
 * Ubah status antrean. Diizinkan untuk owner, admin, kasir, dan capster —
 * tapi capster hanya boleh booking yang ditugaskan ke dirinya.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = guardApiRequest(request, { key: 'booking-status', limit: 60 })
    if (blocked) return blocked

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'booking.status')

    const body = await request.json().catch(() => ({}))
    const status = body.status

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: current } = await admin
      .from('bookings')
      .select('id, status, business_id, assigned_capster_id')
      .eq('id', id)
      .eq('business_id', ctx.businessId)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    if (!canTouchBooking(ctx, current)) {
      return NextResponse.json(
        { error: 'Booking ini bukan tanggung jawab Anda' },
        { status: 403 }
      )
    }

    const from = current.status as BookingStatus
    if (from !== status && !ALLOWED_TRANSITIONS[from]?.includes(status)) {
      return NextResponse.json(
        { error: `Tidak bisa mengubah status dari "${from}" ke "${status}"` },
        { status: 409 }
      )
    }

    const updates: Record<string, unknown> = { status }
    const timestampField = TIMESTAMP_FIELD[status as BookingStatus]
    if (timestampField) updates[timestampField] = new Date().toISOString()

    const { data: booking, error } = await admin
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select(BOOKING_SELECT)
      .single()

    if (error) throw error

    await admin.from('booking_logs').insert({
      booking_id: id,
      old_status: from,
      new_status: status,
      changed_by: ctx.userId,
    })

    return NextResponse.json({ booking })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 })
  }
}
