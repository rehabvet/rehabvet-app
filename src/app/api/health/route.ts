import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      users,
      clients,
      patients,
      appointments,
      sessions,
      treatment_plans,
      invoices,
      invoice_items,
      payments,
      documents,
      treatment_types,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.clients.count(),
      prisma.patients.count(),
      prisma.appointments.count(),
      prisma.sessions.count(),
      prisma.treatment_plans.count(),
      prisma.invoices.count(),
      prisma.invoice_items.count(),
      prisma.payments.count(),
      prisma.documents.count(),
      prisma.treatment_types.count(),
    ])

    return NextResponse.json({
      ok: true,
      db: 'postgres',
      counts: {
        users,
        clients,
        patients,
        appointments,
        sessions,
        treatment_plans,
        invoices,
        invoice_items,
        payments,
        documents,
        treatment_types,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
