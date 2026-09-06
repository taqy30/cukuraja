import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/guards'
import { can } from '@/lib/auth/roles'
import { getActiveCapsters } from '@/lib/booking/capster'
import {
  SLOT_INTERVAL_MINUTES,
  buildCapsterDaySlots,
  generateHourlySlots,
} from '@/lib/booking/slots'
import { normalizeTime } from '@/lib/datetime'
import { isDateISO, isUuid } from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

/**
 * Slot jadwal per jam (10:00, 11:00, …) untuk satu capster.
 * Status: available | booked | blocked | past
 * Detail PII (nama/kode) hanya untuk staf bisnis yang berwenang.
 */
export async function GET(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'slots',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const date = searchParams.get('date')
    const capsterId = searchParams.get('capster_id')

    if (!businessId || !date) {
      return NextResponse.json({ error: 'business_id dan date wajib diisi' }, { status: 400 })
    }
    if (!isUuid(businessId) || (capsterId && !isUuid(capsterId)) || !isDateISO(date)) {
      return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: business } = await admin
      .from('businesses')
      .select('open_time, close_time, active_barbers')
      .eq('id', businessId)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Barbershop tidak ditemukan' }, { status: 404 })
    }

    const openTime = normalizeTime(String(business.open_time))
    const closeTime = normalizeTime(String(business.close_time))
    const capsters = await getActiveCapsters(admin, businessId)

    if (capsters.length > 0 && !capsterId) {
      return NextResponse.json({ error: 'capster_id wajib diisi' }, { status: 400 })
    }

    if (capsterId && !capsters.some((c) => c.id === capsterId)) {
      return NextResponse.json({ error: 'Capster tidak valid' }, { status: 400 })
    }

    // Detail pelanggan hanya untuk staf bisnis
    let includeDetails = false
    try {
      const session = await createClient()
      const ctx = await getAuthContext(session)
      if (ctx && ctx.businessId === businessId) {
        if (can(ctx.role, 'booking.read.all')) {
          includeDetails = true
        } else if (
          ctx.role === 'capster' &&
          can(ctx.role, 'booking.read.own') &&
          ctx.staffId === capsterId
        ) {
          includeDetails = true
        }
      }
    } catch {
      includeDetails = false
    }

    if (capsterId) {
      const daySlots = await buildCapsterDaySlots(
        admin,
        businessId,
        capsterId,
        date,
        openTime,
        closeTime
      )

      return NextResponse.json({
        slots: daySlots.map((s) => ({
          time: s.time,
          available: s.available,
          status: s.status,
          current_bookings: s.status === 'booked' ? 1 : 0,
          max_capacity: 1,
          ...(includeDetails
            ? {
                booking_code: s.booking_code ?? null,
                customer_name: s.customer_name ?? null,
                reason: s.reason ?? null,
              }
            : {
                booking_code: null,
                customer_name: null,
                reason: s.status === 'blocked' ? 'Tidak tersedia' : null,
              }),
        })),
        capster_id: capsterId,
        date,
        interval_minutes: SLOT_INTERVAL_MINUTES,
        timezone: 'Asia/Jakarta',
      })
    }

    const hours = generateHourlySlots(openTime, closeTime)
    const { data: bookings } = await admin
      .from('bookings')
      .select('booking_time')
      .eq('business_id', businessId)
      .eq('booking_date', date)
      .not('status', 'in', '("cancelled","skipped")')

    const counts: Record<string, number> = {}
    for (const b of bookings ?? []) {
      const t = normalizeTime(String(b.booking_time))
      counts[t] = (counts[t] ?? 0) + 1
    }

    const slots = hours.map((time) => {
      const current = counts[time] ?? 0
      const available = current < business.active_barbers
      return {
        time,
        available,
        status: available ? 'available' : 'booked',
        current_bookings: includeDetails ? current : available ? 0 : 1,
        max_capacity: includeDetails ? business.active_barbers : 1,
      }
    })

    return NextResponse.json({
      slots,
      capster_id: null,
      date,
      interval_minutes: SLOT_INTERVAL_MINUTES,
      timezone: 'Asia/Jakarta',
    })
  } catch (error) {
    console.error('Slots error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
