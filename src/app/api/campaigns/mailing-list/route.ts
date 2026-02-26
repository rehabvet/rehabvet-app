import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET — list all clients with email + subscription status
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const filter = req.nextUrl.searchParams.get('filter') || 'all' // all | subscribed | unsubscribed
  const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
  const limit  = 50
  const offset = (page - 1) * limit

  const searchSql = search ? `AND (c.name ILIKE $3 OR c.email ILIKE $3)` : ''
  const countSearchSql = search ? `AND (c.name ILIKE $1 OR c.email ILIKE $1)` : ''
  const filterSql =
    filter === 'subscribed'   ? `AND u.email IS NULL`     :
    filter === 'unsubscribed' ? `AND u.email IS NOT NULL` : ''

  const param1 = limit
  const param2 = offset
  const param3 = `%${search}%`

  const query = `
    SELECT
      c.id, c.name, c.email, c.phone, c.created_at,
      CASE WHEN u.email IS NOT NULL THEN false ELSE true END AS subscribed,
      u.created_at AS unsubscribed_at
    FROM clients c
    LEFT JOIN email_unsubscribes u ON LOWER(u.email) = LOWER(c.email)
    WHERE c.email IS NOT NULL AND c.email != ''
    ${searchSql}
    ${filterSql}
    ORDER BY c.name ASC
    LIMIT $1 OFFSET $2
  `

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM clients c
    LEFT JOIN email_unsubscribes u ON LOWER(u.email) = LOWER(c.email)
    WHERE c.email IS NOT NULL AND c.email != ''
    ${countSearchSql}
    ${filterSql}
  `

  const [rows, countRows] = await Promise.all([
    search
      ? prisma.$queryRawUnsafe(query, param1, param2, param3) as Promise<any[]>
      : prisma.$queryRawUnsafe(query, param1, param2) as Promise<any[]>,
    search
      ? prisma.$queryRawUnsafe(countQuery, param3) as Promise<any[]>
      : prisma.$queryRawUnsafe(countQuery) as Promise<any[]>,
  ])

  // Also get summary counts
  const summaryRows = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN u.email IS NULL THEN 1 END)::int AS subscribed,
      COUNT(CASE WHEN u.email IS NOT NULL THEN 1 END)::int AS unsubscribed
    FROM clients c
    LEFT JOIN email_unsubscribes u ON LOWER(u.email) = LOWER(c.email)
    WHERE c.email IS NOT NULL AND c.email != ''
  `) as any[]

  return NextResponse.json({
    contacts: rows,
    total: countRows[0]?.total ?? 0,
    page,
    limit,
    summary: summaryRows[0] ?? { total: 0, subscribed: 0, unsubscribed: 0 },
  })
}

// POST — unsubscribe or resubscribe
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, email, emails } = await req.json()
  // action: 'unsubscribe' | 'resubscribe'
  // email: single email, or emails: string[] for bulk

  const targets: string[] = emails?.length ? emails : email ? [email] : []
  if (!targets.length) return NextResponse.json({ error: 'No email provided' }, { status: 400 })

  if (action === 'unsubscribe') {
    for (const e of targets) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO email_unsubscribes (email) VALUES (LOWER($1))
        ON CONFLICT (email) DO NOTHING
      `, e)
    }
  } else if (action === 'resubscribe') {
    for (const e of targets) {
      await prisma.$executeRawUnsafe(`
        DELETE FROM email_unsubscribes WHERE LOWER(email) = LOWER($1)
      `, e)
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true, count: targets.length })
}
