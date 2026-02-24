import { Resend } from 'resend'

// Lazy init — do NOT construct at module level (Next.js runs module code at build time)
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
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
const PINK       = '#EC6496'
const PINK_DARK  = '#d4507e'
const PINK_LIGHT = '#fdf2f7'
const GOLD       = '#FDC61C'
const DARK       = '#1a1a2e'
const BODY       = '#374151'
const MUTED      = '#9ca3af'
const DIVIDER    = '#f0f0f0'
const PAGE_BG    = '#f4f4f7'
const CARD_BG    = '#fdf2f7'
const CARD_BDR   = '#fce7f3'
const GREEN      = '#22c55e'
const RED        = '#ef4444'
const FONT       = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

// ─── Shared components ────────────────────────────────────────────────────────

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
      <td style="padding:10px 16px;font-size:13px;color:${MUTED};width:38%;vertical-align:top;border-bottom:1px solid ${DIVIDER};">${label}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:${DARK};vertical-align:top;border-bottom:1px solid ${DIVIDER};">${value}</td>
    </tr>`
}

function sectionLabel(text: string) {
  return `<p style="margin:24px 0 8px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${PINK};">${text}</p>`
}

// ─── Header ───────────────────────────────────────────────────────────────────
function emailHeader() {
  return `
  <!-- ===== HEADER ===== -->
  <tr>
    <td style="background:linear-gradient(135deg,${PINK} 0%,${PINK_DARK} 100%);border-radius:12px 12px 0 0;padding:0;">

      <!-- Top bar -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:32px 48px 24px;text-align:center;">
            <!-- Logo -->
            <img
              src="https://rehabvet.com/wp-content/uploads/2024/07/rehabvet-logo-white.png"
              alt="RehabVet"
              height="44"
              style="display:block;margin:0 auto 10px;height:44px;"
              onerror="this.style.display='none'"
            />
            <!-- Tagline -->
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.75);">
              Veterinary Rehabilitation &nbsp;&bull;&nbsp; Singapore
            </p>
          </td>
        </tr>

        <!-- Gold accent bar -->
        <tr>
          <td style="background:${GOLD};height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>

    </td>
  </tr>`
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function emailFooter(internal = false) {
  return `
  <!-- ===== FOOTER ===== -->
  <tr>
    <td style="background:#fff;padding:0;">
      <!-- Divider -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 48px;"><div style="border-top:1px solid ${DIVIDER};"></div></td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;border-radius:0 0 12px 12px;padding:28px 48px 36px;text-align:center;">

      <!-- Paw icon -->
      <div style="font-size:24px;margin-bottom:12px;">🐾</div>

      <!-- Brand name -->
      <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:${DARK};letter-spacing:-0.3px;">RehabVet</p>
      <p style="margin:0 0 16px;font-size:12px;color:${MUTED};">Singapore's First Veterinary Rehabilitation Centre</p>

      <!-- Contact row -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td align="center">
            <a href="tel:62916881"      style="color:${MUTED};text-decoration:none;font-size:12px;margin:0 8px;">📞 6291 6881</a>
            <a href="https://wa.me/6587987554" style="color:${MUTED};text-decoration:none;font-size:12px;margin:0 8px;">💬 WhatsApp</a>
            <a href="mailto:hello@rehabvet.com" style="color:${MUTED};text-decoration:none;font-size:12px;margin:0 8px;">✉️ hello@rehabvet.com</a>
          </td>
        </tr>
      </table>

      <!-- Address -->
      <p style="margin:0 0 16px;font-size:12px;color:${MUTED};">
        513 Serangoon Road, #01-01, Singapore 218154
      </p>

      <!-- Social links -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td align="center">
            <a href="https://rehabvet.com" style="display:inline-block;margin:0 6px;color:${PINK};font-size:12px;font-weight:600;text-decoration:none;">Website</a>
            <span style="color:${DIVIDER};font-size:12px;">|</span>
            <a href="https://www.instagram.com/rehabvet_sg/" style="display:inline-block;margin:0 6px;color:${PINK};font-size:12px;font-weight:600;text-decoration:none;">Instagram</a>
            <span style="color:${DIVIDER};font-size:12px;">|</span>
            <a href="https://www.facebook.com/rehabvet.sg" style="display:inline-block;margin:0 6px;color:${PINK};font-size:12px;font-weight:600;text-decoration:none;">Facebook</a>
          </td>
        </tr>
      </table>

      <!-- Legal -->
      <p style="margin:0;font-size:11px;color:#d1d5db;line-height:1.6;">
        ${internal
          ? 'RehabVet internal notification &middot; Do not reply to this email.'
          : 'You received this email because you submitted a request on <a href="https://rehabvet.com" style="color:#d1d5db;">rehabvet.com</a>.'
        }<br/>
        &copy; ${new Date().getFullYear()} RehabVet Veterinary Rehabilitation Centre Pte. Ltd.
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
    d.has_pain       !== undefined ? dataRow('Showing pain?',    yesNo(d.has_pain))       : '',
    d.vet_friendly   !== undefined ? dataRow('Vet friendly',     yesNo(d.vet_friendly))   : '',
    d.reactive_to_pets !== undefined ? dataRow('Reactive to pets', yesNo(d.reactive_to_pets)) : '',
    dataRow('Current condition', d.condition),
    dataRow('Referring clinic', d.clinic_name),
    dataRow('Attending vet', d.attending_vet),
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="color-scheme" content="light"/>
  <title>We've received your request!</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:${FONT};">

