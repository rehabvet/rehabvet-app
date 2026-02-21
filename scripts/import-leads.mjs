#!/usr/bin/env node
/**
 * Import historical leads from CSV into RehabVet app.
 * Usage: node scripts/import-leads.mjs <path-to-csv> [base-url] [secret]
 *
 * Defaults:
 *   base-url = https://app.rehabvet.com
 *   secret   = rv-import-2024
 */

import { createReadStream } from 'fs'
import { createInterface } from 'readline'

const CSV_PATH = process.argv[2] || './leads.csv'
const BASE_URL = process.argv[3] || 'https://app.rehabvet.com'
const SECRET   = process.argv[4] || 'rv-import-2024'
const BATCH    = 50  // rows per request

// ---- CSV parser (handles quoted fields with commas/newlines) ----
function parseCSVLine(line) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

function mapRow(headers, values) {
  const get = (col) => {
    const idx = headers.indexOf(col)
    return idx >= 0 ? (values[idx] || '').trim() : ''
  }

  const firstName  = get('First Name')
  const lastName   = get('Last Name')
  const ownerName  = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

  const hasPainRaw = get('Does your pet display symptoms of pain?').toLowerCase()
  const hasPain    = hasPainRaw === 'yes' ? true : hasPainRaw === 'no' ? false : null

  const vetFriendlyRaw = get('Vet Friendly?').toLowerCase()
  const vetFriendly    = vetFriendlyRaw === 'yes' ? true : vetFriendlyRaw === 'no' ? false : null

  const reactiveRaw = get('Is Your Pet Reactive To Other Pets?').toLowerCase()
  const reactive    = reactiveRaw === 'yes' ? true : reactiveRaw === 'no' ? false : null

  const rawGender = get('Gender')

  return {
    owner_name:      ownerName,
    owner_email:     get('Email'),
    owner_phone:     get('Mobile'),
    post_code:       get('Post Code') || null,
    how_heard:       get('We are interested to know how you learned about us :-)') || null,
    pet_name:        get('Name of Pet') || 'Unknown',
    species:         'Unknown',
    breed:           get('Breed') || null,
    age:             get('Age') || null,
    pet_gender:      rawGender || null,
    vet_friendly:    vetFriendly,
    reactive_to_pets: reactive,
    condition:       get('What is the current issue with your pet\'s mobility?') || null,
    has_pain:        hasPain,
    clinic_name:     get('Name of Clinic(s)') || null,
    attending_vet:   get('Name of Attending Vet') || null,
    notes:           `[Imported from CSV] CSV ID: ${get('ID')} Key: ${get('Key')}`,
    created_at:      get('Timestamp') || null,
    updated_at:      get('Last Updated') || null,
  }
}

async function sendBatch(rows) {
  const res = await fetch(`${BASE_URL}/api/admin/import-leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-import-secret': SECRET,
    },
    body: JSON.stringify({ rows }),
  })
  const json = await res.json()
  return json
}

async function main() {
  console.log(`\n📂 Reading: ${CSV_PATH}`)
  console.log(`🌐 Target:  ${BASE_URL}`)

  const rl = createInterface({ input: createReadStream(CSV_PATH), crlfDelay: Infinity })

  let headers = null
  const allRows = []

  for await (const rawLine of rl) {
    if (!headers) {
      headers = parseCSVLine(rawLine)
      console.log(`📋 Headers detected: ${headers.length} columns`)
      continue
    }
    if (!rawLine.trim()) continue
    const values = parseCSVLine(rawLine)
    if (values.length < 5) continue
    allRows.push(mapRow(headers, values))
  }

  console.log(`📊 Total rows parsed: ${allRows.length}`)

  let totalInserted = 0, totalSkipped = 0, totalErrors = 0
  const batches = Math.ceil(allRows.length / BATCH)

  for (let i = 0; i < batches; i++) {
    const batch = allRows.slice(i * BATCH, (i + 1) * BATCH)
    process.stdout.write(`  Batch ${i+1}/${batches} (${batch.length} rows)... `)
    try {
      const result = await sendBatch(batch)
      totalInserted += result.inserted || 0
      totalSkipped  += result.skipped  || 0
      totalErrors   += (result.errors  || []).length
      if (result.errors?.length) {
        console.log(`⚠️  inserted=${result.inserted} skipped=${result.skipped} errors=${result.errors.length}`)
        result.errors.forEach(e => console.error('   ❌', e))
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
