/**
 * Defense-in-depth untuk API Next.js:
 * - Same-origin / CSRF check (Origin atau Referer + allowlist APP_URL)
 * - Rate limit per IP + route (Upstash optional)
 */

import { NextResponse } from 'next/server'
import {
  clientIp,
  rateLimit,
  rateLimitSync,
  type RateLimitResult,
} from './rate-limit'

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

/** Host yang diizinkan dari NEXT_PUBLIC_APP_URL (+ localhost di development). */
function allowedHosts(): Set<string> {
  const set = new Set<string>()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (appUrl) {
    try {
      set.add(new URL(appUrl).host.toLowerCase())
    } catch {
      /* ignore */
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    set.add('localhost:3000')
    set.add('127.0.0.1:3000')
  }
  return set
}

function originHost(originOrUrl: string): string | null {
  try {
    return new URL(originOrUrl).host.toLowerCase()
  } catch {
    return null
  }
}

function hostAllowed(host: string): boolean {
  const allow = allowedHosts()
  if (allow.size === 0) return true
  return allow.has(host)
}

/**
 * Tolak request cross-site ke API mutating (mitigasi CSRF).
 * Prefer allowlist NEXT_PUBLIC_APP_URL; fallback cocokkan Origin/Referer ke Host.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const method = request.method.toUpperCase()
  if (!MUTATING.has(method)) return null

  const host = requestHost(request)
  if (!host) {
    return NextResponse.json({ error: 'Host tidak valid' }, { status: 400 })
  }

  const allow = allowedHosts()
  const expectedHosts = allow.size > 0 ? allow : new Set([host])

  const origin = request.headers.get('origin')
  if (origin) {
    const oHost = originHost(origin)
    if (!oHost || !expectedHosts.has(oHost)) {
      return NextResponse.json({ error: 'Origin ditolak' }, { status: 403 })
    }
    if (allow.size > 0 && !hostAllowed(host)) {
      return NextResponse.json({ error: 'Host ditolak' }, { status: 403 })
    }
    return null
  }

  const referer = request.headers.get('referer')
  if (referer) {
    const rHost = originHost(referer)
    if (!rHost || !expectedHosts.has(rHost)) {
      return NextResponse.json({ error: 'Referer ditolak' }, { status: 403 })
    }
    if (allow.size > 0 && !hostAllowed(host)) {
      return NextResponse.json({ error: 'Host ditolak' }, { status: 403 })
    }
    return null
  }

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

/** Origin check + rate limit (async — Upstash jika dikonfigurasi). */
export async function guardApiRequest(
  request: Request,
  options: GuardOptions
): Promise<NextResponse | null> {
  const requireOrigin =
    options.requireSameOrigin ?? MUTATING.has(request.method.toUpperCase())
  if (requireOrigin) {
    const blocked = assertSameOrigin(request)
    if (blocked) return blocked
  }

  const windowMs = options.windowMs ?? 60_000
  const ip = clientIp(request)
  const result = await rateLimit(`${options.key}:${ip}`, options.limit, windowMs)
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

/** Rate limit kasar di middleware (Edge) — sync memory. */
export function middlewareRateLimit(
  request: Request,
  key: string,
  limit: number,
  windowMs = 60_000
): NextResponse | null {
  const ip = clientIp(request)
  const result = rateLimitSync(`mw:${key}:${ip}`, limit, windowMs)
  if (!result.ok) return rateLimitResponse(result)
  return null
}
