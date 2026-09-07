/**
 * Feature flags keamanan — baca env sekali di server.
 */

/** Demo UI & password lemah boleh di non-prod, atau flag eksplisit. */
export function isDemoUiEnabled() {
  return (
    process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

/**
 * Izinkan createUser dengan email_confirm tanpa verifikasi.
 * Default: true di development, false di production.
 */
export function allowUnverifiedSignup() {
  if (process.env.ALLOW_UNVERIFIED_SIGNUP === 'true') return true
  if (process.env.ALLOW_UNVERIFIED_SIGNUP === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

/**
 * Self-serve daftar bisnis publik.
 * Default: true di development; production harus ENABLE_BUSINESS_REGISTER=true.
 */
export function isBusinessRegisterEnabled() {
  if (process.env.ENABLE_BUSINESS_REGISTER === 'true') return true
  if (process.env.ENABLE_BUSINESS_REGISTER === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export function hasUpstashRateLimit() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  )
}
