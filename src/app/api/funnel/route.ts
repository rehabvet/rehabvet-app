import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Public endpoint — no auth required (anonymous tracking)
export async function POST(req: NextRequest) {
  try {
    const { session_id, event, referrer, device } = await req.json()
    if (!session_id || !event) return NextResponse.json({ ok: false })

    const valid = ['landed','step1','step2','step3','step4','submitted']
    if (!valid.includes(event)) return NextResponse.json({ ok: false })

    await prisma.$queryRawUnsafe(
      `INSERT INTO booking_funnel_events (session_id, event, referrer, device) VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      session_id, event, referrer || null, device || null
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

// Admin: get funnel stats
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = req.nextUrl
    const days = parseInt(searchParams.get('days') || '30')

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      WITH sessions AS (
        SELECT
          session_id,
          MAX(CASE WHEN event = 'landed'    THEN 1 ELSE 0 END) AS landed,
          MAX(CASE WHEN event = 'step1'     THEN 1 ELSE 0 END) AS step1,
          MAX(CASE WHEN event = 'step2'     THEN 1 ELSE 0 END) AS step2,
          MAX(CASE WHEN event = 'step3'     THEN 1 ELSE 0 END) AS step3,
          MAX(CASE WHEN event = 'step4'     THEN 1 ELSE 0 END) AS step4,
          MAX(CASE WHEN event = 'submitted' THEN 1 ELSE 0 END) AS submitted,
          MIN(created_at) AS first_seen
        FROM booking_funnel_events
        WHERE created_at >= NOW() - INTERVAL '1 day' * $1
        GROUP BY session_id
      )
      SELECT
        COUNT(*)::int                                       AS total_sessions,
        SUM(landed)::int                                    AS landed,
        SUM(step1)::int                                     AS started_step1,
        SUM(step2)::int                                     AS started_step2,
        SUM(step3)::int                                     AS started_step3,
        SUM(step4)::int                                     AS started_step4,
        SUM(submitted)::int                                 AS submitted
      FROM sessions
    `, days)

    // Daily trend
    const daily = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Singapore') AS day,
        COUNT(DISTINCT CASE WHEN event = 'landed'    THEN session_id END)::int AS landed,
        COUNT(DISTINCT CASE WHEN event = 'step1'     THEN session_id END)::int AS step1,
        COUNT(DISTINCT CASE WHEN event = 'submitted' THEN session_id END)::int AS submitted
      FROM booking_funnel_events
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Singapore')
      ORDER BY day DESC
    `, days)

    return NextResponse.json({ stats: rows[0], daily })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
