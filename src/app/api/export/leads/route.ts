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
    SELECT id, created_at, status, owner_name, owner_email, owner_phone, post_code,
           pet_name, species, breed, age, weight, pet_gender,
           vet_friendly, reactive_to_pets, has_pain,
           service, condition, preferred_date, first_visit,
           clinic_name, attending_vet, how_heard, notes, staff_notes
    FROM leads
    ORDER BY created_at DESC
  `)

  const headers = ['ID','Created At','Status','Owner Name','Email','Phone','Postcode',
    'Pet Name','Species','Breed','Age','Weight','Gender',
    'Vet Friendly','Reactive','Has Pain',
    'Service','Condition','Preferred Date','First Visit',
    'Clinic','Vet','How Heard','Notes','Staff Notes']
  const csvRows = [headers.join(',')]
  for (const r of rows) {
    csvRows.push([
      r.id, r.created_at, r.status, r.owner_name, r.owner_email, r.owner_phone, r.post_code,
      r.pet_name, r.species, r.breed, r.age, r.weight, r.pet_gender,
      r.vet_friendly, r.reactive_to_pets, r.has_pain,
      r.service, r.condition, r.preferred_date, r.first_visit,
      r.clinic_name, r.attending_vet, r.how_heard, r.notes, r.staff_notes
    ].map(escapeCSV).join(','))
  }

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0,10)}.csv"`,
    }
  })
}
