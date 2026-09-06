/**
 * Seed akun demo + capster + pelanggan
 * Jalankan: npm run seed
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
  owner: { email: 'owner@gmail.com', password: 'owner123', name: 'Owner Admin' },
  admin: { email: 'admin@gmail.com', password: 'admin123', name: 'Admin Operasional', role: 'admin' },
  kasir: { email: 'staff@gmail.com', password: 'staff123', name: 'Kasir Utama', role: 'kasir' },
  capsters: [
    { email: 'capster@gmail.com', password: 'capster123', name: 'Budi Capster', role: 'capster' },
    { email: 'capster2@gmail.com', password: 'capster123', name: 'Andi Capster', role: 'capster' },
    { email: 'capster3@gmail.com', password: 'capster123', name: 'Rizki Capster', role: 'capster' },
  ],
  customer: { email: 'user@gmail.com', password: 'user123', name: 'Pelanggan Setia' },
  business: {
    name: 'Cukuraja',
    slug: 'cukuraja',
    address: 'Jl. Sudirman No. 1',
    phone: '081234567890',
  },
}

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email === email) ?? null
}

async function ensureUser({ email, password, name, role }) {
  let user = await findUserByEmail(email)
  if (user) {
    await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role },
    })
    console.log(`✓ User di-update: ${email} (${role})`)
    return user
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role },
  })
  if (error) throw error
  console.log(`✓ User dibuat: ${email} (${role})`)
  return data.user
}

async function ensureStaff(userId, businessId, name, role) {
  const { data: existing } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (existing) {
    await supabase.from('staff').update({ name, role, status: 'active' }).eq('id', existing.id)
    console.log(`✓ Staff di-update: ${name} (${role})`)
    return
  }

  const { error } = await supabase.from('staff').insert({
    user_id: userId,
    business_id: businessId,
    role,
    name,
    status: 'active',
  })
  if (error) throw error
  console.log(`✓ Staff ditambah: ${name} (${role})`)
}

async function main() {
  const owner = await ensureUser({ ...DEMO.owner, role: 'owner' })
  const admin = await ensureUser({ ...DEMO.admin, role: 'admin' })
  const kasir = await ensureUser({ ...DEMO.kasir, role: 'kasir' })
  const capsterUsers = []
  for (const c of DEMO.capsters) {
    capsterUsers.push(await ensureUser({ ...c, role: 'capster' }))
  }
  await ensureUser({ ...DEMO.customer, role: 'customer' })

  let { data: business } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('slug', DEMO.business.slug)
    .maybeSingle()

  // Migrasi dari slug demo lama `barbershop` → `cukuraja`
  if (!business) {
    const { data: legacy } = await supabase
      .from('businesses')
      .select('id, slug')
      .eq('slug', 'barbershop')
      .maybeSingle()
    if (legacy) {
      await supabase
        .from('businesses')
        .update({
          name: DEMO.business.name,
          slug: DEMO.business.slug,
          address: DEMO.business.address,
          phone: DEMO.business.phone,
          owner_id: owner.id,
        })
        .eq('id', legacy.id)
      business = { id: legacy.id, slug: DEMO.business.slug }
      console.log(`✓ Migrasi slug barbershop → /${DEMO.business.slug}`)
    }
  }

  if (!business) {
    const { data: created, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: owner.id,
        name: DEMO.business.name,
        slug: DEMO.business.slug,
        address: DEMO.business.address,
        phone: DEMO.business.phone,
        open_time: '10:00',
        close_time: '21:00',
        active_barbers: 2,
        status: 'active',
      })
      .select()
      .single()
    if (error) throw error
    business = created
    console.log(`✓ Barbershop: /${business.slug}`)

    const services = [
      { name: 'Haircut', description: 'Potong rambut standar', duration_minutes: 30, price_start: 35000 },
      { name: 'Shaving', description: 'Cukur jenggot', duration_minutes: 15, price_start: 20000 },
      { name: 'Hair Wash', description: 'Cuci rambut', duration_minutes: 20, price_start: 25000 },
      { name: 'Paket Komplit', description: 'Haircut + Shaving + Wash', duration_minutes: 60, price_start: 70000 },
    ]
    await supabase.from('services').insert(
      services.map((s) => ({ ...s, business_id: business.id, status: 'active' }))
    )
  } else {
    await supabase
      .from('businesses')
      .update({
        owner_id: owner.id,
        name: DEMO.business.name,
        address: DEMO.business.address,
        phone: DEMO.business.phone,
      })
      .eq('id', business.id)
    console.log(`✓ Barbershop sudah ada: /${business.slug}`)
  }

  await ensureStaff(admin.id, business.id, DEMO.admin.name, DEMO.admin.role)
  await ensureStaff(kasir.id, business.id, DEMO.kasir.name, DEMO.kasir.role)
  for (let i = 0; i < DEMO.capsters.length; i++) {
    const c = DEMO.capsters[i]
    await ensureStaff(capsterUsers[i].id, business.id, c.name, c.role)
  }

  console.log('\n--- Akun Default ---')
  console.log('Owner:         owner@gmail.com / owner123      → /dashboard/overview (businesses.owner_id)')
  console.log('Admin:         admin@gmail.com / admin123      → /dashboard/overview')
  console.log('Kasir:         staff@gmail.com / staff123      → /dashboard/bookings')
  console.log('Capster Budi:  capster@gmail.com / capster123  → /dashboard/schedule')
  console.log('Capster Andi:  capster2@gmail.com / capster123 → /dashboard/schedule')
  console.log('Capster Rizki: capster3@gmail.com / capster123 → /dashboard/schedule')
  console.log('Pelanggan:     user@gmail.com / user123        → /dashboard/customer')
  console.log('Publik:        http://localhost:3000/cukuraja')
  console.log('\nPastikan migration sudah dijalankan di Supabase SQL Editor.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
