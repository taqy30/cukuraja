import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, AuthError, requireAuth } from '@/lib/auth/guards'
import { can } from '@/lib/auth/roles'
import {
  getBusinessBySlug,
  resolveCustomerBusiness,
} from '@/lib/data/business'
import { isDateISO, isUuid, isValidSlug, sanitizeText } from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

const BUSY_STATUSES = ['called', 'serving']
const COUNTED_STATUSES = ['booked', 'checked_in', 'waiting', 'called', 'serving', 'completed']

interface CapsterBookingRow {
  assigned_capster_id: string | null
  status: string
  booking_time: string
  customer_name: string
  customer_phone: string
  customer_user_id: string | null
}

/**
 * Daftar capster beserta status kesiapannya pada tanggal tertentu.
 * Dipakai kasir/admin/owner untuk membagi beban, dan pelanggan untuk
 * melihat capster mana yang ready sebelum booking.
 * Nomor telepon pelanggan tidak pernah dikirim ke pelanggan lain.
 */
export async function GET(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, {
      key: 'capsters',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireAuth(supabase)

    if (!can(ctx.role, 'capster.read')) throw new AuthError('FORBIDDEN')

    const paramBusinessId = request.nextUrl.searchParams.get('business_id')
    const paramSlug = sanitizeText(request.nextUrl.searchParams.get('slug'), 48).toLowerCase()

    let businessId: string | null = ctx.businessId

    if (ctx.role === 'customer') {
      const { active, memberships } = await resolveCustomerBusiness(ctx.userId)
      const allowedIds = new Set(memberships.map((m) => m.id))
      if (active) allowedIds.add(active.id)

      if (paramBusinessId && isUuid(paramBusinessId)) {
        if (!allowedIds.has(paramBusinessId)) {
          return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
        }
        businessId = paramBusinessId
      } else if (paramSlug && isValidSlug(paramSlug)) {
        const biz = await getBusinessBySlug(paramSlug)
        if (!biz) {
          return NextResponse.json({ error: 'Barbershop tidak ditemukan' }, { status: 404 })
        }
        // Slug publik boleh di-browse; membership tidak wajib untuk lihat ready.
        businessId = biz.id
      } else {
        businessId = active?.id ?? null
      }
    } else if (paramBusinessId && isUuid(paramBusinessId) && paramBusinessId === ctx.businessId) {
      businessId = paramBusinessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Barbershop tidak ditemukan' }, { status: 404 })
    }

    const dateRaw = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
    if (!isDateISO(dateRaw)) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 })
    }
    const date = dateRaw

    const admin = createAdminClient()

    const [{ data: capsters, error: capsterError }, { data: bookings }] = await Promise.all([
      admin
        .from('staff')
        .select('id, name, role, status')
        .eq('business_id', businessId)
        .eq('role', 'capster')
        .eq('status', 'active')
        .order('name'),
      admin
        .from('bookings')
        .select(
          'assigned_capster_id, status, booking_time, customer_name, customer_phone, customer_user_id'
        )
        .eq('business_id', businessId)
        .eq('booking_date', date),
    ])

    if (capsterError) throw capsterError

    const rows = (bookings ?? []) as CapsterBookingRow[]
    const isStaffView = can(ctx.role, 'booking.read.all')

    const result = (capsters ?? []).map((capster) => {
      const own = rows.filter((r) => r.assigned_capster_id === capster.id)
      const counted = own.filter((r) => COUNTED_STATUSES.includes(r.status))
      const busy = own.some((r) => BUSY_STATUSES.includes(r.status))
      const uniqueCustomers = new Set(
        counted.map((r) => r.customer_user_id ?? `${r.customer_name}|${r.customer_phone}`)
      ).size

      return {
        id: capster.id,
        name: capster.name,
        ready: !busy,
        booking_count: counted.length,
        unique_customers: uniqueCustomers,
        // Detail jadwal hanya untuk staff; pelanggan cukup tahu ready atau tidak.
        bookings: isStaffView
          ? counted
              .map((r) => ({
                time: String(r.booking_time).slice(0, 5),
                status: r.status,
                customer_name: r.customer_name,
              }))
              .sort((a, b) => a.time.localeCompare(b.time))
          : undefined,
      }
    })

    return NextResponse.json({ date, capsters: result })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal memuat data capster' }, { status: 500 })
  }
}
