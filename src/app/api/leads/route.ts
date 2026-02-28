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

  // Enrich each lead with matched client from DB (by phone)
  const enriched = await Promise.all(leads.map(async (lead) => {
    if (!lead.owner_phone) return { ...lead, matched_client: null }

    const digits = lead.owner_phone.replace(/\D/g, '')
    const last8 = digits.slice(-8)
    if (last8.length < 8) return { ...lead, matched_client: null }

    const matches = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.name, c.phone, c.email,
             (SELECT COUNT(*) FROM appointments a WHERE a.client_id = c.id) as appt_count,
             (SELECT COUNT(*) FROM patients p WHERE p.client_id = c.id) as pet_count,
             (SELECT string_agg(p.name, ', ') FROM patients p WHERE p.client_id = c.id) as pet_names
      FROM clients c
      WHERE regexp_replace(c.phone, '[^0-9]', '', 'g') LIKE $1
      LIMIT 1
    `, `%${last8}`)

    return { ...lead, matched_client: matches[0] || null }
  }))

  return NextResponse.json({ leads: enriched, total, page, limit, statusCounts })
}
