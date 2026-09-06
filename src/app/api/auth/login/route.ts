import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardApiRequest } from '@/lib/security/http'
import { isEmail, sanitizeText } from '@/lib/validation/input'

/**
 * Login dengan rate limit + sanitasi server-side.
 * Cookie session tetap di-set oleh Supabase SSR client.
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'auth-login',
      limit: 10,
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

    if (!isEmail(email) || !password || password.length > 128) {
      return NextResponse.json({ error: 'Email atau password tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      // Pesan generik — jangan bocorkan apakah email terdaftar.
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: sanitizeText(data.user.user_metadata?.full_name, 80) || null,
      },
    })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
