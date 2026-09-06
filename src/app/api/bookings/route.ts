import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, AuthError, requireAuth } from '@/lib/auth/guards'
import { can, permissionsFor } from '@/lib/auth/roles'
import { BOOKING_SELECT } from '@/lib/auth/redirect'
import { dateInJakarta } from '@/lib/datetime'
import { isDateISO } from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

/**
 * Daftar booking untuk dashboard, otomatis dipersempit sesuai role:
 * - owner/admin/kasir : semua booking pada tanggal tersebut
 * - capster           : hanya booking yang ditugaskan ke dirinya
 */
export async function GET(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'bookings-list',
      limit: 90,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireAuth(supabase)

    const readAll = can(ctx.role, 'booking.read.all')
    const readOwn = can(ctx.role, 'booking.read.own')
    if (!readAll && !readOwn) throw new AuthError('FORBIDDEN')
    if (!ctx.businessId) throw new AuthError('FORBIDDEN')

    const params = request.nextUrl.searchParams
    const date = params.get('date') ?? dateInJakarta()
    if (!isDateISO(date)) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
    }

    const admin = createAdminClient()

    let query = admin
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('business_id', ctx.businessId)
      .eq('booking_date', date)
      .order('booking_time')

    if (!readAll) {
      if (!ctx.staffId) {
        return NextResponse.json(
          { error: 'Akun belum terhubung ke data staff', code: 'NO_STAFF_RECORD' },
          { status: 404 }
        )
      }
      query = query.eq('assigned_capster_id', ctx.staffId)
    }

    const { data: bookings, error } = await query
    if (error) throw error

    const [{ data: services }, { data: capsters }] = await Promise.all([
      admin
        .from('services')
        .select('id, name, duration_minutes, price_start')
        .eq('business_id', ctx.businessId)
        .eq('status', 'active')
        .order('name'),
      admin
        .from('staff')
        .select('id, name')
        .eq('business_id', ctx.businessId)
        .eq('role', 'capster')
        .eq('status', 'active')
        .order('name'),
    ])

    return NextResponse.json({
      role: ctx.role,
      date,
      businessId: ctx.businessId,
      staffId: ctx.staffId,
      permissions: permissionsFor(ctx.role),
      bookings: bookings ?? [],
      services: services ?? [],
      capsters: capsters ?? [],
    })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal memuat booking' }, { status: 500 })
  }
}
