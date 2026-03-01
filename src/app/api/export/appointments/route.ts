import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const ADMIN_EMAILS = ['admin@rehabvet.com', 'sara@rehabvet.com']

function escapeCSV(v: any): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      a.id, a.date, a.start_time, a.end_time, a.status, a.modality,
      a.notes, a.created_at,
      c.name AS client_name, c.phone AS client_phone, c.email AS client_email,
      p.name AS patient_name, p.species, p.breed,
      s.name AS therapist_name
    FROM appointments a
    LEFT JOIN clients c ON a.client_id = c.id
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN staff s ON a.therapist_id = s.id
    ORDER BY a.date DESC, a.start_time DESC
  `)

  const headers = ['ID','Date','Start','End','Status','Treatment','Client','Phone','Email','Patient','Species','Breed','Therapist','Notes','Created At']
  const csvRows = [headers.join(',')]
  for (const r of rows) {
    csvRows.push([
      r.id, r.date, r.start_time, r.end_time, r.status, r.modality,
      r.client_name, r.client_phone, r.client_email,
      r.patient_name, r.species, r.breed, r.therapist_name,
      r.notes, r.created_at
    ].map(escapeCSV).join(','))
  }

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="appointments-${new Date().toISOString().slice(0,10)}.csv"`,
    }
  })
}
