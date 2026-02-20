import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')
  const patientId = req.nextUrl.searchParams.get('patient_id')

  const where: any = {}
  if (status) where.status = status
  if (patientId) where.patient_id = patientId

  const rows = await prisma.treatment_plans.findMany({
    where,
    include: {
      patient: { select: { name: true, species: true, breed: true, client: { select: { name: true } } } },
      created_by_user: { select: { name: true } },
      approved_by_user: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  const plans = (rows as any[]).map((tp) => {
    const { patient, created_by_user, approved_by_user, ...rest } = tp
    return {
      ...rest,
      patient_name: patient?.name,
      species: patient?.species,
      breed: patient?.breed,
      client_name: patient?.client?.name,
      created_by_name: created_by_user?.name ?? null,
      approved_by_name: approved_by_user?.name ?? null,
    }
  })

  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { patient_id, title, diagnosis, goals, modalities, frequency, total_sessions, start_date, notes } = body
  if (!patient_id || !title) return NextResponse.json({ error: 'Patient and title required' }, { status: 400 })

  // Vets can create as active (self-approve), others create as pending
  const status = user.role === 'vet' ? 'active' : 'pending_approval'
  const approvedBy = user.role === 'vet' ? user.id : null

  const plan = await prisma.treatment_plans.create({
    data: {
      patient_id,
      created_by: user.id,
      approved_by: approvedBy,
      title,
      diagnosis: diagnosis || null,
      goals: goals || null,
      modalities: JSON.stringify(modalities || []),
      frequency: frequency || null,
      total_sessions: total_sessions ?? null,
      status,
      start_date: start_date || null,
      notes: notes || null,
    },
  })

  return NextResponse.json({ plan }, { status: 201 })
}
