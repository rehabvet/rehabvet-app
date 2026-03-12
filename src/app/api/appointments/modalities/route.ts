import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET — return distinct modality values from appointments for filter dropdowns
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRaw<{ modality: string }[]>`
    SELECT DISTINCT modality
    FROM appointments
    WHERE modality IS NOT NULL AND modality <> ''
    ORDER BY modality ASC
  `

  const modalities = rows.map(r => r.modality)
  return NextResponse.json({ modalities })
}
