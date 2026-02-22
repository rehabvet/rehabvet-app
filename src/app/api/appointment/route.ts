import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAppointmentConfirmation } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    owner_name, owner_email, owner_phone, post_code, address, how_heard,
    pet_name, species, breed, age, weight, pet_gender, vet_friendly, reactive_to_pets,
    service, condition, has_pain, clinic_name, attending_vet,
    preferred_date, first_visit, notes
  } = body

  if (!owner_name || !owner_email || !owner_phone || !pet_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const lead = await prisma.leads.create({
    data: {
      owner_name, owner_email, owner_phone,
      post_code: post_code || null,
      how_heard: how_heard || null,
      pet_name, species: species || 'Unknown',
      breed: breed || null,
      age: age || null,
      weight: weight || null,
      pet_gender: pet_gender || null,
      vet_friendly: vet_friendly !== undefined ? vet_friendly : null,
      reactive_to_pets: reactive_to_pets !== undefined ? reactive_to_pets : null,
      service: service || null,
      condition: condition || null,
      has_pain: has_pain !== undefined ? has_pain : null,
      clinic_name: clinic_name || null,
      attending_vet: attending_vet || null,
      preferred_date: preferred_date || null,
      first_visit: first_visit !== false,
      notes: notes || null,
      status: 'new',
    }
  })

  // Send confirmation email to customer (non-blocking)
  sendAppointmentConfirmation({
    owner_name,
    owner_email,
    pet_name,
    breed: breed || undefined,
    clinic_name: clinic_name || undefined,
    attending_vet: attending_vet || undefined,
    condition: condition || undefined,
  }).catch(err => console.error('[email] sendAppointmentConfirmation error:', err))

  return NextResponse.json({ success: true, id: lead.id }, { status: 201 })
}
