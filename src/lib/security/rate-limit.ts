/**
 * Rate limit sederhana in-memory (per instance).
 * Cocok sebagai lapisan pertama; untuk multi-instance gunakan Redis/Upstash.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number }

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
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

export function clientIp(request: Request): string {
  // Prefer header yang diset platform/CDN (sulit di-spoof dari klien).
  const cf = request.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

/** Bersihkan bucket lama agar Map tidak tumbuh tanpa batas. */
export function pruneRateLimitBuckets(now = Date.now()) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
  if (buckets.size > 10_000) {
    // Hard cap: buang entri paling tua secara kasar.
    const keys = [...buckets.keys()].slice(0, buckets.size - 5_000)
    for (const key of keys) buckets.delete(key)
  }
}
