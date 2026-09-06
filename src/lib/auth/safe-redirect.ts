/** Path internal aman setelah login (cegah open redirect) */
export function getSafeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  if (path.includes('://') || path.includes('\\') || path.includes('@')) return null
  if (/[\u0000-\u001F\u007F]/.test(path)) return null
  // Batasi panjang & karakter aneh di path
  if (path.length > 512) return null
  return path
}

export function loginUrlWithRedirect(targetPath: string): string {
  return `/login?redirect=${encodeURIComponent(targetPath)}`
}

export function registerUrlWithRedirect(targetPath: string): string {
  return `/register?redirect=${encodeURIComponent(targetPath)}`
}
