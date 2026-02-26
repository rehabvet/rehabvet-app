import { Resend } from 'resend'

// Lazy init — do NOT construct at module level (Next.js runs module code at build time)
// RESEND_KEY_B64 is base64-encoded to survive Railway env var copy-paste corruption
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_KEY_B64
      ? Buffer.from(process.env.RESEND_KEY_B64, 'base64').toString('utf8').trim()
      : process.env.RESEND_API_KEY
    _resend = new Resend(key)
  }
  return _resend
}

export interface LeadEmailData {
  owner_name: string
  owner_email: string
  owner_phone?: string
  post_code?: string
  address?: string
  how_heard?: string
  pet_name: string
  breed?: string
  age?: string
  pet_gender?: string
  vet_friendly?: boolean
  reactive_to_pets?: boolean
  has_pain?: boolean
  condition?: string
  clinic_name?: string
  attending_vet?: string
  preferred_date?: string
  service?: string
  notes?: string
}

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const PINK      = '#EC6496'
const PINK_DARK = '#d4507e'
const GOLD      = '#FDC61C'
const FONT      = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

// ─── Shared helpers ───────────────────────────────────────────────────────────
function badge(text: string, color: string, bg: string) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;letter-spacing:0.3px;padding:3px 10px;border-radius:20px;">${text}</span>`
}
function yesNo(val?: boolean) {
  if (val === true)  return badge('Yes', '#15803d', '#dcfce7')
  if (val === false) return badge('No',  '#b91c1c', '#fee2e2')
  return ''
}
function dataRow(label: string, value: string | undefined | null) {
  if (!value) return ''
  return `
    <tr>
      <td class="ev-lbl" style="padding:10px 16px;font-size:13px;color:#9ca3af;width:38%;vertical-align:top;border-bottom:1px solid #f0f0f0;">${label}</td>
      <td class="ev-val" style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;vertical-align:top;border-bottom:1px solid #f0f0f0;">${value}</td>
    </tr>`
}
function sectionLabel(text: string) {
  return `<p class="ev-sec" style="margin:20px 0 8px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${PINK};">${text}</p>`
}

// ─── Dark mode CSS (shared) ───────────────────────────────────────────────────
// Uses CSS classes so @media query !important can override inline styles
const DARK_CSS = `
  /* ── Dark mode overrides ── */
  @media (prefers-color-scheme: dark) {
    body, .ev-pagebg { background-color: #0f172a !important; }
    .ev-hdr  { background-color: #ffffff !important; border-top-color: ${PINK} !important; }
    .ev-cell { background-color: #1e293b !important; border-left-color: #334155 !important; border-right-color: #334155 !important; }
    .ev-hero { background-color: #1e293b !important; border-left-color: #334155 !important; border-right-color: #334155 !important; }
    .ev-foot { background-color: #1e293b !important; border-left-color: #334155 !important; border-right-color: #334155 !important; }
    .ev-card { background-color: #0f172a !important; border-color: #334155 !important; }
    .ev-card-inner { background-color: #0f172a !important; border-color: #334155 !important; }
    .ev-h1  { color: #f1f5f9 !important; }
    .ev-p   { color: #94a3b8 !important; }
    .ev-lbl { color: #64748b !important; border-bottom-color: #334155 !important; background-color: #1e293b !important; }
    .ev-val { color: #e2e8f0 !important; border-bottom-color: #334155 !important; background-color: #1e293b !important; }
    .ev-sec { color: ${PINK} !important; }
    .ev-step-icon { background-color: #1e3a4a !important; }
    .ev-step-title { color: #f1f5f9 !important; }
    .ev-step-desc  { color: #64748b !important; }
    .ev-foot-brand { color: #f1f5f9 !important; }
    .ev-foot-sub   { color: #475569 !important; }
    .ev-foot-link  { color: ${PINK} !important; }
    .ev-foot-legal { color: #334155 !important; }
    .ev-divider    { border-top-color: #334155 !important; }
    .ev-banner { background-color: #0f172a !important; }
  }
`

