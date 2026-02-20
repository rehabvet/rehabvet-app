import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staff = await prisma.users.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      specializations: true,
      active: true,
      created_at: true,
    },
  })

  const roleOrder: Record<string, number> = { admin: 1, vet: 2, therapist: 3, receptionist: 4 }
  staff.sort((a: any, b: any) => {
    const ra = roleOrder[a.role] ?? 99
    const rb = roleOrder[b.role] ?? 99
    if (ra !== rb) return ra - rb
    return String(a.name || '').localeCompare(String(b.name || ''))
  })

  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { name, email, phone, role, specializations, password } = body
  if (!name || !email || !role) return NextResponse.json({ error: 'Name, email, and role required' }, { status: 400 })

  const existing = await prisma.users.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const hash = bcrypt.hashSync(password || 'password123', 10)

  const staff = await prisma.users.create({
    data: {
      name,
      email,
      password_hash: hash,
      role,
      phone: phone || null,
      specializations: specializations ? JSON.stringify(specializations) : '[]',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      specializations: true,
      active: true,
      created_at: true,
    },
  })

  return NextResponse.json({ staff }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await prisma.users.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
