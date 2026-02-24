import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count FROM clients
    WHERE email IS NOT NULL AND email != ''
    AND email NOT IN (SELECT email FROM email_unsubscribes)
  `) as any[]

  return NextResponse.json({ count: rows[0]?.count ?? 0 })
}
