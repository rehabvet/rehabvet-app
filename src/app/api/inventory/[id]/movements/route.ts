import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const movements = await prisma.stock_movements.findMany({
    where: { item_id: params.id },
    orderBy: { created_at: 'desc' },
    take: 100,
  })
  return NextResponse.json({ movements })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, quantity, reference, notes } = body
  if (!type || quantity == null) return NextResponse.json({ error: 'Type and quantity required' }, { status: 400 })

  const qty = parseInt(quantity)
  const delta = ['in', 'return'].includes(type) ? qty : -qty

  const [movement] = await prisma.$transaction([
    prisma.stock_movements.create({
      data: {
        item_id: params.id,
        type,
        quantity: qty,
        reference: reference || null,
        notes: notes || null,
        created_by: user.name || user.email,
      },
    }),
    prisma.inventory_items.update({
      where: { id: params.id },
      data: { stock_on_hand: { increment: delta } },
    }),
  ])

  return NextResponse.json({ movement }, { status: 201 })
}
