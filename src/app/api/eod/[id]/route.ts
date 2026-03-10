import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT e.*, u.name as submitted_by_name FROM eod_closings e LEFT JOIN users u ON u.id = e.created_by WHERE e.id = $1::uuid LIMIT 1`,
    params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ eod: rows[0] })
}
