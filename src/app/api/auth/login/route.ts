import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken } from '@/lib/auth'

function normalizeRole(role: string): 'admin' | 'vet' | 'therapist' | 'receptionist' {
  switch (role) {
    case 'administrator':
    case 'office_manager':
    case 'marketing':
      return 'admin'
    case 'veterinarian':
      return 'vet'
    case 'senior_therapist':
    case 'assistant_therapist':
    case 'hydrotherapist':
      return 'therapist'
    default:
      return (role as any)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.users.findFirst({
      where: { email, active: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await verifyPassword(password, (user as any).password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const normalizedRole = normalizeRole(String(user.role))
    const token = createToken({ id: user.id, email: user.email, name: user.name, role: normalizedRole })
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: normalizedRole } })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    })
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
