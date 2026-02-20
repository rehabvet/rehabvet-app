/*
  Backfill appointments.therapist_id from appointments_cleaned.csv.
  Matches by patient+client+date+start_time+modality where therapist_id is null.
*/

const fs = require('fs')
const path = require('path')
const { prisma } = require('./_prisma')

const csvPath = process.argv[2] || path.join(__dirname, '../../rehabvet/data/appointments_cleaned.csv')

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') inQuotes = !inQuotes
    else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else current += char
  }
  result.push(current.trim())
  return result
}

function parseCustomerName(fullName) {
  if (!fullName || fullName === 'N/A') return { owner: null, pet: null }
  const match = fullName.match(/^(.+?)\s+([A-Z][A-Z0-9\s]+?)(\s*\(.*\))?$/)
  if (match) return { owner: match[1].trim(), pet: match[2].trim() }
  return { owner: fullName.trim(), pet: 'Unknown' }
}

function parseDateTime(dateStr) {
  if (!dateStr) return null
  const m = dateStr.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/)
  if (!m) return null
  const [, day, month, year, hour, minute] = m
  const fullYear = parseInt(year, 10) + 2000
  return {
    date: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    startTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
  }
}

function buildStaffMatcher(users) {
  const byToken = []
  for (const u of users) {
    const name = (u.name || '').toLowerCase()
    if (!name) continue
    const tokens = name
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter(t => t.length >= 3 && !['dr', 'mrs', 'ms', 'mr'].includes(t))
    byToken.push({ id: u.id, name, tokens: Array.from(new Set(tokens)) })
  }

  return function getTherapistId(employeeName) {
    if (!employeeName) return null
    const e = employeeName.toLowerCase().trim()

    // explicit pattern from CSV
    if (e.includes('noelle') && e.includes('hazel')) {
      // CSV row says Noelle/Hazel; pick first matching token present in e order
      const first = e.indexOf('noelle') < e.indexOf('hazel') ? 'noelle' : 'hazel'
      const hit = byToken.find(u => u.tokens.includes(first))
      if (hit) return hit.id
    }

    // direct contains
    for (const u of byToken) {
      if (e.includes(u.name) || u.name.includes(e)) return u.id
    }

    // token overlap
    for (const u of byToken) {
      if (u.tokens.some(t => e.includes(t))) return u.id
    }

    return null
  }
}

async function main() {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`)

  const text = fs.readFileSync(csvPath, 'utf8')
  const lines = text.split('\n').filter(Boolean)
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''))

  const staff = await prisma.users.findMany({
    where: { role: { in: ['vet', 'therapist', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'] } },
    select: { id: true, name: true }
  })
  const getTherapistId = buildStaffMatcher(staff)

  let updated = 0
  let matchedRows = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] || '' })

    const employee = row['Employee']
    const customerName = row['Customer name']
    const service = row['Service']
    const appointmentDate = row['Appointment date']

    if (!customerName || customerName === 'N/A') continue
    if (!service || service.includes('DO NOT BOOK') || service.includes('Lunch') || service.includes('Leave') || service.includes('WAITLIST')) continue

    const therapistId = getTherapistId(employee)
    if (!therapistId) continue

    const parsed = parseCustomerName(customerName)
    const dt = parseDateTime(appointmentDate)
    if (!parsed.owner || !dt) continue

    const client = await prisma.clients.findFirst({ where: { name: parsed.owner }, select: { id: true } })
    if (!client) continue

    const patient = await prisma.patients.findFirst({ where: { client_id: client.id, name: parsed.pet || 'Unknown' }, select: { id: true } })
    if (!patient) continue

    matchedRows++

    const appt = await prisma.appointments.findFirst({
      where: {
        client_id: client.id,
        patient_id: patient.id,
        date: dt.date,
        start_time: dt.startTime,
        modality: service,
        therapist_id: null,
      },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    })

    if (appt) {
      await prisma.appointments.update({ where: { id: appt.id }, data: { therapist_id: therapistId } })
      updated++
    }
  }

  const remaining = await prisma.appointments.count({ where: { therapist_id: null } })
  console.log(`matched rows: ${matchedRows}`)
  console.log(`updated appointments: ${updated}`)
  console.log(`remaining with null therapist_id: ${remaining}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
