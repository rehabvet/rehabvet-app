import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

  const clients = await prisma.clients.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { patients: true } } },
  })

  return NextResponse.json({
    clients: clients.map((c) => {
      // Keep existing API shape used by the UI
      const { _count, ...rest } = c as any
      return { ...rest, patient_count: _count?.patients ?? 0 }
    }),
  })
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
