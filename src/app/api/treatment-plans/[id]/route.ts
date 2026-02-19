import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const plan = db.prepare(`
    SELECT tp.*, p.name as patient_name, p.species, c.name as client_name,
    u.name as created_by_name, a.name as approved_by_name
    FROM treatment_plans tp
    JOIN patients p ON tp.patient_id = p.id
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON tp.created_by = u.id
    LEFT JOIN users a ON tp.approved_by = a.id
    WHERE tp.id = ?
  `).get(params.id)
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sessions = db.prepare(`
    SELECT s.*, u.name as therapist_name FROM sessions s
    LEFT JOIN users u ON s.therapist_id = u.id
    WHERE s.treatment_plan_id = ? ORDER BY s.date DESC
  `).all(params.id)

  return NextResponse.json({ plan, sessions })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()

  // Approve action (vet only)
  if (body.action === 'approve') {
    if (user.role !== 'vet') return NextResponse.json({ error: 'Only vets can approve treatment plans' }, { status: 403 })
    db.prepare(`UPDATE treatment_plans SET status='active', approved_by=?, updated_at=datetime('now') WHERE id=?`).run(user.id, params.id)
    return NextResponse.json({ plan: db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(params.id) })
  }

  const { title, diagnosis, goals, modalities, frequency, total_sessions, start_date, end_date, notes, status } = body
  db.prepare(`UPDATE treatment_plans SET title=?, diagnosis=?, goals=?, modalities=?, frequency=?, total_sessions=?, start_date=?, end_date=?, notes=?, status=?, updated_at=datetime('now') WHERE id=?`)
    .run(title, diagnosis, goals, JSON.stringify(modalities || []), frequency, total_sessions, start_date, end_date, notes, status, params.id)

  return NextResponse.json({ plan: db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(params.id) })
}
