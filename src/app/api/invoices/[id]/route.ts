import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      i.id, i.invoice_number, i.bill_number, i.client_id, i.patient_id, i.visit_id,
      i.date, i.due_date, i.status, i.subtotal, i.tax, i.total, i.amount_paid, i.notes,
      i.created_at, i.updated_at,
      c.name  AS client_name, c.email AS client_email, c.phone AS client_phone, c.address AS client_address,
      p.name  AS patient_name
    FROM invoices i
    LEFT JOIN clients  c ON c.id = i.client_id
    LEFT JOIN patients p ON p.id = i.patient_id
    WHERE i.id = $1::uuid
    LIMIT 1
  `, params.id) as any[]

  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const invoice = rows[0]

  const [oldItems, lineItems, payments] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT * FROM invoice_items WHERE invoice_id=$1::uuid`, params.id) as Promise<any[]>,
    prisma.$queryRawUnsafe(
      `SELECT il.*, u.name AS staff_name FROM invoice_line_items il LEFT JOIN users u ON u.id=il.staff_id WHERE il.invoice_id=$1::uuid ORDER BY il.sort_order NULLS LAST, il.created_at`,
      params.id
    ) as Promise<any[]>,
    prisma.$queryRawUnsafe(
      `SELECT p.*, u.name AS recorded_by_name FROM payments p LEFT JOIN users u ON u.id=p.recorded_by WHERE p.invoice_id=$1::uuid ORDER BY p.created_at ASC`,
      params.id
    ) as Promise<any[]>,
  ])
  const items = (lineItems as any[]).length > 0 ? lineItems : oldItems

  return NextResponse.json({ invoice, items, payments })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Record payment
  if (body.action === 'record_payment') {
    const { amount, method, reference, date, notes } = body
    if (!amount || !method || !date) return NextResponse.json({ error: 'Amount, method, and date required' }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      await tx.payments.create({
        data: {
          invoice_id: params.id,
          amount: Number(amount),
          method,
          reference: reference || null,
          date,
          notes: notes || null,
        },
      })

      const totalPaidAgg = await tx.payments.aggregate({
        where: { invoice_id: params.id },
        _sum: { amount: true },
      })
      const totalPaid = totalPaidAgg._sum.amount ?? 0

      const inv = await tx.invoices.findUnique({ where: { id: params.id }, select: { total: true } })
      const invoiceTotal = inv?.total ?? 0
      const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partial'

      await tx.invoices.update({
        where: { id: params.id },
        data: { amount_paid: totalPaid, status: newStatus },
      })
    })

    return NextResponse.json({ ok: true })
  }

  // Update status
  if (body.status) {
    await prisma.$queryRawUnsafe(
      `UPDATE invoices SET status=$1, updated_at=NOW() WHERE id=$2::uuid`,
      body.status, params.id
    )
  }

  const updated = await prisma.$queryRawUnsafe(
    `SELECT id, invoice_number, bill_number, status, total, amount_paid FROM invoices WHERE id=$1::uuid`, params.id
  ) as any[]
  return NextResponse.json({ invoice: updated[0] })
}
