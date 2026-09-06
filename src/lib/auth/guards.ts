import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  can,
  normalizeStaffRole,
  type AppRole,
  type Permission,
} from './roles'

export interface AuthContext {
  role: AppRole
  userId: string
  name: string
  email: string
  /** null hanya untuk pelanggan. */
  businessId: string | null
  businessSlug: string | null
  businessName: string | null
  /** `staff.id` — cocokkan dengan `bookings.assigned_capster_id`. */
  staffId: string | null
}

export class AuthError extends Error {
  constructor(public code: 'UNAUTHORIZED' | 'FORBIDDEN', message?: string) {
    super(message ?? code)
    this.name = 'AuthError'
  }
}

/**
 * Menentukan role dari session.
 * Lookup bisnis/staff memakai service role agar tidak gagal karena RLS
 * atau baris staff duplikat (masalah umum yang membuat admin/kasir "tidak bisa login").
 */
export async function getAuthContext(
  supabase: SupabaseClient
): Promise<AuthContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const name =
    (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Pengguna'
  const email = user.email ?? ''

  const admin = createAdminClient()

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, slug')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (business) {
    return {
      role: 'owner',
      userId: user.id,
      name,
      email,
      businessId: business.id,
      businessSlug: business.slug,
      businessName: business.name,
      staffId: null,
    }
  }

  const { data: staffRows } = await admin
    .from('staff')
    .select('id, role, business_id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)

  const staff = staffRows?.[0]
  if (staff) {
    const { data: biz } = await admin
      .from('businesses')
      .select('id, name, slug')
      .eq('id', staff.business_id)
      .maybeSingle()

    return {
      role: normalizeStaffRole(staff.role),
      userId: user.id,
      name,
      email,
      businessId: staff.business_id,
      businessSlug: biz?.slug ?? null,
      businessName: biz?.name ?? null,
      staffId: staff.id,
    }
  }

  const metaRole = user.user_metadata?.role as string | undefined
  if (metaRole === 'customer' || !metaRole) {
    // Akun tanpa staff/owner dianggap pelanggan (termasuk daftar baru).
    return {
      role: 'customer',
      userId: user.id,
      name,
      email,
      businessId: null,
      businessSlug: null,
      businessName: null,
      staffId: null,
    }
  }

  // Metadata mengaku staff tapi baris staff tidak ada → belum terhubung.
  return null
}

export async function requireAuth(supabase: SupabaseClient): Promise<AuthContext> {
  const ctx = await getAuthContext(supabase)
  if (!ctx) throw new AuthError('UNAUTHORIZED')
  return ctx
}

export async function requirePermission(
  supabase: SupabaseClient,
  permission: Permission
): Promise<AuthContext> {
  const ctx = await requireAuth(supabase)
  if (!can(ctx.role, permission)) throw new AuthError('FORBIDDEN')
  return ctx
}

export async function requireBusinessPermission(
  supabase: SupabaseClient,
  permission: Permission
): Promise<AuthContext & { businessId: string }> {
  const ctx = await requirePermission(supabase, permission)
  if (!ctx.businessId) throw new AuthError('FORBIDDEN')
  return { ...ctx, businessId: ctx.businessId }
}

export function canAccessBusiness(ctx: AuthContext, businessId: string): boolean {
  return ctx.businessId === businessId
}

export function canTouchBooking(
  ctx: AuthContext,
  booking: { business_id: string; assigned_capster_id?: string | null }
): boolean {
  if (!canAccessBusiness(ctx, booking.business_id)) return false
  if (can(ctx.role, 'booking.read.all')) return true
  if (ctx.role === 'capster') {
    return !!ctx.staffId && booking.assigned_capster_id === ctx.staffId
  }
  return false
}

export function authErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof AuthError) {
    if (e.code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Anda tidak punya akses ke aksi ini' }, { status: 403 })
  }
  const msg = (e as Error)?.message
  if (msg === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
  }
  if (msg === 'FORBIDDEN') {
    return NextResponse.json({ error: 'Anda tidak punya akses ke aksi ini' }, { status: 403 })
  }
  return null
}
