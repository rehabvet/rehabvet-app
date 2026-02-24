import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface LeadEmailData {
  // Owner
  owner_name: string
  owner_email: string
  owner_phone?: string
  post_code?: string
  address?: string
  how_heard?: string
  // Pet
  pet_name: string
  breed?: string
  age?: string
  pet_gender?: string
  // Health
  vet_friendly?: boolean
  reactive_to_pets?: boolean
  has_pain?: boolean
  condition?: string
  clinic_name?: string
  attending_vet?: string
  // Appointment prefs
  preferred_date?: string
  service?: string
  notes?: string
}

// ─── Shared styles ───────────────────────────────────────────────────────────
const PINK = '#EC6496'
const GOLD = '#FDC61C'
const DARK = '#111827'
const MUTED = '#6b7280'
const LIGHT_BG = '#f9fafb'
const CARD_BG = '#fdf2f7'
const CARD_BORDER = '#fce7f3'

function badge(text: string, color: string, bg: string) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;">${text}</span>`
}

function row(label: string, value: string | undefined | null, highlight = false) {
  if (!value) return ''
  return `
  <tr>
    <td style="padding:7px 0;font-size:13px;color:${MUTED};width:42%;vertical-align:top;">${label}</td>
    <td style="padding:7px 0;font-size:13px;font-weight:${highlight ? '700' : '600'};color:${highlight ? PINK : DARK};vertical-align:top;">${value}</td>
  </tr>`
}

function yesNo(val?: boolean) {
  if (val === true) return badge('Yes', '#166534', '#dcfce7')
  if (val === false) return badge('No', '#991b1b', '#fee2e2')
  return ''
}

