import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    const resendId: string = data?.email_id
    if (!resendId) return NextResponse.json({ ok: true })

    switch (type) {
      case 'email.delivered':
        await prisma.$executeRawUnsafe(`
          UPDATE email_campaign_recipients SET status='delivered' WHERE resend_id=$1 AND status='sent'
        `, resendId)
        break
      case 'email.opened':
        await prisma.$executeRawUnsafe(`
          UPDATE email_campaign_recipients SET status='opened', opened_at=NOW() WHERE resend_id=$1 AND opened_at IS NULL
        `, resendId)
        // Increment campaign opened_count
        await prisma.$executeRawUnsafe(`
          UPDATE email_campaigns SET opened_count=opened_count+1
          WHERE id=(SELECT campaign_id FROM email_campaign_recipients WHERE resend_id=$1 LIMIT 1)
        `, resendId)
        break
      case 'email.clicked':
        await prisma.$executeRawUnsafe(`
          UPDATE email_campaign_recipients SET status='clicked', clicked_at=NOW() WHERE resend_id=$1 AND clicked_at IS NULL
        `, resendId)
        await prisma.$executeRawUnsafe(`
          UPDATE email_campaigns SET clicked_count=clicked_count+1
          WHERE id=(SELECT campaign_id FROM email_campaign_recipients WHERE resend_id=$1 LIMIT 1)
        `, resendId)
        break
      case 'email.bounced':
      case 'email.complained':
        await prisma.$executeRawUnsafe(`
          UPDATE email_campaign_recipients SET status='failed', error=$1 WHERE resend_id=$2
        `, type, resendId)
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/resend]', err)
    return NextResponse.json({ ok: true }) // always 200 to avoid Resend retries
  }
}
