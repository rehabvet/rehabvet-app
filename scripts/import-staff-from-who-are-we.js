/*
  Import staff accounts from RehabVet website 'Who are we' page.

  Source page: https://rehabvet.com/about-us/who-are-we/

  What it does:
  - Upserts staff users (by email)
  - Sets name, role, photo_url
  - Sets password to STAFF_DEFAULT_PASSWORD (or ChangeMe123!)
  - Uses dummy emails: staff+<slug>@<DUMMY_EMAIL_DOMAIN> (default rehabvet.com)

  Usage:
    DATABASE_URL=... STAFF_DEFAULT_PASSWORD='...' node scripts/import-staff-from-who-are-we.js

  Note: This script does NOT send emails.
*/

const bcrypt = require('bcryptjs')
const { prisma } = require('./_prisma')

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
}

async function main() {
  const domain = process.env.DUMMY_EMAIL_DOMAIN || 'rehabvet.com'
  const password = process.env.STAFF_DEFAULT_PASSWORD || 'ChangeMe123!'
  const hash = bcrypt.hashSync(password, 10)

  // Extracted from live page (name + img src)
  const staff = [
    {
      name: 'Dr. Sara Lam, BVSc (Sydney), CCRT (U.S.), CVA',
      role: 'vet',
      photo_url: 'https://rehabvet.com/wp-content/uploads/2026/02/DSC8165-1-2-scaled.jpg',
    },
    {
      name: 'Xan Chuah Yee Chien',
      role: 'vet',
      photo_url: 'https://rehabvet.com/wp-content/uploads/2026/02/DSC8189-1-1-scaled.jpg',
    },
    {
      name: 'Sean Tan',
      role: 'therapist',
      photo_url: 'https://rehabvet.com/wp-content/uploads/2026/02/Sean.jpeg',
    },
    {
      name: 'Joyce Ho',
      role: 'therapist',
      photo_url: 'https://rehabvet.com/wp-content/uploads/2026/02/DSC8237-scaled.jpg',
    },
    {
      name: 'Hazel Lim',
      role: 'therapist',
      photo_url: 'https://rehabvet.com/wp-content/uploads/2026/02/DSC8211-1-scaled.jpg',
    },
    {
      name: 'Noelle Lim',
      role: 'therapist',
      photo_url: 'https://rehabvet.com/wp-content/uploads/2026/02/DSC8198-scaled.jpg',
    },
    {
      name: 'Claire',
      role: 'therapist',
      photo_url: 'https://rehabvet.com/wp-content/uploads/2026/02/IMG_5944-1-scaled.jpeg',
    },
  ]

  let created = 0
  let updated = 0

  for (const s of staff) {
    const email = `staff+${slugify(s.name)}@${domain}`
    const existing = await prisma.users.findUnique({ where: { email }, select: { id: true } })

    await prisma.users.upsert({
      where: { email },
      update: {
        name: s.name,
        role: s.role,
        photo_url: s.photo_url,
        active: true,
      },
      create: {
        email,
        name: s.name,
        role: s.role,
        password_hash: hash,
        active: true,
        photo_url: s.photo_url,
        specializations: '[]',
      },
    })

    if (existing) updated++
    else created++
  }

  console.log('✅ Staff import complete')
  console.log({ created, updated, defaultPassword: password, dummyDomain: domain })
}

main()
  .catch((e) => {
    console.error('❌ Staff import failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
