import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT e.*, u.name as submitted_by_name FROM eod_closings e LEFT JOIN users u ON u.id = e.created_by WHERE e.id = $1::uuid LIMIT 1`,
    params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const e = rows[0]
  const breakdown: any[] = typeof e.payment_breakdown === 'string' ? JSON.parse(e.payment_breakdown) : e.payment_breakdown

  const methodRows = breakdown.map(m => `
    <tr>
      <td>${m.label}</td>
      <td class="num">S$${parseFloat(m.expected).toFixed(2)}</td>
      <td class="num">${m.method === 'cash' ? `S$${parseFloat(m.counted).toFixed(2)}` : '—'}</td>
      <td class="num" style="color:${Math.abs(m.variance) > 5 ? '#dc2626' : Math.abs(m.variance) > 0 ? '#d97706' : '#16a34a'}">${m.method === 'cash' ? `S$${parseFloat(m.variance).toFixed(2)}` : '—'}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>EOD Cash-Up — ${e.date}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; font-family: Arial, sans-serif; }
  body { color: #1a1a2e; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #EC6496; padding-bottom: 12px; }
  .logo { font-size: 22px; font-weight: bold; color: #EC6496; }
  .logo span { display: block; font-size: 12px; font-weight: normal; color: #6b7280; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #EC6496; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
  .num { text-align: right; }
  .total-row td { font-weight: bold; background: #f9fafb; }
  .section-title { font-size: 14px; font-weight: bold; color: #1a1a2e; margin: 20px 0 8px; border-left: 4px solid #EC6496; padding-left: 8px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
  .summary-box .label { font-size: 11px; color: #6b7280; margin-bottom: 2px; }
  .summary-box .value { font-size: 18px; font-weight: bold; color: #1a1a2e; }
  .summary-box.highlight .value { color: #EC6496; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">🐾 RehabVet<span>Veterinary Rehabilitation Centre, Singapore</span></div>
  <div style="text-align:right">
    <div class="title">End of Day Cash-Up</div>
    <div class="meta">Date: <strong>${e.date}</strong></div>
    <div class="meta">Submitted by: <strong>${e.submitted_by_name || '—'}</strong></div>
    <div class="meta">Submitted at: ${new Date(e.submitted_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</div>
  </div>
</div>

<div class="section-title">Payment Summary</div>
<table>
  <thead><tr><th>Payment Method</th><th class="num">Expected (App)</th><th class="num">Counted</th><th class="num">Variance</th></tr></thead>
  <tbody>
    ${methodRows}
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="num">S$${parseFloat(e.total_expected).toFixed(2)}</td>
      <td class="num">S$${parseFloat(e.total_counted).toFixed(2)}</td>
      <td class="num" style="color:${Math.abs(e.total_variance) > 5 ? '#dc2626' : '#16a34a'}">S$${parseFloat(e.total_variance).toFixed(2)}</td>
    </tr>
  </tbody>
</table>

<div class="section-title">Cash Float & Banking</div>
<div class="summary-grid">
  <div class="summary-box"><div class="label">Float In (from previous day)</div><div class="value">S$${parseFloat(e.float_in).toFixed(2)}</div></div>
  <div class="summary-box"><div class="label">Cash Counted</div><div class="value">S$${parseFloat(e.total_counted > 0 ? breakdown.find((m:any)=>m.method==='cash')?.counted || 0 : 0).toFixed(2)}</div></div>
  <div class="summary-box"><div class="label">Float Out (left in till)</div><div class="value">S$${parseFloat(e.float_out).toFixed(2)}</div></div>
  <div class="summary-box highlight"><div class="label">Banking Today</div><div class="value">S$${parseFloat(e.banking).toFixed(2)}</div></div>
</div>

<div class="section-title">Daily Totals</div>
<div class="summary-grid">
  <div class="summary-box"><div class="label">Total Sales (App)</div><div class="value">S$${parseFloat(e.total_expected).toFixed(2)}</div></div>
  <div class="summary-box"><div class="label">Invoices Processed</div><div class="value">${e.invoice_count}</div></div>
  <div class="summary-box"><div class="label">Total Variance</div><div class="value" style="color:${Math.abs(e.total_variance)>5?'#dc2626':Math.abs(e.total_variance)>0?'#d97706':'#16a34a'}">S$${parseFloat(e.total_variance).toFixed(2)}</div></div>
  <div class="summary-box"><div class="label">Net Banking</div><div class="value">S$${parseFloat(e.banking).toFixed(2)}</div></div>
</div>

${e.notes ? `<div class="section-title">Notes</div><p style="background:#f9fafb;padding:10px;border-radius:6px;font-size:12px">${e.notes}</p>` : ''}

<div class="footer">
  <span>RehabVet Veterinary Rehabilitation Centre · 513 Serangoon Rd #01-01 Singapore 218154</span>
  <span>Printed: ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</span>
</div>

<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    }
  })
}
