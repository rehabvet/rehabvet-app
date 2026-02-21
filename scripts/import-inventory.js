#!/usr/bin/env node
// Import RehabVet product stock list into inventory_items
// Run: node scripts/import-inventory.js

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
})
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

// ── Service detection ─────────────────────────────────────────────────────────
const SERVICE_PATTERNS = [
  /session/i, /rental/i, /deposit/i, /\bprofile\b/i, /cancer screen/i,
  /custom made/i, /miscellaneous/i, /ultrasound gel/i, /ultrasonic gel/i,
  /gel top up/i, /\(1tab\)/i, /\(1cap\)/i, /daneuron/i,
  /vetra animal health tricosamine/i, /assis loop weekly/i, /comprehensive diagnostic/i,
]

function isService(name) {
  return SERVICE_PATTERNS.some(p => p.test(name))
}

// ── Category assignment ───────────────────────────────────────────────────────
function getCategory(name) {
  const n = name.toLowerCase()

  if (/^jt |^jt\b|teapills?|conc\.|conc |jiang tang|jin gui|rehmannia|si miao|bu yang|di gu pi|long dan|shen calmer|wind toxin|si wu tang|tian ma|sang hwang|sang wang|di tan|liver happy|wei qi|four paws|ku shen|si wu xiao/.test(n))
    return 'TCM / Chinese Medicine'

  if (/ruffwear/.test(n))
    return 'Ruffwear Gear'

  if (/balto|orthodog|lil back|orthopets|brace|splint/.test(n))
    return 'Orthotics & Braces'

  if (/harness|hip harness|front support|full body lifting|dog lifting|mobility/.test(n))
    return 'Mobility Aids'

  if (/pet cubes|underdog|gently cooked|k9 k\/d|nasi lamak/.test(n))
    return 'Pet Food'

  if (/\bsock|toe grip|rubber pad|vetwrap|soffban|hot cold|healfast|red light|tens\/ems|tens.ems|iv infusion|nacl|venocan|syringe|catheter|cotton wool/.test(n))
    return 'Supplies & Equipment'

  if (/shampoo|conditioner|ear clean|toothpaste|oratene|sonotix|zymox|epi-|dermcare|f10 |f10solution|aloveen|neocort|manuka|domoso|oratene/.test(n))
    return 'Grooming & Skin Care'

  if (/omega|collagen|probiotic|bifilactin|vitamin|melatonin|nutracalm|nutraflex|nutraease|nutrazyl|pro-kolin|pro-fibre|ocu-glo|aktivait|antinol|aminavast|connectin|sam-e|myos|astamate|cobalaplex|algae|nordic|le |^le\b|pea 300|vital support|evexia|sang hwang|sang wang|bioresiliant|super bio|ultra efa|lanomax|jpn|calmer canine|synovan|librela/.test(n))
    return 'Supplements'

  if (/anti.slip|extra anti|aero chamber|vitality|dfang|pet play|giant pet|cool mat|house basic|house prem|non-fold|fold\d|fold1[04]0/.test(n))
    return 'Pet Accessories'

  if (/nexgard|simparica|phenobarb|idexx|decaduro|cobalaplex|neurobion|pain away|pea |nutripet|nutri-plus|epi-otic|epi-soothe|tricin|venocan|soffban|bifilactin|kidney|thyroxine|nu q|librela|evexia|le arthro|le milk|le vitamin/.test(n))
    return 'Medications'

  return 'Other'
}

