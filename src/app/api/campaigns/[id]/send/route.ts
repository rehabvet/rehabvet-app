import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { wrapCampaignEmail } from '@/lib/campaign-email'

const BATCH_SIZE = 50
const FROM = 'RehabVet <hello@rehabvet.com>'

function getResendKey(): string {
  if (process.env.RESEND_KEY_B64) {
    return Buffer.from(process.env.RESEND_KEY_B64, 'base64').toString('utf8').trim()
  }
  return process.env.RESEND_API_KEY || ''
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  // Get campaign
  const campaigns = await prisma.$queryRawUnsafe(
    `SELECT * FROM email_campaigns WHERE id=$1`, id
  ) as any[]
  if (!campaigns.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const campaign = campaigns[0]
  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'Campaign already sent or sending' }, { status: 400 })
  }

  // Get eligible clients (have email, not unsubscribed)
  const clients = await prisma.$queryRawUnsafe(`
    SELECT c.id, c.name, c.email
    FROM clients c
    WHERE c.email IS NOT NULL
      AND c.email != ''
      AND c.email NOT IN (SELECT email FROM email_unsubscribes)
  `) as any[]

  if (!clients.length) {
    return NextResponse.json({ error: 'No eligible recipients' }, { status: 400 })
  }

  // Mark as sending
  await prisma.$executeRawUnsafe(`
    UPDATE email_campaigns SET status='sending', total_recipients=$1, updated_at=NOW() WHERE id=$2
  `, clients.length, id)

  // Insert recipients
  for (const c of clients) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO email_campaign_recipients (campaign_id, client_id, email, name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (campaign_id, client_id) DO NOTHING
    `, id, c.id, c.email, c.name)
  }

  const resendKey = getResendKey()
  let sentCount = 0

  // Send in batches
  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE)
    const emails = batch.map((c: any) => ({
      from: FROM,
      to: c.email,
      subject: campaign.subject,
      headers: { 'List-Unsubscribe': `<https://app.rehabvet.com/unsubscribe?email=${encodeURIComponent(c.email)}&token=${Buffer.from(c.email).toString('base64url')}>` },
      html: wrapCampaignEmail(campaign.body_html, c.name, c.email, id),
    }))

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emails),
      })

      if (res.ok) {
        const data = await res.json() as any[]
        // Update each recipient's resend_id and status
        for (let j = 0; j < batch.length; j++) {
          const rid = data[j]?.id
          await prisma.$executeRawUnsafe(`
            UPDATE email_campaign_recipients
            SET resend_id=$1, status='sent', sent_at=NOW()
            WHERE campaign_id=$2 AND client_id=$3
          `, rid || null, id, batch[j].id)
        }
        sentCount += batch.length
      } else {
        // Mark batch as failed
        for (const c of batch) {
          await prisma.$executeRawUnsafe(`
            UPDATE email_campaign_recipients SET status='failed', error='batch_send_error'
            WHERE campaign_id=$1 AND client_id=$2
          `, id, c.id)
        }
      }
    } catch (err) {
      console.error('[campaigns/send] batch error:', err)
    }

    // Small delay between batches
    if (i + BATCH_SIZE < clients.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  // Mark campaign sent
  await prisma.$executeRawUnsafe(`
    UPDATE email_campaigns
    SET status='sent', sent_at=NOW(), sent_count=$1, updated_at=NOW()
    WHERE id=$2
  `, sentCount, id)

  return NextResponse.json({ success: true, sent: sentCount, total: clients.length })
}
