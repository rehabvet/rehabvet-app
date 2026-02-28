import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await prisma.invoices.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { name: true, email: true, phone: true, address: true } },
      patient: { select: { name: true } },
    },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [oldItems, lineItems, payments] = await Promise.all([
    prisma.invoice_items.findMany({ where: { invoice_id: params.id } }),
    prisma.$queryRawUnsafe(
      `SELECT il.*, u.name AS staff_name FROM invoice_line_items il LEFT JOIN users u ON u.id=il.staff_id WHERE il.invoice_id=$1::uuid ORDER BY il.sort_order, il.created_at`,
      params.id
    ) as Promise<any[]>,
    prisma.payments.findMany({ where: { invoice_id: params.id }, orderBy: { date: 'desc' } }),
  ])
  // Merge: prefer invoice_line_items if present, fall back to invoice_items
  const items = (lineItems as any[]).length > 0 ? lineItems : oldItems

  const { client, patient, ...rest } = row as any
  const invoice = {
    ...rest,
    client_name: client?.name,
    client_email: client?.email,
    client_phone: client?.phone,
    client_address: client?.address,
    patient_name: patient?.name ?? null,
  }

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
    await prisma.invoices.update({
      where: { id: params.id },
      data: { status: body.status },
    })
  }

  const invoice = await prisma.invoices.findUnique({ where: { id: params.id } })
  return NextResponse.json({ invoice })
}
