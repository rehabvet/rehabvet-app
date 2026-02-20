'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  function selectDate(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  function formatDisplay(dateStr: string) {
    if (!dateStr) return 'Select date...'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const selectedDateStr = value

  return (
    <div ref={ref} className="relative">
      {label && <label className="label">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input w-full flex items-center justify-between text-left"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{formatDisplay(value)}</span>
        <Calendar className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1))} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-semibold text-gray-800">
              {viewDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1))} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = dateStr === selectedDateStr
              const isToday = dateStr === todayStr

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`
                    w-9 h-9 rounded-full text-sm font-medium transition-all
                    ${isSelected ? 'bg-brand-pink text-white' : isToday ? 'bg-pink-100 text-brand-pink' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { onChange(todayStr); setOpen(false) }}
              className="flex-1 text-xs font-medium text-brand-pink hover:bg-pink-50 py-2 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { const t = new Date(); t.setDate(t.getDate() + 1); onChange(t.toISOString().split('T')[0]); setOpen(false) }}
              className="flex-1 text-xs font-medium text-gray-600 hover:bg-gray-50 py-2 rounded-lg transition-colors"
            >
              Tomorrow
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
