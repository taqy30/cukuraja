import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  ACTIVE_BUSINESS_COOKIE,
  getBusinessBySlug,
  listCustomerMemberships,
  resolveCustomerBusiness,
} from '@/lib/data/business'
import { authErrorResponse, requireAuth } from '@/lib/auth/guards'
import { isValidSlug, sanitizeText } from '@/lib/validation/input'
import { guardApiRequest, secureCookieOptions } from '@/lib/security/http'

/** Daftar barbershop membership + bisnis aktif pelanggan. */
export async function GET() {
  try {
    const supabase = await createClient()
    const ctx = await requireAuth(supabase)

    if (ctx.role !== 'customer') {
      return NextResponse.json({
        memberships: ctx.businessId
          ? [
              {
                id: ctx.businessId,
                slug: ctx.businessSlug,
                name: ctx.businessName,
              },
            ]
          : [],
        active: ctx.businessId
          ? {
              id: ctx.businessId,
              slug: ctx.businessSlug,
              name: ctx.businessName,
            }
          : null,
      })
    }

    const { active, memberships } = await resolveCustomerBusiness(ctx.userId)
    return NextResponse.json({ memberships, active })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal memuat barbershop' }, { status: 500 })
  }
}

/** Set barbershop aktif (cookie) untuk dashboard pelanggan. */
export async function POST(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, { key: 'my-businesses-set', limit: 30 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireAuth(supabase)

    if (ctx.role !== 'customer') {
      return NextResponse.json({ error: 'Hanya pelanggan yang bisa memilih barbershop' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const slug = sanitizeText(body.slug, 48).toLowerCase()

    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: 'Slug barbershop tidak valid' }, { status: 400 })
    }

    const business = await getBusinessBySlug(slug)
    if (!business) {
      return NextResponse.json({ error: 'Barbershop tidak ditemukan' }, { status: 404 })
    }

    const memberships = await listCustomerMemberships(ctx.userId)
    const isMember = memberships.some((m) => m.id === business.id)

    const store = await cookies()
    store.set(ACTIVE_BUSINESS_COOKIE, slug, secureCookieOptions())

    return NextResponse.json({
      ok: true,
      active: {
        id: business.id,
        name: business.name,
        slug: business.slug,
      },
      isMember,
      memberships,
    })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal menyimpan barbershop aktif' }, { status: 500 })
  }
}