// ─── Header ───────────────────────────────────────────────────────────────────
function emailHeader() {
  return `
  <tr>
    <td class="ev-hdr" style="background:#ffffff;border-radius:12px 12px 0 0;border-top:4px solid ${PINK};border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:26px 48px 20px;text-align:center;">
            <img src="https://rehabvet.com/wp-content/uploads/2025/02/logo.webp"
                 alt="RehabVet" height="46"
                 style="display:block;margin:0 auto;height:46px;max-width:200px;"/>
          </td>
        </tr>
        <tr><td style="background:linear-gradient(90deg,${PINK} 0%,${PINK_DARK} 100%);height:3px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>`
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function emailFooter(internal = false) {
  return `
  <tr>
    <td class="ev-foot" style="background:#ffffff;padding:0;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 48px;"><div class="ev-divider" style="border-top:1px solid #f0f0f0;"></div></td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="ev-foot" style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px 48px 36px;text-align:center;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <div style="font-size:22px;margin-bottom:10px;">🐾</div>
      <p class="ev-foot-brand" style="margin:0 0 3px;font-size:14px;font-weight:800;color:#111827;">RehabVet</p>
      <p class="ev-foot-sub" style="margin:0 0 14px;font-size:12px;color:#9ca3af;">Singapore's First Veterinary Rehabilitation Centre</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr><td align="center">
          <a href="tel:62916881"           class="ev-foot-link" style="color:#9ca3af;text-decoration:none;font-size:12px;margin:0 6px;">📞 6291 6881</a>
          <a href="https://wa.me/6587987554" class="ev-foot-link" style="color:#9ca3af;text-decoration:none;font-size:12px;margin:0 6px;">💬 WhatsApp</a>
          <a href="mailto:hello@rehabvet.com" class="ev-foot-link" style="color:#9ca3af;text-decoration:none;font-size:12px;margin:0 6px;">✉️ hello@rehabvet.com</a>
        </td></tr>
      </table>
      <p class="ev-foot-sub" style="margin:0 0 12px;font-size:12px;color:#9ca3af;">513 Serangoon Road, #01-01, Singapore 218154</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
        <tr><td align="center">
          <a href="https://rehabvet.com"                    class="ev-foot-link" style="color:${PINK};font-size:12px;font-weight:600;text-decoration:none;margin:0 5px;">Website</a>
          <span style="color:#e5e7eb;font-size:12px;">|</span>
          <a href="https://www.instagram.com/rehabvet_sg/"  class="ev-foot-link" style="color:${PINK};font-size:12px;font-weight:600;text-decoration:none;margin:0 5px;">Instagram</a>
          <span style="color:#e5e7eb;font-size:12px;">|</span>
          <a href="https://www.facebook.com/rehabvet.sg"    class="ev-foot-link" style="color:${PINK};font-size:12px;font-weight:600;text-decoration:none;margin:0 5px;">Facebook</a>
        </td></tr>
      </table>
      <p class="ev-foot-legal" style="margin:0;font-size:11px;color:#d1d5db;line-height:1.6;">
        ${internal
          ? 'RehabVet internal notification &middot; Do not reply.'
          : 'You received this because you submitted a request on <a href="https://rehabvet.com" style="color:#d1d5db;">rehabvet.com</a>.'
        }<br/>
        &copy; ${new Date().getFullYear()} RehabVet Pte Ltd.
      </p>
    </td>
  </tr>`
}

// ─── Customer confirmation email ──────────────────────────────────────────────
function customerHtml(d: LeadEmailData): string {
  const firstName = d.owner_name.split(' ')[0]

  const ownerRows = [
    dataRow('Name', d.owner_name),
    dataRow('Phone', d.owner_phone),
    dataRow('Postal code', d.post_code),
    dataRow('How you found us', d.how_heard),
  ].join('')

  const petRows = [
    dataRow('Pet name', d.pet_name),
    dataRow('Species / Breed', d.breed),
    dataRow('Age', d.age),
    dataRow('Gender', d.pet_gender),
  ].join('')

  const healthRows = [
    d.has_pain         !== undefined ? dataRow('Showing pain?',    yesNo(d.has_pain))         : '',
    d.vet_friendly     !== undefined ? dataRow('Vet friendly',     yesNo(d.vet_friendly))     : '',
    d.reactive_to_pets !== undefined ? dataRow('Reactive to pets', yesNo(d.reactive_to_pets)) : '',
    dataRow('Condition', d.condition),
    dataRow('Referring clinic', d.clinic_name),
    dataRow('Attending vet', d.attending_vet),
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>We've received your request!</title>
  <style>${DARK_CSS}</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:${FONT};">

<table class="ev-pagebg" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f7;">
<tr><td align="center" style="padding:32px 16px;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">

  ${emailHeader()}

  <!-- HERO -->
  <tr>
    <td class="ev-hero" style="background:#ffffff;padding:40px 48px 32px;text-align:center;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <h1 class="ev-h1" style="margin:0 0 12px;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.25;">
        Hi ${firstName}! We've got your request 🐾
      </h1>
      <p class="ev-p" style="margin:0 auto;font-size:15px;color:#374151;line-height:1.75;max-width:440px;">
        Thank you for reaching out about <strong>${d.pet_name}</strong>. Our team will review your details and contact you within <strong>1 business day</strong>. We can't wait to meet you! 🥰
      </p>
    </td>
  </tr>

  <!-- SUMMARY -->
  <tr>
    <td class="ev-cell" style="background:#ffffff;padding:0 40px 8px;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">

      <table class="ev-card" width="100%" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#fdf2f7;border:1px solid #fce7f3;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:18px 22px 2px;">
            <p class="ev-sec" style="margin:0;font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:${PINK};">Your Submission Summary</p>
          </td>
        </tr>

        ${ownerRows ? `<tr><td class="ev-card-inner" style="padding:0 22px 2px;background:#fdf2f7;">
          ${sectionLabel('Owner')}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #fce7f3;border-radius:8px;overflow:hidden;">
            ${ownerRows}
          </table>
        </td></tr>` : ''}

        ${petRows ? `<tr><td class="ev-card-inner" style="padding:0 22px 2px;background:#fdf2f7;">
          ${sectionLabel('Pet Details')}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #fce7f3;border-radius:8px;overflow:hidden;">
            ${petRows}
          </table>
        </td></tr>` : ''}

        ${healthRows ? `<tr><td class="ev-card-inner" style="padding:0 22px 18px;background:#fdf2f7;">
          ${sectionLabel('Health & Mobility')}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #fce7f3;border-radius:8px;overflow:hidden;">
            ${healthRows}
          </table>
        </td></tr>` : '<tr><td class="ev-card-inner" style="padding:18px;background:#fdf2f7;"></td></tr>'}
      </table>

    </td>
  </tr>

  <!-- NEXT STEPS -->
  <tr>
    <td class="ev-cell" style="background:#ffffff;padding:32px 48px 8px;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <p class="ev-h1" style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">What happens next?</p>
      <table width="100%" cellpadding="0" cellspacing="0">

        <tr>
          <td style="vertical-align:top;width:46px;padding:0 0 18px;">
            <div class="ev-step-icon" style="width:34px;height:34px;background:#fdf2f7;border-radius:50%;text-align:center;line-height:34px;font-size:15px;">📋</div>
          </td>
          <td style="vertical-align:top;padding:0 0 18px;">
            <p class="ev-step-title" style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">We review your details</p>
            <p class="ev-step-desc" style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Our team looks over ${d.pet_name}'s condition and medical background.</p>
          </td>
        </tr>

        <tr>
          <td style="vertical-align:top;width:46px;padding:0 0 18px;">
            <div class="ev-step-icon" style="width:34px;height:34px;background:#fdf2f7;border-radius:50%;text-align:center;line-height:34px;font-size:15px;">📞</div>
          </td>
          <td style="vertical-align:top;padding:0 0 18px;">
            <p class="ev-step-title" style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">We reach out within 1 business day</p>
            <p class="ev-step-desc" style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">We'll call or WhatsApp to discuss the assessment and answer questions.</p>
          </td>
        </tr>

        <tr>
          <td style="vertical-align:top;width:46px;">
            <div class="ev-step-icon" style="width:34px;height:34px;background:#fdf2f7;border-radius:50%;text-align:center;line-height:34px;font-size:15px;">📅</div>
          </td>
          <td style="vertical-align:top;">
            <p class="ev-step-title" style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">We schedule your visit</p>
            <p class="ev-step-desc" style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">We lock in a date and time that works for you and ${d.pet_name}.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td class="ev-cell" style="background:#ffffff;padding:28px 48px 40px;text-align:center;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <a href="https://wa.me/6587987554"
         style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 36px;border-radius:8px;">
        💬&nbsp; Chat on WhatsApp
      </a>
      <p class="ev-p" style="margin:12px 0 0;font-size:13px;color:#9ca3af;">
        Or call <a href="tel:62916881" style="color:${PINK};font-weight:600;text-decoration:none;">6291 6881</a>
      </p>
    </td>
  </tr>

  ${emailFooter(false)}

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Internal notification email ──────────────────────────────────────────────
function internalHtml(d: LeadEmailData): string {

  const ownerRows = [
    dataRow('Name', d.owner_name),
    dataRow('Email', `<a href="mailto:${d.owner_email}" style="color:${PINK};text-decoration:none;">${d.owner_email}</a>`),
    dataRow('Phone', d.owner_phone ? `<a href="tel:${d.owner_phone}" style="color:${PINK};text-decoration:none;">${d.owner_phone}</a>` : undefined),
    dataRow('Postal Code', d.post_code),
    dataRow('How they found us', d.how_heard),
  ].join('')

  const petRows = [
    dataRow('Pet Name', d.pet_name),
    dataRow('Breed', d.breed),
    dataRow('Age', d.age),
    dataRow('Gender', d.pet_gender),
  ].join('')

  const healthRows = [
    d.has_pain         !== undefined ? dataRow('Showing pain',     yesNo(d.has_pain))         : '',
    d.vet_friendly     !== undefined ? dataRow('Vet friendly',     yesNo(d.vet_friendly))     : '',
    d.reactive_to_pets !== undefined ? dataRow('Reactive to pets', yesNo(d.reactive_to_pets)) : '',
    dataRow('Condition', d.condition),
    dataRow('Referring clinic', d.clinic_name),
    dataRow('Attending vet', d.attending_vet),
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New Lead — ${d.owner_name}</title>
  <style>${DARK_CSS}</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:${FONT};">

<table class="ev-pagebg" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f7;">
<tr><td align="center" style="padding:32px 16px;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">

  ${emailHeader()}

  <!-- BANNER -->
  <tr>
    <td class="ev-banner" style="background:#111827;padding:16px 48px;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0 0 3px;font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:${GOLD};">Internal Notification</p>
            <p class="ev-h1" style="margin:0;font-size:18px;font-weight:800;color:#ffffff;">
              ${d.owner_name}
              ${d.pet_name ? `<span style="color:${PINK};"> &bull; ${d.pet_name}</span>` : ''}
              ${d.breed ? `<span style="font-size:13px;font-weight:500;color:rgba(255,255,255,0.55);"> (${d.breed})</span>` : ''}
            </p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="background:${PINK};color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;white-space:nowrap;">New</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- DATA -->
  <tr>
    <td class="ev-cell" style="background:#ffffff;padding:28px 48px 16px;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">

      ${sectionLabel('Owner Information')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:8px;">
        ${ownerRows}
      </table>

      ${sectionLabel('Pet Details')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:8px;">
        ${petRows}
      </table>

      ${healthRows ? `
      ${sectionLabel('Health & Mobility')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:8px;">
        ${healthRows}
      </table>` : ''}

    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td class="ev-cell" style="background:#ffffff;padding:4px 48px 40px;text-align:center;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <a href="https://app.rehabvet.com/leads"
         style="display:inline-block;background:${PINK};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 36px;border-radius:8px;">
        View in Dashboard &rarr;
      </a>
    </td>
  </tr>

  ${emailFooter(true)}

</table>
</td></tr>
</table>
</body>
</html>`
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

// ─── Send both emails via Resend ──────────────────────────────────────────────
export async function sendLeadEmails(data: LeadEmailData) {
  if (!process.env.RESEND_API_KEY && !process.env.RESEND_KEY_B64) {
    console.warn('[email] No Resend key configured — skipping emails')
    await tgAlert(
      `🔴 <b>RehabVet Alert</b>\n\n<b>RESEND key missing in Railway</b>\n\n<b>Customer:</b> ${data.owner_name}\n<b>Email:</b> ${data.owner_email}\n<b>Pet:</b> ${data.pet_name}`
    )
    return
  }

  const FROM = 'RehabVet <hello@rehabvet.com>'
  const firstName = data.owner_name.split(' ')[0]

  await Promise.allSettled([
    getResend().emails.send({
      from: FROM,
      to: data.owner_email,
      subject: `${firstName}, we've received your request for ${data.pet_name} 🐾`,
      html: customerHtml(data),
    }).then(r => console.log('[email] Customer sent:', r.data?.id))
      .catch(async (e) => {
        console.error('[email] Customer email failed:', e)
        await tgAlert(
          `🔴 <b>Customer email FAILED</b>\n\nTo: ${data.owner_email}\nCustomer: ${data.owner_name}\nPet: ${data.pet_name}\n\nError: <code>${String(e?.message ?? e).slice(0, 300)}</code>`
        )
      }),

    getResend().emails.send({
      from: FROM,
      to: 'hello@rehabvet.com',
      subject: `New lead: ${data.owner_name} — ${data.pet_name}${data.breed ? ` (${data.breed})` : ''}`,
      html: internalHtml(data),
    }).then(r => console.log('[email] Internal sent:', r.data?.id))
      .catch(e => console.error('[email] Internal email failed:', e)),
  ])
}

export const sendAppointmentConfirmation = sendLeadEmails
