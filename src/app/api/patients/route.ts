import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const search = req.nextUrl.searchParams.get('search') || ''
  const clientId = req.nextUrl.searchParams.get('client_id') || ''

  let query = `
    SELECT p.*, c.name as client_name, c.phone as client_phone,
    (SELECT COUNT(*) FROM treatment_plans tp WHERE tp.patient_id = p.id AND tp.status = 'active') as active_plans
    FROM patients p JOIN clients c ON p.client_id = c.id
    WHERE p.active = 1
  `
  const params: any[] = []

  if (search) {
    query += ' AND (p.name LIKE ? OR c.name LIKE ? OR p.breed LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (clientId) {
    query += ' AND p.client_id = ?'
    params.push(clientId)
  }
  query += ' ORDER BY p.name'

  const patients = db.prepare(query).all(...params)
  return NextResponse.json({ patients })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { client_id, name, species, breed, date_of_birth, weight, sex, microchip, medical_history, allergies, notes } = body
  if (!client_id || !name || !species) return NextResponse.json({ error: 'Client, name, and species required' }, { status: 400 })

  const db = getDb()
  const id = uuidv4()
  db.prepare(`INSERT INTO patients (id, client_id, name, species, breed, date_of_birth, weight, sex, microchip, medical_history, allergies, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, client_id, name, species, breed||null, date_of_birth||null, weight||null, sex||null, microchip||null, medical_history||null, allergies||null, notes||null)

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id)
  return NextResponse.json({ patient }, { status: 201 })
}
