/**
 * Rate limit:
 * - Selalu ada fallback in-memory (per instance)
 * - Production Vercel: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   agar limit terdistribusi antar serverless instance (lihat .env.example)
 */

import { hasUpstashRateLimit } from './flags'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number }

/** Bersihkan bucket lama agar Map tidak tumbuh tanpa batas. */
export function pruneRateLimitBuckets(now = Date.now()) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
  if (buckets.size > 10_000) {
    const keys = [...buckets.keys()].slice(0, buckets.size - 5_000)
    for (const key of keys) buckets.delete(key)
  }
}

function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (buckets.size > 100) pruneRateLimitBuckets()

  const now = Date.now()
  const current = buckets.get(key)

  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return { ok: true }
}

/**
 * Upstash REST: INCR + EXPIRE pada key sliding window sederhana (fixed window).
 * Docs: https://upstash.com/docs/redis/features/restapi
 */
async function rateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null

  const redisKey = `rl:${key}`
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))

  try {
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!incrRes.ok) return null
    const incrJson = (await incrRes.json()) as { result?: number }
    const count = Number(incrJson.result ?? 0)

    if (count === 1) {
      await fetch(
        `${url}/expire/${encodeURIComponent(redisKey)}/${windowSec}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }
      )
    }

    if (count > limit) {
      const ttlRes = await fetch(`${url}/ttl/${encodeURIComponent(redisKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const ttlJson = (await ttlRes.json().catch(() => ({}))) as {
        result?: number
      }
      const ttl = Number(ttlJson.result ?? windowSec)
      return {
        ok: false,
        retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec),
      }
    }

    return { ok: true }
  } catch {
    return null
  }
}

/** Rate limit async: Upstash jika tersedia, else memory. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (hasUpstashRateLimit()) {
    const distributed = await rateLimitUpstash(key, limit, windowMs)
    if (distributed) return distributed
  }
  return rateLimitMemory(key, limit, windowMs)
}

/** Sync memory-only (Edge middleware yang tidak await Upstash). */
export function rateLimitSync(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  return rateLimitMemory(key, limit, windowMs)
}

export function clientIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}
