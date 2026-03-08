import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'

function generateUnsubscribeToken(email: string): string {
  return createHmac('sha256', process.env.JWT_SECRET || 'rehabvet').update(email.toLowerCase()).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json()
    if (!email || !token) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    // Verify HMAC token
    const expected = generateUnsubscribeToken(email)
    if (token !== expected) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO email_unsubscribes (email) VALUES ($1)
      ON CONFLICT (email) DO NOTHING
    `, email.toLowerCase())

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[unsubscribe]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export { generateUnsubscribeToken }
