import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { CACHE_STATIC } from '@/lib/cache'
import bcrypt from 'bcryptjs'

function isAdminRole(role?: string) {
  return ['admin', 'administrator', 'office_manager'].includes(String(role || '').toLowerCase())
}

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
      photo_url: true,
      specializations: true,
      active: true,
      created_at: true,
    },
  })

  const roleOrder: Record<string, number> = {
    administrator: 1,
    office_manager: 2,
    marketing: 3,
    veterinarian: 4,
    senior_therapist: 5,
    hydrotherapist: 6,
    assistant_therapist: 7,
    admin: 1,
    vet: 4,
    therapist: 5,
    receptionist: 8,
  }
  staff.sort((a: any, b: any) => {
    const ra = roleOrder[a.role] ?? 99
    const rb = roleOrder[b.role] ?? 99
    if (ra !== rb) return ra - rb
    return String(a.name || '').localeCompare(String(b.name || ''))
  })

  const staffRes = NextResponse.json({ staff })
  staffRes.headers.set('Cache-Control', CACHE_STATIC)
  return staffRes
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { name, email, phone, role, specializations, password, photo_url } = body
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
      photo_url: photo_url || null,
      specializations: specializations ? JSON.stringify(specializations) : '[]',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      photo_url: true,
      specializations: true,
      active: true,
      created_at: true,
    },
  })

  return NextResponse.json({ staff }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { id, name, email, phone, role, specializations, photo_url, active } = body || {}
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (!name || !email || !role) return NextResponse.json({ error: 'Name, email, and role required' }, { status: 400 })

  const existing = await prisma.users.findUnique({ where: { email } })
  if (existing && existing.id !== id) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const staff = await prisma.users.update({
    where: { id },
    data: {
      name,
      email,
      role,
      phone: phone || null,
      photo_url: photo_url || null,
      specializations: specializations ? JSON.stringify(specializations) : '[]',
      active: typeof active === 'boolean' ? active : true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      photo_url: true,
      specializations: true,
      active: true,
      created_at: true,
    },
  })

  return NextResponse.json({ staff })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await prisma.users.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
