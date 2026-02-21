import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patientId = req.nextUrl.searchParams.get('patient_id')
  const planId = req.nextUrl.searchParams.get('plan_id')

  const where: any = {}
  if (patientId) where.patient_id = patientId
  if (planId) where.treatment_plan_id = planId
  if (user.role === 'therapist') where.therapist_id = user.id

  const rows = await prisma.sessions.findMany({
    where,
    include: {
      patient: { select: { name: true, species: true, client: { select: { name: true } } } },
      therapist: { select: { name: true } },
    },
    orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    take: 100,
  })

  const sessions = (rows as any[]).map((s) => {
    const { patient, therapist, ...rest } = s
    return {
      ...rest,
      patient_name: patient?.name,
      species: patient?.species,
      therapist_name: therapist?.name ?? null,
      client_name: patient?.client?.name,
    }
  })

  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['vet', 'therapist', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    appointment_id,
    patient_id,
    treatment_plan_id,
    date,
    modality,
    duration_minutes,
    subjective,
    objective,
    assessment,
    plan,
    pain_score,
    mobility_score,
    progress_notes,
    measurements,
    exercises,
    home_exercises,
    // clinical consultation fields
    heart_rate,
    resp_rate,
    temperature,
    weight_session,
    dental_score,
    body_score,
    flea_treatment,
    wormed,
    bloods,
    history,
    clinical_examination,
    diagnosis,
    treatment_notes,
    comments,
  } = body

  if (!patient_id || !date || !modality) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.sessions.create({
      data: {
        appointment_id: appointment_id || null,
        patient_id,
        therapist_id: user.id,
        treatment_plan_id: treatment_plan_id || null,
        date,
        modality,
        duration_minutes: duration_minutes ?? null,
        subjective: subjective || null,
        objective: objective || null,
        assessment: assessment || null,
        plan: plan || null,
        pain_score: pain_score ?? null,
        mobility_score: mobility_score ?? null,
        progress_notes: progress_notes || null,
        measurements: measurements ? JSON.stringify(measurements) : null,
        exercises: exercises ? JSON.stringify(exercises) : null,
        home_exercises: home_exercises ? JSON.stringify(home_exercises) : null,
        heart_rate: heart_rate ?? null,
        resp_rate: resp_rate ?? null,
        temperature: temperature ?? null,
        weight_session: weight_session ?? null,
        dental_score: dental_score ?? null,
        body_score: body_score ?? null,
        flea_treatment: flea_treatment ?? null,
        wormed: wormed ?? null,
        bloods: bloods ?? null,
        history: history || null,
        clinical_examination: clinical_examination || null,
        diagnosis: diagnosis || null,
        treatment_notes: treatment_notes || null,
        comments: comments || null,
      },
    })

    // Update treatment plan completed sessions count
    if (treatment_plan_id) {
      await tx.treatment_plans.update({
        where: { id: treatment_plan_id },
        data: { completed_sessions: { increment: 1 } },
      })
    }

    // Mark appointment as completed
    if (appointment_id) {
      await tx.appointments.update({
        where: { id: appointment_id },
        data: { status: 'completed' },
      })
    }

    return s
  })

  return NextResponse.json({ session }, { status: 201 })
}
