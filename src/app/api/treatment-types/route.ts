import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { CACHE_STATIC } from '@/lib/cache'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const types = await prisma.treatment_types.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }],
  })

  // Group by category
  const grouped: Record<string, any[]> = {}
  for (const t of types as any[]) {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  }

  const ttRes = NextResponse.json({ types, grouped })
  ttRes.headers.set('Cache-Control', CACHE_STATIC)
  return ttRes
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { name, category, description, duration, price, sessions_in_package, color } = body
  if (!name || !category) return NextResponse.json({ error: 'Name and category required' }, { status: 400 })

  const existing = await prisma.treatment_types.findUnique({ where: { name } })
  if (existing) return NextResponse.json({ error: 'Treatment type already exists' }, { status: 409 })

  const maxSort = await prisma.treatment_types.aggregate({
    where: { category },
    _max: { sort_order: true },
  })
  const sort_order = (maxSort._max.sort_order ?? 0) + 1

  const type = await prisma.treatment_types.create({
    data: {
      name,
      category,
      description: description || null,
      duration: duration !== undefined ? parseInt(duration) : 60,
      price: price !== undefined && price !== '' ? parseFloat(price) : null,
      sessions_in_package: sessions_in_package ? parseInt(sessions_in_package) : null,
      color: color || 'bg-gray-400',
      sort_order,
    },
  })

  return NextResponse.json({ type }, { status: 201 })
}
