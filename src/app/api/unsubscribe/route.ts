import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json()
    if (!email || !token) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    // Verify token (base64url of email)
    const expected = Buffer.from(email).toString('base64url')
    const expectedAlt = Buffer.from(email).toString('base64') // fallback
    if (token !== expected && token !== expectedAlt) {
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
