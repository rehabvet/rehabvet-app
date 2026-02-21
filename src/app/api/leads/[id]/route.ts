import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, staff_notes } = body

  const lead = await prisma.leads.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(staff_notes !== undefined && { staff_notes }),
    }
  })

  return NextResponse.json({ lead })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.leads.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
