import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/clients/merge
// Body: { base_id: string, merge_id: string }
// Moves all records from merge_id → base_id, then deletes merge_id
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { base_id, merge_id } = await req.json()
  if (!base_id || !merge_id) return NextResponse.json({ error: 'base_id and merge_id required' }, { status: 400 })
  if (base_id === merge_id) return NextResponse.json({ error: 'Cannot merge a client with itself' }, { status: 400 })

  // Verify both clients exist
  const clients = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, client_number FROM clients WHERE id IN ($1::uuid, $2::uuid)`, base_id, merge_id
  )
  if (clients.length !== 2) return NextResponse.json({ error: 'One or both clients not found' }, { status: 404 })

  const tables = ['patients', 'appointments', 'invoices', 'client_packages', 'visit_records', 'payments']
  const moved: Record<string, number> = {}

  try {
    for (const table of tables) {
      const rows = await prisma.$executeRawUnsafe(
        `UPDATE ${table} SET client_id = $1::uuid WHERE client_id = $2::uuid`, base_id, merge_id
      )
      if (rows > 0) moved[table] = rows
    }
    // leads.converted_client_id
    const leadsRows = await prisma.$executeRawUnsafe(
      `UPDATE leads SET converted_client_id = $1::uuid WHERE converted_client_id = $2::uuid`, base_id, merge_id
    )
    if (leadsRows > 0) moved['leads'] = leadsRows

    // Delete the duplicate
    await prisma.$executeRawUnsafe(`DELETE FROM clients WHERE id = $1::uuid`, merge_id)

    return NextResponse.json({ ok: true, moved })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
