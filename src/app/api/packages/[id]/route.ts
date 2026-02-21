import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pkg = await prisma.client_packages.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      patient: { select: { id: true, name: true, species: true } },
      treatment_type: { select: { id: true, name: true, category: true, color: true, duration: true } },
      usage_logs: { orderBy: { created_at: 'desc' } },
    },
  })

  if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ package: pkg })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { notes, expiry_date, status } = body

  const pkg = await prisma.client_packages.update({
    where: { id: params.id },
    data: {
      ...(notes !== undefined && { notes }),
      ...(expiry_date !== undefined && { expiry_date }),
      ...(status !== undefined && { status }),
    },
  })

  return NextResponse.json({ package: pkg })
}
