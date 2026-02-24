import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alert'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, stack, url, step, formData, userAgent } = body

    await sendAlert(
      '🔴 Appointment form — CLIENT ERROR',
      `A customer hit a JavaScript error on the booking form.\n\n` +
      `<b>Error:</b> <code>${String(message).slice(0, 300)}</code>\n` +
      `<b>Step:</b> ${step ?? 'unknown'}\n` +
      `<b>URL:</b> ${url ?? 'unknown'}`,
      {
        stack: String(stack ?? '').slice(0, 400),
        formStep: step,
        browser: String(userAgent ?? '').slice(0, 100),
        formData,
      },
    )
  } catch {
    // Silently ignore — never crash on error reporting
  }

  return NextResponse.json({ ok: true })
}
