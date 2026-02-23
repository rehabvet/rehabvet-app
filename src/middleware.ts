import { NextRequest, NextResponse } from 'next/server'

// ── Paths that do NOT require authentication ──────────────────────────────────
const PUBLIC_PREFIXES = [
  '/login',
  '/appointment',           // public booking form
  '/thank-you',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/leads',             // public booking submission (leads list used internally)
  '/api/appointment',       // public booking form POST (note: singular, not /appointments)
  '/api/google-reviews',    // public widget
  '/api/health',
  '/_next',
  '/static',
  '/favicon',
  '/logo',
  '/icons',
]

const PUBLIC_EXTENSIONS = ['.ico', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.css', '.js', '.woff', '.woff2']

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) return true
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))
}

// ── Decode JWT payload without signature verification (Edge-compatible) ───────
// Full verification still happens in each API route handler.
// Middleware only checks: token exists + not expired.
function decodeJwtPayload(token: string): { exp?: number; id?: string; role?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Base64url → Base64 → JSON
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ── Security headers applied to EVERY response ───────────────────────────────
function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    // Tell browsers to only ever use HTTPS for this domain for 1 year
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  return res
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow public paths (add headers first)
  if (isPublic(pathname)) {
    return addSecurityHeaders(NextResponse.next())
  }

  const token = req.cookies.get('token')?.value

  // No token at all
  if (!token) {
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addSecurityHeaders(res)
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Token exists — decode and check expiry
  const payload = decodeJwtPayload(token)
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (!payload || !payload.id || (payload.exp && payload.exp < nowSeconds)) {
    // Expired or malformed token
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json({ error: 'Session expired' }, { status: 401 })
      addSecurityHeaders(res)
      res.cookies.delete('token')
      return res
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    const redirect = NextResponse.redirect(loginUrl)
    redirect.cookies.delete('token')
    return addSecurityHeaders(redirect)
  }

  // Valid token — proceed
  const res = NextResponse.next()
  // Forward user identity to route handlers via header (optional, useful for logging)
  res.headers.set('x-user-id', payload.id)
  res.headers.set('x-user-role', payload.role || '')
  return addSecurityHeaders(res)
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
