import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id, patient_id, visit_id, notes } = await req.json()
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM invoices`) as any[]
  const n = (countRows[0]?.n ?? 0) + 1
  const invoiceNumber = `RV-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`
  const today = new Date().toISOString().split('T')[0]

  const rows = await prisma.$queryRawUnsafe(`
    INSERT INTO invoices (id, invoice_number, client_id, patient_id, visit_id, date, due_date, status, subtotal, tax, total, amount_paid, notes)
    VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, $5, 'draft', 0, 0, 0, 0, $6)
    RETURNING *
  `,
    invoiceNumber,
    client_id,
    patient_id || null,
    visit_id || null,
    today,
    notes || null,
  ) as any[]

  return NextResponse.json({ invoice: rows[0] }, { status: 201 })
}
