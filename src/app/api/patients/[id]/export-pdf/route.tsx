import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { renderToBuffer } from '@react-pdf/renderer'
import MedicalHistoryPDF from '@/components/MedicalHistoryPDF'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const url = req.nextUrl
  const fromDate = url.searchParams.get('from') // YYYY-MM-DD
  const toDate   = url.searchParams.get('to')   // YYYY-MM-DD

  // Fetch patient + client
  const patients = await prisma.$queryRawUnsafe<any[]>(
    `SELECT p.*, c.name as client_name, c.phone as client_phone, c.email as client_email
     FROM patients p
     LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.id = $1 LIMIT 1`,
    id
  )
  if (patients.length === 0) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  const patient = patients[0]

  // Fetch visits with optional date range
  let visitQuery = `
    SELECT vr.*, 
           u.name as staff_name
    FROM visit_records vr
    LEFT JOIN users u ON u.id = vr.staff_id
    WHERE vr.patient_id = $1
  `
  const queryParams: any[] = [id]
  if (fromDate) { queryParams.push(fromDate); visitQuery += ` AND vr.visit_date >= $${queryParams.length}` }
  if (toDate)   { queryParams.push(toDate);   visitQuery += ` AND vr.visit_date <= $${queryParams.length}` }
  visitQuery += ' ORDER BY vr.visit_date ASC, vr.created_at ASC'

  const visits = await prisma.$queryRawUnsafe<any[]>(visitQuery, ...queryParams)

  // Fetch invoice line items for these visits
  const visitIds = visits.map((v: any) => v.id)
  let lineItems: any[] = []
  if (visitIds.length > 0) {
    const placeholders = visitIds.map((_: any, i: number) => `$${i + 1}`).join(',')
    lineItems = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ili.*, i.visit_id, i.bill_number FROM invoice_line_items ili
       JOIN invoices i ON i.id = ili.invoice_id
       WHERE i.visit_id IN (${placeholders})`,
      ...visitIds
    )
  }

  // Attach line items to visits
  const visitsWithItems = visits.map((v: any) => ({
    ...v,
    lineItems: lineItems.filter((li: any) => li.visit_id === v.id),
  }))

  // Pre-fetch logo as base64 so Railway doesn't need outbound image requests during PDF render
  let logoDataUrl: string | null = null
  try {
    const logoRes = await fetch('https://rehabvet.com/wp-content/uploads/2024/01/rehabvet-logo.png', { signal: AbortSignal.timeout(5000) })
    if (logoRes.ok) {
      const logoBuffer = await logoRes.arrayBuffer()
      logoDataUrl = `data:image/png;base64,${Buffer.from(logoBuffer).toString('base64')}`
    }
  } catch { /* logo fetch failed — PDF will render without logo */ }

  // Generate PDF using JSX (avoids createElement type issues with ESM package)
  try {
    const buffer = await renderToBuffer(
      <MedicalHistoryPDF
        patient={patient}
        visits={visitsWithItems}
        fromDate={fromDate || null}
        toDate={toDate || null}
        generatedAt={new Date().toISOString()}
        logoDataUrl={logoDataUrl}
      />
    )

    const filename = `RehabVet_MedicalHistory_${patient.name.replace(/\s+/g, '_')}.pdf`
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    console.error('PDF generation error:', err?.message || err, err?.stack)
    return NextResponse.json({ error: 'PDF generation failed', detail: err?.message || String(err) }, { status: 500 })
  }
}
