/*
  Import customers.csv (clients + patients) into Postgres via Prisma.

  Usage:
    node scripts/import-customers.js /path/to/customers.csv

  Default path (kept for compatibility with the old scripts):
    ../../rehabvet/data/customers.csv
*/

const fs = require('fs')
const path = require('path')
const { prisma } = require('./_prisma')

const csvPath = process.argv[2] || path.join(__dirname, '../../rehabvet/data/customers.csv')

// Skip patterns - entries that are not real customers
const SKIP_PATTERNS = [
  /^full name/i,
  /^name,/i,
  /^breed:/i,
  /^age:/i,
  /^gender:/i,
  /^condition/i,
  /^history/i,
  /^currently/i,
  /^diet/i,
  /^seen /i,
  /^rear leg/i,
  /^walking/i,
  /^cannot walk/i,
  /^weakness/i,
  /^reduce strength/i,
  /^animal world/i,
  /^last con/i,
  /^local husky/i,
  /^sex:/i,
  /^pending/i,
  /^wife called/i,
  /^lux\./i,
  /^eos /i,
  /^mochi /i,
  /^snoopy /i,
  /^chowchow/i,
  /^3yo/i,
  /^maltese/i,
  /^had arthritis/i,
  /^xrays/i,
  /^all staff/i,
  /^staff member/i,
  /^do not use/i,
  /\(do not use\)/i,
  /^no manpower/i,
  /^no room/i,
  /^no equipment/i,
  /^no part timer/i,
  /^interview/i,
  /^go through/i,
  /^medical report/i,
  /^staff training/i,
  /^phone call/i,
  /^vetlink/i,
  /^air con/i,
  /^hbot maint/i,
  /^good friday/i,
  /^hari raya/i,
  /^labour day/i,
  /^vesak day/i,
  /^national day/i,
  /^diwali/i,
  /^christmas/i,
  /^trial /i,
  /^y$/i,
  /^jesus$/i,
  /^female\s*$/i,
  /^singapore special/i,
  /^- yen/i,
  /^sara$/i,
  /^catherine$/i,
  /^hannah$/i,
  /^stephanie$/i,
  /^louisa$/i,
  /^maureen$/i,
  /^ann$/i,
  /^karrina$/i,
]

function shouldSkip(name) {
  if (!name || name.trim().length < 2) return true
  const n = name.trim()
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(n)) return true
  }
  // Skip if it's just a number
  if (/^\d+$/.test(n.replace(/[\s\-+]/g, ''))) return true
  return false
}

// Parse "Owner Name, PET" or "Owner Name PET" format
function parseCustomerName(fullName) {
  if (!fullName) return null
  let name = fullName.trim().replace(/^["']|["']$/g, '')

  // Handle "Owner , PET" format
  if (name.includes(',')) {
    const parts = name.split(',')
    const owner = parts[0].trim()
    const pet = parts.slice(1).join(',').trim()
    if (owner && pet) {
      return { owner, pet: pet.toUpperCase() }
    }
  }

  // Handle "Owner PET" format (pet is typically in CAPS at the end)
  const match = name.match(/^(.+?)\s+([A-Z][A-Z0-9\s]+?)(\s*\(.*\))?$/)
  if (match) {
    const owner = match[1].trim()
    let pet = match[2].trim()
    const note = match[3] ? match[3].replace(/[()]/g, '').trim() : null
    return { owner, pet, note }
  }

  // If no pet name found, return just the owner
  return { owner: name, pet: null }
}

// Normalize phone number
function normalizePhone(phone) {
  if (!phone) return null
  let cleaned = phone.toString().replace(/[\s\-+]/g, '')

  // Skip invalid
  if (!cleaned || cleaned === '0' || cleaned === '1' || cleaned.length < 8) return null
  if (!/^\d+$/.test(cleaned)) return null

  if (cleaned.length === 8) return '+65' + cleaned
  if (cleaned.length === 10 && cleaned.startsWith('65')) return '+' + cleaned
  if (cleaned.length === 11 && cleaned.startsWith('65')) return '+' + cleaned.substring(0, 10)
  if (cleaned.length > 11) return null

  return '+' + cleaned
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

async function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8')
  const lines = csvContent.split('\n')

  let clientsCreated = 0
  let patientsCreated = 0
  let skipped = 0
  const errors = []

  const clientByPhone = new Map()
  const clientByName = new Map()
  const patientCache = new Set()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCSVLine(line)
    const rawName = cols[0]?.replace(/^["']|["']$/g, '').trim()
    const phone = cols[3]?.trim()
    const email = cols[4]?.trim()

    if (shouldSkip(rawName)) {
      skipped++
      continue
    }

    const parsed = parseCustomerName(rawName)
    if (!parsed || !parsed.owner) {
      skipped++
      continue
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      // Clients.phone is required.
      skipped++
      continue
    }

    const ownerName = parsed.owner
    const petName = parsed.pet

    let clientId = clientByPhone.get(normalizedPhone) || clientByName.get(ownerName)

    if (!clientId) {
      const existing = await prisma.clients.findFirst({
        where: { OR: [{ phone: normalizedPhone }, { name: ownerName }] },
        select: { id: true },
      })

      if (existing) {
        clientId = existing.id
      } else {
        try {
          const created = await prisma.clients.create({
            data: {
              name: ownerName,
              phone: normalizedPhone,
              email: email && email !== 'N/A' ? email : null,
            },
            select: { id: true },
          })
          clientId = created.id
          clientsCreated++
        } catch (err) {
          errors.push(`Line ${i + 1}: Failed to create client "${ownerName}": ${err.message || err}`)
          continue
        }
      }

      clientByPhone.set(normalizedPhone, clientId)
      clientByName.set(ownerName, clientId)
    }

    if (petName) {
      const patientKey = `${clientId}:${petName}`
      if (!patientCache.has(patientKey)) {
        const existing = await prisma.patients.findFirst({
          where: { client_id: clientId, name: petName },
          select: { id: true },
        })

        if (!existing) {
          try {
            await prisma.patients.create({
              data: {
                client_id: clientId,
                name: petName,
                species: 'Dog',
                notes: parsed.note || null,
              },
            })
            patientsCreated++
          } catch (err) {
            errors.push(`Line ${i + 1}: Failed to create patient "${petName}": ${err.message || err}`)
          }
        }

        patientCache.add(patientKey)
      }
    }
  }

  console.log('\n=== Customer Import Complete ===')
  console.log(`Clients created: ${clientsCreated}`)
  console.log(`Patients created: ${patientsCreated}`)
  console.log(`Skipped: ${skipped} (headers, notes, invalid entries)`) 

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`))
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`)
  }

  const [totalClients, totalPatients] = await Promise.all([prisma.clients.count(), prisma.patients.count()])
  console.log(`\nDatabase totals: ${totalClients} clients, ${totalPatients} patients`)
}

main()
  .catch((e) => {
    console.error('Import failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
