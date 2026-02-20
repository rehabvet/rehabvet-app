import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'administrator', 'office_manager', 'vet', 'veterinarian'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const period = req.nextUrl.searchParams.get('period') || 'month'

  let dateFilter: string
  const now = new Date()
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    dateFilter = d.toISOString().split('T')[0]
  } else if (period === 'year') {
    dateFilter = `${now.getFullYear()}-01-01`
  } else {
    dateFilter = now.toISOString().substring(0, 7) + '-01'
  }

  const revenueAgg = await prisma.payments.aggregate({
    where: { date: { gte: dateFilter } },
    _sum: { amount: true },
    _count: { _all: true },
  })
  const revenue = { total: revenueAgg._sum.amount ?? 0, count: revenueAgg._count._all }

  const sessionsByModalityRaw = await prisma.sessions.groupBy({
    by: ['modality'],
    where: { date: { gte: dateFilter } },
    _count: { _all: true },
    _avg: { duration_minutes: true },
  })
  const sessionsByModality = (sessionsByModalityRaw as any[])
    .map((r) => ({ modality: r.modality, count: r._count._all, avg_duration: r._avg.duration_minutes }))
    .sort((a, b) => b.count - a.count)

  const outcomesAgg = await prisma.sessions.aggregate({
    where: {
      date: { gte: dateFilter },
      OR: [{ pain_score: { not: null } }, { mobility_score: { not: null } }],
    },
    _avg: { pain_score: true, mobility_score: true },
    _count: { _all: true },
  })
  const patientOutcomes = {
    avg_pain: outcomesAgg._avg.pain_score,
    avg_mobility: outcomesAgg._avg.mobility_score,
    total_sessions: outcomesAgg._count._all,
  }

  const staff = await prisma.users.findMany({
    where: { role: { in: ['vet', 'therapist', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'] }, active: true },
    select: { id: true, name: true },
  })

  const utilAgg = await prisma.sessions.groupBy({
    by: ['therapist_id'],
    where: { date: { gte: dateFilter } },
    _count: { _all: true },
    _sum: { duration_minutes: true },
  })
  const utilByTherapist = new Map((utilAgg as any[]).map((r) => [r.therapist_id, r]))

  const therapistUtilization = staff
    .map((u) => {
      const r: any = utilByTherapist.get(u.id)
      return {
        name: u.name,
        session_count: r?._count?._all ?? 0,
        total_minutes: r?._sum?.duration_minutes ?? 0,
      }
    })
    .sort((a, b) => b.session_count - a.session_count)

  const revenueByModalityRaw = await prisma.invoice_items.groupBy({
    by: ['modality'],
    where: { modality: { not: null }, invoice: { date: { gte: dateFilter } } },
    _sum: { total: true },
  })
  const revenueByModality = (revenueByModalityRaw as any[])
    .map((r) => ({ modality: r.modality, revenue: r._sum.total ?? 0 }))
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))

  const appointmentStatsRaw = await prisma.appointments.groupBy({
    by: ['status'],
    where: { date: { gte: dateFilter } },
    _count: { _all: true },
  })
  const appointmentStats = (appointmentStatsRaw as any[]).map((r) => ({ status: r.status, count: r._count._all }))

  return NextResponse.json({
    period,
    dateFilter,
    revenue,
    sessionsByModality,
    patientOutcomes,
    therapistUtilization,
    revenueByModality,
    appointmentStats,
  })
}
