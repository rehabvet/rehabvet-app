import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const patientId = req.nextUrl.searchParams.get('patient_id')
  const planId = req.nextUrl.searchParams.get('plan_id')

  let query = `
    SELECT s.*, p.name as patient_name, p.species, u.name as therapist_name, c.name as client_name
    FROM sessions s
    JOIN patients p ON s.patient_id = p.id
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON s.therapist_id = u.id
    WHERE 1=1
  `
  const params: any[] = []
  if (patientId) { query += ' AND s.patient_id = ?'; params.push(patientId) }
  if (planId) { query += ' AND s.treatment_plan_id = ?'; params.push(planId) }
  if (user.role === 'therapist') { query += ' AND s.therapist_id = ?'; params.push(user.id) }
  query += ' ORDER BY s.date DESC, s.created_at DESC LIMIT 100'

  return NextResponse.json({ sessions: db.prepare(query).all(...params) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['vet', 'therapist'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { appointment_id, patient_id, treatment_plan_id, date, modality, duration_minutes,
    subjective, objective, assessment, plan, pain_score, mobility_score, progress_notes,
    measurements, exercises, home_exercises } = body

  if (!patient_id || !date || !modality) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const db = getDb()
  const id = uuidv4()
  db.prepare(`INSERT INTO sessions (id, appointment_id, patient_id, therapist_id, treatment_plan_id, date, modality, duration_minutes,
    subjective, objective, assessment, plan, pain_score, mobility_score, progress_notes, measurements, exercises, home_exercises)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, appointment_id||null, patient_id, user.id, treatment_plan_id||null, date, modality, duration_minutes||null,
    subjective||null, objective||null, assessment||null, plan||null,
    pain_score??null, mobility_score??null, progress_notes||null,
    measurements ? JSON.stringify(measurements) : null,
    exercises ? JSON.stringify(exercises) : null,
    home_exercises ? JSON.stringify(home_exercises) : null
  )

  // Update treatment plan completed sessions count
  if (treatment_plan_id) {
    db.prepare(`UPDATE treatment_plans SET completed_sessions = completed_sessions + 1, updated_at=datetime('now') WHERE id=?`).run(treatment_plan_id)
  }

  // Mark appointment as completed
  if (appointment_id) {
    db.prepare(`UPDATE appointments SET status='completed', updated_at=datetime('now') WHERE id=?`).run(appointment_id)
  }

  return NextResponse.json({ session: db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) }, { status: 201 })
}
