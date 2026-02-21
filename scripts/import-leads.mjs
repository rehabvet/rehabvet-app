#!/usr/bin/env node
/**
 * Import historical leads from CSV into RehabVet app.
 * Handles multi-line quoted fields correctly.
 *
 * Usage: node scripts/import-leads.mjs <path-to-csv> [base-url] [secret]
 */

import { readFileSync } from 'fs'

const CSV_PATH = process.argv[2] || './leads.csv'
const BASE_URL = process.argv[3] || 'https://app.rehabvet.com'
const SECRET   = process.argv[4] || 'rv-import-2024'
const BATCH    = 50

// ── Full CSV parser — correctly handles multi-line quoted fields ──────────────
function parseCSV(content) {
  const rows = []
  let row = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++ }   // escaped quote
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      row.push(cur); cur = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++               // skip \r\n pair
      row.push(cur)
      if (row.some(v => v.trim())) rows.push(row)         // skip blank lines
      row = []; cur = ''
    } else {
      cur += ch
    }
  }
  // last field / row
  if (cur || row.length > 0) { row.push(cur); if (row.some(v => v.trim())) rows.push(row) }

  return rows
}

function mapRow(headers, values) {
  const get = (col) => {
    const idx = headers.indexOf(col)
    return idx >= 0 ? (values[idx] || '').trim() : ''
  }

  const firstName = get('First Name')
  const lastName  = get('Last Name')
  const ownerName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

  const hasPainRaw   = get('Does your pet display symptoms of pain?').toLowerCase()
  const hasPain      = hasPainRaw === 'yes' ? true : hasPainRaw === 'no' ? false : null

  const vetFriendlyRaw = get('Vet Friendly?').toLowerCase()
  const vetFriendly    = vetFriendlyRaw === 'yes' ? true : vetFriendlyRaw === 'no' ? false : null

  const reactiveRaw = get('Is Your Pet Reactive To Other Pets?').toLowerCase()
  const reactive    = reactiveRaw === 'yes' ? true : reactiveRaw === 'no' ? false : null

  const timestamp = get('Timestamp')
  const lastUpdated = get('Last Updated')

  return {
    owner_name:       ownerName,
    owner_email:      get('Email'),
    owner_phone:      get('Mobile'),
    post_code:        get('Post Code') || null,
    how_heard:        get('We are interested to know how you learned about us :-)') || null,
    pet_name:         get('Name of Pet') || 'Unknown',
    species:          'Unknown',
    breed:            get('Breed') || null,
    age:              get('Age') || null,
    pet_gender:       get('Gender') || null,
    vet_friendly:     vetFriendly,
    reactive_to_pets: reactive,
    condition:        get("What is the current issue with your pet's mobility?") || null,
    has_pain:         hasPain,
    clinic_name:      get('Name of Clinic(s)') || null,
    attending_vet:    get('Name of Attending Vet') || null,
    notes:            `[CSV] ID:${get('ID')} Key:${get('Key')}`,
    created_at:       timestamp || null,
    updated_at:       lastUpdated || null,
    _csv_id:          get('ID'),
    _timestamp_raw:   timestamp,
  }
}

async function sendBatch(rows) {
  const res = await fetch(`${BASE_URL}/api/admin/import-leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-import-secret': SECRET },
    body: JSON.stringify({ rows }),
  })
  return res.json()
}

async function main() {
  console.log(`\n📂 Reading: ${CSV_PATH}`)
  console.log(`🌐 Target:  ${BASE_URL}\n`)

  const content = readFileSync(CSV_PATH, 'utf8')
  const all = parseCSV(content)

  const headers = all[0]
  const dataRows = all.slice(1)

  console.log(`📋 Headers: ${headers.length} columns`)
  console.log(`📊 Data rows: ${dataRows.length}`)

  // Validate a few rows
  const tsIdx = headers.indexOf('Timestamp')
  const idIdx = headers.indexOf('ID')
  console.log(`\n🔍 Sample rows (first 3):`)
  for (const r of dataRows.slice(0, 3)) {
    console.log(`  ID=${r[idIdx] || '?'}  Timestamp="${r[tsIdx] || '?'}"  cols=${r.length}`)
  }
  console.log()

  const mapped = dataRows
    .filter(r => r.length >= 10)   // skip malformed lines
    .map(r => mapRow(headers, r))

  console.log(`📤 Rows to import: ${mapped.length}\n`)

  // Validate timestamps
  const missingTs = mapped.filter(r => !r._timestamp_raw)
  if (missingTs.length > 0) {
    console.warn(`⚠️  ${missingTs.length} rows have no timestamp (will default to now)`)
    missingTs.slice(0, 5).forEach(r => console.warn(`   CSV ID:${r._csv_id} ${r.owner_name}/${r.pet_name}`))
    console.log()
  }

  let totalInserted = 0, totalSkipped = 0, totalErrors = 0
  const batches = Math.ceil(mapped.length / BATCH)

  for (let i = 0; i < batches; i++) {
    const batch = mapped.slice(i * BATCH, (i + 1) * BATCH)
    process.stdout.write(`  Batch ${i+1}/${batches} (${batch.length} rows)... `)
    try {
      const result = await sendBatch(batch)
      totalInserted += result.inserted || 0
      totalSkipped  += result.skipped  || 0
      totalErrors   += (result.errors  || []).length
      if (result.errors?.length) {
        console.log(`⚠️  inserted=${result.inserted} skipped=${result.skipped} errors=${result.errors.length}`)
        result.errors.slice(0, 3).forEach(e => console.error('   ❌', e))
      } else {
        console.log(`✅ inserted=${result.inserted} skipped=${result.skipped}`)
      }
    } catch (e) {
      console.error(`  ❌ Batch ${i+1} failed:`, e.message)
      totalErrors++
    }
  }

  console.log(`\n✨ Done! inserted=${totalInserted} skipped=${totalSkipped} errors=${totalErrors}`)
}

main().catch(console.error)
