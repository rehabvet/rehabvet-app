import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { CACHE_MEDIUM } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = (req.nextUrl.searchParams.get('search') || '').trim()
  const clientId = (req.nextUrl.searchParams.get('client_id') || '').trim()

  const where: any = { active: true }
  if (clientId) where.client_id = clientId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { breed: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  || '1'))
  const limit = Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20'))
  const skip  = (page - 1) * limit

  const [basePatients, total] = await Promise.all([
    prisma.patients.findMany({
      where,
      include: { client: { select: { name: true, phone: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.patients.count({ where }),
  ])

  const ids = basePatients.map((p) => p.id)
  const activePlans = ids.length
    ? await prisma.treatment_plans.groupBy({
        by: ['patient_id'],
        where: { patient_id: { in: ids }, status: 'active' },
        _count: { _all: true },
      })
    : []

  const activePlansByPatient = new Map(activePlans.map((r) => [r.patient_id, r._count._all]))

  const patients = basePatients.map((p: any) => {
    const client_name = p.client?.name
    const client_phone = p.client?.phone
    const active_plans = activePlansByPatient.get(p.id) ?? 0
    const { client, ...rest } = p
    return { ...rest, client_name, client_phone, active_plans }
  })

  const pRes = NextResponse.json({ patients, total, page, limit })
  pRes.headers.set('Cache-Control', 'no-store')
  return pRes
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { client_id, name, species, breed, date_of_birth, weight, sex, microchip, medical_history, allergies, notes, is_reactive } = body
  if (!client_id || !name || !species) return NextResponse.json({ error: 'Client, name, and species required' }, { status: 400 })

  const { randomUUID } = await import('crypto')
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO patients (id, client_id, name, species, breed, date_of_birth, weight, sex, microchip, medical_history, allergies, notes, is_reactive, created_at, updated_at)
     VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
    randomUUID(), client_id, name, species,
    breed||null, date_of_birth||null, weight??null, sex||null, microchip||null,
    medical_history||null, allergies||null, notes||null, is_reactive||false
  )
  const patient = rows[0]

  return NextResponse.json({ patient }, { status: 201 })
}
