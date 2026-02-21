import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, quantity, notes } = body

  if (!type || quantity === undefined) {
    return NextResponse.json({ error: 'type and quantity required' }, { status: 400 })
  }

  const validTypes = ['in', 'out', 'adjustment', 'sale', 'return', 'restock', 'write_off']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const item = await prisma.inventory_items.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const qty = parseFloat(quantity)
  const beforeQty = item.stock_on_hand
  const afterQty = beforeQty + qty

  // Update stock and create movement in a transaction
  const [updated] = await prisma.$transaction([
    prisma.inventory_items.update({
      where: { id: params.id },
      data: { stock_on_hand: afterQty }
    }),
    prisma.stock_movements.create({
      data: {
        item_id: params.id,
        type,
        quantity: qty,
        reference: `${beforeQty} → ${afterQty}`,
        notes: notes || null,
        created_by: user.id,
      }
    })
  ])

  return NextResponse.json({ item: updated, beforeQty, afterQty })
}
