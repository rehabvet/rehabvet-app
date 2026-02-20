import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await prisma.appointments.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { name: true, species: true, breed: true } },
      client: { select: { name: true, phone: true, email: true } },
      therapist: { select: { name: true } },
    },
  })

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { patient, client, therapist, ...rest } = row as any
  const appointment = {
    ...rest,
    patient_name: patient?.name,
    species: patient?.species,
    breed: patient?.breed,
    client_name: client?.name,
    client_phone: client?.phone,
    client_email: client?.email,
    therapist_name: therapist?.name ?? null,
  }

  return NextResponse.json({ appointment })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // If just updating status
  if (body.status && Object.keys(body).length === 1) {
    const appointment = await prisma.appointments.update({
      where: { id: params.id },
      data: { status: body.status },
    })
    return NextResponse.json({ appointment })
  }

  const { therapist_id, date, start_time, end_time, modality, notes, status } = body
  const appointment = await prisma.appointments.update({
    where: { id: params.id },
    data: {
      therapist_id: therapist_id || null,
      date,
      start_time,
      end_time,
      modality,
      notes,
      status,
    },
  })

  return NextResponse.json({ appointment })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return PUT(req, { params })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.appointments.update({
    where: { id: params.id },
    data: { status: 'cancelled' },
  })
  return NextResponse.json({ ok: true })
}
