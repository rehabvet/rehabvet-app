import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { appointment_date, therapist_id, modality } = body

  const lead = await prisma.leads.findUnique({ where: { id: params.id } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.status === 'converted') return NextResponse.json({ error: 'Lead already converted' }, { status: 400 })

  const result = await prisma.$transaction(async (tx) => {
    // Check if client already exists by email (only if email is present)
    let client = lead.owner_email
      ? await tx.clients.findFirst({ where: { email: lead.owner_email } })
      : null

    if (!client) {
      client = await tx.clients.create({
        data: {
          name: lead.owner_name || 'Unknown',
          email: lead.owner_email,
          phone: lead.owner_phone,
        }
      })
    }

    // Create patient
    const patient = await tx.patients.create({
      data: {
        client_id: client.id,
        name: lead.pet_name || 'Unknown',
        species: lead.species || 'Unknown',
        breed: lead.breed || '',
      }
    })

    // Create appointment if date provided
    let appointment = null
    if (appointment_date) {
      const apptDate = new Date(appointment_date)
      const dateStr = apptDate.toISOString().split('T')[0]
      const startTimeStr = apptDate.toTimeString().slice(0, 5) || '09:00'
      const endDate = new Date(apptDate.getTime() + 60 * 60 * 1000)
      const endTimeStr = endDate.toTimeString().slice(0, 5) || '10:00'
      appointment = await tx.appointments.create({
        data: {
          client_id: client.id,
          patient_id: patient.id,
          therapist_id: therapist_id || null,
          date: dateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
          status: 'scheduled',
          modality: modality || lead.service || 'Consultation',
          notes: lead.condition || lead.notes || null,
        }
      })
    }

    // Update lead as converted
    await tx.leads.update({
      where: { id: params.id },
      data: {
        status: 'converted',
        converted_client_id: client.id,
        converted_patient_id: patient.id,
        converted_appointment_id: appointment?.id || null,
      }
    })

    return { client, patient, appointment }
  })

  return NextResponse.json({ success: true, ...result })
}
