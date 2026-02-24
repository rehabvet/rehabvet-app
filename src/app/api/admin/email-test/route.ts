import { NextResponse } from 'next/server'
import dns from 'dns/promises'
import nodemailer from 'nodemailer'

// Protected — only callable with admin token
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (token !== 'rv-debug-2809') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const result: Record<string, unknown> = {}

  // 1. DNS resolution for smtp.gmail.com
  try {
    const ipv4 = await dns.resolve4('smtp.gmail.com')
    const ipv6 = await dns.resolve6('smtp.gmail.com').catch(() => [])
    result.dns = { ipv4, ipv6 }
  } catch (e) {
    result.dns = { error: String(e) }
  }

  // 2. SMTP verify on port 587
  try {
    const t587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'hello@rehabvet.com',
        pass: process.env.GMAIL_APP_PASSWORD || '(not set)',
      },
      connectionTimeout: 8000,
    })
    await t587.verify()
    result.smtp587 = 'OK'
  } catch (e) {
    result.smtp587 = String(e)
  }

  // 3. SMTP verify on port 465
  try {
    const t465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'hello@rehabvet.com',
        pass: process.env.GMAIL_APP_PASSWORD || '(not set)',
      },
      connectionTimeout: 8000,
    })
    await t465.verify()
    result.smtp465 = 'OK'
  } catch (e) {
    result.smtp465 = String(e)
  }

  result.GMAIL_APP_PASSWORD_SET = !!process.env.GMAIL_APP_PASSWORD

  return NextResponse.json(result)
}
