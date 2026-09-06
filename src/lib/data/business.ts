import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_BUSINESS_SLUG } from '@/lib/auth/redirect'

export const ACTIVE_BUSINESS_COOKIE = 'cukuraja_active_business'

export type BusinessSummary = {
  id: string
  name: string
  slug: string
  open_time?: string
  close_time?: string
  address?: string | null
  phone?: string | null
  status?: string
}

export async function getBusinessBySlug(slug: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

export async function getBusinessById(id: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

/** Demo / fallback — dipakai hanya jika pelanggan belum punya membership. */
export async function getDefaultBusiness() {
  return getBusinessBySlug(DEFAULT_BUSINESS_SLUG)
}

export async function getDefaultBusinessId(): Promise<string | null> {
  const business = await getDefaultBusiness()
  return business?.id ?? null
}

/** Barbershop tempat user jadi member (hasil booking online / ditambahkan owner). */
export async function listCustomerMemberships(userId: string): Promise<BusinessSummary[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('business_customers')
    .select('business_id, businesses!inner(id, name, slug, open_time, close_time, address, phone, status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const list: BusinessSummary[] = []
  for (const row of data ?? []) {
    const biz = row.businesses as unknown as BusinessSummary | BusinessSummary[] | null
    const business = Array.isArray(biz) ? biz[0] : biz
    if (business && business.status !== 'inactive') {
      list.push({
        id: business.id,
        name: business.name,
        slug: business.slug,
        open_time: business.open_time,
        close_time: business.close_time,
        address: business.address,
        phone: business.phone,
        status: business.status,
      })
    }
  }
  return list
}

export async function readActiveBusinessSlugCookie(): Promise<string | null> {
  try {
    const store = await cookies()
    return store.get(ACTIVE_BUSINESS_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Bisnis aktif untuk dashboard pelanggan.
 * Prioritas: cookie (jika masih membership) → membership pertama → null.
 */
export async function resolveCustomerBusiness(
  userId: string,
  preferredSlug?: string | null
): Promise<{ active: BusinessSummary | null; memberships: BusinessSummary[] }> {
  const memberships = await listCustomerMemberships(userId)
  const cookieSlug = preferredSlug ?? (await readActiveBusinessSlugCookie())

  if (cookieSlug) {
    const fromMembership = memberships.find((m) => m.slug === cookieSlug)
    if (fromMembership) return { active: fromMembership, memberships }

    // Izinkan set aktif ke bisnis publik (belum member) agar bisa browse sebelum booking.
    const publicBiz = await getBusinessBySlug(cookieSlug)
    if (publicBiz) {
      const summary: BusinessSummary = {
        id: publicBiz.id,
        name: publicBiz.name,
        slug: publicBiz.slug,
        open_time: publicBiz.open_time,
        close_time: publicBiz.close_time,
        address: publicBiz.address,
        phone: publicBiz.phone,
        status: publicBiz.status,
      }
      return { active: summary, memberships }
    }
  }

  if (memberships[0]) return { active: memberships[0], memberships }

  return { active: null, memberships }
}

export async function getCapsters(businessId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('staff')
    .select('id, name, role, status')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .eq('role', 'capster')
    .order('name')
  return data ?? []
}

export async function getBusinessStaff(businessId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('staff')
    .select('id, name, role, status, created_at')
    .eq('business_id', businessId)
    .order('role')
    .order('name')
  return data ?? []
}

export async function getActiveServices(businessId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('price_start', { ascending: true })
  return data ?? []
}
