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
      c.id, c.client_number, c.first_name, c.last_name, c.name,
      c.email, c.phone, c.address, c.created_at,
      COUNT(DISTINCT p.id)::int AS pet_count,
      COUNT(DISTINCT a.id)::int AS appt_count,
      string_agg(DISTINCT p.name, \', \') AS pets
    FROM clients c
    LEFT JOIN patients p ON p.client_id = c.id
    LEFT JOIN appointments a ON a.client_id = c.id
    GROUP BY c.id, c.client_number, c.first_name, c.last_name, c.name, c.email, c.phone, c.address, c.created_at
    ORDER BY c.name ASC
  `)

  const headers = ['ID','Client #','First Name','Last Name','Full Name','Email','Phone','Address','Pets','Pet Count','Appt Count','Created At']
  const csvRows = [headers.join(',')]
  for (const r of rows) {
    csvRows.push([
      r.id, r.client_number, r.first_name, r.last_name, r.name,
      r.email, r.phone, r.address, r.pets, r.pet_count, r.appt_count, r.created_at
    ].map(escapeCSV).join(','))
  }

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().slice(0,10)}.csv"`,
    }
  })
}
