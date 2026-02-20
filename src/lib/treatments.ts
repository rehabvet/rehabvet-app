export const TREATMENT_TYPES = {
  'Uncategorized': [
    { name: 'Lunch', duration: 60 },
    { name: 'Admin', duration: 15 },
    { name: 'On Leave', duration: 540 },
    { name: 'OFF', duration: 540 },
    { name: 'Half Day Off', duration: 240 },
    { name: 'DO NOT BOOK', duration: 60 },
  ],
  'Pet Rehabilitation': [
    { name: 'Rehabilitation - Hydrotherapy', duration: 60 },
    { name: 'Animal Rehabilitation - Follow Ups', duration: 60 },
    { name: 'TCM Acupuncture Review', duration: 30 },
    { name: 'TCVM Tui-na and acupuncture', duration: 60 },
    { name: 'Pain Relief', duration: 30 },
    { name: 'House-Call', duration: 90 },
    { name: 'UWTM', duration: 45 },
  ],
  'Other Services': [
    { name: 'Hyperbaric Oxygen', duration: 60 },
    { name: 'Fitness Swim', duration: 45 },
  ],
  'Consultation & Assessment': [
    { name: 'Orthopedic & Neurological Assessment', duration: 60 },
    { name: 'TCM Consultation', duration: 60 },
    { name: 'Reassessment', duration: 30 },
    { name: 'Assessment Fun Swim', duration: 30 },
  ],
}

export const TREATMENT_COLORS: Record<string, string> = {
  // Uncategorized - grays
  'Lunch': 'bg-gray-400',
  'Admin': 'bg-gray-500',
  'On Leave': 'bg-gray-300',
  'OFF': 'bg-gray-300',
  'Half Day Off': 'bg-gray-400',
  'DO NOT BOOK': 'bg-red-300',
  
  // Pet Rehabilitation - blues & cyans
  'Rehabilitation - Hydrotherapy': 'bg-cyan-500',
  'Animal Rehabilitation - Follow Ups': 'bg-blue-400',
  'TCM Acupuncture Review': 'bg-purple-400',
  'TCVM Tui-na and acupuncture': 'bg-purple-500',
  'Pain Relief': 'bg-orange-400',
  'House-Call': 'bg-teal-500',
  'UWTM': 'bg-cyan-400',
  
  // Other Services
  'Hyperbaric Oxygen': 'bg-orange-500',
  'Fitness Swim': 'bg-sky-400',
  
  // Consultation & Assessment - greens
  'Orthopedic & Neurological Assessment': 'bg-green-500',
  'TCM Consultation': 'bg-emerald-500',
  'Reassessment': 'bg-green-400',
  'Assessment Fun Swim': 'bg-sky-500',
}

export function getAllTreatments() {
  const all: { name: string; duration: number; category: string }[] = []
  for (const [category, treatments] of Object.entries(TREATMENT_TYPES)) {
    for (const t of treatments) {
      all.push({ ...t, category })
    }
  }
  return all
}

export function formatDuration(mins: number) {
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    if (remaining === 0) return `${hours} h`
    return `${hours} h ${remaining} min`
  }
  return `${mins} min`
}
