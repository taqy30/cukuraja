import { homeFor, type AppRole } from './roles'
import { SHOP_SLUG } from '@/lib/brand'

/** Slug toko Cukuraja (single shop). */
export const DEFAULT_BUSINESS_SLUG = SHOP_SLUG

export const BOOKING_SELECT = `
  *,
  service:services(id, name, duration_minutes, price_start),
  capster:staff!bookings_assigned_capster_id_fkey(id, name, role)
`

/** Halaman tujuan setelah login berdasarkan role. */
export function getDashboardPath(role: AppRole | null): string {
  if (!role) return '/login'
  return homeFor(role)
}
