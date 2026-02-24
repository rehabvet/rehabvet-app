import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { wrapCampaignEmail } from '@/lib/campaign-email'

function getResendKey() {
  if (process.env.RESEND_KEY_B64)
    return Buffer.from(process.env.RESEND_KEY_B64, 'base64').toString('utf8').trim()
  return process.env.RESEND_API_KEY || ''
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { to } = await req.json()
  if (!to) return NextResponse.json({ error: 'No recipient email' }, { status: 400 })

  // Get campaign (use body_html from DB, or fall back to empty)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM email_campaigns WHERE id = $1`, id
  ) as any[]
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const campaign = rows[0]

  const html = wrapCampaignEmail(
    campaign.body_html || '<p>This is a test email.</p>',
    user.name || 'Test Recipient',
    to,
    id
  )

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getResendKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'RehabVet <hello@rehabvet.com>',
      to,
      subject: `[TEST] ${campaign.subject}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message || 'Send failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
