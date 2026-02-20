import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const search = req.nextUrl.searchParams.get('search') || ''
  
  let clients
  if (search) {
    clients = db.prepare(`
      SELECT c.*, COUNT(p.id) as patient_count
      FROM clients c LEFT JOIN patients p ON c.id = p.client_id
      WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?
      GROUP BY c.id ORDER BY c.name
    `).all(`%${search}%`, `%${search}%`, `%${search}%`)
  } else {
    clients = db.prepare(`
      SELECT c.*, COUNT(p.id) as patient_count
      FROM clients c LEFT JOIN patients p ON c.id = p.client_id
      GROUP BY c.id ORDER BY c.name
    `).all()
  }
  return NextResponse.json({ clients })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, address, notes, pet, pets } = body
  if (!name || !phone) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 })

  const db = getDb()
  const id = uuidv4()
  db.prepare('INSERT INTO clients (id, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, email || null, phone, address || null, notes || null)

  // Create pet(s) if provided (backward compatible: accepts `pet` or `pets`)
  const petsArr = Array.isArray(pets) ? pets : (pet ? [pet] : [])
  for (const p of petsArr) {
    if (!p || !p.name) continue
    const petId = uuidv4()
    db.prepare('INSERT INTO patients (id, client_id, name, species, breed, medical_history) VALUES (?, ?, ?, ?, ?, ?)').run(
      petId,
      id,
      p.name,
      p.species || 'Dog',
      p.breed || null,
      p.medical_history || null
    )
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
  return NextResponse.json({ client }, { status: 201 })
}
