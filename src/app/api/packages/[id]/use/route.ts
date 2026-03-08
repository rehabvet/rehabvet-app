import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { used_date, notes, appointment_id } = body

  const result = await prisma.$transaction(async (tx) => {
    // Atomic check: only increment if sessions_used < sessions_total and status is active
    const updated = await tx.$queryRawUnsafe<any[]>(`
      UPDATE client_packages
      SET sessions_used = sessions_used + 1,
          status = CASE WHEN sessions_used + 1 >= sessions_total THEN 'completed' ELSE 'active' END
      WHERE id = $1 AND status = 'active' AND sessions_used < sessions_total
      RETURNING *
    `, params.id)

    if (!updated.length) return null

    await tx.package_usage_logs.create({
      data: {
        package_id: params.id,
        used_date: used_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        appointment_id: appointment_id || null,
      },
    })

    return updated[0]
  })

  if (!result) {
    // Check why it failed
    const pkg = await prisma.client_packages.findUnique({ where: { id: params.id } })
    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    if (pkg.status !== 'active') return NextResponse.json({ error: 'Package is not active' }, { status: 400 })
    return NextResponse.json({ error: 'No sessions remaining' }, { status: 400 })
  }

  // Re-fetch with includes for the response
  const updatedPkg = await prisma.client_packages.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true } },
      patient: { select: { id: true, name: true } },
      treatment_type: { select: { id: true, name: true, color: true } },
      usage_logs: { orderBy: { created_at: 'desc' } },
    },
  })

  return NextResponse.json({ package: updatedPkg, completed: result.status === 'completed' })
}