<!-- Page wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${PAGE_BG};">
<tr><td align="center" style="padding:32px 16px;">

<!-- Email card -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">

  ${emailHeader()}

  <!-- ===== HERO ===== -->
  <tr>
    <td style="background:#fff;padding:44px 48px 32px;text-align:center;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">
      <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:${DARK};letter-spacing:-0.5px;line-height:1.2;">
        Hi ${firstName}! We've got your request 🐾
      </h1>
      <p style="margin:0;font-size:15px;color:${BODY};line-height:1.75;max-width:440px;margin:0 auto;">
        Thank you for reaching out about <strong>${d.pet_name}</strong>. Our team will review everything you've shared and contact you within <strong>1 business day</strong>. We can't wait to meet you! 🥰
      </p>
    </td>
  </tr>

  <!-- ===== SUMMARY CARD ===== -->
  <tr>
    <td style="background:#fff;padding:0 48px 8px;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${CARD_BG};border:1px solid ${CARD_BDR};border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px 4px;">
            <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:${PINK};">Your Submission Summary</p>
          </td>
        </tr>

        ${ownerRows ? `
        <tr><td style="padding:4px 24px 0;">
          ${sectionLabel('Owner')}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${CARD_BDR};border-radius:8px;overflow:hidden;margin-bottom:4px;">
            ${ownerRows}
          </table>
        </td></tr>` : ''}

        ${petRows ? `
        <tr><td style="padding:4px 24px 0;">
          ${sectionLabel('Pet Details')}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${CARD_BDR};border-radius:8px;overflow:hidden;margin-bottom:4px;">
            ${petRows}
          </table>
        </td></tr>` : ''}

        ${healthRows ? `
        <tr><td style="padding:4px 24px 20px;">
          ${sectionLabel('Health & Mobility')}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${CARD_BDR};border-radius:8px;overflow:hidden;">
            ${healthRows}
          </table>
        </td></tr>` : '<tr><td style="padding:20px;"></td></tr>'}

      </table>
    </td>
  </tr>

  <!-- ===== NEXT STEPS ===== -->
  <tr>
    <td style="background:#fff;padding:36px 48px 8px;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">
      <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:${DARK};">What happens next?</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

        <tr>
          <td style="vertical-align:top;width:48px;padding:0 0 20px;">
            <div style="width:36px;height:36px;background:${PINK_LIGHT};border-radius:50%;text-align:center;line-height:36px;font-size:16px;">📋</div>
          </td>
          <td style="vertical-align:top;padding:0 0 20px;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${DARK};">We review your details</p>
            <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">Our clinical team looks over ${d.pet_name}'s condition and medical background.</p>
          </td>
        </tr>

        <tr>
          <td style="vertical-align:top;width:48px;padding:0 0 20px;">
            <div style="width:36px;height:36px;background:${PINK_LIGHT};border-radius:50%;text-align:center;line-height:36px;font-size:16px;">📞</div>
          </td>
          <td style="vertical-align:top;padding:0 0 20px;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${DARK};">We reach out within 1 business day</p>
            <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">We'll call or WhatsApp you to discuss the assessment and answer questions.</p>
          </td>
        </tr>

        <tr>
          <td style="vertical-align:top;width:48px;">
            <div style="width:36px;height:36px;background:${PINK_LIGHT};border-radius:50%;text-align:center;line-height:36px;font-size:16px;">📅</div>
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${DARK};">We schedule your visit</p>
            <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">We lock in a date and time that works for you and ${d.pet_name}.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>

  <!-- ===== CTA ===== -->
  <tr>
    <td style="background:#fff;padding:32px 48px 40px;text-align:center;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">

      <!-- WhatsApp button -->
      <a href="https://wa.me/6587987554"
         style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:15px 40px;border-radius:8px;letter-spacing:0.2px;">
        💬&nbsp; Chat on WhatsApp
      </a>

      <p style="margin:14px 0 0;font-size:13px;color:${MUTED};">
        Or call us at <a href="tel:62916881" style="color:${PINK};font-weight:600;text-decoration:none;">6291 6881</a>
      </p>

    </td>
  </tr>

  ${emailFooter(false)}

