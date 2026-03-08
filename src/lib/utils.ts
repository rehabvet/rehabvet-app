import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function genId(): string {
  return uuidv4()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount)
}

export function formatDate(date: string): string {
  // Append noon time to date-only strings to avoid UTC offset shifting the date
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00') : new Date(date)
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(time: string): string {
  if (!time || typeof time !== 'string') return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  if (isNaN(hour)) return ''
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export const MODALITIES = [
  'Physiotherapy',
  'Hydrotherapy',
  'Acupuncture',
  'HBOT',
  'Chiropractic',
  'TCM',
  'Laser Therapy',
  'Electrotherapy',
  'Assessment',
] as const

export type Modality = typeof MODALITIES[number]

export const SPECIES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Horse', 'Other'] as const
