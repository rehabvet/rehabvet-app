import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const ADMIN_ROLES = ['admin', 'administrator', 'office_manager']

// GET — list all clinical services (treatment_types) with pricing
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const services = await prisma.treatment_types.findMany({
    where: { category: { not: 'Uncategorized' }, active: true },
    orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ services })
}

// POST — create a new service (treatment_type + service_pricing entry)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_ROLES.includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { name, category, bin_no, duration, price, appointment_names, color } = body
  if (!name || !category || price == null) {
    return NextResponse.json({ error: 'name, category and price are required' }, { status: 400 })
  }

  const CAT_COLORS: Record<string, string> = {
    'Acupuncture': 'bg-purple-400', 'Diagnostics': 'bg-blue-400',
    'Fees': 'bg-gray-400', 'Consultation': 'bg-indigo-400',
    'Fitness Swim': 'bg-cyan-400', 'UWTM': 'bg-teal-400',
    'Hyperbaric Oxygen': 'bg-sky-400', 'Laser Therapy': 'bg-yellow-400',
    'Rehabilitation': 'bg-pink-400', 'Other Treatments': 'bg-orange-400',
  }

  const service = await prisma.treatment_types.create({
    data: {
      name,
      category,
      bin_no: bin_no ? parseInt(bin_no) : null,
      duration: duration ? parseInt(duration) : 0,
      price: parseFloat(price),
      appointment_names: appointment_names || [],
      color: color || CAT_COLORS[category] || 'bg-gray-400',
      active: true,
      sort_order: 999,
    },
  })

  // Create service_pricing entry for billing compat
  await prisma.service_pricing.create({
    data: { service_id: service.id, label: name, sessions: 1, price: parseFloat(price) },
  })

  return NextResponse.json({ service }, { status: 201 })
}
