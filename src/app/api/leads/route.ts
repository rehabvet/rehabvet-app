import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || ''
  const search = req.nextUrl.searchParams.get('search') || ''

  const where: any = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { owner_name: { contains: search, mode: 'insensitive' } },
      { owner_email: { contains: search, mode: 'insensitive' } },
      { pet_name: { contains: search, mode: 'insensitive' } },
    ]
  }

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  || '1'))
  const limit = Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20'))
  const skip  = (page - 1) * limit

  const [leads, total, counts] = await Promise.all([
    prisma.leads.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: limit }),
    prisma.leads.count({ where }),
    prisma.leads.groupBy({ by: ['status'], _count: { id: true } }),
  ])

  const statusCounts = counts.reduce((acc: any, c) => {
    acc[c.status] = c._count.id
    return acc
  }, {})

  return NextResponse.json({ leads, total, page, limit, statusCounts })
}
