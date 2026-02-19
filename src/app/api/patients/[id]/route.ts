import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const patient = db.prepare(`
    SELECT p.*, c.name as client_name, c.phone as client_phone, c.email as client_email
    FROM patients p JOIN clients c ON p.client_id = c.id WHERE p.id = ?
  `).get(params.id) as any
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const treatmentPlans = db.prepare(`
    SELECT tp.*, u.name as created_by_name, a.name as approved_by_name
    FROM treatment_plans tp
    LEFT JOIN users u ON tp.created_by = u.id
    LEFT JOIN users a ON tp.approved_by = a.id
    WHERE tp.patient_id = ? ORDER BY tp.created_at DESC
  `).all(params.id)

  const sessions = db.prepare(`
    SELECT s.*, u.name as therapist_name
    FROM sessions s LEFT JOIN users u ON s.therapist_id = u.id
    WHERE s.patient_id = ? ORDER BY s.date DESC LIMIT 20
  `).all(params.id)

  const appointments = db.prepare(`
    SELECT a.*, u.name as therapist_name
    FROM appointments a LEFT JOIN users u ON a.therapist_id = u.id
    WHERE a.patient_id = ? ORDER BY a.date DESC, a.start_time DESC LIMIT 20
  `).all(params.id)

  const documents = db.prepare('SELECT * FROM documents WHERE patient_id = ? ORDER BY created_at DESC').all(params.id)

  return NextResponse.json({ patient, treatmentPlans, sessions, appointments, documents })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()
  const fields = ['name','species','breed','date_of_birth','weight','sex','microchip','medical_history','allergies','notes']
  const sets = fields.map(f => `${f}=?`).join(', ')
  const values = fields.map(f => body[f] ?? null)

  db.prepare(`UPDATE patients SET ${sets}, updated_at=datetime('now') WHERE id=?`).run(...values, params.id)
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(params.id)
  return NextResponse.json({ patient })
}
