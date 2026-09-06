import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authErrorResponse,
  canTouchBooking,
  requireBusinessPermission,
} from '@/lib/auth/guards'
import { validateCapsterAssignment, isCapsterSlotAvailable } from '@/lib/booking/capster'
import { BOOKING_SELECT } from '@/lib/auth/redirect'
import {
  isDateISO,
  isTimeHM,
  isUuid,
  isValidPhone,
  sanitizeNote,
  sanitizePhone,
  sanitizeText,
} from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

/** Ubah detail booking. Status hanya lewat `/status` (aturan transisi). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = guardApiRequest(request, { key: 'booking-patch', limit: 40 })
    if (blocked) return blocked

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Booking tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'booking.update')
    const body = await request.json().catch(() => ({}))

    const admin = createAdminClient()
    const { data: current } = await admin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('business_id', ctx.businessId)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    if (!canTouchBooking(ctx, current)) {
      return NextResponse.json({ error: 'Anda tidak berhak mengubah booking ini' }, { status: 403 })
    }

    const {
      customer_name,
      customer_phone,
      booking_date,
      booking_time,
      service_id,
      assigned_capster_id,
      note,
    } = body

    if (body.status != null) {
      return NextResponse.json(
        { error: 'Ubah status melalui endpoint status yang sesuai' },
        { status: 400 }
      )
    }

    if (booking_date != null && !isDateISO(booking_date)) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
    }
    if (booking_time != null && !isTimeHM(booking_time)) {
      return NextResponse.json({ error: 'Jam tidak valid' }, { status: 400 })
    }

    if (service_id != null) {
      if (!isUuid(service_id)) {
        return NextResponse.json({ error: 'Layanan tidak valid' }, { status: 400 })
      }
      const { data: service } = await admin
        .from('services')
        .select('id')
        .eq('id', service_id)
        .eq('business_id', ctx.businessId)
        .eq('status', 'active')
        .maybeSingle()
      if (!service) {
        return NextResponse.json({ error: 'Layanan tidak ditemukan' }, { status: 400 })
      }
    }

    const capsterId = assigned_capster_id ?? current.assigned_capster_id
    if (capsterId) {
      const capsterCheck = await validateCapsterAssignment(admin, ctx.businessId, capsterId)
      if (!capsterCheck.ok) {
        return NextResponse.json({ error: capsterCheck.error }, { status: 400 })
      }

      const date = booking_date ?? current.booking_date
      const time = booking_time ?? current.booking_time
      const sameSlot =
        current.booking_date === date &&
        String(current.booking_time).slice(0, 5) === String(time).slice(0, 5) &&
        current.assigned_capster_id === capsterId

      if (!sameSlot) {
        const free = await isCapsterSlotAvailable(admin, ctx.businessId, capsterId, date, time)
        if (!free) {
          return NextResponse.json(
            { error: 'Capster sudah punya booking di jam tersebut' },
            { status: 409 }
          )
        }
      }
    }

    const updates: Record<string, unknown> = {}
    if (customer_name != null) {
      const name = sanitizeText(customer_name, 80)
      if (!name) {
        return NextResponse.json({ error: 'Nama pelanggan wajib diisi' }, { status: 400 })
      }
      updates.customer_name = name
    }
    if (customer_phone != null) {
      const phone = sanitizePhone(customer_phone)
      if (!isValidPhone(phone)) {
        return NextResponse.json({ error: 'Nomor WhatsApp tidak valid' }, { status: 400 })
      }
      updates.customer_phone = phone
    }
    if (booking_date != null) updates.booking_date = booking_date
    if (booking_time != null) updates.booking_time = booking_time
    if (service_id != null) updates.service_id = service_id
    if (assigned_capster_id !== undefined) {
      updates.assigned_capster_id = assigned_capster_id || null
    }
    if (note !== undefined) updates.note = sanitizeNote(note)

    const { data: booking, error } = await admin
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select(BOOKING_SELECT)
      .single()

    if (error) throw error

    return NextResponse.json({ booking })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal mengubah booking' }, { status: 500 })
  }
}

/** Hapus booking. Butuh izin `booking.delete` (owner & admin). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = guardApiRequest(request, { key: 'booking-delete', limit: 20 })
    if (blocked) return blocked

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Booking tidak valid' }, { status: 400 })
    }
    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'booking.delete')

    const admin = createAdminClient()
    const { data: current } = await admin
      .from('bookings')
      .select('id, business_id, assigned_capster_id')
      .eq('id', id)
      .eq('business_id', ctx.businessId)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    if (!canTouchBooking(ctx, current)) {
      return NextResponse.json({ error: 'Anda tidak berhak menghapus booking ini' }, { status: 403 })
    }

    const { error } = await admin.from('bookings').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal menghapus booking' }, { status: 500 })
  }
}
