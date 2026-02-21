import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { service_id, label, sessions, price } = await req.json()

  const entry = await prisma.service_pricing.update({
    where: { id: params.id },
    data: {
      service_id,
      label,
      sessions: sessions ? parseInt(sessions) : 1,
      price: parseFloat(price),
    },
    include: { service: { select: { id: true, name: true, category: true, color: true, duration: true } } },
  })

  return NextResponse.json({ entry })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.service_pricing.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
