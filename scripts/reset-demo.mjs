/**
 * Reset + sinkronisasi penuh akun demo (owner, admin, kasir, capster, pelanggan)
 * Jalankan: npm run seed:reset
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO = {
  owner: { email: 'owner@gmail.com', password: 'owner123', name: 'Owner Admin', role: 'owner' },
  admin: { email: 'admin@gmail.com', password: 'admin123', name: 'Admin Operasional', role: 'admin' },
  kasir: { email: 'staff@gmail.com', password: 'staff123', name: 'Kasir Utama', role: 'kasir' },
  capsters: [
    { email: 'capster@gmail.com', password: 'capster123', name: 'Budi Capster', role: 'capster' },
    { email: 'capster2@gmail.com', password: 'capster123', name: 'Andi Capster', role: 'capster' },
    { email: 'capster3@gmail.com', password: 'capster123', name: 'Rizki Capster', role: 'capster' },
  ],
  customer: { email: 'user@gmail.com', password: 'user123', name: 'Pelanggan Setia', role: 'customer' },
  business: {
    name: 'Cukuraja',
    slug: 'cukuraja',
    address: 'Jl. Sudirman No. 1',
    phone: '081234567890',
  },
}

async function listAllUsers() {
  const users = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 200) break
    page += 1
  }
  return users
}

async function findUserByEmail(email) {
  const users = await listAllUsers()
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function ensureUser({ email, password, name, role }) {
  let user = await findUserByEmail(email)
  if (user) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role },
    })
    if (error) throw error
    console.log(`✓ Auth update: ${email} (${role})`)
    return user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role },
  })
  if (error) throw error
  console.log(`✓ Auth dibuat: ${email} (${role})`)
  return data.user
}

async function ensureBusiness(ownerId) {
  let { data: existing } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('slug', DEMO.business.slug)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!existing) {
    const { data: legacy } = await supabase
      .from('businesses')
      .select('id, slug')
      .eq('slug', 'barbershop')
      .maybeSingle()
    if (legacy) {
      await supabase
        .from('businesses')
        .update({
          owner_id: ownerId,
          name: DEMO.business.name,
          slug: DEMO.business.slug,
          address: DEMO.business.address,
          phone: DEMO.business.phone,
          status: 'active',
        })
        .eq('id', legacy.id)
      console.log(`✓ Migrasi slug barbershop → /${DEMO.business.slug}`)
      return { id: legacy.id, slug: DEMO.business.slug }
    }
  }

  if (existing) {
    await supabase
      .from('businesses')
      .update({
        owner_id: ownerId,
        name: DEMO.business.name,
        address: DEMO.business.address,
        phone: DEMO.business.phone,
        status: 'active',
      })
      .eq('id', existing.id)
    console.log(`✓ Bisnis: /${existing.slug}`)
    return existing
  }

  const { data: created, error } = await supabase
    .from('businesses')
    .insert({
      owner_id: ownerId,
      name: DEMO.business.name,
      slug: DEMO.business.slug,
      address: DEMO.business.address,
      phone: DEMO.business.phone,
      open_time: '10:00',
      close_time: '21:00',
      active_barbers: 3,
      status: 'active',
    })
    .select('id, slug')
    .single()
  if (error) throw error

  const services = [
    { name: 'Haircut', description: 'Potong rambut standar', duration_minutes: 30, price_start: 35000 },
    { name: 'Shaving', description: 'Cukur jenggot', duration_minutes: 15, price_start: 20000 },
    { name: 'Hair Wash', description: 'Cuci rambut', duration_minutes: 20, price_start: 25000 },
    { name: 'Paket Komplit', description: 'Haircut + Shaving + Wash', duration_minutes: 60, price_start: 70000 },
  ]
  await supabase.from('services').insert(
    services.map((s) => ({ ...s, business_id: created.id, status: 'active' }))
  )
  console.log(`✓ Bisnis baru: /${created.slug}`)
  return created
}

async function replaceStaff(businessId, members) {
  // Hapus semua staff bisnis ini lalu isi ulang — hilangkan duplikat & role salah.
  const { error: delErr } = await supabase.from('staff').delete().eq('business_id', businessId)
  if (delErr) throw delErr

  for (const m of members) {
    const { error } = await supabase.from('staff').insert({
      user_id: m.userId,
      business_id: businessId,
      role: m.role,
      name: m.name,
      status: 'active',
    })
    if (error) {
      console.error(`✗ Gagal insert staff ${m.name} (${m.role}):`, error.message)
      throw error
    }
    console.log(`✓ Staff: ${m.name} (${m.role})`)
  }
}

async function main() {
  console.log('=== Reset akun demo Cukuraja ===\n')

  const owner = await ensureUser(DEMO.owner)
  const admin = await ensureUser(DEMO.admin)
  const kasir = await ensureUser(DEMO.kasir)
  const capsterUsers = []
  for (const c of DEMO.capsters) {
    capsterUsers.push(await ensureUser(c))
  }
  await ensureUser(DEMO.customer)

  const business = await ensureBusiness(owner.id)

  // Owner tidak boleh ada di tabel staff
  await supabase.from('staff').delete().eq('user_id', owner.id)

  await replaceStaff(business.id, [
    { userId: admin.id, name: DEMO.admin.name, role: 'admin' },
    { userId: kasir.id, name: DEMO.kasir.name, role: 'kasir' },
    ...DEMO.capsters.map((c, i) => ({
      userId: capsterUsers[i].id,
      name: c.name,
      role: 'capster',
    })),
  ])

  // Verifikasi cepat
  const { data: staffCheck } = await supabase
    .from('staff')
    .select('name, role, status')
    .eq('business_id', business.id)
    .order('role')

  console.log('\n--- Staff di database ---')
  for (const s of staffCheck ?? []) {
    console.log(`  ${s.role.padEnd(8)} ${s.name} [${s.status}]`)
  }

  console.log('\n--- Login demo ---')
  console.log('Owner:        owner@gmail.com / owner123     (businesses.owner_id)')
  console.log('Admin:        admin@gmail.com / admin123')
  console.log('Kasir:        staff@gmail.com / staff123')
  console.log('Capster Budi: capster@gmail.com / capster123')
  console.log('Capster Andi: capster2@gmail.com / capster123')
  console.log('Capster Rizki:capster3@gmail.com / capster123')
  console.log('Pelanggan:    user@gmail.com / user123')
  console.log('\nPastikan migration 001–007 sudah dijalankan di Supabase SQL Editor.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
