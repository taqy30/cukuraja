import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCapsterAssignment } from '@/lib/booking/capster'
import { nextBookingCode } from '@/lib/booking/codes'
import { isHourlySlotFree } from '@/lib/booking/slots'
import {
  authErrorResponse,
  canAccessBusiness,
  requireBusinessPermission,
} from '@/lib/auth/guards'
import { dateInJakarta, normalizeTime } from '@/lib/datetime'
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

/**
 * Walk-in non-member: wajib pilih capster + jam penuh (10:00, 11:00, …).
 * Tidak membuat akun Auth / membership — `customer_user_id` selalu null.
 * Member yang reservasi terjadwal memakai POST /api/booking (online).
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, { key: 'walk-in', limit: 30 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'booking.create.walkin')

    const body = await request.json()
    const businessId = body.business_id ?? ctx.businessId
    const service_id = body.service_id
    const customer_name = sanitizeText(body.customer_name, 80)
    const rawPhone = body.customer_phone
    const customer_phone = rawPhone ? sanitizePhone(rawPhone) : '-'
    const note = sanitizeNote(body.note)
    const assigned_capster_id = body.assigned_capster_id
    const booking_date = body.booking_date
    const booking_time = body.booking_time

    if (!isUuid(businessId) || !isUuid(service_id) || !customer_name) {
      return NextResponse.json(
        { error: 'Nama pelanggan dan layanan wajib diisi' },
        { status: 400 }
      )
    }

    if (customer_phone !== '-' && !isValidPhone(customer_phone)) {
      return NextResponse.json({ error: 'Nomor WhatsApp tidak valid' }, { status: 400 })
    }

    if (!isUuid(assigned_capster_id) || !isTimeHM(booking_time)) {
      return NextResponse.json(
        { error: 'Pilih capster dan jam slot (per jam) untuk walk-in' },
        { status: 400 }
      )
    }

    if (!canAccessBusiness(ctx, businessId)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const admin = createAdminClient()
    const date = booking_date || dateInJakarta()
    if (!isDateISO(date)) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
    }
    if (date < dateInJakarta()) {
      return NextResponse.json({ error: 'Tanggal tidak boleh di masa lalu' }, { status: 400 })
    }

    const { data: service } = await admin
      .from('services')
      .select('id')
      .eq('id', service_id)
      .eq('business_id', businessId)
      .eq('status', 'active')
      .maybeSingle()

    if (!service) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan di barbershop ini' }, { status: 400 })
    }

    const timeNorm = normalizeTime(String(booking_time))

    const capsterCheck = await validateCapsterAssignment(
      admin,
      businessId,
      assigned_capster_id
    )
    if (!capsterCheck.ok) {
      return NextResponse.json({ error: capsterCheck.error }, { status: capsterCheck.status })
    }

    if (!capsterCheck.capsterId) {
      return NextResponse.json({ error: 'Capster wajib dipilih' }, { status: 400 })
    }

    const slot = await isHourlySlotFree(
      admin,
      businessId,
      capsterCheck.capsterId,
      date,
      timeNorm
    )
    if (!slot.free) {
      return NextResponse.json(
        { error: slot.reason ?? 'Jam tidak tersedia untuk capster ini' },
        { status: 409 }
      )
    }

    const bookingCode = await nextBookingCode(admin, businessId, 'walk_in')

    const { data: booking, error } = await admin
      .from('bookings')
      .insert({
        business_id: businessId,
        service_id,
        booking_code: bookingCode,
        customer_name,
        customer_phone,
        booking_date: date,
        booking_time: timeNorm,
        note,
        source: 'walk_in',
        status: 'checked_in',
        customer_user_id: null,
        assigned_capster_id: capsterCheck.capsterId,
      })
      .select('*, service:services(*), capster:staff!bookings_assigned_capster_id_fkey(id, name)')
      .single()

    if (error) {
      console.error('Walk-in error:', error)
      return NextResponse.json(
        {
          error:
            error.message?.includes('unique') || error.code === '23505'
              ? 'Jam tersebut baru saja terisi. Pilih jam lain.'
              : 'Gagal menambah walk-in',
        },
        { status: 500 }
      )
    }

    await admin.from('booking_logs').insert({
      booking_id: booking.id,
      old_status: null,
      new_status: 'checked_in',
      changed_by: ctx.userId,
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error('Walk-in error:', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
