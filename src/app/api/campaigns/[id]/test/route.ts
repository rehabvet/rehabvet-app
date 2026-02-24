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

  const body = await req.json()
  const addresses: string[] = Array.isArray(body.to) ? body.to : [body.to]
  const valid = addresses.filter(e => e && e.includes('@'))
  if (!valid.length) return NextResponse.json({ error: 'No valid recipient email' }, { status: 400 })

  // Get campaign (use body_html from DB, or fall back to empty)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM email_campaigns WHERE id = $1`, id
  ) as any[]
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const campaign = rows[0]

  const emails = valid.map(addr => ({
    from: 'RehabVet <hello@rehabvet.com>',
    to: addr,
    subject: `[TEST] ${campaign.subject}`,
    html: wrapCampaignEmail(
      campaign.body_html || '<p>This is a test email.</p>',
      user.name || 'Test Recipient',
      addr,
      id
    ),
  }))

  const endpoint = emails.length === 1 ? 'https://api.resend.com/emails' : 'https://api.resend.com/emails/batch'
  const payload  = emails.length === 1 ? emails[0] : emails

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getResendKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message || 'Send failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, sent: valid.length })
}
