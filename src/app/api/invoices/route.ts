import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')
  const clientId = req.nextUrl.searchParams.get('client_id')

  const where: any = {}
  if (status) where.status = status
  if (clientId) where.client_id = clientId

  const rows = await prisma.invoices.findMany({
    where,
    include: {
      client: { select: { name: true, phone: true } },
      patient: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  })

  const invoices = (rows as any[]).map((i) => {
    const { client, patient, ...rest } = i
    return {
      ...rest,
      client_name: client?.name,
      client_phone: client?.phone,
      patient_name: patient?.name ?? null,
    }
  })

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
  const invoiceNumber = `RV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

  let subtotal = 0
  for (const item of items) subtotal += Number(item.quantity) * Number(item.unit_price)
  const tax = Math.round(subtotal * 0.09 * 100) / 100 // 9% GST
  const total = Math.round((subtotal + tax) * 100) / 100

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
