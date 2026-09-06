import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Scissors,
  Settings,
  Users,
  UserCircle,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { can, type AppRole, type Permission } from './roles'

export interface NavItem {
  href: string
  label: string
  description: string
  icon: LucideIcon
  /** Menu tampil hanya jika role punya izin ini. */
  permission: Permission
  /** Sembunyikan untuk role tertentu walaupun izinnya ada. */
  hideFor?: AppRole[]
}

/** Menu dashboard bisnis (owner, admin, kasir, capster). */
const BIZ_NAV: NavItem[] = [
  {
    href: '/dashboard/overview',
    label: 'Ringkasan',
    description: 'Statistik operasional harian',
    icon: BarChart3,
    permission: 'overview.view',
    // Kasir fokus ke antrean; capster ke jadwal miliknya.
    hideFor: ['capster', 'kasir'],
  },
  {
    href: '/dashboard/schedule',
    label: 'Jadwal Saya',
    description: 'Booking yang ditugaskan ke Anda',
    icon: CalendarClock,
    permission: 'booking.read.own',
    // Owner punya semua izin — jangan tampilkan menu khusus capster.
    hideFor: ['owner', 'admin', 'kasir'],
  },
  {
    href: '/dashboard/bookings',
    label: 'Booking & Antrean',
    description: 'Kelola seluruh antrean hari ini',
    icon: ClipboardList,
    permission: 'booking.read.all',
  },
  {
    href: '/dashboard/capsters',
    label: 'Capster',
    description: 'Ketersediaan dan beban kerja capster',
    icon: UsersRound,
    permission: 'capster.read',
  },
  {
    href: '/dashboard/services',
    label: 'Layanan & Harga',
    description: 'Daftar layanan barbershop',
    icon: Scissors,
    permission: 'service.read',
    hideFor: ['capster'],
  },
  {
    href: '/dashboard/customers',
    label: 'Pelanggan',
    description: 'Data pelanggan dan riwayat kunjungan',
    icon: UserCircle,
    permission: 'customer.read',
  },
  {
    href: '/dashboard/staff',
    label: 'Tim & Akun',
    description: 'Admin, kasir, dan capster',
    icon: Users,
    permission: 'staff.read',
  },
  {
    href: '/dashboard/settings',
    label: 'Pengaturan',
    description: 'Profil dan jam operasional',
    icon: Settings,
    permission: 'settings.manage',
  },
]

export function bizNavFor(role: AppRole): NavItem[] {
  return BIZ_NAV.filter(
    (item) => can(role, item.permission) && !item.hideFor?.includes(role)
  )
}