// ── Parse the text file ───────────────────────────────────────────────────────
function parseProducts(text) {
  const lines = text.split('\n')
  const products = []

  // Header pattern to skip
  const skipPatterns = [
    /^RehabVet Clinic/,
    /^513 Serangoon/,
    /^Ph:/,
    /Product Stock List/,
    /Not By Category/,
    /Pack\s+Cost/,
    /^Name\s+/,
    /^Store 1$/,
    /^Printed:/,
    /^Total Printed:/,
    /^Note:/,
    /Page \d+ of \d+/,
    /D:\\VL2/,
    /^\s*$/,
  ]

  // Product line pattern: starts with a name, then has numbers
  // Format: Name  Number  Supplier  Bin  Min  Max  Onhand  PackCost  CostValue  Markup  PackSell  SellValue  [Expiry]
  const productRegex = /^(.+?)\s{2,}(\d{3,4})\s+(.*?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s+(\S+))?\s*$/

  let currentName = ''
  let pendingLine = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip header/footer lines
    if (skipPatterns.some(p => p.test(line))) {
      pendingLine = ''
      continue
    }

    // Try to parse as a full product line
    const trimmed = line.trim()
    if (!trimmed) { pendingLine = ''; continue }

    // Combine with pending if we have a wrapped name
    const fullLine = pendingLine ? pendingLine + ' ' + trimmed : trimmed

    // Try to match product line with SKU number
    // Products have a number like 1001-1999 after the name
    const match = fullLine.match(/^(.+?)\s{2,}(\d{4})\s/)
    if (match) {
      // Parse the full line for all fields
      // Fields: Name, Number, [Supplier], [Bin.No], Min, Max, [Onhand], [PackCost], [CostValue], [Markup], [PackSell], [SellValue], [Expiry]
      const parts = fullLine.split(/\s{2,}/)
      const name = parts[0].trim()
      const sku = parts[1]?.trim()

      if (!sku || !/^\d{4}$/.test(sku)) {
        pendingLine = fullLine
        continue
      }

      // Find numeric fields from the end of the remaining parts
      const remaining = parts.slice(2).join(' ').trim()
      const nums = remaining.match(/([-\d.]+)/g) || []

      // Extract: [supplier?] [bin?] min max [onhand] [cost] [costVal] [markup] [sell] [sellVal] [expiry?]
      // Min and Max are always 1.00 for most items
      let min = 1, max = 1, onHand = 0, cost = 0, markup = 0, sell = 0
      let binNo = ''
      let expiry = ''

      // Bin number is a single short number (1-3 digits) between supplier and min
      const binMatch = remaining.match(/\b([1-9])\b/)
      if (binMatch) binNo = binMatch[1]

      // Parse numbers - they appear in order: min, max, [onhand], cost, costVal, markup%, sell, sellVal [expiry]
      // We need at least min, max (both 1.00 usually), then cost and sell
      if (nums.length >= 2) {
        // Find min/max - usually both 1.00
        let idx = 0
        // Skip any leading 1.00 pairs
        while (idx < nums.length && parseFloat(nums[idx]) === 1.0 && idx + 1 < nums.length && parseFloat(nums[idx + 1]) === 1.0) {
          min = parseFloat(nums[idx])
          max = parseFloat(nums[idx + 1])
          idx += 2
          break
        }

        // onHand might be next if it looks like a stock qty (could be negative, 0, or larger)
        if (idx < nums.length) {
          const next = parseFloat(nums[idx])
          // If next is not a typical price/markup, it's onHand
          if (nums[idx] !== undefined) {
            // heuristic: onhand appears before cost value
            // cost and sell are usually > 0.05
            onHand = next
            idx++
          }
        }

        // cost, costVal, markup, sell, sellVal
        if (idx < nums.length) cost = Math.abs(parseFloat(nums[idx++]) || 0)
        idx++ // skip cost value
        if (idx < nums.length) markup = parseFloat(nums[idx++]) || 0
        if (idx < nums.length) sell = Math.abs(parseFloat(nums[idx++]) || 0)

        // Last item might be expiry date (format: D/M/YYYY)
        const lastNum = nums[nums.length - 1]
        if (lastNum && /\d{1,2}\/\d{1,2}\/\d{4}/.test(remaining)) {
          const expiryMatch = remaining.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
          if (expiryMatch) expiry = expiryMatch[1]
        }
      }

      if (name && sku) {
        products.push({ name, sku, min, max, onHand, cost, markup, sell, binNo, expiry })
      }
      pendingLine = ''
    } else {
      // Might be a continuation of previous name, or a new name without full data yet
      pendingLine = fullLine
    }
  }

  return products
}

