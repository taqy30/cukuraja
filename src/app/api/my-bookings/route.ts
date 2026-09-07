import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requirePermission } from '@/lib/auth/guards'
import { guardApiRequest } from '@/lib/security/http'

/**
 * Riwayat booking milik pelanggan yang login.
 * Pakai admin client setelah auth agar tidak gagal karena RLS join ke staff/services.
 */
export async function GET(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, {
      key: 'my-bookings',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requirePermission(supabase, 'booking.read.own')

    if (ctx.role !== 'customer') {
      return NextResponse.json({ error: 'Khusus pelanggan' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('bookings')
      .select(
        `id, booking_code, booking_date, booking_time, status, note, source,
         service:services(name, duration_minutes, price_start),
         capster:staff!bookings_assigned_capster_id_fkey(id, name)`
      )
      .eq('customer_user_id', ctx.userId)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ bookings: data ?? [] })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal memuat booking' }, { status: 500 })
  }
}
