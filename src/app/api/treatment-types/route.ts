import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const types = db.prepare(`
    SELECT * FROM treatment_types WHERE active = 1 ORDER BY category, sort_order, name
  `).all()
  
  // Group by category
  const grouped: Record<string, any[]> = {}
  for (const t of types as any[]) {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  }
  
  return NextResponse.json({ types, grouped })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { name, category, duration, color } = body
  if (!name || !category) return NextResponse.json({ error: 'Name and category required' }, { status: 400 })

  const db = getDb()
  const existing = db.prepare('SELECT id FROM treatment_types WHERE name = ?').get(name)
  if (existing) return NextResponse.json({ error: 'Treatment type already exists' }, { status: 409 })

  const id = uuidv4()
  const maxSort = db.prepare('SELECT MAX(sort_order) as max FROM treatment_types WHERE category = ?').get(category) as any
  const sortOrder = (maxSort?.max || 0) + 1

  db.prepare('INSERT INTO treatment_types (id, name, category, duration, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, category, duration || 60, color || 'bg-gray-400', sortOrder)

  const type = db.prepare('SELECT * FROM treatment_types WHERE id = ?').get(id)
  return NextResponse.json({ type }, { status: 201 })
}
