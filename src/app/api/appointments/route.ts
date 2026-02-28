import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { CACHE_SHORT } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p = req.nextUrl.searchParams
  const date        = p.get('date')
  const startDate   = p.get('start_date')
  const endDate     = p.get('end_date')
  const therapistId = p.get('therapist_id')
  const status      = p.get('status')
  const q           = (p.get('q') || '').trim()
  const page        = Math.max(1, parseInt(p.get('page') || '1', 10))
  const perPage     = Math.min(5000, parseInt(p.get('per_page') || '20', 10))
  const offset      = (page - 1) * perPage

  // Build WHERE clauses
  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (date) {
    conditions.push(`a.date = $${idx++}`)
    params.push(date)
  } else if (startDate && endDate) {
    conditions.push(`a.date >= $${idx++} AND a.date <= $${idx++}`)
    params.push(startDate, endDate)
  }

  if (therapistId) {
    conditions.push(`a.therapist_id = $${idx++}::uuid`)
    params.push(therapistId)
  }


  if (status && status !== 'all') {
    conditions.push(`a.status::text = $${idx++}`)
    params.push(status)
  }

  if (q) {
    conditions.push(`(
      pat.name ILIKE $${idx} OR
      cl.name  ILIKE $${idx} OR
      u.name   ILIKE $${idx} OR
      a.modality ILIKE $${idx}
    )`)
    params.push(`%${q}%`)
    idx++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countParams = [...params]
  const countSql = `
    SELECT COUNT(*) AS total
    FROM appointments a
    LEFT JOIN patients pat ON pat.id = a.patient_id
    LEFT JOIN clients  cl  ON cl.id  = a.client_id
    LEFT JOIN users    u   ON u.id   = a.therapist_id
    ${where}
  `

  const dataSql = `
    SELECT
      a.id, a.patient_id, a.client_id, a.therapist_id, a.treatment_plan_id,
      a.date, a.start_time, a.end_time, a.modality, a.status::text AS status,
      a.notes, a.created_at, a.updated_at,
      pat.name        AS patient_name,
      pat.species     AS species,
      pat.breed       AS breed,
      cl.name         AS client_name,
      cl.phone        AS client_phone,
      u.name          AS therapist_name,
      u.role          AS therapist_role,
      u.photo_url     AS therapist_photo
    FROM appointments a
    LEFT JOIN patients pat ON pat.id = a.patient_id
    LEFT JOIN clients  cl  ON cl.id  = a.client_id
    LEFT JOIN users    u   ON u.id   = a.therapist_id
    ${where}
    ORDER BY a.date ASC, a.start_time ASC
    LIMIT $${idx++} OFFSET $${idx++}
  `
  params.push(perPage, offset)

  const [countRows, rows] = await Promise.all([
    prisma.$queryRawUnsafe<{ total: string }[]>(countSql, ...countParams),
    prisma.$queryRawUnsafe<any[]>(dataSql, ...params),
  ])

  const total = parseInt(countRows[0]?.total || '0', 10)

  const res = NextResponse.json({
    appointments: rows,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  })
  res.headers.set('Cache-Control', CACHE_SHORT)
  return res
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { patient_id, client_id, therapist_id, treatment_plan_id, date, start_time, end_time, modality, notes } = body
  if (!date || !start_time || !end_time || !modality) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check for conflicts
  if (therapist_id) {
    const conflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM appointments
       WHERE therapist_id = $1::uuid AND date = $2
         AND status::text NOT IN ('cancelled','no_show')
         AND start_time < $3 AND end_time > $4
       LIMIT 1`,
      therapist_id, date, end_time, start_time
    )
    if (conflict.length > 0) return NextResponse.json({ error: 'Therapist has a scheduling conflict' }, { status: 409 })
  }

  const { randomUUID } = await import('crypto')
  const id = randomUUID()

  await prisma.$queryRawUnsafe(
    `INSERT INTO appointments (id, patient_id, client_id, therapist_id, treatment_plan_id, date, start_time, end_time, modality, notes, status, created_at, updated_at)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'confirmed', NOW(), NOW())`,
    id,
    patient_id || null,
    client_id ? `${client_id}` : null,
    therapist_id || null,
    treatment_plan_id || null,
    date, start_time, end_time, modality,
    notes || null,
  )

  const appt = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM appointments WHERE id = $1::uuid LIMIT 1`, id
  )

  return NextResponse.json({ appointment: appt[0] }, { status: 201 })
}
