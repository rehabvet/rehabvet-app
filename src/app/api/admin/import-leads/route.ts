import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple admin token for bulk imports — not user-facing
const IMPORT_SECRET = process.env.IMPORT_SECRET || 'rv-import-2024'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-import-secret')
  if (auth !== IMPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      // Check for duplicate by email + pet_name + created_at (csv ID as notes fallback)
      const existing = await prisma.leads.findFirst({
        where: {
          owner_email: r.owner_email,
          pet_name: r.pet_name,
          created_at: r.created_at ? { gte: new Date(new Date(r.created_at).getTime() - 60000), lte: new Date(new Date(r.created_at).getTime() + 60000) } : undefined,
        },
      })
      if (existing) {
        results.skipped++
        continue
      }

      await prisma.leads.create({
        data: {
          owner_name: r.owner_name || 'Unknown',
          owner_email: r.owner_email || '',
          owner_phone: r.owner_phone || '',
          post_code: r.post_code || null,
          how_heard: r.how_heard || null,
          pet_name: r.pet_name || 'Unknown',
          species: r.species || 'Unknown',
          breed: r.breed || null,
          age: r.age || null,
          pet_gender: r.pet_gender || null,
          vet_friendly: r.vet_friendly ?? null,
          reactive_to_pets: r.reactive_to_pets ?? null,
          condition: r.condition || null,
          has_pain: r.has_pain ?? null,
          clinic_name: r.clinic_name || null,
          attending_vet: r.attending_vet || null,
          notes: r.notes || null,
          status: 'new',
          created_at: r.created_at ? new Date(r.created_at) : new Date(),
          updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
        },
      })
      results.inserted++
    } catch (e: any) {
      results.errors.push(`Row ${r.owner_name}/${r.pet_name}: ${e.message}`)
    }
  }

  return NextResponse.json(results)
}