// ─── Customer confirmation email ─────────────────────────────────────────────
function customerHtml(d: LeadEmailData): string {
  const firstName = d.owner_name.split(' ')[0]
  const petSection = [
    row('Pet name', d.pet_name),
    row('Breed', d.breed),
    row('Age', d.age),
    row('Gender', d.pet_gender),
  ].join('')

  const healthSection = [
    d.has_pain !== undefined ? `<tr><td style="padding:7px 0;font-size:13px;color:${MUTED};width:42%;vertical-align:top;">Showing pain?</td><td style="padding:7px 0;">${yesNo(d.has_pain)}</td></tr>` : '',
    d.vet_friendly !== undefined ? `<tr><td style="padding:7px 0;font-size:13px;color:${MUTED};width:42%;vertical-align:top;">Vet friendly</td><td style="padding:7px 0;">${yesNo(d.vet_friendly)}</td></tr>` : '',
    d.reactive_to_pets !== undefined ? `<tr><td style="padding:7px 0;font-size:13px;color:${MUTED};width:42%;vertical-align:top;">Reactive to pets</td><td style="padding:7px 0;">${yesNo(d.reactive_to_pets)}</td></tr>` : '',
    row('Current issue', d.condition),
    row('Referring clinic', d.clinic_name),
    row('Attending vet', d.attending_vet),
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>We've received your request!</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

  <!-- Header -->
  <tr><td style="background:${PINK};border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;">
    <img src="https://rehabvet.com/wp-content/uploads/2024/07/rehabvet-logo-white.png"
         alt="RehabVet" height="40" style="display:block;margin:0 auto 14px;" onerror="this.style.display='none'" />
    <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Singapore's First Vet Rehab Clinic</p>
  </td></tr>

  <!-- Hero -->
  <tr><td style="background:#fff;padding:36px 40px 20px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🐾</div>
    <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:${DARK};">Hi ${firstName}! We've got your request.</h1>
    <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.7;">
      Thank you for reaching out about <strong style="color:${DARK};">${d.pet_name}</strong>. Our team will review everything you've shared and get back to you within a day. We can't wait to meet you both! 🥰
    </p>
  </td></tr>

  <!-- Summary card -->
  <tr><td style="background:#fff;padding:0 40px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:14px;padding:22px 24px;">
    <tr><td>
      <p style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${PINK};">📋 Your Submission Summary</p>

      <!-- Owner -->
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Owner</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        ${row('Name', d.owner_name)}
        ${row('Phone', d.owner_phone)}
        ${row('Postal code', d.post_code)}
        ${row('How you found us', d.how_heard)}
      </table>

      <!-- Pet -->
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Pet Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        ${petSection}
      </table>

      ${healthSection ? `
      <!-- Health -->
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Health & Mobility</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
        ${healthSection}
      </table>` : ''}

    </td></tr>
    </table>
  </td></tr>

  <!-- What's next -->
  <tr><td style="background:#fff;padding:28px 40px;">
    <p style="margin:0 0 18px;font-size:15px;font-weight:700;color:${DARK};">What happens next?</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;padding:8px 0;width:40px;font-size:22px;">📋</td>
        <td style="padding:8px 0;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:${DARK};">We review your details</p>
          <p style="margin:0;font-size:13px;color:${MUTED};">Our clinical team carefully looks over ${d.pet_name}'s condition and history.</p>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding:8px 0;font-size:22px;">📞</td>
        <td style="padding:8px 0;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:${DARK};">We'll reach out within a day</p>
          <p style="margin:0;font-size:13px;color:${MUTED};">We'll call or WhatsApp you to discuss the assessment and answer any questions.</p>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding:8px 0;font-size:22px;">📅</td>
        <td style="padding:8px 0;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:${DARK};">Schedule your visit</p>
          <p style="margin:0;font-size:13px;color:${MUTED};">We'll lock in a date and time that works perfectly for you.</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:#fff;padding:0 40px 32px;text-align:center;">
    <a href="https://wa.me/6587987554"
       style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:50px;margin-bottom:12px;">
      💬 WhatsApp Us
    </a>
    <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Or call us at <a href="tel:62916881" style="color:${PINK};text-decoration:none;">6291 6881</a></p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">RehabVet Clinic · 513 Serangoon Road #01-01 · Singapore 218154</p>
    <p style="margin:0;font-size:12px;">
      <a href="https://rehabvet.com" style="color:${PINK};text-decoration:none;">rehabvet.com</a>
      &nbsp;·&nbsp;
      <a href="https://www.instagram.com/rehabvet_sg/" style="color:${PINK};text-decoration:none;">@rehabvet_sg</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

// ─── Internal notification email ──────────────────────────────────────────────
function internalHtml(d: LeadEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Lead</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

  <!-- Header -->
  <tr><td style="background:${DARK};border-radius:12px 12px 0 0;padding:20px 32px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;">RehabVet · Internal</p>
    <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#fff;">🐾 New Lead Received</h1>
  </td></tr>

  <!-- Alert bar -->
  <tr><td style="background:${PINK};padding:10px 32px;">
    <p style="margin:0;font-size:13px;font-weight:700;color:#fff;">
      ${d.owner_name} submitted a form for <strong>${d.pet_name}</strong>${d.breed ? ` (${d.breed})` : ''}
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#fff;padding:28px 32px;">

    <!-- Owner -->
    <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${PINK};">Owner Information</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;">
      ${(
        [
          ['Name', d.owner_name],
          ['Email', `<a href="mailto:${d.owner_email}" style="color:${PINK};text-decoration:none;">${d.owner_email}</a>`],
          ['Phone', d.owner_phone ? `<a href="tel:${d.owner_phone}" style="color:${PINK};text-decoration:none;">${d.owner_phone}</a>` : ''],
          ['Postal Code', d.post_code || ''],
          ['How they found us', d.how_heard || ''],
        ] as [string, string][]
      ).filter(r => r[1]).map(([label, val], i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : LIGHT_BG};">
        <td style="padding:9px 14px;font-size:13px;color:${MUTED};width:40%;">${label}</td>
        <td style="padding:9px 14px;font-size:13px;font-weight:600;color:${DARK};">${val}</td>
      </tr>`).join('')}
    </table>

    <!-- Pet -->
    <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${PINK};">Pet Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;">
      ${(
        [
          ['Pet Name', d.pet_name],
          ['Breed', d.breed || ''],
          ['Age', d.age || ''],
          ['Gender', d.pet_gender || ''],
        ] as [string, string][]
      ).filter(r => r[1]).map(([label, val], i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : LIGHT_BG};">
        <td style="padding:9px 14px;font-size:13px;color:${MUTED};width:40%;">${label}</td>
        <td style="padding:9px 14px;font-size:13px;font-weight:600;color:${DARK};">${val}</td>
      </tr>`).join('')}
    </table>

    <!-- Health -->
    <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${PINK};">Health & Mobility</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;">
      ${(
        [
          ['Showing pain', d.has_pain !== undefined ? yesNo(d.has_pain) : ''],
          ['Vet friendly', d.vet_friendly !== undefined ? yesNo(d.vet_friendly) : ''],
          ['Reactive to pets', d.reactive_to_pets !== undefined ? yesNo(d.reactive_to_pets) : ''],
          ['Current issue / condition', d.condition || ''],
          ['Referring clinic', d.clinic_name || ''],
          ['Attending vet', d.attending_vet || ''],
        ] as [string, string][]
      ).filter(r => r[1]).map(([label, val], i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : LIGHT_BG};">
        <td style="padding:9px 14px;font-size:13px;color:${MUTED};width:40%;vertical-align:top;">${label}</td>
        <td style="padding:9px 14px;font-size:13px;font-weight:600;color:${DARK};">${val}</td>
      </tr>`).join('')}
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="https://app.rehabvet.com/leads"
           style="display:inline-block;background:${PINK};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;">
          View in Dashboard →
        </a>
      </td></tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">RehabVet internal notification · Do not reply</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

// ─── Alert helper ─────────────────────────────────────────────────────────────
async function tgAlert(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot8561245766:AAHytz33Xw46AreO7BxUxqgtAoym9H-dwfo/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '246605723', text, parse_mode: 'HTML' }),
    })
  } catch { /* never crash */ }
}

// ─── Send both emails via Resend ─────────────────────────────────────────────
export async function sendLeadEmails(data: LeadEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping emails')
    await tgAlert(
      `🔴 <b>RehabVet Alert</b>\n\n<b>⚠️ Emails NOT sending — RESEND_API_KEY missing in Railway</b>\n\n<b>Customer:</b> ${data.owner_name}\n<b>Email:</b> ${data.owner_email}\n<b>Pet:</b> ${data.pet_name}`
    )
    return
  }

  const firstName = data.owner_name.split(' ')[0]

  await Promise.allSettled([
    // NOTE: from address switches to hello@rehabvet.com once domain is verified in Resend
    const fromAddress = process.env.RESEND_FROM ?? 'RehabVet <onboarding@resend.dev>'

    // 1. Customer confirmation
    resend.emails.send({
      from: fromAddress,
      to: data.owner_email,
      subject: `${firstName}, we've received your request for ${data.pet_name} 🐾`,
      html: customerHtml(data),
    }).then(r => console.log('[email] Customer email sent:', r.data?.id))
      .catch(async (e) => {
        console.error('[email] Customer email failed:', e)
        await tgAlert(
          `🔴 <b>RehabVet Alert</b>\n\n<b>Customer email FAILED (Resend)</b>\n\n<b>To:</b> ${data.owner_email}\n<b>Customer:</b> ${data.owner_name}\n<b>Pet:</b> ${data.pet_name}\n\n<b>Error:</b> <code>${String(e?.message ?? e).slice(0, 300)}</code>`
        )
      }),

    // 2. Internal notification
    resend.emails.send({
      from: fromAddress,
      to: 'hello@rehabvet.com',
      subject: `🐾 New lead: ${data.owner_name} — ${data.pet_name}${data.breed ? ` (${data.breed})` : ''}`,
      html: internalHtml(data),
    }).then(r => console.log('[email] Internal email sent:', r.data?.id))
      .catch(e => console.error('[email] Internal email failed:', e)),
  ])
}

// Backwards compat alias
export const sendAppointmentConfirmation = sendLeadEmails
