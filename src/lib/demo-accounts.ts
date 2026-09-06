import type { AppRole } from "@/lib/auth/roles";
import { ROLE_LABEL } from "@/lib/auth/roles";

export interface DemoAccount {
  role: AppRole;
  /** Label tombol di shield (bisa lebih spesifik dari ROLE_LABEL). */
  label: string;
  email: string;
  password: string;
  hint: string;
}

/**
 * Akun demo publik.
 * Sinkron dengan `scripts/seed-demo.mjs` dan `scripts/reset-demo.mjs`.
 *
 * Catatan Owner: tidak ada di tabel `staff.role`.
 * Owner = `businesses.owner_id` + Auth user. Di Supabase Table Editor,
 * kolom role staff hanya: admin | kasir | capster.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "owner",
    label: "Owner",
    email: "owner@gmail.com",
    password: "owner123",
    hint: "Pemilik toko · businesses.owner_id (bukan baris staff)",
  },
  {
    role: "admin",
    label: "Admin",
    email: "admin@gmail.com",
    password: "admin123",
    hint: "Operasional · staff.role = admin",
  },
  {
    role: "kasir",
    label: "Kasir",
    email: "staff@gmail.com",
    password: "staff123",
    hint: "Walk-in & antrean · staff.role = kasir",
  },
  {
    role: "capster",
    label: "Capster · Budi",
    email: "capster@gmail.com",
    password: "capster123",
    hint: "staff.role = capster",
  },
  {
    role: "capster",
    label: "Capster · Andi",
    email: "capster2@gmail.com",
    password: "capster123",
    hint: "staff.role = capster",
  },
  {
    role: "capster",
    label: "Capster · Rizki",
    email: "capster3@gmail.com",
    password: "capster123",
    hint: "staff.role = capster",
  },
  {
    role: "customer",
    label: "Pelanggan",
    email: "user@gmail.com",
    password: "user123",
    hint: "Member booking online",
  },
];

export function demoRoleTitle(account: DemoAccount) {
  return account.label.includes("·")
    ? account.label
    : ROLE_LABEL[account.role];
}
