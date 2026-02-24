/**
 * RehabVet Alert System
 * Sends real-time error alerts to Marcus via Telegram
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8561245766:AAHytz33Xw46AreO7BxUxqgtAoym9H-dwfo'
const CHAT_ID = '246605723'

export async function sendAlert(title: string, body: string, data?: Record<string, unknown>) {
  try {
    const dataBlock = data
      ? `\n\n<b>📋 Details:</b>\n<pre>${JSON.stringify(data, null, 2).slice(0, 800)}</pre>`
      : ''

    const message = [
      `🚨 <b>RehabVet Alert</b>`,
      ``,
      `<b>${title}</b>`,
      body,
      dataBlock,
      ``,
      `🕐 ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}`,
    ].join('\n')

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    })
  } catch (e) {
    // Never let alerting crash the app
    console.error('[alert] Failed to send Telegram alert:', e)
  }
}
