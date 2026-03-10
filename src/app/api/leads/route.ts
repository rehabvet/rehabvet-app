import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || ''
  const search = req.nextUrl.searchParams.get('search') || ''

  const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  || '1') || 1)
  const limit  = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20') || 20))
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

  // Auto-convert: any lead with a matched client that isn't already converted
  const toConvert = leads.filter(l => l.matched_client && l.status !== 'converted')
  if (toConvert.length > 0) {
    // Fire-and-forget — don't block the response
    prisma.$queryRawUnsafe(`
      UPDATE leads
      SET status = 'converted',
          converted_client_id = mc.client_id,
          updated_at = NOW()
      FROM (VALUES ${toConvert.map((l, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::uuid)`).join(', ')}) AS mc(lead_id, client_id)
      WHERE leads.id = mc.lead_id
        AND leads.status != 'converted'
    `, ...toConvert.flatMap(l => [l.id, l.matched_client!.id])).catch(() => {})
  }

  return NextResponse.json({ leads, total, page, limit, statusCounts })
}

async function resolvePostcode(post_code?: string): Promise<string | null> {
  if (!post_code || post_code.length < 5) return null
  try {
    const res = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${post_code}&returnGeom=N&getAddrDetails=Y&pageNum=1`)
    const data = await res.json()
    if (data.results?.length > 0) {
      const r = data.results[0]
      return `${r.BLK_NO ? r.BLK_NO + ' ' : ''}${r.ROAD_NAME}${r.BUILDING && r.BUILDING !== 'NIL' ? ' ' + r.BUILDING : ''} SINGAPORE ${r.POSTAL}`
    }
  } catch {}
  return null
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    owner_name, owner_email = '', owner_phone = '', post_code,
    pet_name, species = 'Dog', breed, age, pet_gender,
    vet_friendly, reactive_to_pets, clinic_name, attending_vet,
    has_pain, condition, how_heard, notes, service, preferred_date,
  } = body

  if (!owner_name || !pet_name) {
    return NextResponse.json({ error: 'owner_name and pet_name are required' }, { status: 400 })
  }

  // Resolve address from postcode once and store it
  const owner_address = await resolvePostcode(post_code)

  // Check if this lead matches an existing client (by email or phone)
  let status = 'new'
  let converted_client_id: string | null = null

  if (owner_email || owner_phone) {
    const digits = owner_phone.replace(/\D/g, '').slice(-8)
    const match = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id FROM clients
      WHERE ($1 != '' AND LOWER(email) = LOWER($1))
         OR ($2 != '' AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = $2)
      LIMIT 1
    `, owner_email, digits)
    if (match.length > 0) {
      status = 'converted'
      converted_client_id = match[0].id
    }
  }

  const lead = await prisma.leads.create({
    data: {
      owner_name, owner_email, owner_phone, post_code, owner_address,
      pet_name, species, breed, age, pet_gender,
      vet_friendly, reactive_to_pets, clinic_name, attending_vet,
      has_pain, condition, how_heard, notes, service, preferred_date,
      status,
      converted_client_id,
    },
  })

  return NextResponse.json(lead, { status: 201 })
}
