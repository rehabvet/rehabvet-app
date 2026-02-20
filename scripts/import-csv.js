/*
  Import appointments_cleaned.csv into Postgres via Prisma.

  Usage:
    node scripts/import-csv.js /path/to/appointments_cleaned.csv

  Default path (kept for compatibility with the old scripts):
    ../../rehabvet/data/appointments_cleaned.csv
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

// Helper to parse customer name into owner + pet
function parseCustomerName(fullName) {
  if (!fullName || fullName === 'N/A') return { owner: null, pet: null }

  const match = fullName.match(/^(.+?)\s+([A-Z][A-Z0-9\s]+?)(\s*\(.*\))?$/)
  if (match) {
    return {
      owner: match[1].trim(),
      pet: match[2].trim(),
      note: match[3] ? match[3].replace(/[()]/g, '').trim() : null,
    }
  }
  return { owner: fullName, pet: 'Unknown' }
}

// Normalize phone
function normalizePhone(phone) {
  if (!phone || phone === 'N/A') return null
  const cleaned = phone.toString().replace(/[\s\-+]/g, '')
  if (!cleaned.match(/^\d+$/)) return null
  if (cleaned.length === 8) return '+65' + cleaned
  if (cleaned.length === 10 && cleaned.startsWith('65')) return '+' + cleaned
  if (cleaned.length === 11 && cleaned.startsWith('65')) return '+' + cleaned
  return null
}

// Map service to treatment type duration (best-effort)
function getTreatmentDuration(service, treatmentMap) {
  if (!service) return null
  const svc = service.toLowerCase().trim()

  if (treatmentMap[svc]) return treatmentMap[svc].duration

  for (const [name, data] of Object.entries(treatmentMap)) {
    if (svc.includes(name) || name.includes(svc)) return data.duration
  }

  if (svc.includes('hydrotherapy')) return treatmentMap['rehabilitation - hydrotherapy']?.duration
  if (svc.includes('follow up')) return treatmentMap['animal rehabilitation - follow ups']?.duration
  if (svc.includes('acupuncture')) return treatmentMap['tcvm tui-na and acupuncture']?.duration
  if (svc.includes('pain')) return treatmentMap['pain relief']?.duration
  if (svc.includes('lunch')) return treatmentMap['lunch']?.duration

  return null
}

// Parse date: "28/2/26 17:00" -> { date: "2026-02-28", startTime: "17:00", endTime: "18:00" }
function parseDateTime(dateStr, duration = 60) {
  if (!dateStr) return null
  const match = dateStr.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/)
  if (!match) return null

  const [, day, month, year, hour, minute] = match
  const fullYear = parseInt(year, 10) + 2000
  const date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const startTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`

  const startMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10)
  const endMinutes = startMinutes + duration
  const endHour = Math.floor(endMinutes / 60)
  const endMin = endMinutes % 60
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`

  return { date, startTime, endTime }
}

async function main() {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`)

  const csvContent = fs.readFileSync(csvPath, 'utf8')
  const lines = csvContent.split('\n')
  const headers = lines[0].split(',')

  // Prefetch staff and treatment types
  const [staff, treatments] = await Promise.all([
    prisma.users.findMany({ select: { id: true, name: true } }),
    prisma.treatment_types.findMany({ select: { id: true, name: true, duration: true } }),
  ])

  const staffIndex = staff.map((u) => ({ id: u.id, name: (u.name || '').toLowerCase() }))

  function getTherapistId(employeeName) {
    if (!employeeName) return null
    const e = employeeName.toLowerCase().trim()
    // direct substring match
    for (const u of staffIndex) {
      if (!u.name) continue
      if (e.includes(u.name) || u.name.includes(e)) return u.id
    }
    // token match
    const tokens = ['joyce', 'xan', 'sean', 'sara', 'noelle', 'hazel', 'claire']
    for (const t of tokens) {
      if (e.includes(t)) {
        const u = staffIndex.find((x) => x.name.includes(t))
        if (u) return u.id
      }
    }
    return null
  }

  const treatmentMap = {}
  for (const t of treatments) {
    treatmentMap[t.name.toLowerCase()] = { id: t.id, duration: t.duration }
  }

  const clientCache = new Map() // key -> clientId
  const patientCache = new Map() // key -> patientId

  let imported = 0
  let skipped = 0
  const errors = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => {
      row[h.trim().replace(/^\uFEFF/, '')] = cols[idx] || ''
    })

    const csvId = row['ID']
    const customerName = row['Customer name']
    const phone = row['Customer phone']
    const email = row['Customer email']
    const service = row['Service']
    const employee = row['Employee']
    const appointmentDate = row['Appointment date']
    const durationFromCsv = parseInt(row['Duration'], 10) || null
    const status = row['Status']
    const notes = row['Notes']

    if (!customerName || customerName === 'N/A' || customerName === 'NO MANPOWER') {
      skipped++
      continue
    }

    // Skip blocking/admin entries
    if (
      service &&
      (service.includes('DO NOT BOOK') ||
        service.includes('Lunch') ||
        service.includes('Leave') ||
        service.includes('CNY') ||
        service.includes('Interview') ||
        service.includes('TRIAL') ||
        service.includes('WAITLIST'))
    ) {
      skipped++
      continue
    }

    const parsed = parseCustomerName(customerName)
    if (!parsed.owner) {
      skipped++
      continue
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      // clients.phone is required
      skipped++
      continue
    }

    const clientKey = normalizedPhone || parsed.owner

    // Get/create client
    let clientId = clientCache.get(clientKey)
    if (!clientId) {
      const existing = await prisma.clients.findFirst({
        where: { OR: [{ phone: normalizedPhone }, { name: parsed.owner }] },
        select: { id: true },
      })

      if (existing) {
        clientId = existing.id
      } else {
        const created = await prisma.clients.create({
          data: {
            name: parsed.owner,
            phone: normalizedPhone,
            email: email && email !== 'N/A' && !String(email).match(/^\d+$/) ? email : null,
          },
          select: { id: true },
        })
        clientId = created.id
      }

      clientCache.set(clientKey, clientId)
    }

    // Get/create patient
    const pet = parsed.pet || 'Unknown'
    const patientKey = `${clientId}:${pet}`

    let patientId = patientCache.get(patientKey)
    if (!patientId) {
      const existing = await prisma.patients.findFirst({
        where: { client_id: clientId, name: pet },
        select: { id: true },
      })

      if (existing) {
        patientId = existing.id
      } else {
        const created = await prisma.patients.create({
          data: {
            client_id: clientId,
            name: pet,
            species: 'Dog',
            notes: parsed.note || null,
          },
          select: { id: true },
        })
        patientId = created.id
      }

      patientCache.set(patientKey, patientId)
    }

    // Therapist
    const therapistId = getTherapistId(employee)

    // Duration + date/time
    const duration = durationFromCsv || getTreatmentDuration(service, treatmentMap) || 60
    const dt = parseDateTime(appointmentDate, duration)
    if (!dt) {
      errors.push(`Row ${i}: Invalid date "${appointmentDate}"`)
      skipped++
      continue
    }

    // Map status to DB enum
    let dbStatus = 'scheduled'
    if (status === 'Approved') {
      const apptDate = new Date(dt.date)
      const today = new Date()
      dbStatus = apptDate < today ? 'completed' : 'confirmed'
    } else if (status === 'Cancelled') {
      dbStatus = 'cancelled'
    }

    try {
      await prisma.appointments.create({
        data: {
          patient_id: patientId,
          client_id: clientId,
          therapist_id: therapistId,
          date: dt.date,
          start_time: dt.startTime,
          end_time: dt.endTime,
          modality: service || 'Other',
          status: dbStatus,
          notes: notes || `Imported from CSV (original ID: ${csvId})`,
        },
      })
      imported++
    } catch (err) {
      errors.push(`Row ${i}: ${err.message || err}`)
    }
  }

  console.log(`\n=== Import Complete ===`)
  console.log(`Imported: ${imported} appointments`)
  console.log(`Skipped: ${skipped} (admin/blocking entries, invalid rows)`) 
  console.log(`Clients touched (cache size): ${clientCache.size}`)
  console.log(`Patients touched (cache size): ${patientCache.size}`)

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`))
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`)
  }
}

main()
  .catch((e) => {
    console.error('Import failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
