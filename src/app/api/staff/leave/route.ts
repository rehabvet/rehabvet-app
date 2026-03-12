import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/staff/leave?staff_id=xxx   — all leave for a staff member
// GET /api/staff/leave?from=YYYY-MM-DD&to=YYYY-MM-DD  — leave in range (for calendar)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const staffId = req.nextUrl.searchParams.get('staff_id')
    const from = req.nextUrl.searchParams.get('from')
    const to   = req.nextUrl.searchParams.get('to')

    if (staffId) {
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, staff_id, start_date::text, end_date::text, reason, created_at
        FROM staff_leave
        WHERE staff_id = $1::uuid
        ORDER BY start_date ASC
      `, staffId)
      return NextResponse.json({ leave: rows })
    }

    if (from && to) {
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, staff_id, start_date::text, end_date::text, reason
        FROM staff_leave
        WHERE start_date <= $2::date AND end_date >= $1::date
        ORDER BY start_date ASC
      `, from, to)
      return NextResponse.json({ leave: rows })
    }

    // All leave
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, staff_id, start_date::text, end_date::text, reason, created_at
      FROM staff_leave
      ORDER BY start_date ASC
    `)
    return NextResponse.json({ leave: rows })
  } catch (e: any) {
    console.error('[GET /api/staff/leave]', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

// POST /api/staff/leave  — add a leave period
// Body: { staff_id, start_date, end_date, reason? }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { staff_id, start_date, end_date, reason } = await req.json()
    if (!staff_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'staff_id, start_date and end_date required' }, { status: 400 })
    }
    if (end_date < start_date) {
      return NextResponse.json({ error: 'end_date must be >= start_date' }, { status: 400 })
    }

    const [row] = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO staff_leave (staff_id, start_date, end_date, reason)
      VALUES ($1::uuid, $2::date, $3::date, $4)
      RETURNING id, staff_id, start_date::text, end_date::text, reason, created_at
    `, staff_id, start_date, end_date, reason || null)

    return NextResponse.json({ leave: row })
  } catch (e: any) {
    console.error('[POST /api/staff/leave]', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/staff/leave  — delete a leave period
// Body: { id }
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.$executeRawUnsafe(`DELETE FROM staff_leave WHERE id = $1::uuid`, id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[DELETE /api/staff/leave]', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
