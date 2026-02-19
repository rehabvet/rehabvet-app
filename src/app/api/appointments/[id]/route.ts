import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const appointment = db.prepare(`
    SELECT a.*, p.name as patient_name, p.species, p.breed,
    c.name as client_name, c.phone as client_phone, c.email as client_email,
    u.name as therapist_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN clients c ON a.client_id = c.id
    LEFT JOIN users u ON a.therapist_id = u.id
    WHERE a.id = ?
  `).get(params.id)
  if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ appointment })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()

  // If just updating status
  if (body.status && Object.keys(body).length === 1) {
    db.prepare(`UPDATE appointments SET status=?, updated_at=datetime('now') WHERE id=?`).run(body.status, params.id)
  } else {
    const { therapist_id, date, start_time, end_time, modality, notes, status } = body
    db.prepare(`UPDATE appointments SET therapist_id=?, date=?, start_time=?, end_time=?, modality=?, notes=?, status=?, updated_at=datetime('now') WHERE id=?`)
      .run(therapist_id, date, start_time, end_time, modality, notes, status, params.id)
  }

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(params.id)
  return NextResponse.json({ appointment })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  db.prepare("UPDATE appointments SET status='cancelled', updated_at=datetime('now') WHERE id=?").run(params.id)
  return NextResponse.json({ ok: true })
}
