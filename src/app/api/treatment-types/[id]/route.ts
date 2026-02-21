import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { name, category, description, duration, price, sessions_in_package, color } = body

  const type = await prisma.treatment_types.update({
    where: { id: params.id },
    data: {
      name,
      category,
      description: description || null,
      duration,
      price: price !== undefined && price !== '' ? parseFloat(price) : null,
      sessions_in_package: sessions_in_package ? parseInt(sessions_in_package) : null,
      color,
    },
  })

  return NextResponse.json({ type })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return PUT(req, { params })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  // Soft delete
  await prisma.treatment_types.update({ where: { id: params.id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
