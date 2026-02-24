import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      c.*,
      COUNT(r.id)::int AS recipient_count
    FROM email_campaigns c
    LEFT JOIN email_campaign_recipients r ON r.campaign_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `) as any[]

  return NextResponse.json({ campaigns: rows })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, subject, preheader, body_blocks, body_html } = body

  if (!name || !subject) {
    return NextResponse.json({ error: 'Name and subject required' }, { status: 400 })
  }

  const rows = await prisma.$queryRawUnsafe(`
    INSERT INTO email_campaigns (name, subject, preheader, body_blocks, body_html)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, name, subject, preheader || null, body_blocks || '[]', body_html || '') as any[]

  return NextResponse.json({ campaign: rows[0] })
}
