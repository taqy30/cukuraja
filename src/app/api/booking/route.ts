import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateCapsterAssignment } from '@/lib/booking/capster'
import { isHourlySlotFree } from '@/lib/booking/slots'
import {
  authErrorResponse,
  canAccessBusiness,
  requireAuth,
} from '@/lib/auth/guards'
import { can } from '@/lib/auth/roles'
import { dateInJakarta, normalizeTime } from '@/lib/datetime'
import { nextBookingCode } from '@/lib/booking/codes'
import { ACTIVE_BUSINESS_COOKIE } from '@/lib/data/business'
import { guardApiRequest, secureCookieOptions } from '@/lib/security/http'
import {
  isDateISO,
  isTimeHM,
  isUuid,
  isValidPhone,
  sanitizeNote,
  sanitizePhone,
  sanitizeText,
} from '@/lib/validation/input'

/**
 * Buat booking terjadwal.
 * - Pelanggan → online + `customer_user_id`
 * - Owner/Admin → booking dibantu staff
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'booking-create',
      limit: 20,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireAuth(supabase)

    const isCustomerOnline = ctx.role === 'customer' && can(ctx.role, 'booking.create.online')
    const isStaffCreate = ctx.role !== 'customer' && can(ctx.role, 'booking.update')

    if (!isCustomerOnline && !isStaffCreate) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const business_id = body.business_id
    const service_id = body.service_id
    const customer_name = sanitizeText(body.customer_name, 80)
    const customer_phone = sanitizePhone(body.customer_phone)
    const booking_date = body.booking_date
    const booking_time = body.booking_time
    const note = sanitizeNote(body.note)
    const assigned_capster_id = body.assigned_capster_id

    if (
      !isUuid(business_id) ||
      !isUuid(service_id) ||
      !customer_name ||
      !isValidPhone(customer_phone) ||
      !isDateISO(booking_date) ||
      !isTimeHM(booking_time)
    ) {
      return NextResponse.json({ error: 'Data booking tidak lengkap atau tidak valid' }, { status: 400 })
    }

    if (booking_date < dateInJakarta()) {
      return NextResponse.json({ error: 'Tanggal booking tidak boleh di masa lalu' }, { status: 400 })
    }

    if (assigned_capster_id != null && !isUuid(assigned_capster_id)) {
      return NextResponse.json({ error: 'Capster tidak valid' }, { status: 400 })
    }

    if (isStaffCreate) {
      if (!canAccessBusiness(ctx, business_id)) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
      }
    }

    const admin = createAdminClient()
    const timeNorm = normalizeTime(booking_time)

    const { data: service } = await admin
      .from('services')
      .select('id')
      .eq('id', service_id)
      .eq('business_id', business_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!service) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan di barbershop ini' }, { status: 400 })
    }

    const capsterCheck = await validateCapsterAssignment(
      admin,
      business_id,
      assigned_capster_id
    )
    if (!capsterCheck.ok) {
      return NextResponse.json({ error: capsterCheck.error }, { status: capsterCheck.status })
    }

    const { data: business } = await admin
      .from('businesses')
      .select('active_barbers, status, slug')
      .eq('id', business_id)
      .single()

    if (!business || business.status !== 'active') {
      return NextResponse.json({ error: 'Barbershop tidak ditemukan' }, { status: 404 })
    }

    if (capsterCheck.capsterId) {
      const slot = await isHourlySlotFree(
        admin,
        business_id,
        capsterCheck.capsterId,
        booking_date,
        timeNorm
      )
      if (!slot.free) {
        return NextResponse.json(
          { error: slot.reason ?? 'Capster sudah punya booking di jam tersebut. Pilih jam lain.' },
          { status: 409 }
        )
      }
    } else {
      const { count } = await admin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business_id)
        .eq('booking_date', booking_date)
        .eq('booking_time', timeNorm)
        .not('status', 'in', '("cancelled","skipped")')

      if ((count ?? 0) >= business.active_barbers) {
        return NextResponse.json({ error: 'Slot sudah penuh' }, { status: 409 })
      }
    }

    const bookingCode = await nextBookingCode(admin, business_id, 'online')
    const customerUserId = isCustomerOnline ? ctx.userId : null

    const { data: booking, error } = await admin
      .from('bookings')
      .insert({
        business_id,
        service_id,
        booking_code: bookingCode,
        customer_name,
        customer_phone,
        booking_date,
        booking_time: timeNorm,
        note,
        source: 'online',
        status: 'booked',
        customer_user_id: customerUserId,
        assigned_capster_id: capsterCheck.capsterId,
      })
      .select(
        '*, service:services(name, duration_minutes, price_start), capster:staff!bookings_assigned_capster_id_fkey(id, name)'
      )
      .single()

    if (error) {
      console.error('Booking error:', error)
      return NextResponse.json(
        {
          error:
            error.message?.includes('unique') || error.code === '23505'
              ? 'Slot atau kode booking bentrok. Coba jam lain.'
              : 'Gagal membuat booking',
        },
        { status: 500 }
      )
    }

    await admin.from('booking_logs').insert({
      booking_id: booking.id,
      old_status: null,
      new_status: 'booked',
      changed_by: ctx.userId,
    })

    if (customerUserId) {
      await admin.from('business_customers').upsert(
        {
          business_id,
          user_id: customerUserId,
          name: customer_name,
          phone: customer_phone,
        },
        { onConflict: 'business_id,user_id' }
      )

      // Sinkronkan barbershop aktif di dashboard pelanggan.
      if (business.slug) {
        const store = await cookies()
        store.set(ACTIVE_BUSINESS_COOKIE, business.slug, secureCookieOptions())
      }
    }

    return NextResponse.json({ booking }, { status: 201 })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error('Booking error:', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
