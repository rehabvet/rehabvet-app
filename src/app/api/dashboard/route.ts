import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  const todayAppointments = (db.prepare(
    'SELECT COUNT(*) as c FROM appointments WHERE date = ?'
  ).get(today) as any).c

  const totalPatients = (db.prepare(
    'SELECT COUNT(*) as c FROM patients WHERE active = 1'
  ).get() as any).c

  const activeClients = (db.prepare(
    'SELECT COUNT(DISTINCT client_id) as c FROM patients WHERE active = 1'
  ).get() as any).c

  const activePlans = (db.prepare(
    "SELECT COUNT(*) as c FROM treatment_plans WHERE status = 'active'"
  ).get() as any).c

  const monthStart = today.substring(0, 7) + '-01'
  const monthRevenue = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date >= ?"
  ).get(monthStart) as any).total

  const outstandingBalance = (db.prepare(
    "SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices WHERE status IN ('sent','partial','overdue')"
  ).get() as any).total

  const todaySchedule = db.prepare(`
    SELECT a.*, p.name as patient_name, c.name as client_name, u.name as therapist_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN clients c ON a.client_id = c.id
    LEFT JOIN users u ON a.therapist_id = u.id
    WHERE a.date = ?
    ORDER BY a.start_time
  `).all(today)

  const recentSessions = db.prepare(`
    SELECT s.*, p.name as patient_name
    FROM sessions s
    JOIN patients p ON s.patient_id = p.id
    ORDER BY s.date DESC, s.created_at DESC
    LIMIT 5
  `).all()

  return NextResponse.json({
    todayAppointments, totalPatients, activeClients, activePlans,
    monthRevenue, outstandingBalance, todaySchedule, recentSessions,
  })
}
