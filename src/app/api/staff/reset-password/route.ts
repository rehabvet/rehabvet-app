import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Admin-only password reset for staff accounts.
// Body: { id: string, password?: string }
// If password omitted, a random temp password is generated and returned.

function isAdminRole(role?: string) {
  return ['admin', 'administrator', 'office_manager'].includes(String(role || '').toLowerCase())
}

function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64').slice(0, 12)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { id, password } = body || {}
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const newPass = (password && String(password).trim()) || generateTempPassword()
  const hash = await bcrypt.hash(newPass, 10)

  await prisma.users.update({
    where: { id },
    data: { password_hash: hash },
  })

  return NextResponse.json({ success: true, tempPassword: password ? null : newPass })
}
