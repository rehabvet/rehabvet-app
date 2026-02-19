import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const status = req.nextUrl.searchParams.get('status')
  const patientId = req.nextUrl.searchParams.get('patient_id')

  let query = `
    SELECT tp.*, p.name as patient_name, p.species, p.breed,
    c.name as client_name, u.name as created_by_name, a.name as approved_by_name
    FROM treatment_plans tp
    JOIN patients p ON tp.patient_id = p.id
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON tp.created_by = u.id
    LEFT JOIN users a ON tp.approved_by = a.id
    WHERE 1=1
  `
  const params: any[] = []
  if (status) { query += ' AND tp.status = ?'; params.push(status) }
  if (patientId) { query += ' AND tp.patient_id = ?'; params.push(patientId) }
  query += ' ORDER BY tp.created_at DESC'

  return NextResponse.json({ plans: db.prepare(query).all(...params) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { patient_id, title, diagnosis, goals, modalities, frequency, total_sessions, start_date, notes } = body
  if (!patient_id || !title) return NextResponse.json({ error: 'Patient and title required' }, { status: 400 })

  const db = getDb()
  const id = uuidv4()
  // Vets can create as active (self-approve), others create as pending
  const status = user.role === 'vet' ? 'active' : 'pending_approval'
  const approvedBy = user.role === 'vet' ? user.id : null

  db.prepare(`INSERT INTO treatment_plans (id, patient_id, created_by, approved_by, title, diagnosis, goals, modalities, frequency, total_sessions, status, start_date, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, patient_id, user.id, approvedBy, title, diagnosis||null, goals||null,
    JSON.stringify(modalities || []), frequency||null, total_sessions||null,
    status, start_date||null, notes||null
  )

  return NextResponse.json({ plan: db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(id) }, { status: 201 })
}
