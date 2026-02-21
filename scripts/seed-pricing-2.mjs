// Seed pricing from second RehabVet price board screenshot
// Consultation, TCVM, Acupuncture
const BASE = 'https://app.rehabvet.com'

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
    body: JSON.stringify({ email: 'admin@rehabvet.com', password: '2809Leonie!' }),
  })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/token=([^;]+)/)
  if (match) cookie = `token=${match[1]}`
  const d = await res.json()
  console.log('Login:', d.user?.email, '| role:', d.user?.role)
}

async function createService(name, category, description, duration, color) {
  const d = await api('POST', '/api/treatment-types', { name, category, description, duration, color })
  if (d.type) { console.log('  Created:', d.type.id, name); return d.type.id }
  console.log('  Error creating:', name, JSON.stringify(d))
  return null
}

async function updateDuration(id, duration) {
  // PATCH just the duration — need to first GET the service to preserve other fields
  const d = await api('PUT', `/api/treatment-types/${id}`, { duration })
  if (d.type) console.log('  Duration updated:', d.type.name, duration + 'min')
  else console.log('  Error:', JSON.stringify(d))
}

async function addPricing(service_id, label, sessions, price) {
  const d = await api('POST', '/api/service-pricing', { service_id, label, sessions, price })
  if (d.entry) console.log(`  ✓ ${label} — S$${price} x${sessions}`)
  else console.log('  Error:', d.error || JSON.stringify(d))
}

async function main() {
  await login()

  const { types } = await api('GET', '/api/treatment-types')
  const svcMap = {}
  for (const t of types) svcMap[t.name] = { id: t.id, ...t }
  console.log('\nLoaded', types.length, 'services')

  // ── Create/ensure services ──────────────────────────────────────────────────
  console.log('\n── Ensuring services exist ──')

  // "Rehabilitation Consultation" — main consultation service
  if (!svcMap['Rehabilitation Consultation'])
    svcMap['Rehabilitation Consultation'] = { id: await createService('Rehabilitation Consultation', 'Consultation & Assessment', 'Initial & follow-up rehabilitation consultations', 60, 'bg-pink-500') }

  // "Rehab Full Written Report"
  if (!svcMap['Rehab Full Written Report'])
    svcMap['Rehab Full Written Report'] = { id: await createService('Rehab Full Written Report', 'Consultation & Assessment', 'Full written rehabilitation report', 0, 'bg-indigo-400') }

  // Update durations for existing services
  console.log('\n── Updating durations ──')
  const reassess = svcMap['Reassessment']
  if (reassess) await updateDuration(reassess.id, 30)

  const tcvmTuina = svcMap['TCVM Tui-na and acupuncture']
  if (tcvmTuina) await updateDuration(tcvmTuina.id, 60)

  const tcmConsult = svcMap['TCM Consultation']
  if (tcmConsult) await updateDuration(tcmConsult.id, 60)

  const acupuncture = svcMap['TCM Acupuncture Review']
  if (acupuncture) await updateDuration(acupuncture.id, 30)

  // ── Seed pricing ────────────────────────────────────────────────────────────
  console.log('\n── Seeding: Consultation ──')
  const consult = svcMap['Rehabilitation Consultation']?.id
  if (consult) {
    await addPricing(consult, 'Rehabilitation Consultation (Weekday)',              1, 249)
    await addPricing(consult, 'Rehabilitation Consultation (Weekend & PH)',         1, 299)
    await addPricing(consult, 'Rehabilitation Consultation (Returning patients)',   1, 139)
    await addPricing(consult, 'Re-assessment (End of package)',                     1, 139)
  }

  console.log('\n── Seeding: Rehab Full Written Report ──')
  const report = svcMap['Rehab Full Written Report']?.id
  if (report) await addPricing(report, 'Rehab Full Written Report', 1, 139)

  console.log('\n── Seeding: Rehabilitation / TCVM (Tui-Na & Acupuncture) ──')
  const tuina = svcMap['TCVM Tui-na and acupuncture']?.id
  if (tuina) {
    await addPricing(tuina, '1 x Session (<15kg)',   1,  310)
    await addPricing(tuina, '1 x Session (>15kg)',   1,  350)
    await addPricing(tuina, '10 x Sessions (<15kg)', 10, 2099)
    await addPricing(tuina, '10 x Sessions (>15kg)', 10, 2499)
  }

  console.log('\n── Seeding: TCVM Initial Consultation ──')
  const tcvmId = svcMap['TCM Consultation']?.id
  if (tcvmId) await addPricing(tcvmId, 'Initial Consultation', 1, 149)

  console.log('\n── Seeding: Acupuncture ──')
  const acuId = svcMap['TCM Acupuncture Review']?.id
  if (acuId) {
    await addPricing(acuId, '1 x Session',  1,  169)
    await addPricing(acuId, '10 x Sessions', 10, 1149)
  }

  console.log('\n✅ Done!')
}

main().catch(console.error)
