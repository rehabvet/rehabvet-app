import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient_id = req.nextUrl.searchParams.get('patient_id')
  const client_id  = req.nextUrl.searchParams.get('client_id')
  const page       = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
  const limit      = Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20'))
  const offset     = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params: any[] = []
  let idx = 1

  if (patient_id) { where += ` AND v.patient_id = $${idx++}::uuid`; params.push(patient_id) }
  if (client_id)  { where += ` AND v.client_id = $${idx++}::uuid`;  params.push(client_id) }

  params.push(limit, offset)

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      v.*,
      u.name AS staff_name,
      p.name AS patient_name,
      c.name AS client_name
    FROM visit_records v
    LEFT JOIN users    u ON u.id = v.staff_id
    LEFT JOIN patients p ON p.id = v.patient_id
    LEFT JOIN clients  c ON c.id = v.client_id
    ${where}
    ORDER BY v.visit_date DESC, v.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `, ...params) as any[]

  const countRows = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS total
    FROM visit_records v ${where}
  `, ...params.slice(0, -2)) as any[]

  return NextResponse.json({ visits: rows, total: countRows[0]?.total ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    appointment_id, client_id, patient_id, staff_id,
    visit_date, weight_kg, temperature_c, heart_rate_bpm, body_condition_score,
    history, clinical_examination, diagnosis,
    treatment, hep, internal_notes, client_notes, plan,
  } = body

  if (!client_id || !patient_id || !visit_date) {
    return NextResponse.json({ error: 'client_id, patient_id and visit_date required' }, { status: 400 })
  }

  // Generate visit number
  const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM visit_records`) as any[]
  const n = (countRows[0]?.n ?? 0) + 1
  const visitNumber = `VR-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`

  const rows = await prisma.$queryRawUnsafe(`
    INSERT INTO visit_records (
      visit_number,
      appointment_id, client_id, patient_id, staff_id,
      visit_date, weight_kg, temperature_c, heart_rate_bpm, body_condition_score,
      history, clinical_examination, diagnosis,
      treatment, hep, internal_notes, client_notes, plan
    ) VALUES (
      $1,
      $2, $3::uuid, $4::uuid, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16, $17, $18
    ) RETURNING *
  `,
    visitNumber,
    appointment_id || null,
    client_id,
    patient_id,
    staff_id || user.id,
    visit_date,
    weight_kg || null,
    temperature_c || null,
    heart_rate_bpm || null,
    body_condition_score || null,
    history || null,
    clinical_examination || null,
    diagnosis || null,
    JSON.stringify(treatment || []),
    JSON.stringify(hep || []),
    internal_notes || null,
    client_notes || null,
    plan || null,
  ) as any[]

  return NextResponse.json({ visit: rows[0] }, { status: 201 })
}
