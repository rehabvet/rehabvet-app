import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await prisma.clients.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [patients, invoices, appointments] = await Promise.all([
    prisma.patients.findMany({ where: { client_id: params.id }, orderBy: { name: 'asc' } }),
    prisma.invoices.findMany({ where: { client_id: params.id }, orderBy: { date: 'desc' } }),
    prisma.appointments.findMany({
      where: { client_id: params.id },
      include: {
        patient: { select: { name: true } },
        therapist: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { start_time: 'desc' }],
    }),
  ])

  return NextResponse.json({ client, patients, invoices, appointments })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, address, notes } = body

  const client = await prisma.clients.update({
    where: { id: params.id },
    data: {
      name,
      email,
      phone,
      address,
      notes,
    },
  })

  return NextResponse.json({ client })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.clients.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
