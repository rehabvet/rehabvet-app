import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'vet'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb()
  const period = req.nextUrl.searchParams.get('period') || 'month'

  let dateFilter: string
  const now = new Date()
  if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    dateFilter = d.toISOString().split('T')[0]
  } else if (period === 'year') {
    dateFilter = `${now.getFullYear()}-01-01`
  } else {
    dateFilter = now.toISOString().substring(0, 7) + '-01'
  }

  const revenue = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM payments WHERE date >= ?
  `).get(dateFilter) as any

  const sessionsByModality = db.prepare(`
    SELECT modality, COUNT(*) as count, AVG(duration_minutes) as avg_duration
    FROM sessions WHERE date >= ? GROUP BY modality ORDER BY count DESC
  `).all(dateFilter)

  const patientOutcomes = db.prepare(`
    SELECT AVG(pain_score) as avg_pain, AVG(mobility_score) as avg_mobility,
    COUNT(*) as total_sessions
    FROM sessions WHERE date >= ? AND (pain_score IS NOT NULL OR mobility_score IS NOT NULL)
  `).get(dateFilter)

  const therapistUtilization = db.prepare(`
    SELECT u.name, COUNT(s.id) as session_count, SUM(s.duration_minutes) as total_minutes
    FROM users u LEFT JOIN sessions s ON u.id = s.therapist_id AND s.date >= ?
    WHERE u.role IN ('vet','therapist') AND u.active = 1
    GROUP BY u.id ORDER BY session_count DESC
  `).all(dateFilter)

  const revenueByModality = db.prepare(`
    SELECT ii.modality, SUM(ii.total) as revenue
    FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.date >= ? AND ii.modality IS NOT NULL
    GROUP BY ii.modality ORDER BY revenue DESC
  `).all(dateFilter)

  const appointmentStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM appointments WHERE date >= ? GROUP BY status
  `).all(dateFilter)

  return NextResponse.json({
    period, dateFilter, revenue, sessionsByModality, patientOutcomes,
    therapistUtilization, revenueByModality, appointmentStats,
  })
}
