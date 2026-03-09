import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const ADMIN_ROLES = ['admin', 'administrator', 'office_manager']

// PUT — update a service
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_ROLES.includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, category, bin_no, duration, price, appointment_names, appointment_durations, active, sessions_in_package } = await req.json()

  const service = await prisma.treatment_types.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(bin_no !== undefined && { bin_no: bin_no ? parseInt(bin_no) : null }),
      ...(sessions_in_package !== undefined && { sessions_in_package: sessions_in_package ? parseInt(sessions_in_package) : 1 }),
      ...(duration !== undefined && { duration: parseInt(duration) || 0 }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(appointment_names !== undefined && { appointment_names }),
      ...(appointment_durations !== undefined && { appointment_durations }),
      ...(active !== undefined && { active }),
    },
  })

  // Sync service_pricing label + price
  if (price !== undefined || name !== undefined) {
    await prisma.service_pricing.updateMany({
      where: { service_id: params.id },
      data: {
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(name !== undefined && { label: name }),
      },
    })
  }

  return NextResponse.json({ service })
}

// DELETE — deactivate (soft delete)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_ROLES.includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.treatment_types.update({
    where: { id: params.id },
    data: { active: false },
  })

  return NextResponse.json({ ok: true })
}
