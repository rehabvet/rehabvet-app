import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET — fetch invoice for this visit (or null)
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      i.id, i.invoice_number, i.bill_number, i.client_id, i.patient_id, i.visit_id,
      i.date, i.due_date, i.status, i.subtotal, i.tax, i.total, i.amount_paid, i.notes,
      i.created_at, i.updated_at,
      c.name AS client_name,
      p.name AS patient_name
    FROM invoices i
    LEFT JOIN clients  c ON c.id = i.client_id
    LEFT JOIN patients p ON p.id = i.patient_id
    WHERE i.visit_id = $1::uuid
    LIMIT 1
  `, params.id) as any[]

  if (!rows.length) return NextResponse.json({ invoice: null })

  const inv = rows[0]
  const lineItems = await prisma.$queryRawUnsafe(`
    SELECT il.*, u.name AS staff_name
    FROM invoice_line_items il
    LEFT JOIN users u ON u.id = il.staff_id
    WHERE il.invoice_id = $1::uuid
    ORDER BY il.created_at ASC
  `, inv.id) as any[]

  const payments = await prisma.$queryRawUnsafe(`
    SELECT p.*, u.name AS recorded_by_name
    FROM payments p
    LEFT JOIN users u ON u.id = p.recorded_by
    WHERE p.invoice_id = $1::uuid
    ORDER BY p.created_at ASC
  `, inv.id) as any[]

  return NextResponse.json({ invoice: inv, line_items: lineItems, payments })
}

// POST — create invoice for this visit
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get visit details
  const visits = await prisma.$queryRawUnsafe(`
    SELECT v.*, c.name AS client_name, p.name AS patient_name
    FROM visit_records v
    LEFT JOIN clients  c ON c.id = v.client_id
    LEFT JOIN patients p ON p.id = v.patient_id
    WHERE v.id = $1::uuid
  `, params.id) as any[]

  if (!visits.length) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
  const visit = visits[0]

  // Check if invoice already exists
  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM invoices WHERE visit_id = $1::uuid LIMIT 1`, params.id
  ) as any[]
  if (existing.length) return NextResponse.json({ error: 'Invoice already exists for this visit' }, { status: 409 })

  // Generate invoice number
  const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM invoices`) as any[]
  const n = (countRows[0]?.n ?? 0) + 1
  const invoiceNumber = `RV-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`

  const body = await req.json().catch(() => ({}))
  const visitDate = visit.visit_date?.toISOString?.()?.split('T')[0] ?? new Date().toISOString().split('T')[0]

  const rows = await prisma.$queryRawUnsafe(`
    INSERT INTO invoices (id, invoice_number, client_id, patient_id, visit_id, date, due_date, status, subtotal, tax, total, amount_paid, notes)
    VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'draft', 0, 0, 0, 0, $7)
    RETURNING *
  `,
    invoiceNumber,
    visit.client_id,
    visit.patient_id,
    params.id,
    visitDate,
    visitDate,
    body.notes || null,
  ) as any[]

  return NextResponse.json({ invoice: rows[0] }, { status: 201 })
}
