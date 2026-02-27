import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { CACHE_MEDIUM } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = (req.nextUrl.searchParams.get('search') || '').trim()

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }
    : {}

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  || '1'))
  const limit = Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20'))
  const skip  = (page - 1) * limit

  const [clients, total] = await Promise.all([
    prisma.clients.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { patients: true } } },
      skip,
      take: limit,
    }),
    prisma.clients.count({ where }),
  ])

  // Fetch client_numbers for this page (outside Prisma schema)
  const ids = clients.map(c => c.id)
  const cnRows = ids.length
    ? await prisma.$queryRawUnsafe(
        `SELECT id, client_number FROM clients WHERE id = ANY($1::uuid[])`,
        ids
      ) as any[]
    : []
  const cnMap = Object.fromEntries(cnRows.map((r: any) => [r.id, r.client_number]))

  const cliRes = NextResponse.json({
    clients: clients.map((c) => {
      const { _count, ...rest } = c as any
      return { ...rest, patient_count: _count?.patients ?? 0, client_number: cnMap[c.id] ?? null }
    }),
    total,
    page,
    limit,
  })
  cliRes.headers.set('Cache-Control', 'no-store')
  return cliRes
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, address, notes, pet, pets } = body
  if (!name || !phone) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 })

  // Create pet(s) if provided (backward compatible: accepts `pet` or `pets`)
  const petsArr = Array.isArray(pets) ? pets : pet ? [pet] : []
  const patientCreates = (petsArr || [])
    .filter((p: any) => p && p.name)
    .map((p: any) => ({
      name: p.name,
      species: p.species || 'Dog',
      breed: p.breed || null,
      medical_history: p.medical_history || null,
    }))

  const client = await prisma.clients.create({
    data: {
      name,
      email: email || null,
      phone,
      address: address || null,
      notes: notes || null,
      patients: patientCreates.length ? { create: patientCreates } : undefined,
    },
  })

  return NextResponse.json({ client }, { status: 201 })
}
