import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const date = req.nextUrl.searchParams.get('date')
  const startDate = req.nextUrl.searchParams.get('start_date')
  const endDate = req.nextUrl.searchParams.get('end_date')
  const therapistId = req.nextUrl.searchParams.get('therapist_id')
  const status = req.nextUrl.searchParams.get('status')

  let query = `
    SELECT a.*, p.name as patient_name, p.species, p.breed,
    c.name as client_name, c.phone as client_phone,
    u.name as therapist_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN clients c ON a.client_id = c.id
    LEFT JOIN users u ON a.therapist_id = u.id
    WHERE 1=1
  `
  const params: any[] = []

  if (date) { query += ' AND a.date = ?'; params.push(date) }
  if (startDate && endDate) { query += ' AND a.date BETWEEN ? AND ?'; params.push(startDate, endDate) }
  if (therapistId) { query += ' AND a.therapist_id = ?'; params.push(therapistId) }
  if (status) { query += ' AND a.status = ?'; params.push(status) }

  // If therapist, only show their appointments
  if (user.role === 'therapist') {
    query += ' AND a.therapist_id = ?'; params.push(user.id)
  }

  query += ' ORDER BY a.date, a.start_time'
  const appointments = db.prepare(query).all(...params)
  return NextResponse.json({ appointments })
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
  const db = getDb()
  if (therapist_id) {
    const conflict = db.prepare(`
      SELECT id FROM appointments WHERE therapist_id = ? AND date = ? AND status NOT IN ('cancelled','no_show')
      AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
    `).get(therapist_id, date, end_time, start_time, end_time, start_time, start_time, end_time)
    if (conflict) return NextResponse.json({ error: 'Therapist has a scheduling conflict' }, { status: 409 })
  }

  const id = uuidv4()
  db.prepare(`INSERT INTO appointments (id, patient_id, client_id, therapist_id, treatment_plan_id, date, start_time, end_time, modality, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, patient_id, client_id, therapist_id||null, treatment_plan_id||null, date, start_time, end_time, modality, notes||null)

  return NextResponse.json({ appointment: db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) }, { status: 201 })
}
