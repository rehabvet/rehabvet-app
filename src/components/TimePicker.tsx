'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  minTime?: string
}

// Generate time slots from 8:00 to 19:00 in 15-min increments
const TIME_SLOTS = Array.from({ length: 45 }, (_, i) => {
  const totalMins = 8 * 60 + i * 15
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
})

export default function TimePicker({ value, onChange, label, minTime }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll to selected time when opening
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [open])

  function formatDisplay(time: string) {
    if (!time) return 'Select time...'
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${String(m).padStart(2, '0')} ${period}`
  }

  function formatSlot(time: string) {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${String(m).padStart(2, '0')} ${period}`
  }

  const filteredSlots = minTime 
    ? TIME_SLOTS.filter(t => t > minTime)
    : TIME_SLOTS

  return (
    <div ref={ref} className="relative">
      {label && <label className="label">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input w-full flex items-center justify-between text-left"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{formatDisplay(value)}</span>
        <Clock className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredSlots.map(time => {
              const isSelected = time === value
              return (
                <button
                  key={time}
                  type="button"
                  ref={isSelected ? selectedRef : null}
                  onClick={() => { onChange(time); setOpen(false) }}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isSelected ? 'bg-brand-pink text-white' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  {formatSlot(time)}
                </button>
              )
            })}
          </div>

          {/* Quick select common times */}
          <div className="border-t border-gray-100 p-2 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 px-1">Quick select</p>
            <div className="grid grid-cols-4 gap-1">
              {['09:00', '10:00', '11:00', '14:00'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { onChange(t); setOpen(false) }}
                  className={`
                    px-2 py-1.5 text-xs font-medium rounded-md transition-all
                    ${value === t ? 'bg-brand-pink text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}
                  `}
                >
                  {formatSlot(t)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
