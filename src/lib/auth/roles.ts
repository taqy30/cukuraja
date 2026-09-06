/**
 * Sumber kebenaran tunggal untuk role & permission Cukuraja.
 * Dipakai bersama oleh server layout, API route, dan UI shell agar tidak pernah
 * terjadi perbedaan antara menu yang tampil dan aksi yang benar-benar diizinkan.
 */

export type AppRole = 'owner' | 'admin' | 'kasir' | 'capster' | 'customer'

/** Role yang disimpan di kolom `staff.role`. Owner ada di `businesses.owner_id`. */
export type StaffRole = 'admin' | 'kasir' | 'capster'

export const STAFF_ROLES: StaffRole[] = ['admin', 'kasir', 'capster']

/** Baris staff lama memakai role 'staff'; perlakukan sebagai kasir. */
export function normalizeStaffRole(raw: string | null | undefined): StaffRole {
  if (raw === 'admin' || raw === 'kasir' || raw === 'capster') return raw
  return 'kasir'
}

export const PERMISSIONS = [
  'overview.view',
  'overview.revenue',
  'booking.read.all',
  'booking.read.own',
  'booking.create.walkin',
  'booking.create.online',
  'booking.update',
  'booking.status',
  'booking.delete',
  'capster.read',
  'schedule.block',
  'service.read',
  'service.manage',
  'staff.read',
  'staff.manage',
  'customer.read',
  'customer.manage',
  'settings.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

/**
 * Matriks izin.
 * - owner    : akses penuh
 * - admin    : operasional + layanan + blokir jadwal capster
 * - kasir    : walk-in + antrean + blokir jadwal (operasional lantai)
 * - capster  : jadwal sendiri + bisa tandai berhalangan pada slotnya
 * - customer : booking online
 */
const MATRIX: Record<AppRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: [
    'overview.view',
    'booking.read.all',
    'booking.create.walkin',
    'booking.update',
    'booking.status',
    'booking.delete',
    'capster.read',
    'schedule.block',
    'service.read',
    'service.manage',
    'staff.read',
    'customer.read',
  ],
  kasir: [
    'overview.view',
    'booking.read.all',
    'booking.create.walkin',
    'booking.status',
    'capster.read',
    'schedule.block',
    'service.read',
  ],
  capster: [
    'overview.view',
    'booking.read.own',
    'booking.status',
    'schedule.block',
    'service.read',
  ],
  customer: ['booking.read.own', 'booking.create.online', 'capster.read', 'service.read'],
}

export function can(role: AppRole, permission: Permission): boolean {
  return MATRIX[role].includes(permission)
}

export function canAny(role: AppRole, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p))
}

export function permissionsFor(role: AppRole): Permission[] {
  return [...MATRIX[role]]
}

/** Role bisnis (punya businessId) vs pelanggan. */
export function isBusinessRole(role: AppRole): boolean {
  return role !== 'customer'
}

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  kasir: 'Kasir',
  capster: 'Capster',
  customer: 'Pelanggan',
}

export const ROLE_DESCRIPTION: Record<AppRole, string> = {
  owner: 'Akses penuh seluruh dashboard, staff, layanan, dan omset',
  admin: 'Operasional harian, layanan, dan data pelanggan',
  kasir: 'Booking offline walk-in dan menjalankan antrean',
  capster: 'Jadwal dan pelanggan yang ditugaskan ke Anda',
  customer: 'Booking online dan melihat capster yang ready',
}

/** Halaman awal setelah login untuk tiap role. */
export const ROLE_HOME: Record<AppRole, string> = {
  owner: '/dashboard/overview',
  admin: '/dashboard/overview',
  kasir: '/dashboard/bookings',
  capster: '/dashboard/schedule',
  customer: '/dashboard/customer',
}

export function homeFor(role: AppRole): string {
  return ROLE_HOME[role]
}
