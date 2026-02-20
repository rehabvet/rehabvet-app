/*
  Basic seed for Postgres via Prisma.

  Requires:
    - DATABASE_URL set
    - Prisma migrations applied (e.g. `npx prisma migrate dev`)

  Usage:
    node scripts/seed.js
*/

const bcrypt = require('bcryptjs')
const { prisma } = require('./_prisma')

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@rehabvet.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'password123'
  const name = process.env.SEED_ADMIN_NAME || 'Admin'

  const hash = bcrypt.hashSync(password, 10)

  const user = await prisma.users.upsert({
    where: { email },
    update: {
      name,
      password_hash: hash,
      role: 'admin',
      active: true,
    },
    create: {
      email,
      name,
      password_hash: hash,
      role: 'admin',
      active: true,
      specializations: '[]',
    },
    select: { id: true, email: true, name: true, role: true },
  })

  console.log('✅ Seed complete')
  console.log('Admin user:', user)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
