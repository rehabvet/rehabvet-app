import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { renderToBuffer } from '@react-pdf/renderer'
import MedicalHistoryPDF from '@/components/MedicalHistoryPDF'
import fs from 'fs'
import path from 'path'

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
     WHERE p.id = $1::uuid LIMIT 1`,
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
    WHERE vr.patient_id = $1::uuid
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
    const placeholders = visitIds.map((_: any, i: number) => `$${i + 1}::uuid`).join(',')
    lineItems = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ili.*, i.visit_id, i.bill_number FROM invoice_line_items ili
       JOIN invoices i ON i.id = ili.invoice_id::uuid
       WHERE i.visit_id IN (${placeholders})`,
      ...visitIds
    )
  }

  // Serialize: convert Prisma Decimal/Date objects to plain JS primitives
  function serialize(obj: any): any {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'bigint') return Number(obj)
    if (obj instanceof Date) return obj.toISOString()
    if (typeof obj === 'object' && typeof obj.toFixed === 'function') return Number(obj) // Prisma Decimal
    if (Array.isArray(obj)) return obj.map(serialize)
    if (typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serialize(v)]))
    return obj
  }

  const visitsWithItems = visits.map((v: any) => serialize({
    ...v,
    lineItems: lineItems.filter((li: any) => li.visit_id === v.id),
  }))
  const safePatient = serialize(patient)

  // Load logo from local public folder — no outbound HTTP needed
  let logoDataUrl: string | null = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'rehabvet-logo.jpg')
    const logoBuffer = fs.readFileSync(logoPath)
    logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`
  } catch { /* logo missing — PDF renders without it */ }

  // Generate PDF using JSX (avoids createElement type issues with ESM package)
  try {
    const buffer = await renderToBuffer(
      <MedicalHistoryPDF
        patient={safePatient}
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
