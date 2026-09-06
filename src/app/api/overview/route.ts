import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { can } from '@/lib/auth/roles'
import { dateInJakarta } from '@/lib/datetime'

interface BookingRow {
  status: string
  source: string
  booking_time: string
  customer_name: string
  customer_phone: string
  customer_user_id: string | null
  assigned_capster_id: string | null
  service: { name: string; price_start: number | null } | null
}

const ACTIVE_STATUSES = ['booked', 'checked_in', 'waiting', 'called', 'serving']

function customerKey(row: BookingRow) {
  return row.customer_user_id ?? `${row.customer_name}|${row.customer_phone}`
}

/**
 * Ringkasan operasional yang menyesuaikan role:
 * - owner   : semua metrik termasuk omset
 * - admin   : semua metrik kecuali omset
 * - kasir   : fokus antrean hari ini + walk-in
 * - capster : hanya booking yang ditugaskan ke dirinya
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'overview.view')

    const date =
      request.nextUrl.searchParams.get('date') ?? dateInJakarta()

    const admin = createAdminClient()

    let query = admin
      .from('bookings')
      .select(
        'status, source, booking_time, customer_name, customer_phone, customer_user_id, assigned_capster_id, service:services(name, price_start)'
      )
      .eq('business_id', ctx.businessId)
      .eq('booking_date', date)

    // Capster hanya melihat angka dari booking miliknya sendiri.
    if (ctx.role === 'capster') {
      if (!ctx.staffId) {
        return NextResponse.json(
          { error: 'Akun capster belum terhubung ke data staff', code: 'NO_STAFF_RECORD' },
          { status: 404 }
        )
      }
      query = query.eq('assigned_capster_id', ctx.staffId)
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as unknown as BookingRow[]

    const total = rows.length
    const completed = rows.filter((r) => r.status === 'completed').length
    const cancelled = rows.filter((r) => r.status === 'cancelled').length
    const skipped = rows.filter((r) => r.status === 'skipped').length
    const active = rows.filter((r) => ACTIVE_STATUSES.includes(r.status)).length
    const online = rows.filter((r) => r.source === 'online').length
    const walkIn = rows.filter((r) => r.source === 'walk_in').length
    const uniqueCustomers = new Set(rows.map(customerKey)).size

    const finished = completed + skipped
    const noShowRate = finished > 0 ? Math.round((skipped / finished) * 100) : 0

    const serviceCount = new Map<string, number>()
    for (const row of rows) {
      const name = row.service?.name
      if (!name) continue
      serviceCount.set(name, (serviceCount.get(name) ?? 0) + 1)
    }
    const popularServices = [...serviceCount.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const hourly = new Map<number, number>()
    for (const row of rows) {
      const hour = Number(String(row.booking_time).slice(0, 2))
      if (Number.isNaN(hour)) continue
      hourly.set(hour, (hourly.get(hour) ?? 0) + 1)
    }
    const hourlyDistribution = [...hourly.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour)

    const payload: Record<string, unknown> = {
      role: ctx.role,
      date,
      total,
      active,
      completed,
      cancelled,
      skipped,
      online,
      walk_in: walkIn,
      unique_customers: uniqueCustomers,
      no_show_rate: noShowRate,
      popular_services: popularServices,
      hourly_distribution: hourlyDistribution,
    }

    // Omset hanya untuk owner.
    if (can(ctx.role, 'overview.revenue')) {
      payload.revenue = rows
        .filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.service?.price_start ?? 0), 0)
    }

    // Capster: total pelanggan yang pernah dia layani (sepanjang waktu).
    if (ctx.role === 'capster' && ctx.staffId) {
      const { data: allTime } = await admin
        .from('bookings')
        .select('customer_name, customer_phone, customer_user_id, status')
        .eq('business_id', ctx.businessId)
        .eq('assigned_capster_id', ctx.staffId)

      const allRows = (allTime ?? []) as unknown as BookingRow[]
      payload.lifetime_customers = new Set(allRows.map(customerKey)).size
      payload.lifetime_completed = allRows.filter((r) => r.status === 'completed').length
    }

    return NextResponse.json(payload)
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal memuat ringkasan' }, { status: 500 })
  }
}
