import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLeadEmails } from '@/lib/email'
import { sendAlert } from '@/lib/alert'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}

  try {
    body = await req.json()
  } catch {
    await sendAlert(
      '⚠️ Appointment form — bad request body',
      'Customer submitted the form but the request body could not be parsed (invalid JSON).',
    )
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const {
    owner_name, owner_email, owner_phone, post_code, address, how_heard,
    pet_name, species, breed, age, weight, pet_gender, vet_friendly, reactive_to_pets,
    service, condition, has_pain, clinic_name, attending_vet,
    preferred_date, first_visit, notes,
  } = body as Record<string, unknown>

  // ── Validation ──────────────────────────────────────────────────────────────
  const missing: string[] = []
  if (!owner_name)  missing.push('owner_name')
  if (!owner_email) missing.push('owner_email')
  if (!owner_phone) missing.push('owner_phone')
  if (!pet_name)    missing.push('pet_name')

  if (missing.length > 0) {
    await sendAlert(
      '⚠️ Appointment form — missing required fields',
      `A submission was rejected due to missing: <b>${missing.join(', ')}</b>`,
      { owner_name, owner_email, owner_phone, pet_name },
    )
    return NextResponse.json({ error: 'Missing required fields', missing }, { status: 400 })
  }

  // ── Save lead ────────────────────────────────────────────────────────────────
  let lead
  try {
    lead = await prisma.leads.create({
      data: {
        owner_name:       String(owner_name),
        owner_email:      String(owner_email),
        owner_phone:      String(owner_phone),
        post_code:        post_code  ? String(post_code)  : null,
        how_heard:        how_heard  ? String(how_heard)  : null,
        pet_name:         String(pet_name),
        species:          species    ? String(species)    : 'Unknown',
        breed:            breed      ? String(breed)      : null,
        age:              age        ? String(age)        : null,
        weight:           weight     ? String(weight)     : null,
        pet_gender:       pet_gender ? String(pet_gender) : null,
        vet_friendly:     vet_friendly     !== undefined ? Boolean(vet_friendly)     : null,
        reactive_to_pets: reactive_to_pets !== undefined ? Boolean(reactive_to_pets) : null,
        service:          service    ? String(service)    : null,
        condition:        condition  ? String(condition)  : null,
        has_pain:         has_pain   !== undefined ? Boolean(has_pain) : null,
        clinic_name:      clinic_name   ? String(clinic_name)   : null,
        attending_vet:    attending_vet  ? String(attending_vet) : null,
        preferred_date:   preferred_date ? String(preferred_date): null,
        first_visit:      first_visit !== false,
        notes:            notes ? String(notes) : null,
        status:           'new',
      },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)

    await sendAlert(
      '🔴 Appointment form — DATABASE ERROR',
      `A customer tried to book but we <b>failed to save their lead</b>.\n\nError: <code>${errMsg}</code>`,
      {
        owner_name,
        owner_email,
        owner_phone,
        pet_name,
        breed,
      },
    )

    console.error('[appointment] DB error:', err)
    return NextResponse.json({ error: 'Failed to save your request. Please try again.' }, { status: 500 })
  }

  // ── Send emails (non-blocking) ───────────────────────────────────────────────
  sendLeadEmails({
    owner_name:       String(owner_name),
    owner_email:      String(owner_email),
    owner_phone:      owner_phone  ? String(owner_phone)  : undefined,
    post_code:        post_code    ? String(post_code)    : undefined,
    how_heard:        how_heard    ? String(how_heard)    : undefined,
    pet_name:         String(pet_name),
    breed:            breed        ? String(breed)        : undefined,
    age:              age          ? String(age)          : undefined,
    pet_gender:       pet_gender   ? String(pet_gender)   : undefined,
    vet_friendly:     vet_friendly     !== undefined ? Boolean(vet_friendly)     : undefined,
    reactive_to_pets: reactive_to_pets !== undefined ? Boolean(reactive_to_pets) : undefined,
    has_pain:         has_pain         !== undefined ? Boolean(has_pain)         : undefined,
    condition:        condition    ? String(condition)    : undefined,
    clinic_name:      clinic_name  ? String(clinic_name)  : undefined,
    attending_vet:    attending_vet ? String(attending_vet) : undefined,
    preferred_date:   preferred_date ? String(preferred_date) : undefined,
    service:          service      ? String(service)      : undefined,
    notes:            notes        ? String(notes)        : undefined,
  }).catch(async (err) => {
    const errMsg = err instanceof Error ? err.message : String(err)
    await sendAlert(
      '⚠️ Appointment form — email failed',
      `Lead was saved (ID: ${lead.id}) but <b>confirmation email failed</b>.\n\nError: <code>${errMsg}</code>`,
      { owner_name, owner_email, pet_name },
    )
    console.error('[email] sendLeadEmails error:', err)
  })

  return NextResponse.json({ success: true, id: lead.id }, { status: 201 })
}
