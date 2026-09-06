/**
 * Defense-in-depth untuk API Next.js:
 * - Same-origin / CSRF check (Origin atau Referer)
 * - Rate limit per IP + route
 */

import { NextResponse } from 'next/server'
import { clientIp, rateLimit, type RateLimitResult } from './rate-limit'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export type GuardOptions = {
  /** Kunci unik bucket, contoh: `booking-create` */
  key: string
  limit: number
  windowMs?: number
  /** Default true untuk method mutating */
  requireSameOrigin?: boolean
}

function requestHost(request: Request): string | null {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  return host?.split(',')[0]?.trim().toLowerCase() || null
}

function originHost(originOrUrl: string): string | null {
  try {
    return new URL(originOrUrl).host.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Tolak request cross-site ke API mutating (mitigasi CSRF).
 * Izinkan jika Origin/Referer cocok dengan Host, atau Origin hilang
 * (beberapa client native) HANYA bila Referer juga absen di development.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const method = request.method.toUpperCase()
  if (!MUTATING.has(method)) return null

  const host = requestHost(request)
  if (!host) {
    return NextResponse.json({ error: 'Host tidak valid' }, { status: 400 })
  }

  const origin = request.headers.get('origin')
  if (origin) {
    const oHost = originHost(origin)
    if (!oHost || oHost !== host) {
      return NextResponse.json({ error: 'Origin ditolak' }, { status: 403 })
    }
    return null
  }

  const referer = request.headers.get('referer')
  if (referer) {
    const rHost = originHost(referer)
    if (!rHost || rHost !== host) {
      return NextResponse.json({ error: 'Referer ditolak' }, { status: 403 })
    }
    return null
  }

  // Tanpa Origin & Referer: tolak di production (browser selalu kirim salah satunya untuk form/fetch same-site).
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Origin wajib' }, { status: 403 })
  }

  return null
}

export function rateLimitResponse(result: Extract<RateLimitResult, { ok: false }>) {
  return NextResponse.json(
    { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSec) },
    }
  )
}

/** Origin check + rate limit. Return NextResponse jika ditolak, null jika OK. */
export function guardApiRequest(
  request: Request,
  options: GuardOptions
): NextResponse | null {
  const requireOrigin = options.requireSameOrigin ?? MUTATING.has(request.method.toUpperCase())
  if (requireOrigin) {
    const blocked = assertSameOrigin(request)
    if (blocked) return blocked
  }

  const windowMs = options.windowMs ?? 60_000
  const ip = clientIp(request)
  const result = rateLimit(`${options.key}:${ip}`, options.limit, windowMs)
  if (!result.ok) return rateLimitResponse(result)
  return null
}

export function secureCookieOptions(maxAgeSec = 60 * 60 * 24 * 365) {
  return {
    path: '/',
    maxAge: maxAgeSec,
    sameSite: 'lax' as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  }
}

/** Rate limit kasar di middleware (Edge). */
export function middlewareRateLimit(
  request: Request,
  key: string,
  limit: number,
  windowMs = 60_000
): NextResponse | null {
  const ip = clientIp(request)
  const result = rateLimit(`mw:${key}:${ip}`, limit, windowMs)
  if (!result.ok) return rateLimitResponse(result)
  return null
}
