import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const patients = db.prepare('SELECT * FROM patients WHERE client_id = ? ORDER BY name').all(params.id)
  const invoices = db.prepare(`SELECT * FROM invoices WHERE client_id = ? ORDER BY date DESC`).all(params.id)

  return NextResponse.json({ client, patients, invoices })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, address, notes } = body
  const db = getDb()
  db.prepare(`UPDATE clients SET name=?, email=?, phone=?, address=?, notes=?, updated_at=datetime('now') WHERE id=?`).run(name, email, phone, address, notes, params.id)
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)
  return NextResponse.json({ client })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getDb()
  db.prepare('DELETE FROM clients WHERE id = ?').run(params.id)
  return NextResponse.json({ ok: true })
}
