import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { CACHE_SHORT } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date')
  const startDate = req.nextUrl.searchParams.get('start_date')
  const endDate = req.nextUrl.searchParams.get('end_date')
  const therapistId = req.nextUrl.searchParams.get('therapist_id')
  const status = req.nextUrl.searchParams.get('status')

  const where: any = {}

  if (date) where.date = date
  if (startDate && endDate) where.date = { gte: startDate, lte: endDate }
  if (therapistId) where.therapist_id = therapistId
  if (status) where.status = status

  // If therapist, only show their appointments
  if (user.role === 'therapist') where.therapist_id = user.id

  const rows = await prisma.appointments.findMany({
    where,
    include: {
      patient: { select: { name: true, species: true, breed: true } },
      client: { select: { name: true, phone: true } },
      therapist: { select: { name: true, role: true, photo_url: true } },
    },
    orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
  })

  const appointments = (rows as any[]).map((a) => {
    const { patient, client, therapist, ...rest } = a
    return {
      ...rest,
      patient_name: patient?.name,
      species: patient?.species,
      breed: patient?.breed,
      client_name: client?.name,
      client_phone: client?.phone,
      therapist_name: therapist?.name ?? null,
      therapist_role: therapist?.role ?? null,
      therapist_photo: therapist?.photo_url ?? null,
    }
  })

  const apptRes = NextResponse.json({ appointments })
  apptRes.headers.set('Cache-Control', CACHE_SHORT)
  return apptRes
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { patient_id, client_id, therapist_id, treatment_plan_id, date, start_time, end_time, modality, notes } = body
  if (!patient_id || !client_id || !date || !start_time || !end_time || !modality) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check for conflicts
  if (therapist_id) {
    const conflict = await prisma.appointments.findFirst({
      where: {
        therapist_id,
        date,
        status: { notIn: ['cancelled', 'no_show'] },
        AND: [{ start_time: { lt: end_time } }, { end_time: { gt: start_time } }],
      },
      select: { id: true },
    })
    if (conflict) return NextResponse.json({ error: 'Therapist has a scheduling conflict' }, { status: 409 })
  }

  const appointment = await prisma.appointments.create({
    data: {
      patient_id,
      client_id,
      therapist_id: therapist_id || null,
      treatment_plan_id: treatment_plan_id || null,
      date,
      start_time,
      end_time,
      modality,
      notes: notes || null,
    },
  })

  return NextResponse.json({ appointment }, { status: 201 })
}
