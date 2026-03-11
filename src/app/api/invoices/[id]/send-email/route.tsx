import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { Resend } from 'resend'
import InvoicePDF from '@/components/InvoicePDF'
import fs from 'fs'
import path from 'path'

function getResend() {
  const key = process.env.RESEND_KEY_B64
    ? Buffer.from(process.env.RESEND_KEY_B64, 'base64').toString('utf8').trim()
    : process.env.RESEND_API_KEY
  return new Resend(key)
}

function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj)
  if (obj instanceof Date) return obj.toISOString()
  if (typeof obj === 'object' && typeof obj.toFixed === 'function') return Number(obj)
  if (Array.isArray(obj)) return obj.map(serialize)
  if (typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serialize(v)]))
  return obj
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const recipientEmail: string | undefined = body.email?.trim()

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: 'Valid email address required' }, { status: 400 })
  }

  // Fetch full invoice
  const invoices = await prisma.$queryRawUnsafe<any[]>(`
    SELECT i.*, 
           c.name AS client_name, c.phone AS client_phone, c.email AS client_email,
           p.name AS patient_name, p.species AS patient_species, p.breed AS patient_breed,
           vr.visit_date
    FROM invoices i
    LEFT JOIN clients  c  ON c.id  = i.client_id
    LEFT JOIN patients p  ON p.id  = i.patient_id
    LEFT JOIN visit_records vr ON vr.id = i.visit_id
    WHERE i.id = $1::uuid LIMIT 1
  `, params.id)
  if (!invoices.length) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const lineItems = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY created_at ASC
  `, params.id)

  const payments = await prisma.$queryRawUnsafe<any[]>(`
    SELECT p.*, u.name AS recorded_by_name
    FROM payments p
    LEFT JOIN users u ON u.id = p.recorded_by
    WHERE p.invoice_id = $1::uuid
    ORDER BY p.created_at ASC
  `, params.id)

  const invoice  = serialize(invoices[0])
  const safeItems = lineItems.map(serialize)
  const safePays  = payments.map(serialize)

  // Load logo
  let logoDataUrl: string | null = null
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'rehabvet-logo.jpg'))
    logoDataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {}

  // Generate PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      <InvoicePDF
        invoice={invoice}
        lineItems={safeItems}
        payments={safePays}
        logoDataUrl={logoDataUrl}
      />
    ) as unknown as Buffer
  } catch (err: any) {
    console.error('Invoice PDF error:', err?.message, err?.stack)
    return NextResponse.json({ error: 'PDF generation failed', detail: err?.message || String(err) }, { status: 500 })
  }

  // Build email HTML
  const total = Number(invoice.total || 0).toFixed(2)
  const isPaid = invoice.status === 'paid'
  const patientName = invoice.patient_name || 'your pet'
  const clientName = invoice.client_name || 'Valued Client'
  const invoiceNum = invoice.invoice_number

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#e91e8c,#f472b6);padding:28px 32px;">
    <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">RehabVet Pte Ltd</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">513 Serangoon Road, #01-01, Singapore 218154</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;font-size:15px;color:#0f172a;">Dear <strong>${clientName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Please find attached your invoice for ${patientName}'s treatment at RehabVet.
      ${isPaid ? 'This invoice has been <strong style="color:#16a34a;">paid in full</strong>. Thank you!' : 'Payment is due upon receipt.'}
    </p>

    <!-- Invoice card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Invoice Details</p>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <table width="100%">
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:6px;">Invoice Number</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${invoiceNum}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:6px;">Patient</td>
            <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${patientName}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:6px;">Date</td>
            <td style="font-size:13px;color:#0f172a;text-align:right;">${invoice.date ? new Date(invoice.date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
          </tr>
          <tr>
            <td style="font-size:16px;font-weight:700;color:#0f172a;padding-top:12px;border-top:1px solid #e2e8f0;">Total</td>
            <td style="font-size:16px;font-weight:700;color:#e91e8c;text-align:right;padding-top:12px;border-top:1px solid #e2e8f0;">S$${total}</td>
          </tr>
          ${isPaid ? `<tr><td colspan="2" style="padding-top:8px;"><span style="background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">✓ PAID IN FULL</span></td></tr>` : ''}
        </table>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;font-size:13px;color:#64748b;">The full invoice is attached as a PDF to this email.</p>

    <p style="margin:0;font-size:14px;color:#0f172a;">Thank you for choosing RehabVet! 🐾</p>
    <p style="margin:4px 0 0;font-size:13px;color:#64748b;">We look forward to seeing ${patientName} again.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      RehabVet Pte Ltd · 513 Serangoon Road, #01-01, Singapore 218154<br>
      Tel: 6291 6881 · <a href="mailto:hello@rehabvet.com" style="color:#e91e8c;text-decoration:none;">hello@rehabvet.com</a> · <a href="https://rehabvet.com" style="color:#e91e8c;text-decoration:none;">rehabvet.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  // Send via Resend
  const resend = getResend()
  const { error } = await resend.emails.send({
    from: 'RehabVet Pte Ltd <hello@rehabvet.com>',
    to: [recipientEmail],
    replyTo: 'hello@rehabvet.com',
    subject: `Invoice ${invoiceNum} from RehabVet${isPaid ? ' — Paid' : ''}`,
    html,
    attachments: [{
      filename: `RehabVet_Invoice_${invoiceNum}.pdf`,
      content: pdfBuffer.toString('base64'),
    }],
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Email send failed', detail: error.message }, { status: 500 })
  }

  // Log the send on the invoice
  await prisma.$queryRawUnsafe(
    `UPDATE invoices SET notes = COALESCE(notes || E'\\n', '') || $1 WHERE id = $2::uuid`,
    `[Email sent to ${recipientEmail} on ${new Date().toLocaleDateString('en-SG')}]`,
    params.id
  ).catch(() => {})

  return NextResponse.json({ ok: true, sent_to: recipientEmail })
}
