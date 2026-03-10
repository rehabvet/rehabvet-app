import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/staff/roster?month=2026-03
// Returns all rostered (staff_id, date) pairs for the month
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month') // e.g. "2026-03"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month param (expected YYYY-MM)' }, { status: 400 })
  }

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT staff_id, date::text
    FROM staff_roster
    WHERE date >= $1::date AND date < ($1::date + interval '1 month')
    ORDER BY date ASC, staff_id ASC
  `, `${month}-01`)

  return NextResponse.json({ roster: rows })
}

// POST /api/staff/roster
// Body: { month: "2026-03", staff_id: "uuid", dates: ["2026-03-01", ...] }
// Replaces all roster entries for that staff member in that month
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { month, staff_id, dates } = body

  if (!month || !staff_id) {
    return NextResponse.json({ error: 'month and staff_id required' }, { status: 400 })
  }

  // Delete all existing entries for this staff member in this month
  await prisma.$executeRawUnsafe(`
    DELETE FROM staff_roster
    WHERE staff_id = $1::uuid
      AND date >= $2::date
      AND date < ($2::date + interval '1 month')
  `, staff_id, `${month}-01`)

  // Insert new entries
  if (dates && dates.length > 0) {
    const values = dates.map((_: string, i: number) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::date)`).join(', ')
    const params = dates.flatMap((d: string) => [staff_id, d])
    await prisma.$executeRawUnsafe(`
      INSERT INTO staff_roster (staff_id, date)
      VALUES ${values}
      ON CONFLICT (staff_id, date) DO NOTHING
    `, ...params)
  }

  return NextResponse.json({ ok: true })
}
