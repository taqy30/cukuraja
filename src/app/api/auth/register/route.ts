import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApiRequest } from '@/lib/security/http'
import {
  assertMinPassword,
  isEmail,
  isValidPhone,
  sanitizePhone,
  sanitizeText,
} from '@/lib/validation/input'

/** Registrasi pelanggan dengan rate limit + sanitasi metadata. */
export async function POST(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'auth-register',
      limit: 5,
      windowMs: 60_000,
    })
    if (blocked) return blocked

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 })
    }

    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const name = sanitizeText(body.name ?? body.full_name, 80)
    const phoneRaw = sanitizePhone(body.phone)
    const phone = phoneRaw || null

    if (!isEmail(email) || !name) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 })
    }

    const pwdError = assertMinPassword(password, 8)
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 })
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Nomor WhatsApp tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
          role: 'customer',
        },
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      return NextResponse.json(
        {
          error:
            msg.includes('already') || msg.includes('registered')
              ? 'Email sudah terdaftar. Silakan masuk.'
              : 'Gagal mendaftar. Periksa data Anda.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        user: data.user
          ? { id: data.user.id, email: data.user.email, name }
          : null,
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
