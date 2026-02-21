import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceId = req.nextUrl.searchParams.get('service_id') || ''
  const where: any = {}
  if (serviceId) where.service_id = serviceId

  const pricing = await prisma.service_pricing.findMany({
    where,
    include: { service: { select: { id: true, name: true, category: true, color: true, duration: true } } },
    orderBy: [{ service: { name: 'asc' } }, { sessions: 'asc' }],
  })

  return NextResponse.json({ pricing })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { service_id, label, sessions, price } = await req.json()
  if (!service_id || !label || price == null) {
    return NextResponse.json({ error: 'service_id, label and price are required' }, { status: 400 })
  }

  const entry = await prisma.service_pricing.create({
    data: {
      service_id,
      label,
      sessions: sessions ? parseInt(sessions) : 1,
      price: parseFloat(price),
    },
    include: { service: { select: { id: true, name: true, category: true, color: true, duration: true } } },
  })

  return NextResponse.json({ entry }, { status: 201 })
}
