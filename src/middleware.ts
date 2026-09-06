import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { assertSameOrigin, middlewareRateLimit } from '@/lib/security/http'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method.toUpperCase()

  // Rate limit global untuk API (mitigasi brute-force / scraping).
  if (pathname.startsWith('/api/')) {
    const isAuthApi =
      pathname.startsWith('/api/auth/') || pathname.startsWith('/api/register')
    const isPublicRead =
      method === 'GET' &&
      (pathname.startsWith('/api/business/') || pathname.startsWith('/api/slots'))

    const limited = middlewareRateLimit(
      request,
      isAuthApi ? 'api-auth' : isPublicRead ? 'api-public' : 'api',
      isAuthApi ? 20 : isPublicRead ? 90 : 120,
      60_000
    )
    if (limited) return limited

    // CSRF: tolak mutating cross-origin.
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const blocked = assertSameOrigin(request)
      if (blocked) return blocked
    }
  }

  // Halaman login/register: batasi flood.
  if (
    method === 'GET' &&
    (pathname === '/login' ||
      pathname === '/register' ||
      pathname.startsWith('/register/'))
  ) {
    const limited = middlewareRateLimit(request, 'auth-pages', 60, 60_000)
    if (limited) return limited
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
