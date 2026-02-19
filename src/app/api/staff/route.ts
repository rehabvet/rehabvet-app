import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const staff = db.prepare(`
    SELECT id, email, name, role, phone, specializations, active, created_at
    FROM users ORDER BY
      CASE role WHEN 'admin' THEN 1 WHEN 'vet' THEN 2 WHEN 'therapist' THEN 3 WHEN 'receptionist' THEN 4 END,
      name
  `).all()
  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { name, email, phone, role, specializations, password } = body
  if (!name || !email || !role) return NextResponse.json({ error: 'Name, email, and role required' }, { status: 400 })

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const id = uuidv4()
  const hash = bcrypt.hashSync(password || 'password123', 10)
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, phone, specializations) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, email, hash, name, role, phone || null, specializations ? JSON.stringify(specializations) : '[]'
  )

  const staff = db.prepare('SELECT id, email, name, role, phone, specializations, active, created_at FROM users WHERE id = ?').get(id)
  return NextResponse.json({ staff }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  const db = getDb()
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
