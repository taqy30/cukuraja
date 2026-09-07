import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { can } from '@/lib/auth/roles'
import { sanitizeText } from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

/** Daftar layanan. Semua role bisnis boleh membaca (`service.read`). */
export async function GET(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, {
      key: 'services-list',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'service.read')

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('services')
      .select('id, name, description, duration_minutes, price_start, status')
      .eq('business_id', ctx.businessId)
      .eq('status', 'active')
      .order('price_start', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      services: data ?? [],
      canManage: can(ctx.role, 'service.manage'),
    })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal memuat layanan' }, { status: 500 })
  }
}

/** Tambah layanan. Owner & admin (`service.manage`). */
export async function POST(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, { key: 'services-create', limit: 20 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'service.manage')

    const body = await request.json().catch(() => ({}))
    const name = sanitizeText(body.name, 80)
    const description = sanitizeText(body.description, 300) || null

    if (!name) {
      return NextResponse.json({ error: 'Nama layanan wajib diisi' }, { status: 400 })
    }

    const duration = Number(body.duration_minutes)
    if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
      return NextResponse.json({ error: 'Durasi harus antara 5-480 menit' }, { status: 400 })
    }

    const priceRaw = body.price_start
    const price =
      priceRaw != null && priceRaw !== '' ? Number(priceRaw) : null
    if (price != null && (!Number.isFinite(price) || price < 0 || price > 100_000_000)) {
      return NextResponse.json({ error: 'Harga tidak valid' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('services')
      .insert({
        business_id: ctx.businessId,
        name,
        description,
        duration_minutes: duration,
        price_start: price,
        status: 'active',
      })
      .select('id, name, description, duration_minutes, price_start, status')
      .single()

    if (error) throw error

    return NextResponse.json({ service: data }, { status: 201 })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal menambah layanan' }, { status: 500 })
  }
}
