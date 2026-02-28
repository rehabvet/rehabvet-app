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

  // Fetch client_numbers + first/last name for this page (outside Prisma schema)
  const ids = clients.map(c => c.id)
  const cnRows = ids.length
    ? await prisma.$queryRawUnsafe(
        `SELECT id, client_number, first_name, last_name FROM clients WHERE id = ANY($1::uuid[])`,
        ids
      ) as any[]
    : []
  const cnMap = Object.fromEntries(cnRows.map((r: any) => [r.id, { client_number: r.client_number, first_name: r.first_name, last_name: r.last_name }]))

  const cliRes = NextResponse.json({
    clients: clients.map((c) => {
      const { _count, ...rest } = c as any
      const extra = cnMap[c.id] || {}
      return { ...rest, patient_count: _count?.patients ?? 0, client_number: extra.client_number ?? null, first_name: extra.first_name ?? null, last_name: extra.last_name ?? null }
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
  const { first_name, last_name, name: rawName, email, phone, address, notes, pet, pets } = body

  // Support both first_name+last_name and legacy name field
  const firstName = (first_name || '').trim()
  const lastName  = (last_name  || '').trim()
  const fullName  = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || (rawName || '').trim()

  if (!fullName || !phone) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 })

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
      name: fullName,
      email: email || null,
      phone,
      address: address || null,
      notes: notes || null,
      patients: patientCreates.length ? { create: patientCreates } : undefined,
    },
  })

  // Store first_name / last_name via raw SQL (outside Prisma schema)
  if (firstName || lastName) {
    await prisma.$queryRawUnsafe(
      `UPDATE clients SET first_name = $1, last_name = $2 WHERE id = $3`,
      firstName || null, lastName || null, client.id
    )
  }

  return NextResponse.json({ client }, { status: 201 })
}
