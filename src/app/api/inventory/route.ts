import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const category = req.nextUrl.searchParams.get('category') || ''
  const lowStock = req.nextUrl.searchParams.get('low_stock') === 'true'

  const where: any = { is_active: true }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (category) {
    where.category = category
  }

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  || '1'))
  const limit = Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20'))

  const [allItems, allActive] = await Promise.all([
    prisma.inventory_items.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    prisma.inventory_items.findMany({ where: { is_active: true } }),
  ])

  // Filter low stock in-memory (cross-column comparison not supported by Prisma)
  const filtered = lowStock
    ? allItems.filter((i: any) => i.stock_on_hand <= i.stock_min)
    : allItems

  // Paginate the filtered set
  const total = filtered.length
  const items = filtered.slice((page - 1) * limit, page * limit)

  // Aggregate stats (always over full active set)
  const totalValue = allActive.reduce((sum: number, i: any) => sum + (i.stock_on_hand * (i.cost_price || 0)), 0)
  const totalOnHand = allActive.reduce((sum: number, i: any) => sum + i.stock_on_hand, 0)
  const lowStockCount = allActive.filter((i: any) => i.stock_on_hand <= i.stock_min).length

  const categories = Array.from(new Set(allActive.map((i: any) => i.category))).sort()

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    stats: {
      total: allActive.length,
      totalOnHand,
      lowStockCount,
      totalValue: Math.round(totalValue * 100) / 100,
    },
    categories,
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    name, category, sku, brand, cost_price, sell_price, markup_pct,
    stock_on_hand, stock_min, stock_max, unit, expiry_date, notes
  } = body

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const item = await prisma.inventory_items.create({
    data: {
      name,
      category: category || 'Other',
      sku: sku || null,
      brand: brand || null,
      cost_price: cost_price ? parseFloat(cost_price) : null,
      sell_price: sell_price ? parseFloat(sell_price) : null,
      markup_pct: markup_pct ? parseFloat(markup_pct) : null,
      stock_on_hand: stock_on_hand ? parseFloat(stock_on_hand) : 0,
      stock_min: stock_min ? parseFloat(stock_min) : 1,
      stock_max: stock_max ? parseFloat(stock_max) : 10,
      unit: unit || 'each',
      expiry_date: expiry_date || null,
      notes: notes || null,
    }
  })

  return NextResponse.json({ item }, { status: 201 })
}
