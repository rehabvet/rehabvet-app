import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  || '1'))
  const limit = 25
  const offset = (page - 1) * limit

  const [rows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT * FROM email_campaign_recipients
      WHERE campaign_id=$1
      ORDER BY sent_at DESC NULLS LAST, name ASC
      LIMIT $2 OFFSET $3
    `, id, limit, offset) as Promise<any[]>,
    prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int AS total FROM email_campaign_recipients WHERE campaign_id=$1
    `, id) as Promise<any[]>,
  ])

  return NextResponse.json({ recipients: rows, total: countRows[0]?.total ?? 0, page, limit })
}
