import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const [todayAppointments, totalPatients, activePlans] = await Promise.all([
    prisma.appointments.count({ where: { date: today } }),
    prisma.patients.count({ where: { active: true } }),
    prisma.treatment_plans.count({ where: { status: 'active' } }),
  ])

  const activeClientRows = await prisma.patients.findMany({
    where: { active: true },
    distinct: ['client_id'],
    select: { client_id: true },
  })
  const activeClients = activeClientRows.length

  const monthStart = today.substring(0, 7) + '-01'
  const monthRevenueAgg = await prisma.payments.aggregate({
    where: { date: { gte: monthStart } },
    _sum: { amount: true },
    _count: { _all: true },
  })
  const monthRevenue = monthRevenueAgg._sum.amount ?? 0

  const outstandingInvoices = await prisma.invoices.findMany({
    where: { status: { in: ['sent', 'partial', 'overdue'] } },
    select: { total: true, amount_paid: true },
  })
  const outstandingBalance = outstandingInvoices.reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0)

  const scheduleRows = await prisma.appointments.findMany({
    where: { date: today },
    include: {
      patient: { select: { name: true, species: true, breed: true } },
      client: { select: { name: true, phone: true } },
      therapist: { select: { name: true, role: true } },
    },
    orderBy: { start_time: 'asc' },
  })

  const todaySchedule = (scheduleRows as any[]).map((a) => {
    const { patient, client, therapist, ...rest } = a
    return {
      ...rest,
      patient_name: patient?.name,
      patient_species: patient?.species,
      patient_breed: patient?.breed,
      client_name: client?.name,
      client_phone: client?.phone ?? null,
      therapist_name: therapist?.name ?? null,
      therapist_role: therapist?.role ?? null,
    }
  })

  const recentRows = await prisma.sessions.findMany({
    include: { patient: { select: { name: true } } },
    orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    take: 5,
  })

  const recentSessions = (recentRows as any[]).map((s) => {
    const { patient, ...rest } = s
    return { ...rest, patient_name: patient?.name }
  })

  return NextResponse.json({
    todayAppointments,
    totalPatients,
    activeClients,
    activePlans,
    monthRevenue,
    outstandingBalance,
    todaySchedule,
    recentSessions,
  })
}
