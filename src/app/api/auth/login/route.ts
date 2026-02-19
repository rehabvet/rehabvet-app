import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email) as any
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role })
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false, // local dev
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    })
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
