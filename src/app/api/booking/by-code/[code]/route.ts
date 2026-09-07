import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  authErrorResponse,
  canTouchBooking,
  requireAuth,
} from '@/lib/auth/guards'
import { maskPhone, isBookingCode } from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

/**
 * Lookup tiket by kode — hanya member pemilik booking atau staf yang berwenang.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const blocked = await guardApiRequest(request, {
      key: 'by-code',
      limit: 20,
      windowMs: 60_000,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireAuth(supabase)
    const { code: rawCode } = await params
    const code = String(rawCode || '')
      .trim()
      .toUpperCase()
      .slice(0, 32)

    if (!isBookingCode(code)) {
      return NextResponse.json({ error: 'Kode booking tidak valid' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: booking, error } = await admin
      .from('bookings')
      .select(
        '*, service:services(name, duration_minutes, price_start), business:businesses(name, slug, address, phone), capster:staff!bookings_assigned_capster_id_fkey(id, name)'
      )
      .eq('booking_code', code)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    const isOwnerCustomer =
      ctx.role === 'customer' && booking.customer_user_id === ctx.userId
    const isBusinessStaff =
      ctx.role !== 'customer' && canTouchBooking(ctx, booking)

    // Samakan 404 untuk mencegah enumerasi kode (oracle 403 vs 404).
    if (!isOwnerCustomer && !isBusinessStaff) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }

    const { count } = await admin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', booking.business_id)
      .eq('booking_date', booking.booking_date)
      .in('status', ['checked_in', 'waiting', 'called'])
      .lt('created_at', booking.created_at)

    return NextResponse.json({
      booking: {
        ...booking,
        customer_phone: maskPhone(String(booking.customer_phone ?? '')),
      },
      queue_position: (count ?? 0) + 1,
    })
  } catch (error) {
    const auth = authErrorResponse(error)
    if (auth) return auth
    console.error('Booking lookup error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
