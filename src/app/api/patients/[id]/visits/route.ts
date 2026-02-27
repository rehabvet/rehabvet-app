import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      v.id, v.visit_date, v.weight_kg, v.temperature_c,
      v.clinical_examination, v.diagnosis, v.plan,
      v.treatment, v.hep, v.internal_notes, v.client_notes,
      v.created_at,
      u.name AS staff_name,
      u.id   AS staff_id
    FROM visit_records v
    LEFT JOIN users u ON u.id = v.staff_id
    WHERE v.patient_id = $1::uuid
    ORDER BY v.visit_date DESC, v.created_at DESC
  `, params.id) as any[]

  return NextResponse.json({ visits: rows })
}
