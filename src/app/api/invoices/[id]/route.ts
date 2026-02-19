import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const invoice = db.prepare(`
    SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_address,
    p.name as patient_name
    FROM invoices i JOIN clients c ON i.client_id = c.id LEFT JOIN patients p ON i.patient_id = p.id WHERE i.id = ?
  `).get(params.id)
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(params.id)
  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY date DESC').all(params.id)

  return NextResponse.json({ invoice, items, payments })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()

  // Record payment
  if (body.action === 'record_payment') {
    const { amount, method, reference, date, notes } = body
    if (!amount || !method || !date) return NextResponse.json({ error: 'Amount, method, and date required' }, { status: 400 })

    db.prepare('INSERT INTO payments (id, invoice_id, amount, method, reference, date, notes) VALUES (?,?,?,?,?,?,?)')
      .run(uuidv4(), params.id, amount, method, reference||null, date, notes||null)

    // Update invoice
    const totalPaid = (db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE invoice_id = ?').get(params.id) as any).total
    const invoice = db.prepare('SELECT total FROM invoices WHERE id = ?').get(params.id) as any
    const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial'
    db.prepare(`UPDATE invoices SET amount_paid=?, status=?, updated_at=datetime('now') WHERE id=?`).run(totalPaid, newStatus, params.id)

    return NextResponse.json({ ok: true })
  }

  // Update status
  if (body.status) {
    db.prepare(`UPDATE invoices SET status=?, updated_at=datetime('now') WHERE id=?`).run(body.status, params.id)
  }

  return NextResponse.json({ invoice: db.prepare('SELECT * FROM invoices WHERE id = ?').get(params.id) })
}
