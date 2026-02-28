import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false })

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, expires_at, used_at FROM password_reset_tokens WHERE token = $1 LIMIT 1`, token
  )
  if (!rows.length) return NextResponse.json({ valid: false })
  if (rows[0].used_at) return NextResponse.json({ valid: false, reason: 'used' })
  if (new Date(rows[0].expires_at) < new Date()) return NextResponse.json({ valid: false, reason: 'expired' })

  return NextResponse.json({ valid: true })
}

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at
     FROM password_reset_tokens prt WHERE prt.token = $1 LIMIT 1`, token
  )
  if (!rows.length) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  if (rows[0].used_at) return NextResponse.json({ error: 'This link has already been used' }, { status: 400 })
  if (new Date(rows[0].expires_at) < new Date()) return NextResponse.json({ error: 'Link has expired. Please request a new one.' }, { status: 400 })

  const hashed = await hashPassword(password)

  await prisma.$queryRawUnsafe(
    `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`, hashed, rows[0].user_id
  )
  await prisma.$queryRawUnsafe(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, rows[0].id
  )

  return NextResponse.json({ ok: true })
}
