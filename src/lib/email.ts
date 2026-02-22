import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'hello@rehabvet.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export interface AppointmentEmailData {
  owner_name: string
  owner_email: string
  pet_name: string
  breed?: string
  clinic_name?: string
  attending_vet?: string
  condition?: string
}

function appointmentConfirmationHtml(data: AppointmentEmailData): string {
  const firstName = data.owner_name.split(' ')[0]
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>We've received your request</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#EC6496 0%,#d44a7e 100%);padding:36px 40px;text-align:center;">
            <img src="https://rehabvet.com/wp-content/uploads/2023/01/rehabvet-logo.png" alt="RehabVet" height="44" style="display:block;margin:0 auto 12px;" />
            <p style="margin:0;color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Singapore's First Vet Rehab Clinic</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">
              Hi ${firstName} 👋
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              We've received your appointment request for <strong style="color:#111827;">${data.pet_name}</strong>. Our team will review the details and confirm your appointment shortly.
            </p>

            <!-- Details card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f7;border-radius:12px;border:1px solid #fce7f3;margin-bottom:28px;">
              <tr><td style="padding:24px 28px;">
                <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#EC6496;">Your Request Summary</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;width:40%;">Pet name</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${data.pet_name}${data.breed ? ' (' + data.breed + ')' : ''}</td>
                  </tr>
                  ${data.clinic_name ? `
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;">Referring clinic</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${data.clinic_name}</td>
                  </tr>` : ''}
                  ${data.attending_vet ? `
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;">Attending vet</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${data.attending_vet}</td>
                  </tr>` : ''}
                  ${data.condition ? `
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;vertical-align:top;">Condition</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${data.condition}</td>
                  </tr>` : ''}
                </table>
              </td></tr>
            </table>

            <!-- What's next -->
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;">What happens next?</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              ${[
                ['📋', 'We review your details', 'Our clinical team looks over your pet\'s condition and history.'],
                ['📞', 'We reach out within 1 day', 'We\'ll call or WhatsApp you to discuss the assessment.'],
                ['📅', 'Schedule your visit', 'We\'ll confirm a date and time that works for you.'],
              ].map(([icon, title, desc]) => `
              <tr>
                <td style="vertical-align:top;padding:8px 0;width:36px;font-size:20px;">${icon}</td>
                <td style="padding:8px 0;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#111827;">${title}</p>
                  <p style="margin:0;font-size:13px;color:#6b7280;">${desc}</p>
                </td>
              </tr>`).join('')}
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td align="center">
                <a href="https://wa.me/6587987554" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:50px;">
                  💬 WhatsApp Us Directly
                </a>
              </td></tr>
            </table>

            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
              If you have any urgent questions, you can also reach us at <a href="tel:62916881" style="color:#EC6496;text-decoration:none;">6291 6881</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">RehabVet Clinic · 513 Serangoon Road #01-01, Singapore 218154</p>
            <p style="margin:0;font-size:12px;color:#d1d5db;">
              <a href="https://rehabvet.com" style="color:#EC6496;text-decoration:none;">rehabvet.com</a>
              &nbsp;·&nbsp;
              <a href="https://www.instagram.com/rehabvet_sg/" style="color:#EC6496;text-decoration:none;">@rehabvet_sg</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`
}

export async function sendAppointmentConfirmation(data: AppointmentEmailData) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.warn('[email] GMAIL_APP_PASSWORD not set — skipping email')
    return
  }

  try {
    const result = await transporter.sendMail({
      from: '"RehabVet" <hello@rehabvet.com>',
      to: data.owner_email,
      subject: `We've received your request for ${data.pet_name} 🐾`,
      html: appointmentConfirmationHtml(data),
    })
    console.log('[email] Sent appointment confirmation:', result.messageId)
    return result
  } catch (err) {
    console.error('[email] Failed to send:', err)
  }
}
