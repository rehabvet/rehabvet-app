import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/app-errors — returns recent unresolved errors (admin only)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'administrator'].includes(user.role))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = req.nextUrl.searchParams.get('since') // ISO timestamp
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 200)

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, route, method, error_code, error_message, stack, created_at, resolved
     FROM app_errors
     WHERE resolved = false
       ${since ? `AND created_at > $2` : ''}
     ORDER BY created_at DESC
     LIMIT $1`,
    limit,
    ...(since ? [since] : [])
  )

  return NextResponse.json({ errors: rows, count: rows.length })
}

// PATCH /api/app-errors — mark errors as resolved
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'administrator'].includes(user.role))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids, fix_notes } = await req.json()
  await prisma.$queryRawUnsafe(
    `UPDATE app_errors SET resolved = true, resolved_at = NOW(), fix_notes = $1
     WHERE id = ANY($2::uuid[])`,
    fix_notes || null,
    ids
  )
  return NextResponse.json({ ok: true })
}
