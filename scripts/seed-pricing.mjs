// Seed service pricing from the RehabVet price board screenshot
// Run after deploy: node scripts/seed-pricing.mjs
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const BASE = 'https://app.rehabvet.com'
const CREDS = { email: 'admin@rehabvet.com', password: '2809Leonie!' }

let cookie = ''

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDS),
  })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/token=([^;]+)/)
  if (match) cookie = `token=${match[1]}`
  const d = await res.json()
  console.log('Login:', d.user?.email, '| role:', d.user?.role)
}

async function createService(name, category, description, duration, color) {
  const d = await api('POST', '/api/treatment-types', { name, category, description, duration, color })
  if (d.type) { console.log('  Created service:', d.type.id, name); return d.type.id }
  if (d.error?.includes('Unique') || d.error?.includes('already')) {
    console.log('  Service exists:', name)
    return null
  }
  console.log('  Error creating service:', name, d.error || JSON.stringify(d))
  return null
}

async function updateDuration(id, duration) {
  const d = await api('PUT', `/api/treatment-types/${id}`, { duration })
  if (d.type) console.log('  Updated duration:', id, duration + 'min')
  else console.log('  Error updating duration:', d)
}

async function addPricing(service_id, label, sessions, price) {
  const d = await api('POST', '/api/service-pricing', { service_id, label, sessions, price })
  if (d.entry) console.log(`  Pricing: ${label} — S$${price} x${sessions}`)
  else console.log('  Error adding pricing:', d.error || JSON.stringify(d))
}

// Known existing service IDs (from treatment_types fetch)
const SERVICES = {
  fitnesSwim:   'dea0b801-0000-0000-0000-000000000000', // placeholder, fetched below
  uwtm:         'c3df356d-0000-0000-0000-000000000000',
  hyperbaric:   '816e4af2-0000-0000-0000-000000000000',
}

async function main() {
  await login()

  // Fetch all treatment types to get full IDs
  const { types } = await api('GET', '/api/treatment-types')
  const svcMap = {}
  for (const t of types) svcMap[t.name] = t.id
  console.log('\nExisting services:', Object.keys(svcMap).join(', '))

  // ─── Update durations for existing services ───────────────────────────────
  console.log('\n── Updating service durations ──')
  if (svcMap['Fitness Swim']) await updateDuration(svcMap['Fitness Swim'], 45)
  if (svcMap['UWTM']) await updateDuration(svcMap['UWTM'], 45)
  if (svcMap['Hyperbaric Oxygen']) await updateDuration(svcMap['Hyperbaric Oxygen'], 60)

  // ─── Create missing services ──────────────────────────────────────────────
  console.log('\n── Creating missing services ──')
  if (!svcMap['Shockwave Treatment'])
    svcMap['Shockwave Treatment'] = await createService('Shockwave Treatment', 'Other Services', '4000 shots per session', 0, 'bg-orange-500')
  if (!svcMap['Fitting Fee For Toe Grips'])
    svcMap['Fitting Fee For Toe Grips'] = await createService('Fitting Fee For Toe Grips', 'Other Services', 'One-time fitting fee', 0, 'bg-gray-400')
  if (!svcMap['Fitting Fee For Braces'])
    svcMap['Fitting Fee For Braces'] = await createService('Fitting Fee For Braces', 'Other Services', 'One-time fitting fee', 0, 'bg-gray-500')
  if (!svcMap['Weekend Charges'])
    svcMap['Weekend Charges'] = await createService('Weekend Charges', 'Other Services', 'Weekend & public holiday surcharge', 0, 'bg-yellow-500')

  // ─── Seed pricing from screenshot ─────────────────────────────────────────
  console.log('\n── Seeding: Hydrotherapy - Fitness Swim ──')
  const fs = svcMap['Fitness Swim']
  if (fs) {
    await addPricing(fs, '1 x Session (<15kg)',  1,  130)
    await addPricing(fs, '1 x Session (>15kg)',  1,  153)
    await addPricing(fs, '1 x Session (>30kg)',  1,  164)
    await addPricing(fs, '10 x Sessions (<15kg)', 10, 999)
    await addPricing(fs, '10 x Sessions (>15kg)', 10, 1129)
    await addPricing(fs, '10 x Sessions (>30kg)', 10, 1239)
  } else console.log('  SKIP — Fitness Swim not found')

  console.log('\n── Seeding: Hydrotherapy - Under Water Treadmill ──')
  const uwtm = svcMap['UWTM']
  if (uwtm) {
    await addPricing(uwtm, '10 x Session (<15kg)', 10, 1299)
    await addPricing(uwtm, '10 x Session (>15kg)', 10, 1499)
    await addPricing(uwtm, '10 x Session (>30kg)', 10, 1699)
  } else console.log('  SKIP — UWTM not found')

  console.log('\n── Seeding: Hyperbaric Oxygen Treatment ──')
  const hbo = svcMap['Hyperbaric Oxygen']
  if (hbo) {
    await addPricing(hbo, 'Consultation & Introduction (Weekday) - Veterinarian', 1, 315)
    await addPricing(hbo, 'Consultation & Introduction (Weekend & PH) - Veterinarian', 1, 360)
    await addPricing(hbo, '1 x Session', 1, 380)
    await addPricing(hbo, '6 x Sessions', 6, 2039)
    await addPricing(hbo, '10 x Sessions', 10, 2759)
  } else console.log('  SKIP — Hyperbaric Oxygen not found')

  console.log('\n── Seeding: Other Fees ──')
  const sw = svcMap['Shockwave Treatment']
  if (sw) await addPricing(sw, 'Shockwave Treatment (4000 shots)', 1, 49)

  const tg = svcMap['Fitting Fee For Toe Grips']
  if (tg) await addPricing(tg, 'Fitting Fee For Toe Grips', 1, 35)

  const br = svcMap['Fitting Fee For Braces']
  if (br) await addPricing(br, 'Fitting Fee For Braces', 1, 55)

  const wc = svcMap['Weekend Charges']
  if (wc) await addPricing(wc, 'Weekend Surcharge', 1, 50)

  console.log('\n✅ Done!')
}

main().catch(console.error)
