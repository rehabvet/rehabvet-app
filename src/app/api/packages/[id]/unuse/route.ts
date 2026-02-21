import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pkg = await prisma.client_packages.findUnique({
    where: { id: params.id },
    include: { usage_logs: { orderBy: { created_at: 'desc' }, take: 1 } },
  })

  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  if (pkg.sessions_used <= 0) return NextResponse.json({ error: 'No sessions to undo' }, { status: 400 })

  const lastLog = pkg.usage_logs[0]

  const [updatedPkg] = await prisma.$transaction([
    prisma.client_packages.update({
      where: { id: params.id },
      data: {
        sessions_used: pkg.sessions_used - 1,
        status: 'active',
      },
      include: {
        client: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true } },
        treatment_type: { select: { id: true, name: true, color: true } },
        usage_logs: { orderBy: { created_at: 'desc' } },
      },
    }),
    ...(lastLog
      ? [prisma.package_usage_logs.delete({ where: { id: lastLog.id } })]
      : []),
  ])

  return NextResponse.json({ package: updatedPkg })
}
