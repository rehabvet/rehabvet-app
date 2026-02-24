import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    status, staff_notes,
    owner_name, owner_email, owner_phone, post_code, how_heard,
    pet_name, species, breed, age, weight, pet_gender,
    vet_friendly, reactive_to_pets, has_pain,
    clinic_name, attending_vet,
    condition, service, preferred_date, first_visit, notes,
  } = body

  const lead = await prisma.leads.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(staff_notes !== undefined && { staff_notes }),
      ...(owner_name !== undefined && { owner_name }),
      ...(owner_email !== undefined && { owner_email }),
      ...(owner_phone !== undefined && { owner_phone }),
      ...(post_code !== undefined && { post_code }),
      ...(how_heard !== undefined && { how_heard }),
      ...(pet_name !== undefined && { pet_name }),
      ...(species !== undefined && { species }),
      ...(breed !== undefined && { breed }),
      ...(age !== undefined && { age }),
      ...(weight !== undefined && { weight }),
      ...(pet_gender !== undefined && { pet_gender }),
      ...(vet_friendly !== undefined && { vet_friendly }),
      ...(reactive_to_pets !== undefined && { reactive_to_pets }),
      ...(has_pain !== undefined && { has_pain }),
      ...(clinic_name !== undefined && { clinic_name }),
      ...(attending_vet !== undefined && { attending_vet }),
      ...(condition !== undefined && { condition }),
      ...(service !== undefined && { service }),
      ...(preferred_date !== undefined && { preferred_date }),
      ...(first_visit !== undefined && { first_visit }),
      ...(notes !== undefined && { notes }),
    }
  })

  return NextResponse.json({ lead })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.leads.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
