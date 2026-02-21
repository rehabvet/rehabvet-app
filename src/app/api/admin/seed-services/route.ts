import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const SERVICES = [
  // Hydrotherapy
  { name: 'Hydrotherapy Fitness Swim 1x (<15kg)', category: 'Hydrotherapy', price: 130, duration: 45, sessions_in_package: null, color: 'bg-cyan-500' },
  { name: 'Hydrotherapy Fitness Swim 1x (>15kg)', category: 'Hydrotherapy', price: 153, duration: 45, sessions_in_package: null, color: 'bg-cyan-500' },
  { name: 'Hydrotherapy Fitness Swim 1x (>30kg)', category: 'Hydrotherapy', price: 164, duration: 45, sessions_in_package: null, color: 'bg-cyan-500' },
  { name: 'Hydrotherapy Fitness Swim 10x (<15kg)', category: 'Hydrotherapy', price: 999, duration: 45, sessions_in_package: 10, color: 'bg-cyan-500' },
  { name: 'Hydrotherapy Fitness Swim 10x (>15kg)', category: 'Hydrotherapy', price: 1129, duration: 45, sessions_in_package: 10, color: 'bg-cyan-500' },
  { name: 'Hydrotherapy Fitness Swim 10x (>30kg)', category: 'Hydrotherapy', price: 1239, duration: 45, sessions_in_package: 10, color: 'bg-cyan-500' },
  { name: 'Hydrotherapy Underwater Treadmill 10x (<15kg)', category: 'Hydrotherapy', price: 1299, duration: 45, sessions_in_package: 10, color: 'bg-teal-500' },
  { name: 'Hydrotherapy Underwater Treadmill 10x (>15kg)', category: 'Hydrotherapy', price: 1499, duration: 45, sessions_in_package: 10, color: 'bg-teal-500' },
  { name: 'Hydrotherapy Underwater Treadmill 10x (>30kg)', category: 'Hydrotherapy', price: 1699, duration: 45, sessions_in_package: 10, color: 'bg-teal-500' },
  // Hyperbaric Oxygen Treatment
  { name: 'HBOT Consultation - Weekday (Vet)', category: 'Hyperbaric Oxygen Treatment', price: 315, duration: 60, sessions_in_package: null, color: 'bg-blue-500' },
  { name: 'HBOT Consultation - Weekend/PH (Vet)', category: 'Hyperbaric Oxygen Treatment', price: 360, duration: 60, sessions_in_package: null, color: 'bg-blue-500' },
  { name: 'HBOT 1x Session', category: 'Hyperbaric Oxygen Treatment', price: 380, duration: 60, sessions_in_package: null, color: 'bg-blue-500' },
  { name: 'HBOT 6x Sessions', category: 'Hyperbaric Oxygen Treatment', price: 2039, duration: 60, sessions_in_package: 6, color: 'bg-blue-500' },
  { name: 'HBOT 10x Sessions', category: 'Hyperbaric Oxygen Treatment', price: 2759, duration: 60, sessions_in_package: 10, color: 'bg-blue-500' },
  // Consultation & Assessment
  { name: 'Rehabilitation Consultation (Weekday)', category: 'Consultation & Assessment', price: 249, duration: 60, sessions_in_package: null, color: 'bg-rose-500' },
  { name: 'Rehabilitation Consultation (Weekend & PH)', category: 'Consultation & Assessment', price: 299, duration: 60, sessions_in_package: null, color: 'bg-rose-500' },
  { name: 'Rehabilitation Consultation (Returning Patient)', category: 'Consultation & Assessment', price: 139, duration: 30, sessions_in_package: null, color: 'bg-rose-500' },
  { name: 'Re-assessment (End of Package)', category: 'Consultation & Assessment', price: 139, duration: 30, sessions_in_package: null, color: 'bg-rose-500' },
  { name: 'TCVM Initial Consultation', category: 'Consultation & Assessment', price: 149, duration: 60, sessions_in_package: null, color: 'bg-rose-400' },
  // Pet Rehabilitation
  { name: 'Rehab / TCVM 1x Session (<15kg)', category: 'Pet Rehabilitation', price: 310, duration: 60, sessions_in_package: null, color: 'bg-purple-500' },
  { name: 'Rehab / TCVM 1x Session (>15kg)', category: 'Pet Rehabilitation', price: 350, duration: 60, sessions_in_package: null, color: 'bg-purple-500' },
  { name: 'Rehab / TCVM 10x Sessions (<15kg)', category: 'Pet Rehabilitation', price: 2099, duration: 60, sessions_in_package: 10, color: 'bg-purple-500' },
  { name: 'Rehab / TCVM 10x Sessions (>15kg)', category: 'Pet Rehabilitation', price: 2499, duration: 60, sessions_in_package: 10, color: 'bg-purple-500' },
  { name: 'Acupuncture 1x Session', category: 'Pet Rehabilitation', price: 169, duration: 30, sessions_in_package: null, color: 'bg-indigo-500' },
  { name: 'Acupuncture 10x Sessions', category: 'Pet Rehabilitation', price: 1149, duration: 30, sessions_in_package: 10, color: 'bg-indigo-500' },
  // Other Services
  { name: 'Rehab Full Written Report', category: 'Other Services', price: 139, duration: 0, sessions_in_package: null, color: 'bg-gray-400' },
  { name: 'Fitting Fee - Toe Grips', category: 'Other Services', price: 35, duration: 0, sessions_in_package: null, color: 'bg-gray-400' },
  { name: 'Fitting Fee - Braces', category: 'Other Services', price: 55, duration: 0, sessions_in_package: null, color: 'bg-gray-400' },
  { name: 'Weekend Surcharge', category: 'Other Services', price: 50, duration: 0, sessions_in_package: null, color: 'bg-gray-400' },
  { name: 'Shockwave Treatment (4000 shots)', category: 'Other Services', price: 49, duration: 0, sessions_in_package: null, color: 'bg-gray-400' },
]

export async function POST() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const results = []
  for (let i = 0; i < SERVICES.length; i++) {
    const s = SERVICES[i]
    const record = await prisma.treatment_types.upsert({
      where: { name: s.name },
      update: {
        category: s.category,
        price: s.price,
        duration: s.duration,
        sessions_in_package: s.sessions_in_package,
        color: s.color,
      },
      create: {
        name: s.name,
        category: s.category,
        price: s.price,
        duration: s.duration,
        sessions_in_package: s.sessions_in_package,
        color: s.color,
        sort_order: i,
      },
    })
    results.push(record.name)
  }

  return NextResponse.json({ ok: true, seeded: results.length, services: results })
}
