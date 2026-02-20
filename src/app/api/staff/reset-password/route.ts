import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Admin-only password reset for staff accounts.
// Body: { id: string, password?: string }
// If password omitted, a random temp password is generated and returned.

function generateTempPassword(len = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { id, password } = body || {}
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const newPass = (password && String(password).trim()) || generateTempPassword()
  const hash = bcrypt.hashSync(newPass, 10)

  await prisma.users.update({
    where: { id },
    data: { password_hash: hash },
  })

  return NextResponse.json({ success: true, tempPassword: password ? null : newPass })
}