// ── Simpler, more robust parser ───────────────────────────────────────────────
function parseProductsRobust(text) {
  // Split into pages, remove headers
  const cleanedLines = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (/^RehabVet|^513 Serang|^Ph:|Product Stock|Not By Category|^Pack\s|^Name\s|^Store 1$|^Printed:|^Total Printed:|^Note:|D:\\VL2|Page \d+ of/.test(t)) continue
    cleanedLines.push(t)
  }

  // Join the cleaned text and split by product entries
  // Each product line has a 4-digit number (SKU) somewhere in it
  const products = []

  // Process line by line; accumulate multi-line names
  let buf = ''
  for (const line of cleanedLines) {
    // Check if this line contains a 4-digit SKU (standalone number 1000-1999)
    const skuMatch = line.match(/\b(1\d{3})\b/)
    if (skuMatch) {
      // This is a product line; buf contains any pending name from previous line
      const combined = buf ? buf + ' ' + line : line
      buf = ''

      // Parse: everything before the SKU is the name (or part of it)
      const skuIdx = combined.indexOf(skuMatch[1])
      let name = combined.substring(0, skuIdx).trim()
      const rest = combined.substring(skuIdx + skuMatch[1].length).trim()

      if (!name) { buf = line; continue }

      const sku = skuMatch[1]

      // Extract numbers from rest
      const nums = (rest.match(/([-]?\d+\.?\d*)/g) || []).map(Number)

      let min = 1, max = 1, onHand = 0, cost = 0, markup = 0, sell = 0, binNo = ''

      // First we might have a single bin digit (1-9)
      let startIdx = 0
      if (nums.length > 0 && nums[0] >= 1 && nums[0] <= 9 && Math.floor(nums[0]) === nums[0]) {
        // Could be bin number
        const binCandidate = rest.match(/^\s*(\d)\s/)
        if (binCandidate) { binNo = binCandidate[1]; startIdx = 1 }
      }

      // min max are 1.00 1.00 (float 1)
      if (nums[startIdx] === 1 && nums[startIdx + 1] === 1) {
        min = 1; max = 1; startIdx += 2
      }

      // Next might be onHand (could be negative or 0)
      // Then cost, costValue, markup, sell, sellValue
      if (startIdx < nums.length) { onHand = nums[startIdx++] }
      if (startIdx < nums.length) { cost = Math.abs(nums[startIdx++]) }
      startIdx++ // skip cost value
      if (startIdx < nums.length) { markup = Math.abs(nums[startIdx++]) }
      if (startIdx < nums.length) { sell = Math.abs(nums[startIdx++]) }

      // Expiry date
      let expiry = ''
      const expiryMatch = rest.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
      if (expiryMatch) expiry = expiryMatch[1]

      products.push({ name, sku, min, max, onHand, cost, markup, sell, binNo, expiry })
    } else {
      // Continuation of previous product name
      buf = buf ? buf + ' ' + line : line
    }
  }

  return products
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const textPath = '/tmp/rehabvet-products.txt'
  if (!fs.existsSync(textPath)) {
    console.error('Product text file not found at', textPath)
    process.exit(1)
  }

  const text = fs.readFileSync(textPath, 'utf8')
  const rawProducts = parseProductsRobust(text)

  console.log(`Parsed ${rawProducts.length} raw entries`)

  // Filter services
  const products = rawProducts.filter(p => !isService(p.name))
  console.log(`After filtering services: ${products.length} products`)

  // Check existing count
  const existing = await prisma.inventory_items.count()
  console.log(`Existing inventory items: ${existing}`)

  // Get existing SKUs to skip dupes
  const existingSkus = new Set(
    (await prisma.inventory_items.findMany({ select: { sku: true } }))
      .map((i) => i.sku)
      .filter(Boolean)
  )
  console.log(`Existing SKUs in DB: ${existingSkus.size}`)

  // Insert products (skip existing SKUs)
  let inserted = 0
  let skipped = 0

  for (const p of products) {
    if (p.sku && existingSkus.has(p.sku)) { skipped++; continue }
    try {
      await prisma.inventory_items.create({
        data: {
          sku: p.sku || null,
          name: p.name,
          category: getCategory(p.name),
          cost_price: p.cost || null,
          sell_price: p.sell || null,
          markup_pct: p.markup || null,
          stock_on_hand: p.onHand || 0,
          stock_min: p.min || 1,
          stock_max: p.max || 1,
          unit: 'each',
          expiry_date: p.expiry || null,
          notes: p.binNo ? `Bin: ${p.binNo}` : null,
          is_active: true,
        }
      })
      inserted++
    } catch (e) {
      console.warn(`Skipped "${p.name}":`, e.message)
      skipped++
    }
  }

  console.log(`✅ Inserted: ${inserted} | Skipped: ${skipped}`)

  // Show category breakdown
  const byCategory = {}
  for (const p of products) {
    const cat = getCategory(p.name)
    byCategory[cat] = (byCategory[cat] || 0) + 1
  }
  console.log('\nCategory breakdown:')
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${count}`)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
