import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM email_campaigns WHERE id = $1`, id) as any[]
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ campaign: rows[0] })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { name, subject, preheader, body_blocks, body_html } = body

  const rows = await prisma.$queryRawUnsafe(`
    UPDATE email_campaigns
    SET name=$1, subject=$2, preheader=$3, body_blocks=$4, body_html=$5, updated_at=NOW()
    WHERE id=$6 AND status='draft'
    RETURNING *
  `, name, subject, preheader || null, body_blocks, body_html, id) as any[]

  if (!rows.length) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })
  return NextResponse.json({ campaign: rows[0] })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  await prisma.$executeRawUnsafe(`DELETE FROM email_campaigns WHERE id=$1 AND status='draft'`, id)
  return NextResponse.json({ success: true })
}
