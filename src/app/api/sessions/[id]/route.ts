import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await prisma.sessions.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { name: true, species: true, breed: true, client: { select: { name: true } } } },
      therapist: { select: { name: true } },
    },
  })

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { patient, therapist, ...rest } = row as any
  const session = {
    ...rest,
    patient_name: patient?.name,
    species: patient?.species,
    breed: patient?.breed,
    therapist_name: therapist?.name ?? null,
    client_name: patient?.client?.name,
  }

  return NextResponse.json({ session })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const data: any = {}
  const fields = [
    'modality',
    'duration_minutes',
    'subjective',
    'objective',
    'assessment',
    'plan',
    'pain_score',
    'mobility_score',
    'progress_notes',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]
  }

  if (body.measurements !== undefined) data.measurements = body.measurements ? JSON.stringify(body.measurements) : null
  if (body.exercises !== undefined) data.exercises = body.exercises ? JSON.stringify(body.exercises) : null
  if (body.home_exercises !== undefined) data.home_exercises = body.home_exercises ? JSON.stringify(body.home_exercises) : null

  const session = await prisma.sessions.update({ where: { id: params.id }, data })
  return NextResponse.json({ session })
}
