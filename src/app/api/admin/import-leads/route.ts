import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const IMPORT_SECRET = process.env.IMPORT_SECRET || 'rv-import-2024'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-import-secret') === IMPORT_SECRET
}

// DELETE — wipe all leads (for re-import)
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const count = await prisma.leads.deleteMany({})
  return NextResponse.json({ deleted: count.count })
}

// POST — bulk insert leads preserving original timestamps via raw SQL
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rows: any[]
  try {
    const body = await req.json()
    rows = body.rows
    if (!Array.isArray(rows)) throw new Error('rows must be an array')
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const results = { inserted: 0, skipped: 0, errors: [] as string[] }

  for (const r of rows) {
    try {
      // Parse dates from CSV (format: "YYYY-MM-DD HH:mm:ss")
      const parseDate = (s: string | null): Date => {
        if (!s) return new Date()
        // Replace space with T for ISO 8601 compatibility, treat as UTC+8 (SGT)
        const iso = s.replace(' ', 'T') + '+08:00'
        const d = new Date(iso)
        return isNaN(d.getTime()) ? new Date() : d
      }

      const createdAt = parseDate(r.created_at)
      const updatedAt = parseDate(r.updated_at)

      // Use raw SQL to bypass Prisma's @default(now()) override
      await prisma.$executeRaw`
        INSERT INTO leads (
          id, owner_name, owner_email, owner_phone, post_code, how_heard,
          pet_name, species, breed, age, pet_gender,
          vet_friendly, reactive_to_pets,
          condition, has_pain, clinic_name, attending_vet,
          notes, status, first_visit,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${r.owner_name || 'Unknown'},
          ${r.owner_email || ''},
          ${r.owner_phone || ''},
          ${r.post_code || null},
          ${r.how_heard || null},
          ${r.pet_name || 'Unknown'},
          ${r.species || 'Unknown'},
          ${r.breed || null},
          ${r.age || null},
          ${r.pet_gender || null},
          ${r.vet_friendly ?? null},
          ${r.reactive_to_pets ?? null},
          ${r.condition || null},
          ${r.has_pain ?? null},
          ${r.clinic_name || null},
          ${r.attending_vet || null},
          ${r.notes || null},
          'new',
          true,
          ${createdAt},
          ${updatedAt}
        )
      `
      results.inserted++
    } catch (e: any) {
      results.errors.push(`${r.owner_name}/${r.pet_name}: ${e.message}`)
    }
  }

  return NextResponse.json(results)
}
