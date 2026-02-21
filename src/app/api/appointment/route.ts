import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    owner_name, owner_email, owner_phone, how_heard,
    pet_name, species, breed, age, weight,
    service, condition, preferred_date, first_visit, notes
  } = body

  if (!owner_name || !owner_email || !owner_phone || !pet_name || !species) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const lead = await prisma.leads.create({
    data: {
      owner_name, owner_email, owner_phone,
      how_heard: how_heard || null,
      pet_name, species,
      breed: breed || null,
      age: age || null,
      weight: weight || null,
      service: service || null,
      condition: condition || null,
      preferred_date: preferred_date || null,
      first_visit: first_visit !== false,
      notes: notes || null,
      status: 'new',
    }
  })

  return NextResponse.json({ success: true, id: lead.id }, { status: 201 })
}
