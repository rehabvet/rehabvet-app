import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Always return success to prevent email enumeration
  const users = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, email
  )
  if (!users.length) return NextResponse.json({ ok: true })

  const user = users[0]
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  // Invalidate any existing tokens for this user
  await prisma.$queryRawUnsafe(
    `DELETE FROM password_reset_tokens WHERE user_id = $1`, user.id
  )

  await prisma.$queryRawUnsafe(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    user.id, token, expires
  )

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.rehabvet.com'}/reset-password?token=${token}`

  try {
    await sendPasswordResetEmail({ name: user.name, email: user.email, resetUrl })
  } catch (e) {
    console.error('Failed to send reset email:', e)
  }

  return NextResponse.json({ ok: true })
}
