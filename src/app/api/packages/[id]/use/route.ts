import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { used_date, notes, appointment_id } = body

  const pkg = await prisma.client_packages.findUnique({ where: { id: params.id } })
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  if (pkg.status !== 'active') return NextResponse.json({ error: 'Package is not active' }, { status: 400 })
  if (pkg.sessions_used >= pkg.sessions_total) return NextResponse.json({ error: 'No sessions remaining' }, { status: 400 })

  const newUsed = pkg.sessions_used + 1
  const isCompleted = newUsed >= pkg.sessions_total

  const [updatedPkg] = await prisma.$transaction([
    prisma.client_packages.update({
      where: { id: params.id },
      data: {
        sessions_used: newUsed,
        status: isCompleted ? 'completed' : 'active',
      },
      include: {
        client: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true } },
        treatment_type: { select: { id: true, name: true, color: true } },
        usage_logs: { orderBy: { created_at: 'desc' } },
      },
    }),
    prisma.package_usage_logs.create({
      data: {
        package_id: params.id,
        used_date: used_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        appointment_id: appointment_id || null,
      },
    }),
  ])

  return NextResponse.json({ package: updatedPkg, completed: isCompleted })
}
