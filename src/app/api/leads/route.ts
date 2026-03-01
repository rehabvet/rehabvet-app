import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || ''
  const search = req.nextUrl.searchParams.get('search') || ''

  const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  || '1'))
  const limit  = Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20'))
  const offset = (page - 1) * limit

  // Build WHERE
  const conditions: string[] = []
  const params: any[] = []
  let p = 1
  if (status) { conditions.push(`status = $${p++}`); params.push(status) }
  if (search) {
    conditions.push(`(owner_name ILIKE $${p} OR owner_email ILIKE $${p} OR pet_name ILIKE $${p})`)
    params.push(`%${search}%`); p++
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  // Fetch leads (no N+1 — single query), counts, status breakdown in parallel
  const [leadsRaw, countRaw, statusRaw] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`
      SELECT l.*
      FROM leads l
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${p} OFFSET $${p+1}
    `, ...params, limit, offset),

    prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total FROM leads ${where}`, ...params
    ),

    prisma.$queryRawUnsafe<any[]>(
      `SELECT status, COUNT(*)::int AS cnt FROM leads GROUP BY status`
    ),
  ])

  const total = countRaw[0]?.total ?? 0
  const statusCounts = statusRaw.reduce((acc: any, r: any) => {
    acc[r.status] = r.cnt; return acc
  }, {})

  // Batch phone matching: collect last-8-digit suffixes, single JOIN query
  const phoneMap: Record<string, string> = {}
  for (const l of leadsRaw) {
    if (!l.owner_phone) continue
    const digits = String(l.owner_phone).replace(/\D/g, '')
    if (digits.length >= 8) phoneMap[l.id] = digits.slice(-8)
  }

  const suffixes = Object.values(phoneMap)
  let clientByPhone: Record<string, any> = {}

  if (suffixes.length > 0) {
    const placeholders = suffixes.map((_: string, i: number) => `$${i + 1}`).join(', ')
    const matched = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        right(regexp_replace(c.phone, '[^0-9]', '', 'g'), 8) AS phone_suffix,
        c.id, c.name, c.email, c.phone,
        (SELECT COUNT(*)::int FROM appointments a WHERE a.client_id = c.id) AS appt_count,
        (SELECT string_agg(p.name, ', ') FROM patients p WHERE p.client_id = c.id) AS pet_names
      FROM clients c
      WHERE right(regexp_replace(c.phone, '[^0-9]', '', 'g'), 8) = ANY(ARRAY[${placeholders}])
        AND length(regexp_replace(c.phone, '[^0-9]', '', 'g')) >= 8
    `, ...suffixes)

    for (const m of matched) {
      clientByPhone[m.phone_suffix] = m
    }
  }

  const leads = leadsRaw.map((l: any) => {
    const suffix = phoneMap[l.id]
    const mc = suffix ? clientByPhone[suffix] : null
    const matched_client = mc ? {
      id: mc.id, name: mc.name, email: mc.email,
      appt_count: mc.appt_count ?? 0,
      pet_names: mc.pet_names ?? '',
    } : null
    return { ...l, matched_client }
  })

  return NextResponse.json({ leads, total, page, limit, statusCounts })
}
