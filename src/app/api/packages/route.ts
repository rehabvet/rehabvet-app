import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || ''
  const client_id = req.nextUrl.searchParams.get('client_id') || ''
  const search = req.nextUrl.searchParams.get('search') || ''

  const where: any = {}
  if (status) where.status = status
  if (client_id) where.client_id = client_id

  const packages = await prisma.client_packages.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, phone: true } },
      patient: { select: { id: true, name: true, species: true } },
      treatment_type: { select: { id: true, name: true, category: true, color: true, duration: true } },
      usage_logs: { orderBy: { created_at: 'desc' } },
    },
    orderBy: { created_at: 'desc' },
  })

  const filtered = search
    ? packages.filter(p =>
        p.client.name.toLowerCase().includes(search.toLowerCase()) ||
        p.patient?.name.toLowerCase().includes(search.toLowerCase()) ||
        p.treatment_type.name.toLowerCase().includes(search.toLowerCase())
      )
    : packages

  return NextResponse.json({ packages: filtered })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { client_id, patient_id, treatment_type_id, sessions_total, purchase_date, expiry_date, price_paid, notes } = body

  if (!client_id || !treatment_type_id || !sessions_total || !purchase_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const pkg = await prisma.client_packages.create({
    data: {
      client_id,
      patient_id: patient_id || null,
      treatment_type_id,
      sessions_total: parseInt(sessions_total),
      purchase_date,
      expiry_date: expiry_date || null,
      price_paid: price_paid ? parseFloat(price_paid) : null,
      notes: notes || null,
      status: 'active',
    },
    include: {
      client: { select: { id: true, name: true } },
      patient: { select: { id: true, name: true } },
      treatment_type: { select: { id: true, name: true, category: true, color: true } },
    },
  })

  return NextResponse.json({ package: pkg }, { status: 201 })
}
