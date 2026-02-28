import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')
  const clientId = req.nextUrl.searchParams.get('client_id')

  const conditions: string[] = []
  const values: any[] = []
  let idx = 1
  if (status) { conditions.push(`i.status = $${idx++}`); values.push(status) }
  if (clientId) { conditions.push(`i.client_id = $${idx++}::uuid`); values.push(clientId) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      i.id, i.invoice_number, i.bill_number, i.client_id, i.patient_id, i.visit_id,
      i.date, i.due_date, i.status, i.subtotal, i.tax, i.total, i.amount_paid, i.notes,
      i.created_at, i.updated_at,
      c.name  AS client_name, c.phone AS client_phone,
      p.name  AS patient_name
    FROM invoices i
    LEFT JOIN clients  c ON c.id = i.client_id
    LEFT JOIN patients p ON p.id = i.patient_id
    ${where}
    ORDER BY i.date DESC, i.created_at DESC
  `, ...values) as any[]

  const invoices = rows

  return NextResponse.json({ invoices })
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

  // Generate invoice number (simple incremental approach)
  const count = await prisma.invoices.count()
  const invoiceNumber = `RV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`

  let subtotal = 0
  for (const item of items) subtotal += Number(item.quantity) * Number(item.unit_price)
  const tax = 0
  const total = subtotal

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoices.create({
      data: {
        invoice_number: invoiceNumber,
        client_id,
        patient_id: patient_id || null,
        date,
        due_date,
        subtotal,
        tax,
        total,
        status: 'draft',
        notes: notes || null,
      },
    })

    await tx.invoice_items.createMany({
      data: items.map((it: any) => ({
        invoice_id: inv.id,
        description: it.description,
        modality: it.modality || null,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price),
        total: Number(it.quantity) * Number(it.unit_price),
      })),
    })

    return inv
  })

  return NextResponse.json({ invoice }, { status: 201 })
}
