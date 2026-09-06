import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { can } from '@/lib/auth/roles'
import { buildCustomerKey } from '@/lib/customers/keys'
import {
  assertMinPassword,
  isEmail,
  isValidPhone,
  sanitizePhone,
  sanitizeText,
} from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

export interface CustomerRow {
  id: string
  name: string
  phone: string
  customer_user_id: string | null
  bookings: number
  completed: number
  lastVisit: string
  type: 'registered' | 'guest'
}

interface RawBooking {
  customer_name: string
  customer_phone: string
  customer_user_id: string | null
  status: string
  created_at: string
}

function aggregate(bookings: RawBooking[]): Map<string, CustomerRow> {
  const map = new Map<string, CustomerRow>()

  for (const b of bookings) {
    const key = buildCustomerKey(b.customer_user_id, b.customer_name, b.customer_phone)
    const existing = map.get(key)

    if (existing) {
      existing.bookings += 1
      if (b.status === 'completed') existing.completed += 1
      if (b.created_at > existing.lastVisit) existing.lastVisit = b.created_at
      continue
    }

    map.set(key, {
      id: key,
      name: b.customer_name,
      phone: b.customer_phone,
      customer_user_id: b.customer_user_id,
      bookings: 1,
      completed: b.status === 'completed' ? 1 : 0,
      lastVisit: b.created_at,
      type: b.customer_user_id ? 'registered' : 'guest',
    })
  }

  return map
}

export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'customer.read')

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('bookings')
      .select('customer_name, customer_phone, customer_user_id, status, created_at')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    const { data: members, error: membersError } = await admin
      .from('business_customers')
      .select('user_id, name, phone, created_at')
      .eq('business_id', ctx.businessId)
      .limit(500)

    // Tabel mungkin belum dimigrasi di lingkungan lama — lanjut tanpa member list.
    if (membersError && !/business_customers|schema cache|does not exist/i.test(membersError.message)) {
      throw membersError
    }

    const map = aggregate((data ?? []) as RawBooking[])
    const seenUsers = new Set(
      [...map.values()].filter((c) => c.customer_user_id).map((c) => c.customer_user_id)
    )

    for (const m of members ?? []) {
      if (seenUsers.has(m.user_id)) continue
      map.set(buildCustomerKey(m.user_id, m.name, m.phone), {
        id: buildCustomerKey(m.user_id, m.name, m.phone),
        name: m.name,
        phone: m.phone,
        customer_user_id: m.user_id,
        bookings: 0,
        completed: 0,
        lastVisit: m.created_at,
        type: 'registered',
      })
    }

    const customers = [...map.values()]
    customers.sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name))

    return NextResponse.json({
      customers,
      canManage: can(ctx.role, 'customer.manage'),
    })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal memuat pelanggan' }, { status: 500 })
  }
}

/** Buat akun pelanggan. Hanya owner (`customer.manage`). */
export async function POST(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, { key: 'customers-create', limit: 10 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'customer.manage')

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = sanitizeText(body.name, 80)
    const phone = sanitizePhone(body.phone)
    const password = body.password

    if (!isEmail(email) || !name || !isValidPhone(phone) || !password) {
      return NextResponse.json(
        { error: 'Email, password, nama, dan WhatsApp wajib diisi dengan benar' },
        { status: 400 }
      )
    }

    const pwdError = assertMinPassword(password, 8)
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'customer',
        phone,
        created_by_business_id: ctx.businessId,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: 'Gagal membuat akun. Pastikan email belum terdaftar.' },
        { status: 400 }
      )
    }

    const { error: memberError } = await admin.from('business_customers').insert({
      business_id: ctx.businessId,
      user_id: authData.user.id,
      name,
      phone,
    })

    if (memberError) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Gagal menyimpan pelanggan' }, { status: 500 })
    }

    const customer: CustomerRow = {
      id: buildCustomerKey(authData.user.id, name, phone),
      name,
      phone,
      customer_user_id: authData.user.id,
      bookings: 0,
      completed: 0,
      lastVisit: new Date().toISOString(),
      type: 'registered',
    }

    return NextResponse.json({ customer }, { status: 201 })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal menambah pelanggan' }, { status: 500 })
  }
}
