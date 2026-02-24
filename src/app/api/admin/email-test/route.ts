import { NextResponse } from 'next/server'
import dnsPromises from 'dns/promises'
import dnsLib from 'dns'
import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

// Force IPv4 lookup — same as email.ts
function ipv4Lookup(
  hostname: string,
  _opts: Record<string, unknown>,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
) {
  dnsLib.resolve4(hostname, (err, addresses) => {
    if (err) return callback(err, '', 4)
    callback(null, addresses[0], 4)
  })
}

// Protected — only callable with admin token
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (token !== 'rv-debug-2809') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const result: Record<string, unknown> = {}
  result.GMAIL_APP_PASSWORD_SET = !!process.env.GMAIL_APP_PASSWORD

  // 1. DNS resolution
  try {
    const ipv4 = await dnsPromises.resolve4('smtp.gmail.com')
    const ipv6 = await dnsPromises.resolve6('smtp.gmail.com').catch(() => [])
    result.dns = { ipv4, ipv6 }
  } catch (e) {
    result.dns = { error: String(e) }
  }

  // Helper to test a transport
  async function testTransport(opts: SMTPTransport.Options): Promise<string> {
    try {
      const t = nodemailer.createTransport(opts as SMTPTransport.Options)
      await t.verify()
      return 'OK ✅'
    } catch (e) {
      return String(e)
    }
  }

  const auth = { user: 'hello@rehabvet.com', pass: process.env.GMAIL_APP_PASSWORD || '(not set)' }
  const timeout = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 }

  // 2. Port 587, no lookup hook (default DNS)
  result['587_default'] = await testTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth, ...timeout } as SMTPTransport.Options)

  // 3. Port 587, IPv4 lookup hook
  result['587_ipv4hook'] = await testTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth, lookup: ipv4Lookup, ...timeout } as SMTPTransport.Options)

  // 4. Port 465, IPv4 lookup hook
  result['465_ipv4hook'] = await testTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth, lookup: ipv4Lookup, ...timeout } as SMTPTransport.Options)

  // 5. Port 587 directly to resolved IPv4 (bypassing DNS entirely)
  const ipv4addr = ((result.dns as Record<string, string[]>)?.ipv4)?.[0]
  if (ipv4addr) {
    result['587_hardcoded_ip'] = await testTransport({
      host: ipv4addr,
      port: 587,
      secure: false,
      auth,
      tls: { servername: 'smtp.gmail.com' },
      ...timeout,
    } as SMTPTransport.Options)
  }

  // 6. Raw TCP tests — check if Railway can reach SMTP ports at all
  const tcpTests = [
    { host: '142.251.12.109', port: 587, label: 'Gmail IPv4:587' },
    { host: '142.251.12.109', port: 465, label: 'Gmail IPv4:465' },
    { host: 'smtp-relay.brevo.com', port: 587, label: 'Brevo:587' },
    { host: 'smtp.sendgrid.net',    port: 587, label: 'SendGrid:587' },
  ]

  const net = await import('net')
  const tcpResults: Record<string, string> = {}

  for (const { host, port, label } of tcpTests) {
    await new Promise<void>((resolve) => {
      const sock = net.default.createConnection({ host, port, family: 4 })
      const timer = setTimeout(() => { sock.destroy(); tcpResults[label] = 'timeout'; resolve() }, 6000)
      sock.on('connect', () => { clearTimeout(timer); sock.destroy(); tcpResults[label] = 'connected ✅'; resolve() })
      sock.on('error', (e) => { clearTimeout(timer); tcpResults[label] = `error: ${e.message}`; resolve() })
    })
  }
  result.tcp = tcpResults

  return NextResponse.json(result)
}
