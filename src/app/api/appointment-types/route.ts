import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { CACHE_STATIC } from '@/lib/cache'

// GET — return distinct appointment type names from service pricing (treatment_types.appointment_names)
// grouped by category, with duration from the parent treatment_type
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const services = await prisma.treatment_types.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }],
    select: { name: true, category: true, appointment_names: true, duration: true, appointment_durations: true },
  })

  // Build a deduplicated list of appointment types, grouped by category
  // Only include services that have appointment_names defined (those are bookable appt types)
  const seen = new Set<string>()
  const grouped: Record<string, { name: string; duration: number }[]> = {}

  for (const svc of services) {
    const names = (svc.appointment_names as string[]) || []
    const durOverrides = (svc.appointment_durations as Record<string, number>) || {}
    const cat = svc.category || 'Uncategorized'

    // If no appointment_names, use the service name itself
    const apptNames = names.length > 0 ? names : [svc.name]

    for (const apptName of apptNames) {
      if (seen.has(apptName)) continue
      seen.add(apptName)
      if (!grouped[cat]) grouped[cat] = []
      const dur = durOverrides[apptName] ?? svc.duration ?? 60
      grouped[cat].push({ name: apptName, duration: dur })
    }
  }

  const res = NextResponse.json({ grouped })
  res.headers.set('Cache-Control', CACHE_STATIC)
  return res
}
