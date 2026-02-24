// Campaign email wrapper
export { type Block, renderBlocks } from './blocks'

const PINK      = '#EC6496'
const PINK_DARK = '#d4507e'
const FONT      = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

const DARK_CSS = `
  @media (prefers-color-scheme: dark) {
    body, .ev-pagebg { background-color: #0f172a !important; }
    .ev-hdr  { background-color: #ffffff !important; }
    .ev-cell { background-color: #1e293b !important; border-left-color: #334155 !important; border-right-color: #334155 !important; }
    .ev-foot { background-color: #1e293b !important; border-left-color: #334155 !important; border-right-color: #334155 !important; }
    .ev-h1, .ev-h2  { color: #f1f5f9 !important; }
    .ev-p   { color: #94a3b8 !important; }
    .ev-foot-brand { color: #f1f5f9 !important; }
    .ev-foot-sub   { color: #475569 !important; }
    .ev-foot-link  { color: ${PINK} !important; }
    .ev-foot-legal { color: #334155 !important; }
    .ev-divider    { border-top-color: #334155 !important; }
  }
`

export function wrapCampaignEmail(
  bodyHtml: string,
  recipientName: string,
  recipientEmail: string,
  campaignId: string
): string {
  const firstName = recipientName.split(' ')[0]
  const token = Buffer.from(recipientEmail).toString('base64url')
  const unsubUrl = `https://app.rehabvet.com/unsubscribe?email=${encodeURIComponent(recipientEmail)}&token=${token}`
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>RehabVet</title>
  <style>${DARK_CSS}</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:${FONT};">

<table class="ev-pagebg" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f7;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">

  <!-- HEADER -->
  <tr>
    <td class="ev-hdr" style="background:#ffffff;border-radius:12px 12px 0 0;border-top:4px solid ${PINK};border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 48px 20px;text-align:center;">
            <img src="https://rehabvet.com/wp-content/uploads/2025/02/logo.webp"
                 alt="RehabVet" height="44"
                 style="display:block;margin:0 auto;height:44px;max-width:200px;"/>
          </td>
        </tr>
        <tr><td style="background:linear-gradient(90deg,${PINK} 0%,${PINK_DARK} 100%);height:3px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td class="ev-cell" style="background:#ffffff;padding:40px 48px 32px;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      ${bodyHtml}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td class="ev-foot" style="background:#ffffff;padding:0;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 48px;"><div class="ev-divider" style="border-top:1px solid #f0f0f0;"></div></td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="ev-foot" style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px 48px 32px;text-align:center;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
      <div style="font-size:20px;margin-bottom:8px;">🐾</div>
      <p class="ev-foot-brand" style="margin:0 0 3px;font-size:13px;font-weight:800;color:#111827;">RehabVet</p>
      <p class="ev-foot-sub" style="margin:0 0 12px;font-size:11px;color:#9ca3af;">Singapore's First Veterinary Rehabilitation Centre</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
        <tr><td align="center">
          <a href="tel:62916881"               class="ev-foot-link" style="color:#9ca3af;text-decoration:none;font-size:11px;margin:0 5px;">📞 6291 6881</a>
          <a href="https://wa.me/6587987554"   class="ev-foot-link" style="color:#9ca3af;text-decoration:none;font-size:11px;margin:0 5px;">💬 WhatsApp</a>
          <a href="mailto:hello@rehabvet.com"  class="ev-foot-link" style="color:#9ca3af;text-decoration:none;font-size:11px;margin:0 5px;">✉️ hello@rehabvet.com</a>
        </td></tr>
      </table>
      <p class="ev-foot-sub" style="margin:0 0 10px;font-size:11px;color:#9ca3af;">513 Serangoon Road, #01-01, Singapore 218154</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
        <tr><td align="center">
          <a href="https://rehabvet.com"                   class="ev-foot-link" style="color:${PINK};font-size:11px;font-weight:600;text-decoration:none;margin:0 4px;">Website</a>
          <span style="color:#e5e7eb;font-size:11px;">|</span>
          <a href="https://www.instagram.com/rehabvet_sg/" class="ev-foot-link" style="color:${PINK};font-size:11px;font-weight:600;text-decoration:none;margin:0 4px;">Instagram</a>
          <span style="color:#e5e7eb;font-size:11px;">|</span>
          <a href="https://www.facebook.com/rehabvet.sg"   class="ev-foot-link" style="color:${PINK};font-size:11px;font-weight:600;text-decoration:none;margin:0 4px;">Facebook</a>
        </td></tr>
      </table>
      <p class="ev-foot-legal" style="margin:0;font-size:10px;color:#d1d5db;line-height:1.6;">
        Hi ${firstName}, you're receiving this as a RehabVet client at ${recipientEmail}.<br/>
        <a href="${unsubUrl}" style="color:#d1d5db;text-decoration:underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        &copy; ${year} RehabVet Veterinary Rehabilitation Centre Pte. Ltd.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
