import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.inventory_items.findUnique({
    where: { id: params.id },
    include: { movements: { orderBy: { created_at: 'desc' }, take: 20 } }
  })

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    name, category, sku, brand, cost_price, sell_price, markup_pct,
    stock_on_hand, stock_min, stock_max, unit, expiry_date, notes, is_active
  } = body

  const item = await prisma.inventory_items.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(sku !== undefined && { sku }),
      ...(brand !== undefined && { brand }),
      ...(cost_price !== undefined && { cost_price: parseFloat(cost_price) }),
      ...(sell_price !== undefined && { sell_price: parseFloat(sell_price) }),
      ...(markup_pct !== undefined && { markup_pct: parseFloat(markup_pct) }),
      ...(stock_on_hand !== undefined && { stock_on_hand: parseFloat(stock_on_hand) }),
      ...(stock_min !== undefined && { stock_min: parseFloat(stock_min) }),
      ...(stock_max !== undefined && { stock_max: parseFloat(stock_max) }),
      ...(unit !== undefined && { unit }),
      ...(expiry_date !== undefined && { expiry_date }),
      ...(notes !== undefined && { notes }),
      ...(is_active !== undefined && { is_active }),
    }
  })

  return NextResponse.json({ item })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete
  await prisma.inventory_items.update({
    where: { id: params.id },
    data: { is_active: false }
  })

  return NextResponse.json({ success: true })
}