</table>
<!-- /Email card -->

</td></tr>
</table>
<!-- /Page wrapper -->

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
    d.has_pain         !== undefined ? dataRow('Showing pain',    yesNo(d.has_pain))         : '',
    d.vet_friendly     !== undefined ? dataRow('Vet friendly',    yesNo(d.vet_friendly))     : '',
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
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:${FONT};">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${PAGE_BG};">
<tr><td align="center" style="padding:32px 16px;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">

  ${emailHeader()}

  <!-- ===== ALERT BANNER ===== -->
  <tr>
    <td style="background:${DARK};padding:16px 48px;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td>
            <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:${GOLD};">Internal Notification</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#fff;">
              New Lead: ${d.owner_name}
              ${d.pet_name ? `<span style="color:${PINK};"> &bull; ${d.pet_name}</span>` : ''}
              ${d.breed ? `<span style="font-size:14px;font-weight:500;color:rgba(255,255,255,0.6);"> (${d.breed})</span>` : ''}
            </p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="display:inline-block;background:${PINK};color:#fff;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;white-space:nowrap;">New</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ===== DATA SECTIONS ===== -->
  <tr>
    <td style="background:#fff;padding:32px 48px 24px;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">

      ${sectionLabel('Owner Information')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${DIVIDER};border-radius:8px;overflow:hidden;margin-bottom:8px;">
        ${ownerRows}
      </table>

      ${sectionLabel('Pet Details')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${DIVIDER};border-radius:8px;overflow:hidden;margin-bottom:8px;">
        ${petRows}
      </table>

      ${healthRows ? `
      ${sectionLabel('Health & Mobility')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${DIVIDER};border-radius:8px;overflow:hidden;margin-bottom:8px;">
        ${healthRows}
      </table>` : ''}

    </td>
  </tr>

  <!-- ===== CTA ===== -->
  <tr>
    <td style="background:#fff;padding:8px 48px 40px;text-align:center;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">
      <a href="https://app.rehabvet.com/leads"
         style="display:inline-block;background:${PINK};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:15px 40px;border-radius:8px;letter-spacing:0.2px;">
        View Lead in Dashboard &rarr;
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

// ─── Send both emails via Resend ─────────────────────────────────────────────
export async function sendLeadEmails(data: LeadEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping emails')
    await tgAlert(
      `🔴 <b>RehabVet Alert</b>\n\n<b>RESEND_API_KEY missing in Railway</b>\n\n<b>Customer:</b> ${data.owner_name}\n<b>Email:</b> ${data.owner_email}\n<b>Pet:</b> ${data.pet_name}`
    )
    return
  }

  const firstName = data.owner_name.split(' ')[0]
  const FROM = 'RehabVet <hello@rehabvet.com>'

  await Promise.allSettled([
    // 1. Customer confirmation
    getResend().emails.send({
      from: FROM,
      to: data.owner_email,
      subject: `${firstName}, we've received your request for ${data.pet_name} 🐾`,
      html: customerHtml(data),
    }).then(r => console.log('[email] Customer sent:', r.data?.id))
      .catch(async (e) => {
        console.error('[email] Customer email failed:', e)
        await tgAlert(
          `🔴 <b>Customer email FAILED</b>\n\n<b>To:</b> ${data.owner_email}\n<b>Customer:</b> ${data.owner_name}\n<b>Pet:</b> ${data.pet_name}\n\n<b>Error:</b> <code>${String(e?.message ?? e).slice(0, 300)}</code>`
        )
      }),

    // 2. Internal lead alert
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
