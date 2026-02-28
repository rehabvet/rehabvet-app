import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT il.*, u.name AS staff_name
    FROM invoice_line_items il
    LEFT JOIN users u ON u.id = il.staff_id
    WHERE il.invoice_id = $1::uuid
    ORDER BY il.created_at ASC
  `, params.id) as any[]

  return NextResponse.json({ line_items: rows })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    staff_id, item_type = 'service', description,
    qty = 1, unit_price = 0,
    package_id, is_package_redemption = false,
    dispensing_instructions,
  } = body

  if (!description) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  const total = parseFloat(qty) * parseFloat(unit_price)

  const rows = await prisma.$queryRawUnsafe(`
    INSERT INTO invoice_line_items
      (invoice_id, staff_id, item_type, description, qty, unit_price, total, package_id, is_package_redemption, dispensing_instructions)
    VALUES
      ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `,
    params.id,
    staff_id || user.id,
    item_type,
    description,
    parseFloat(qty),
    parseFloat(unit_price),
    total,
    package_id || null,
    is_package_redemption,
    dispensing_instructions || null,
  ) as any[]

  // Recalculate invoice totals
  await recalcInvoice(params.id)

  return NextResponse.json({ line_item: rows[0] }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { line_item_id } = await req.json()
  await prisma.$queryRawUnsafe(
    `DELETE FROM invoice_line_items WHERE id = $1::uuid AND invoice_id = $2::uuid`,
    line_item_id, params.id
  )

  await recalcInvoice(params.id)
  return NextResponse.json({ ok: true })
}

async function recalcInvoice(invoiceId: string) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(total), 0)::numeric AS subtotal
    FROM invoice_line_items WHERE invoice_id = $1::uuid
  `, invoiceId) as any[]

  const subtotal = parseFloat(rows[0]?.subtotal ?? 0)
  // Prices are GST-inclusive — no tax added on top
  const total = subtotal

  // Get amount paid
  const paid = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM payments WHERE invoice_id = $1::uuid
  `, invoiceId) as any[]
  const amountPaid = parseFloat(paid[0]?.paid ?? 0)
  const status = amountPaid >= total && total > 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'sent'

  await prisma.$queryRawUnsafe(`
    UPDATE invoices SET subtotal=$1, tax=0, total=$2, status=$3, updated_at=NOW()
    WHERE id=$4::uuid
  `, subtotal, total, status, invoiceId)
}
