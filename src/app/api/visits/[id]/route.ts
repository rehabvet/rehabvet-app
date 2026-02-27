import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      v.*,
      u.name  AS staff_name,
      p.name  AS patient_name,
      p.species AS patient_species,
      c.name  AS client_name,
      c.phone AS client_phone
    FROM visit_records v
    LEFT JOIN users    u ON u.id = v.staff_id
    LEFT JOIN patients p ON p.id = v.patient_id
    LEFT JOIN clients  c ON c.id = v.client_id
    WHERE v.id = $1::uuid
  `, params.id) as any[]

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const measurements = await prisma.$queryRawUnsafe(`
    SELECT * FROM visit_measurements WHERE visit_id = $1::uuid ORDER BY recorded_at ASC
  `, params.id) as any[]

  return NextResponse.json({ visit: rows[0], measurements })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    staff_id, visit_date, weight_kg, temperature_c, heart_rate_bpm, body_condition_score,
    history, clinical_examination, diagnosis,
    treatment, hep, internal_notes, client_notes, plan,
  } = body

  const rows = await prisma.$queryRawUnsafe(`
    UPDATE visit_records SET
      staff_id              = COALESCE($1, staff_id),
      visit_date            = COALESCE($2, visit_date),
      weight_kg             = $3,
      temperature_c         = $4,
      heart_rate_bpm        = $5,
      body_condition_score  = $6,
      history               = $7,
      clinical_examination  = $8,
      diagnosis             = $9,
      treatment             = $10,
      hep                   = $11,
      internal_notes        = $12,
      client_notes          = $13,
      plan                  = $14,
      updated_at            = NOW()
    WHERE id = $15::uuid
    RETURNING *
  `,
    staff_id || null,
    visit_date || null,
    weight_kg ?? null,
    temperature_c ?? null,
    heart_rate_bpm ?? null,
    body_condition_score ?? null,
    history ?? null,
    clinical_examination ?? null,
    diagnosis ?? null,
    JSON.stringify(treatment ?? []),
    JSON.stringify(hep ?? []),
    internal_notes ?? null,
    client_notes ?? null,
    plan ?? null,
    params.id,
  ) as any[]

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ visit: rows[0] })
}
