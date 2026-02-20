import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const { name, category, duration, color } = body
  
  const db = getDb()
  db.prepare('UPDATE treatment_types SET name=?, category=?, duration=?, color=? WHERE id=?')
    .run(name, category, duration, color, params.id)

  const type = db.prepare('SELECT * FROM treatment_types WHERE id = ?').get(params.id)
  return NextResponse.json({ type })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return PUT(req, { params })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const db = getDb()
  // Soft delete
  db.prepare('UPDATE treatment_types SET active = 0 WHERE id = ?').run(params.id)
  return NextResponse.json({ ok: true })
}
