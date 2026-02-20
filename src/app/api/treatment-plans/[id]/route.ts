import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await prisma.treatment_plans.findUnique({
    where: { id: params.id },
    include: {
      patient: { select: { name: true, species: true, client: { select: { name: true } } } },
      created_by_user: { select: { name: true } },
      approved_by_user: { select: { name: true } },
    },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sessions = await prisma.sessions.findMany({
    where: { treatment_plan_id: params.id },
    include: { therapist: { select: { name: true } } },
    orderBy: { date: 'desc' },
  })

  const { patient, created_by_user, approved_by_user, ...rest } = row as any
  const plan = {
    ...rest,
    patient_name: patient?.name,
    species: patient?.species,
    client_name: patient?.client?.name,
    created_by_name: created_by_user?.name ?? null,
    approved_by_name: approved_by_user?.name ?? null,
  }

  const sessionsWithNames = (sessions as any[]).map((s) => {
    const { therapist, ...restS } = s
    return { ...restS, therapist_name: therapist?.name ?? null }
  })

  return NextResponse.json({ plan, sessions: sessionsWithNames })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Approve action (vet only)
  if (body.action === 'approve') {
    if (user.role !== 'vet') return NextResponse.json({ error: 'Only vets can approve treatment plans' }, { status: 403 })

    const plan = await prisma.treatment_plans.update({
      where: { id: params.id },
      data: { status: 'active', approved_by: user.id },
    })

    return NextResponse.json({ plan })
  }

  const data: any = {}
  const fields = ['title', 'diagnosis', 'goals', 'frequency', 'total_sessions', 'start_date', 'end_date', 'notes', 'status']
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  if (body.modalities !== undefined) data.modalities = JSON.stringify(body.modalities || [])

  const plan = await prisma.treatment_plans.update({ where: { id: params.id }, data })
  return NextResponse.json({ plan })
}
