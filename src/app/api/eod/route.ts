import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const DEFAULT_FLOAT = 68.00
const METHODS = ['cash', 'card', 'bank_transfer', 'paynow', 'other']
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card (NETS/Visa/MC)', bank_transfer: 'Bank Transfer', paynow: 'PayNow', other: 'Other',
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]

  // Check if already submitted
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT e.*, u.name as submitted_by_name FROM eod_closings e LEFT JOIN users u ON u.id = e.created_by WHERE e.date = $1 LIMIT 1`, date
  )

  // Pull all payments for this date joined to invoices
  const payments = await prisma.$queryRawUnsafe<any[]>(`
    SELECT p.method, p.amount, p.date as payment_date,
           i.invoice_number, i.total as invoice_total,
           c.name as client_name, pat.name as patient_name
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN patients pat ON pat.id = i.patient_id
    WHERE p.date = $1 OR (p.paid_at::date = $1::date)
    ORDER BY p.method, i.invoice_number
  `, date)

  // Group by method
  const byMethod: Record<string, number> = {}
  for (const m of METHODS) byMethod[m] = 0
  for (const p of payments) {
    const m = p.method || 'other'
    byMethod[m] = (byMethod[m] || 0) + parseFloat(p.amount || 0)
  }

  const payments_by_method = METHODS.map(m => ({
    method: m,
    label: METHOD_LABELS[m],
    expected: parseFloat(byMethod[m].toFixed(2)),
  }))

  // Get float_in from previous EOD
  const prevEod = await prisma.$queryRawUnsafe<any[]>(
    `SELECT float_out FROM eod_closings WHERE date < $1 ORDER BY date DESC LIMIT 1`, date
  )
  const float_in = prevEod.length > 0 ? parseFloat(prevEod[0].float_out) : DEFAULT_FLOAT

  // Invoice breakdown
  const invoices = payments.map(p => ({
    invoice_number: p.invoice_number,
    client_name: p.client_name,
    patient_name: p.patient_name,
    amount: parseFloat(p.amount || 0),
    method: p.method || 'other',
    method_label: METHOD_LABELS[p.method || 'other'],
  }))

  return NextResponse.json({
    date,
    existing_eod: existing[0] || null,
    payments_by_method,
    invoices,
    float_in,
    total_expected: parseFloat(Object.values(byMethod).reduce((a, b) => a + b, 0).toFixed(2)),
    invoice_count: payments.length,
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, float_in, float_out, cash_counted, payment_breakdown, notes, total_expected, invoice_count, invoices } = body

  const banking = parseFloat(cash_counted || 0) - parseFloat(float_out || 0)
  const total_counted = payment_breakdown.reduce((s: number, m: any) => s + parseFloat(m.counted || 0), 0)
  const total_variance = total_counted - parseFloat(total_expected || 0)

  // Upsert
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM eod_closings WHERE date = $1 LIMIT 1`, date
  )
  let eodId: string
  if (existing.length > 0) {
    await prisma.$queryRawUnsafe(
      `UPDATE eod_closings SET float_in=$1, float_out=$2, banking=$3, payment_breakdown=$4::jsonb,
       total_expected=$5, total_counted=$6, total_variance=$7, invoice_count=$8,
       notes=$9, submitted_at=NOW(), updated_at=NOW(), created_by=$10::uuid WHERE date=$11`,
      float_in, float_out, banking, JSON.stringify(payment_breakdown),
      total_expected, total_counted, total_variance, invoice_count,
      notes || null, user.id, date
    )
    eodId = existing[0].id
  } else {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO eod_closings (date, float_in, float_out, banking, payment_breakdown,
       total_expected, total_counted, total_variance, invoice_count, notes, submitted_at, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,NOW(),$11::uuid) RETURNING id`,
      date, float_in, float_out, banking, JSON.stringify(payment_breakdown),
      total_expected, total_counted, total_variance, invoice_count,
      notes || null, user.id
    )
    eodId = rows[0].id
  }

  // Send email via Resend
  try {
    const keyB64 = process.env.RESEND_KEY_B64 || ''
    const apiKey = keyB64 ? Buffer.from(keyB64, 'base64').toString('utf8').trim() : process.env.RESEND_API_KEY || ''
    if (apiKey) {
      const methodRows = payment_breakdown.map((m: any) =>
        `<tr><td>${m.label}</td><td>S$${parseFloat(m.expected).toFixed(2)}</td><td>S$${parseFloat(m.counted).toFixed(2)}</td><td style="color:${Math.abs(m.variance)>5?'#dc2626':Math.abs(m.variance)>0?'#d97706':'#16a34a'}">S$${parseFloat(m.variance).toFixed(2)}</td></tr>`
      ).join('')
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'RehabVet <hello@rehabvet.com>',
          to: ['hello@rehabvet.com'],
          subject: `EOD Cash-Up — ${date}`,
          html: `
            <h2>End of Day Cash-Up: ${date}</h2>
            <p>Submitted by: <strong>${user.name}</strong></p>
            <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
              <tr><th>Method</th><th>Expected</th><th>Counted</th><th>Variance</th></tr>
              ${methodRows}
              <tr style="font-weight:bold"><td>TOTAL</td><td>S$${parseFloat(total_expected).toFixed(2)}</td><td>S$${total_counted.toFixed(2)}</td><td>S$${total_variance.toFixed(2)}</td></tr>
            </table>
            <br/>
            <table border="1" cellpadding="6" style="border-collapse:collapse">
              <tr><td><strong>Float In</strong></td><td>S$${parseFloat(float_in).toFixed(2)}</td></tr>
              <tr><td><strong>Cash Counted</strong></td><td>S$${parseFloat(cash_counted).toFixed(2)}</td></tr>
              <tr><td><strong>Float Out</strong></td><td>S$${parseFloat(float_out).toFixed(2)}</td></tr>
              <tr><td><strong>Banking Today</strong></td><td>S$${banking.toFixed(2)}</td></tr>
            </table>
            <br/><p><strong>Total Invoices:</strong> ${invoice_count}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          `,
        }),
      })
    }
  } catch (e) { console.error('EOD email error:', e) }

  return NextResponse.json({ success: true, id: eodId })
}
