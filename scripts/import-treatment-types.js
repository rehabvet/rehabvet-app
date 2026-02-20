/*
  Import treatment types into Postgres via Prisma.

  Usage:
    node scripts/import-treatment-types.js
*/

const { prisma } = require('./_prisma')

const treatmentTypes = [
  // Uncategorized
  { name: 'Lunch', category: 'Uncategorized', duration: 60, color: 'bg-gray-400' },
  { name: 'Admin', category: 'Uncategorized', duration: 15, color: 'bg-gray-500' },
  { name: 'On Leave', category: 'Uncategorized', duration: 540, color: 'bg-gray-300' },
  { name: 'OFF', category: 'Uncategorized', duration: 540, color: 'bg-gray-300' },
  { name: 'Half Day Off', category: 'Uncategorized', duration: 240, color: 'bg-gray-400' },
  { name: 'DO NOT BOOK', category: 'Uncategorized', duration: 60, color: 'bg-red-300' },

  // Pet Rehabilitation
  { name: 'Rehabilitation - Hydrotherapy', category: 'Pet Rehabilitation', duration: 60, color: 'bg-cyan-500' },
  { name: 'Animal Rehabilitation - Follow Ups', category: 'Pet Rehabilitation', duration: 60, color: 'bg-blue-400' },
  { name: 'TCM Acupuncture Review', category: 'Pet Rehabilitation', duration: 30, color: 'bg-purple-400' },
  { name: 'TCVM Tui-na and acupuncture', category: 'Pet Rehabilitation', duration: 60, color: 'bg-purple-500' },
  { name: 'Pain Relief', category: 'Pet Rehabilitation', duration: 30, color: 'bg-orange-400' },
  { name: 'House-Call', category: 'Pet Rehabilitation', duration: 90, color: 'bg-teal-500' },
  { name: 'UWTM', category: 'Pet Rehabilitation', duration: 45, color: 'bg-cyan-400' },

  // Other Services
  { name: 'Hyperbaric Oxygen', category: 'Other Services', duration: 60, color: 'bg-orange-500' },
  { name: 'Fitness Swim', category: 'Other Services', duration: 45, color: 'bg-sky-400' },

  // Consultation & Assessment
  { name: 'Orthopedic & Neurological Assessment', category: 'Consultation & Assessment', duration: 60, color: 'bg-green-500' },
  { name: 'TCM Consultation', category: 'Consultation & Assessment', duration: 60, color: 'bg-emerald-500' },
  { name: 'Reassessment', category: 'Consultation & Assessment', duration: 30, color: 'bg-green-400' },
  { name: 'Assessment Fun Swim', category: 'Consultation & Assessment', duration: 30, color: 'bg-sky-500' },
]

async function main() {
  let sortOrder = 0
  let inserted = 0
  let updated = 0

  for (const t of treatmentTypes) {
    const existing = await prisma.treatment_types.findUnique({ where: { name: t.name } })

    const so = sortOrder++

    await prisma.treatment_types.upsert({
      where: { name: t.name },
      update: {
        category: t.category,
        duration: t.duration,
        color: t.color,
        active: true,
        sort_order: so,
      },
      create: {
        name: t.name,
        category: t.category,
        duration: t.duration,
        color: t.color,
        active: true,
        sort_order: so,
      },
    })

    if (existing) updated++
    else inserted++
  }

  const total = await prisma.treatment_types.count()
  console.log('✅ Treatment types import complete')
  console.log(`Inserted: ${inserted}`)
  console.log(`Updated: ${updated}`)
  console.log(`Total treatment types: ${total}`)

  const grouped = await prisma.treatment_types.groupBy({ by: ['category'], _count: { _all: true } })
  grouped.sort((a, b) => String(a.category).localeCompare(String(b.category)))
  for (const g of grouped) console.log(` - ${g.category}: ${g._count._all}`)
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
