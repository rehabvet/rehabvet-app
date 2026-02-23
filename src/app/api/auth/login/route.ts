import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken } from '@/lib/auth'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

const MAX_FAILED_ATTEMPTS = 10          // lock account after this many failures
const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export async function POST(req: NextRequest) {
  // ── 1. IP-based rate limiting ─────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'

  const rate = checkRateLimit(ip)
  if (!rate.allowed) {
    const mins = Math.ceil(rate.resetInSeconds / 60)
    return NextResponse.json(
      { error: `Too many login attempts. Please try again in ${mins} minute${mins !== 1 ? 's' : ''}.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.resetInSeconds),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + rate.resetInSeconds),
        },
      }
    )
  }

  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // ── 2. Look up user ───────────────────────────────────────────────────────
    const user = await prisma.users.findFirst({
      where: { email, active: true },
    })

    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // ── 3. Account lockout check ──────────────────────────────────────────────
    if (user.locked_until && user.locked_until > new Date()) {
      const mins = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Account is temporarily locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` },
        { status: 423 }
      )
    }

    // ── 4. Verify password ────────────────────────────────────────────────────
    const valid = await verifyPassword(password, (user as any).password_hash)

    if (!valid) {
      // Increment failed attempts
      const newCount = ((user as any).failed_login_attempts ?? 0) + 1
      const shouldLock = newCount >= MAX_FAILED_ATTEMPTS

      await prisma.users.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: newCount,
          locked_until: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION_MS)
            : undefined,
        } as any,
      })

      if (shouldLock) {
        return NextResponse.json(
          { error: 'Account locked due to too many failed attempts. Try again in 30 minutes.' },
          { status: 423 }
        )
      }

      const attemptsLeft = MAX_FAILED_ATTEMPTS - newCount
      return NextResponse.json(
        { error: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before lockout.` },
        { status: 401 }
      )
    }

    // ── 5. Successful login — reset counters ──────────────────────────────────
    resetRateLimit(ip)
    await prisma.users.update({
      where: { id: user.id },
      data: { failed_login_attempts: 0, locked_until: null } as any,
    })

    // ── 6. Issue JWT ──────────────────────────────────────────────────────────
    const role = String(user.role)
    const token = createToken({ id: user.id, email: user.email, name: user.name, role })
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role },
    })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    })
    return response

  } catch (err: any) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
