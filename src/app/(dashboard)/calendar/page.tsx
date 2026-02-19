'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<any[]>([])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    fetch(`/api/appointments?start_date=${startDate}&end_date=${endDate}`)
      .then(r => r.json()).then(d => setAppointments(d.appointments || []))
  }, [year, month])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const apptsByDate: Record<string, any[]> = {}
  for (const a of appointments) {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = []
    apptsByDate[a.date].push(a)
  }

  const modalityColor: Record<string, string> = {
    Physiotherapy: 'bg-blue-400',
    Hydrotherapy: 'bg-cyan-400',
    Acupuncture: 'bg-purple-400',
    HBOT: 'bg-orange-400',
    Chiropractic: 'bg-green-400',
    TCM: 'bg-red-400',
    'Laser Therapy': 'bg-yellow-400',
    Electrotherapy: 'bg-indigo-400',
    Assessment: 'bg-gray-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500 text-sm">Monthly appointment overview</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="text-lg font-semibold">{currentDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="bg-white min-h-[100px]" />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayAppts = apptsByDate[dateStr] || []
            const isToday = dateStr === today

            return (
              <Link key={dateStr} href={`/appointments?date=${dateStr}`}
                className={`bg-white min-h-[100px] p-1.5 hover:bg-gray-50 transition-colors ${isToday ? 'ring-2 ring-inset ring-brand-pink' : ''}`}>
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-brand-pink font-bold' : 'text-gray-700'}`}>{day}</div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 3).map((a: any) => (
                    <div key={a.id} className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${modalityColor[a.modality] || 'bg-gray-400'}`}>
                      {a.start_time} {a.patient_name}
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">+{dayAppts.length - 3} more</div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          {Object.entries(modalityColor).map(([name, color]) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-xs text-gray-500">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
