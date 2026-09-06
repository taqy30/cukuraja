import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  assertMinPassword,
  isEmail,
  isTimeHM,
  isValidPhone,
  isValidSlug,
  sanitizePhone,
  sanitizeText,
  slugify,
} from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

const DEFAULT_SERVICES = [
  {
    name: 'Haircut',
    description: 'Potong rambut standar',
    duration_minutes: 30,
    price_start: 35000,
  },
  {
    name: 'Haircut + Wash',
    description: 'Potong + cuci rambut',
    duration_minutes: 45,
    price_start: 45000,
  },
  {
    name: 'Shaving',
    description: 'Cukur jenggot / kumis',
    duration_minutes: 20,
    price_start: 25000,
  },
]

/**
 * Self-serve: daftar owner + buat barbershop.
 * Setelah sukses, user login ke /dashboard/overview.
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'register-business',
      limit: 3,
      windowMs: 60_000,
    })
    if (blocked) return blocked

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 })
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = body.password
    const ownerName = sanitizeText(body.owner_name ?? body.name, 80)
    const ownerPhone = sanitizePhone(body.owner_phone ?? body.phone)
    const businessName = sanitizeText(body.business_name, 80)
    const slugRaw = sanitizeText(body.slug, 48).toLowerCase() || slugify(businessName)
    const address = sanitizeText(body.address, 200) || null
    const businessPhone = sanitizePhone(body.business_phone) || ownerPhone || null
    const openTime = typeof body.open_time === 'string' ? body.open_time.slice(0, 5) : '10:00'
    const closeTime = typeof body.close_time === 'string' ? body.close_time.slice(0, 5) : '21:00'

    if (!isEmail(email) || !ownerName || !businessName) {
      return NextResponse.json(
        { error: 'Email, nama owner, dan nama barbershop wajib diisi' },
        { status: 400 }
      )
    }

    const pwdError = assertMinPassword(password, 8)
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 })
    }

    if (!isValidSlug(slugRaw)) {
      return NextResponse.json(
        {
          error:
            'Slug tidak valid. Pakai huruf kecil, angka, dan strip (2–48 karakter).',
        },
        { status: 400 }
      )
    }

    if (ownerPhone && !isValidPhone(ownerPhone)) {
      return NextResponse.json({ error: 'Nomor WhatsApp owner tidak valid' }, { status: 400 })
    }

    if (!isTimeHM(openTime) || !isTimeHM(closeTime)) {
      return NextResponse.json({ error: 'Jam buka/tutup tidak valid' }, { status: 400 })
    }

    const reserved = new Set([
      'login',
      'register',
      'dashboard',
      'api',
      'auth',
      'ticket',
      'admin',
      'www',
      'app',
    ])
    if (reserved.has(slugRaw)) {
      return NextResponse.json({ error: 'Slug ini tidak tersedia' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: existingSlug } = await admin
      .from('businesses')
      .select('id')
      .eq('slug', slugRaw)
      .maybeSingle()

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Slug sudah dipakai. Pilih alamat URL lain.' },
        { status: 409 }
      )
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        phone: ownerPhone || null,
        role: 'owner',
      },
    })

    if (authError || !authData.user) {
      const msg = authError?.message?.toLowerCase() ?? ''
      return NextResponse.json(
        {
          error:
            msg.includes('already') || msg.includes('registered') || msg.includes('exists')
              ? 'Email sudah terdaftar. Silakan masuk, atau pakai email lain.'
              : 'Gagal membuat akun owner',
        },
        { status: 400 }
      )
    }

    const { data: business, error: bizError } = await admin
      .from('businesses')
      .insert({
        owner_id: authData.user.id,
        name: businessName,
        slug: slugRaw,
        category: 'barber',
        address,
        phone: businessPhone,
        open_time: openTime,
        close_time: closeTime,
        active_barbers: 1,
        status: 'active',
      })
      .select('id, name, slug')
      .single()

    if (bizError || !business) {
      await admin.auth.admin.deleteUser(authData.user.id)
      console.error('Register business insert error:', bizError)
      return NextResponse.json({ error: 'Gagal membuat barbershop' }, { status: 500 })
    }

    await admin.from('services').insert(
      DEFAULT_SERVICES.map((s) => ({
        ...s,
        business_id: business.id,
        status: 'active',
      }))
    )

    return NextResponse.json(
      {
        ok: true,
        business,
        message: 'Barbershop berhasil dibuat. Silakan masuk dengan email Anda.',
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('Register business error:', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
