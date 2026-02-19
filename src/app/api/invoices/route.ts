import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const status = req.nextUrl.searchParams.get('status')
  const clientId = req.nextUrl.searchParams.get('client_id')

  let query = `
    SELECT i.*, c.name as client_name, c.phone as client_phone, p.name as patient_name
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN patients p ON i.patient_id = p.id
    WHERE 1=1
  `
  const params: any[] = []
  if (status) { query += ' AND i.status = ?'; params.push(status) }
  if (clientId) { query += ' AND i.client_id = ?'; params.push(clientId) }
  query += ' ORDER BY i.date DESC'

  return NextResponse.json({ invoices: db.prepare(query).all(...params) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'receptionist'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { client_id, patient_id, date, due_date, items, notes } = body
  if (!client_id || !date || !due_date || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getDb()
  const id = uuidv4()

  // Generate invoice number
  const count = (db.prepare("SELECT COUNT(*) as c FROM invoices").get() as any).c
  const invoiceNumber = `RV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

  let subtotal = 0
  for (const item of items) {
    subtotal += item.quantity * item.unit_price
  }
  const tax = Math.round(subtotal * 0.09 * 100) / 100 // 9% GST
  const total = Math.round((subtotal + tax) * 100) / 100

  db.prepare(`INSERT INTO invoices (id, invoice_number, client_id, patient_id, date, due_date, subtotal, tax, total, status, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, invoiceNumber, client_id, patient_id||null, date, due_date, subtotal, tax, total, 'draft', notes||null)

  const insertItem = db.prepare(`INSERT INTO invoice_items (id, invoice_id, description, modality, quantity, unit_price, total) VALUES (?,?,?,?,?,?,?)`)
  for (const item of items) {
    insertItem.run(uuidv4(), id, item.description, item.modality||null, item.quantity, item.unit_price, item.quantity * item.unit_price)
  }

  return NextResponse.json({ invoice: db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) }, { status: 201 })
}
