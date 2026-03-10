import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { randomUUID } from 'crypto'

type Ctx = { params: { id: string } }

// GET /api/patients/[id]/diagnoses
export async function GET(_req: NextRequest, { params }: Ctx) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT pd.id, pd.text, pd.date, pd.created_at, pd.updated_at,
           u.name AS diagnosed_by_name, pd.diagnosed_by
    FROM patient_diagnoses pd
    LEFT JOIN users u ON u.id = pd.diagnosed_by
    WHERE pd.patient_id = $1::uuid
    ORDER BY pd.date DESC, pd.created_at DESC
  `, params.id)
  return NextResponse.json({ diagnoses: rows })
}

// POST /api/patients/[id]/diagnoses
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, date } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Text required' }, { status: 400 })

  const id = randomUUID()
  await prisma.$queryRawUnsafe(`
    INSERT INTO patient_diagnoses (id, patient_id, text, diagnosed_by, date)
    VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5::date)
  `, id, params.id, text.trim(), user.id, date || new Date().toISOString().split('T')[0])

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT pd.id, pd.text, pd.date, pd.created_at, pd.updated_at,
           u.name AS diagnosed_by_name, pd.diagnosed_by
    FROM patient_diagnoses pd
    LEFT JOIN users u ON u.id = pd.diagnosed_by
    WHERE pd.id = $1::uuid
  `, id)
  return NextResponse.json({ diagnosis: rows[0] })
}

// PATCH /api/patients/[id]/diagnoses  — body: { diagnosis_id, text, date }
export async function PATCH(req: NextRequest, { params: _ }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { diagnosis_id, text, date } = await req.json()
  if (!diagnosis_id || !text?.trim()) return NextResponse.json({ error: 'diagnosis_id and text required' }, { status: 400 })

  await prisma.$queryRawUnsafe(`
    UPDATE patient_diagnoses
    SET text = $1, date = $2::date, updated_at = NOW()
    WHERE id = $3::uuid
  `, text.trim(), date, diagnosis_id)

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT pd.id, pd.text, pd.date, pd.created_at, pd.updated_at,
           u.name AS diagnosed_by_name, pd.diagnosed_by
    FROM patient_diagnoses pd
    LEFT JOIN users u ON u.id = pd.diagnosed_by
    WHERE pd.id = $1::uuid
  `, diagnosis_id)
  return NextResponse.json({ diagnosis: rows[0] })
}

// DELETE /api/patients/[id]/diagnoses?diagnosis_id=xxx
export async function DELETE(req: NextRequest, { params: _ }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const diagnosis_id = req.nextUrl.searchParams.get('diagnosis_id')
  if (!diagnosis_id) return NextResponse.json({ error: 'diagnosis_id required' }, { status: 400 })

  await prisma.$queryRawUnsafe(`DELETE FROM patient_diagnoses WHERE id = $1::uuid`, diagnosis_id)
  return NextResponse.json({ ok: true })
}
