import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[]
    const usersCount = (() => {
      try {
        const r = db.prepare('SELECT COUNT(*) as c FROM users').get() as any
        return Number(r?.c || 0)
      } catch {
        return null
      }
    })()

    return NextResponse.json({ ok: true, tables: tables.map(t => t.name), usersCount })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
