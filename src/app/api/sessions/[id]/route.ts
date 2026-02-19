import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const session = db.prepare(`
    SELECT s.*, p.name as patient_name, p.species, p.breed, u.name as therapist_name, c.name as client_name
    FROM sessions s
    JOIN patients p ON s.patient_id = p.id
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON s.therapist_id = u.id
    WHERE s.id = ?
  `).get(params.id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ session })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()
  const fields = ['modality','duration_minutes','subjective','objective','assessment','plan',
    'pain_score','mobility_score','progress_notes']
  const sets = fields.map(f => `${f}=?`).join(', ')
  const values = fields.map(f => body[f] ?? null)

  db.prepare(`UPDATE sessions SET ${sets}, measurements=?, exercises=?, home_exercises=?, updated_at=datetime('now') WHERE id=?`)
    .run(...values, body.measurements ? JSON.stringify(body.measurements) : null,
      body.exercises ? JSON.stringify(body.exercises) : null,
      body.home_exercises ? JSON.stringify(body.home_exercises) : null,
      params.id)

  return NextResponse.json({ session: db.prepare('SELECT * FROM sessions WHERE id = ?').get(params.id) })
}
