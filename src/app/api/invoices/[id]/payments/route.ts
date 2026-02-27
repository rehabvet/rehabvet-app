import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT p.*, u.name AS recorded_by_name
    FROM payments p
    LEFT JOIN users u ON u.id = p.recorded_by
    WHERE p.invoice_id = $1::uuid
    ORDER BY p.created_at ASC
  `, params.id) as any[]

  return NextResponse.json({ payments: rows })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { amount, method = 'cash', reference, client_id } = body

  if (!amount || !client_id) return NextResponse.json({ error: 'Amount and client_id required' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]
  await prisma.$queryRawUnsafe(`
    INSERT INTO payments (invoice_id, client_id, amount, method, reference, date, recorded_by, paid_at)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid, NOW())
  `, params.id, client_id, parseFloat(amount), method, reference || null, today, user.id)

  // Update invoice amount_paid and status
  const paid = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM payments WHERE invoice_id = $1::uuid
  `, params.id) as any[]
  const amountPaid = parseFloat(paid[0]?.paid ?? 0)

  const inv = await prisma.$queryRawUnsafe(`SELECT total FROM invoices WHERE id = $1::uuid`, params.id) as any[]
  const total = parseFloat(inv[0]?.total ?? 0)
  const status = amountPaid >= total && total > 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'draft'

  await prisma.$queryRawUnsafe(`
    UPDATE invoices SET amount_paid=$1, status=$2, updated_at=NOW() WHERE id=$3::uuid
  `, amountPaid, status, params.id)

  return NextResponse.json({ ok: true, amount_paid: amountPaid, status }, { status: 201 })
}
