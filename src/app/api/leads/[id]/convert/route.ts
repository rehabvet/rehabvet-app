import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { appointment_date, therapist_id, modality } = body

  const lead = await prisma.leads.findUnique({ where: { id: params.id } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // Check if client already exists by email
  let client = await prisma.clients.findFirst({
    where: { email: lead.owner_email }
  })

  if (!client) {
    client = await prisma.clients.create({
      data: {
        name: lead.owner_name,
        email: lead.owner_email,
        phone: lead.owner_phone,
      }
    })
  }

  // Create patient
  const patient = await prisma.patients.create({
    data: {
      client_id: client.id,
      name: lead.pet_name,
      species: lead.species,
      breed: lead.breed || '',
    }
  })

  // Create appointment if date provided
  let appointment = null
  if (appointment_date) {
    appointment = await prisma.appointments.create({
      data: {
        client_id: client.id,
        patient_id: patient.id,
        therapist_id: therapist_id || null,
        appointment_date: new Date(appointment_date),
        duration_minutes: 60,
        status: 'scheduled',
        modality: modality || lead.service || 'Consultation',
        notes: lead.condition || lead.notes || null,
      }
    })
  }

  // Update lead as converted
  await prisma.leads.update({
    where: { id: params.id },
    data: {
      status: 'converted',
      converted_client_id: client.id,
      converted_patient_id: patient.id,
      converted_appointment_id: appointment?.id || null,
    }
  })

  return NextResponse.json({ success: true, client, patient, appointment })
}
