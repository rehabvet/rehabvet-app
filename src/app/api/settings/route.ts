import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const DEFAULTS = {
  clinic: {
    name: 'RehabVet',
    tagline: 'Proven steps to pain free mobility',
    phone: '',
    email: '',
    website: '',
    address: '',
    registration: '',
    gst_registered: false,
    gst_number: '',
  },
  hours: {
    monday:    { open: '09:00', close: '18:00', closed: false },
    tuesday:   { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday:  { open: '09:00', close: '18:00', closed: false },
    friday:    { open: '09:00', close: '18:00', closed: false },
    saturday:  { open: '09:00', close: '14:00', closed: false },
    sunday:    { open: '09:00', close: '13:00', closed: true },
  },
  appointments: {
    default_duration: 60,
    buffer_minutes: 0,
    booking_window_days: 90,
    min_notice_hours: 24,
    cancellation_hours: 24,
    max_per_day: 40,
  },
  billing: {
    currency: 'SGD',
    currency_symbol: 'S$',
    invoice_prefix: 'INV',
    gst_rate: 9,
    payment_terms_days: 30,
    bank_name: '',
    bank_account: '',
    paynow_number: '',
  },
  reminders: {
    send_reminders: true,
    reminder_hours_before: 24,
    second_reminder_hours: 2,
    reminder_via_email: true,
    reminder_via_sms: false,
  },
  system: {
    timezone: 'Asia/Singapore',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    language: 'en',
  }
}

export async function GET() {
  const row = await prisma.clinic_settings.findUnique({ where: { id: 'default' } })
  const data = row ? JSON.parse(row.data) : DEFAULTS
  // Merge with defaults to ensure new keys always exist
  const merged = {
    clinic:       { ...DEFAULTS.clinic,       ...(data.clinic || {}) },
    hours:        { ...DEFAULTS.hours,        ...(data.hours || {}) },
    appointments: { ...DEFAULTS.appointments, ...(data.appointments || {}) },
    billing:      { ...DEFAULTS.billing,      ...(data.billing || {}) },
    reminders:    { ...DEFAULTS.reminders,    ...(data.reminders || {}) },
    system:       { ...DEFAULTS.system,       ...(data.system || {}) },
  }
  return NextResponse.json({ settings: merged })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = ['admin', 'administrator', 'office_manager'].includes(user.role)
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  await prisma.clinic_settings.upsert({
    where: { id: 'default' },
    create: { id: 'default', data: JSON.stringify(body) },
    update: { data: JSON.stringify(body) },
  })
  return NextResponse.json({ ok: true })
}
