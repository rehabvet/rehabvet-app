import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

async function resolvePostcode(post_code?: string): Promise<string | null> {
  if (!post_code || post_code.length < 5) return null
  try {
    const res = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${post_code}&returnGeom=N&getAddrDetails=Y&pageNum=1`)
    const data = await res.json()
    if (data.results?.length > 0) {
      const r = data.results[0]
      return `${r.BLK_NO ? r.BLK_NO + ' ' : ''}${r.ROAD_NAME}${r.BUILDING && r.BUILDING !== 'NIL' ? ' ' + r.BUILDING : ''} SINGAPORE ${r.POSTAL}`
    }
  } catch {}
  return null
}

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

  // Resolve address if post_code is being updated
  let owner_address: string | null | undefined = undefined
  if (post_code !== undefined) {
    owner_address = await resolvePostcode(post_code)
  }

  const lead = await prisma.leads.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(staff_notes !== undefined && { staff_notes }),
      ...(owner_name !== undefined && { owner_name }),
      ...(owner_email !== undefined && { owner_email }),
      ...(owner_phone !== undefined && { owner_phone }),
      ...(post_code !== undefined && { post_code }),
      ...(owner_address !== undefined && { owner_address }),
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
