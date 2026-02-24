/**
 * RehabVet Appointment Form — API Test Suite
 * Tests app.rehabvet.com/api/appointment for correctness
 *
 * Run: node scripts/test-appointment.mjs [--live]
 *   --live  : test against production (default: localhost:3000)
 */

const LIVE = process.argv.includes('--live')
const BASE = LIVE ? 'https://app.rehabvet.com' : 'http://localhost:3000'

const DB_URL = 'postgresql://postgres:yIsgRytqoQYdNvIbWqPOsqUKINcVmpck@gondola.proxy.rlwy.net:35992/railway?sslmode=require'

let passed = 0
let failed = 0
const failures = []

// ── Helpers ──────────────────────────────────────────────────────────────────
function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ ${name}`)
    passed++
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
    failures.push(name)
  }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

async function dbQuery(sql, params = []) {
  // Dynamic import so script works without pg installed globally
  const { default: pg } = await import('pg')
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  try {
    const r = await client.query(sql, params)
    return r.rows
  } finally {
    await client.end()
  }
}

const VALID = {
  owner_name: 'Test User RehabVet',
  owner_email: 'testsubmission@rehabvet-autotest.com',
  owner_phone: '+65 9000 0001',
  post_code: '218154',
  pet_name: 'AutoTest Dog',
  species: 'Dog',
  breed: 'Golden Retriever',
  age: '3',
  pet_gender: 'Male',
  vet_friendly: true,
  reactive_to_pets: false,
  has_pain: true,
  clinic_name: 'Test Vet Clinic',
  attending_vet: 'Dr. AutoTest',
  how_heard: 'Google Search',
  condition: 'Automated test submission — safe to delete',
}

// ── Test suites ───────────────────────────────────────────────────────────────
async function testHappyPath() {
  console.log('\n📋 Happy path')

  // Clean up any previous test runs
  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [VALID.owner_email]).catch(() => {})

  const { status, json } = await post('/api/appointment', VALID)
  ok('Returns 201', status === 201, `got ${status}`)
  ok('Returns success:true', json?.success === true, JSON.stringify(json))
  ok('Returns lead id', typeof json?.id === 'string' && json.id.length > 0)

  if (json?.id) {
    const rows = await dbQuery(`SELECT * FROM leads WHERE id = $1`, [json.id])
    ok('Lead saved to DB', rows.length === 1)
    ok('Owner name correct', rows[0]?.owner_name === VALID.owner_name)
    ok('Pet name correct', rows[0]?.pet_name === VALID.pet_name)
    ok('Status is "new"', rows[0]?.status === 'new')
    ok('Email stored', rows[0]?.owner_email === VALID.owner_email)
    ok('Phone stored', rows[0]?.owner_phone === VALID.owner_phone)
    ok('Breed stored', rows[0]?.breed === VALID.breed)
    ok('vet_friendly stored', rows[0]?.vet_friendly === true)
    ok('reactive_to_pets stored', rows[0]?.reactive_to_pets === false)
    ok('has_pain stored', rows[0]?.has_pain === true)

    // Cleanup
    await dbQuery(`DELETE FROM leads WHERE id = $1`, [json.id])
    console.log('  🧹 Test lead cleaned up')
  }
}

async function testValidation() {
  console.log('\n🛡️  Validation — missing required fields')

  const cases = [
    { label: 'No owner_name',  body: { ...VALID, owner_name: undefined } },
    { label: 'No owner_email', body: { ...VALID, owner_email: undefined } },
    { label: 'No owner_phone', body: { ...VALID, owner_phone: undefined } },
    { label: 'No pet_name',    body: { ...VALID, pet_name: undefined } },
    { label: 'Empty body',     body: {} },
  ]

  for (const { label, body } of cases) {
    const { status, json } = await post('/api/appointment', body)
    ok(`${label} → 400`, status === 400, `got ${status} ${JSON.stringify(json)}`)
  }
}

async function testEdgeCases() {
  console.log('\n🔍 Edge cases')

  // Optional fields absent — should still succeed
  const minimal = {
    owner_name: 'Minimal Test',
    owner_email: 'minimal-test@rehabvet-autotest.com',
    owner_phone: '+65 9000 0002',
    pet_name: 'Mini Dog',
  }
  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [minimal.owner_email]).catch(() => {})
  const { status, json } = await post('/api/appointment', minimal)
  ok('Minimal fields (no optional) → 201', status === 201, `got ${status}`)
  if (json?.id) await dbQuery(`DELETE FROM leads WHERE id = $1`, [json.id])

  // Extra unknown fields — should be ignored, not crash
  const withExtra = { ...VALID, owner_email: 'extra-test@rehabvet-autotest.com', unknown_field: 'hack', __proto__: 'ignore' }
  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [withExtra.owner_email]).catch(() => {})
  const { status: s2 } = await post('/api/appointment', withExtra)
  ok('Unknown extra fields ignored → 201', s2 === 201, `got ${s2}`)
  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [withExtra.owner_email]).catch(() => {})

  // Very long condition text
  const longCondition = { ...VALID, owner_email: 'long-test@rehabvet-autotest.com', condition: 'x'.repeat(2000) }
  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [longCondition.owner_email]).catch(() => {})
  const { status: s3 } = await post('/api/appointment', longCondition)
  ok('Long condition text handled → 201', s3 === 201, `got ${s3}`)
  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [longCondition.owner_email]).catch(() => {})
}

async function testDuplicates() {
  console.log('\n🔄 Duplicate submissions')

  const dupEmail = 'dup-test@rehabvet-autotest.com'
  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [dupEmail]).catch(() => {})

  const body = { ...VALID, owner_email: dupEmail }
  const { status: s1, json: j1 } = await post('/api/appointment', body)
  const { status: s2, json: j2 } = await post('/api/appointment', body)

  ok('First submission → 201', s1 === 201)
  // Duplicates are allowed (staff review handles it) — just shouldn't crash
  ok('Second (duplicate) submission → 2xx', s2 >= 200 && s2 < 300, `got ${s2}`)
  ok('Both get different IDs', j1?.id !== j2?.id)

  await dbQuery(`DELETE FROM leads WHERE owner_email = $1`, [dupEmail]).catch(() => {})
}

async function testContentType() {
  console.log('\n📡 Request format')

  // Non-JSON body
  const res = await fetch(`${BASE}/api/appointment`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'not json',
  })
  ok('Non-JSON body → 4xx', res.status >= 400, `got ${res.status}`)

  // Empty body
  const res2 = await fetch(`${BASE}/api/appointment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '',
  })
  ok('Empty body → 4xx', res2.status >= 400, `got ${res2.status}`)

  // GET method not allowed
  const res3 = await fetch(`${BASE}/api/appointment`)
  ok('GET not allowed → 405', res3.status === 405, `got ${res3.status}`)
}

// ── Run all ───────────────────────────────────────────────────────────────────
console.log(`\n🧪 RehabVet Appointment API Tests`)
console.log(`🌐 Target: ${BASE}`)
console.log(`${'─'.repeat(50)}`)

try {
  await testHappyPath()
  await testValidation()
  await testEdgeCases()
  await testDuplicates()
  await testContentType()
} catch (err) {
  console.error('\n💥 Test runner crashed:', err.message)
  process.exit(1)
}

console.log(`\n${'─'.repeat(50)}`)
console.log(`📊 Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log(`\n❌ Failed tests:`)
  failures.forEach(f => console.log(`   • ${f}`))
  process.exit(1)
} else {
  console.log(`\n✅ All tests passed!`)
}
