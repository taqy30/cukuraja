import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/guards'
import { permissionsFor } from '@/lib/auth/roles'
import { getDefaultBusiness } from '@/lib/data/business'
import { guardApiRequest } from '@/lib/security/http'

/** Identitas + daftar izin milik user yang sedang login. */
export async function GET(request: NextRequest) {
  const blocked = await guardApiRequest(request, {
    key: 'me',
    limit: 90,
    requireSameOrigin: false,
  })
  if (blocked) return blocked

  const supabase = await createClient()
  const ctx = await getAuthContext(supabase)

  if (!ctx) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 })
  }

  const base = {
    role: ctx.role,
    name: ctx.name,
    email: ctx.email,
    businessId: ctx.businessId,
    businessSlug: ctx.businessSlug,
    businessName: ctx.businessName,
    staffId: ctx.staffId,
    permissions: permissionsFor(ctx.role),
  }

  if (ctx.role !== 'customer') {
    return NextResponse.json(base)
  }

  // Single-shop: pelanggan selalu terikat ke Cukuraja.
  const shop = await getDefaultBusiness()

  return NextResponse.json({
    ...base,
    businessId: shop?.id ?? null,
    businessSlug: shop?.slug ?? null,
    businessName: shop?.name ?? null,
    activeBusiness: shop
      ? { id: shop.id, slug: shop.slug, name: shop.name }
      : null,
  })
}
