import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patientRow = await prisma.patients.findUnique({
    where: { id: params.id },
    include: { client: { select: { name: true, phone: true, email: true } } },
  })
  if (!patientRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const patient: any = {
    ...(() => {
      const { client, ...rest } = patientRow as any
      return rest
    })(),
    client_name: (patientRow as any).client?.name,
    client_phone: (patientRow as any).client?.phone,
    client_email: (patientRow as any).client?.email,
  }

  const [treatmentPlans, sessions, appointments, documents] = await Promise.all([
    prisma.treatment_plans.findMany({
      where: { patient_id: params.id },
      include: {
        created_by_user: { select: { name: true } },
        approved_by_user: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.sessions.findMany({
      where: { patient_id: params.id },
      include: { therapist: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      take: 20,
    }),
    prisma.appointments.findMany({
      where: { patient_id: params.id },
      include: { therapist: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { start_time: 'desc' }],
      take: 20,
    }),
    prisma.documents.findMany({
      where: { patient_id: params.id },
      orderBy: { created_at: 'desc' },
    }),
  ])

  const treatmentPlansWithNames = (treatmentPlans as any[]).map((tp) => {
    const { created_by_user, approved_by_user, ...rest } = tp
    return {
      ...rest,
      created_by_name: created_by_user?.name ?? null,
      approved_by_name: approved_by_user?.name ?? null,
    }
  })

  const sessionsWithNames = (sessions as any[]).map((s) => {
    const { therapist, ...rest } = s
    return { ...rest, therapist_name: therapist?.name ?? null }
  })

  const appointmentsWithNames = (appointments as any[]).map((a) => {
    const { therapist, ...rest } = a
    return { ...rest, therapist_name: therapist?.name ?? null }
  })

  return NextResponse.json({
    patient,
    treatmentPlans: treatmentPlansWithNames,
    sessions: sessionsWithNames,
    appointments: appointmentsWithNames,
    documents,
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.species !== undefined) data.species = body.species
  if (body.breed !== undefined) data.breed = body.breed ?? null
  if (body.date_of_birth !== undefined) data.date_of_birth = body.date_of_birth ?? null
  if (body.weight !== undefined) data.weight = body.weight ?? null
  if (body.sex !== undefined) data.sex = body.sex || null
  if (body.microchip !== undefined) data.microchip = body.microchip ?? null
  if (body.medical_history !== undefined) data.medical_history = body.medical_history ?? null
  if (body.allergies !== undefined) data.allergies = body.allergies ?? null
  if (body.notes !== undefined) data.notes = body.notes ?? null

  const patient = await prisma.patients.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json({ patient })
}
