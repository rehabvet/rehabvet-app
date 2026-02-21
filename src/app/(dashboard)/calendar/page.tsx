'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import Modal from '@/components/Modal'
import DatePicker from '@/components/DatePicker'
import TimePicker from '@/components/TimePicker'

type ViewType = 'day' | 'week' | 'month'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('day')
  const [appointments, setAppointments] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [treatmentTypes, setTreatmentTypes] = useState<any[]>([])
  const [treatmentGrouped, setTreatmentGrouped] = useState<Record<string, any[]>>({})
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0]
    fetch(`/api/appointments?start_date=${startDate}&end_date=${endDate}`)
      .then(r => r.json()).then(d => setAppointments(d.appointments || []))
    fetch('/api/staff')
      .then(r => r.json()).then(d => setStaff(d.staff || []))
    fetch('/api/treatment-types')
      .then(r => r.json()).then(d => { setTreatmentTypes(d.types || []); setTreatmentGrouped(d.grouped || {}) })
  }, [year, month])
  
  // Build color map from treatment types
  const treatmentColors: Record<string, string> = {}
  for (const t of treatmentTypes) {
    treatmentColors[t.name] = t.color
  }
  
  function formatDuration(mins: number) {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remaining = mins % 60
      if (remaining === 0) return `${hours}h`
      return `${hours}h ${remaining}min`
    }
    return `${mins}min`
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const apptsByDate: Record<string, any[]> = {}
  for (const a of appointments) {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = []
    apptsByDate[a.date].push(a)
  }

  const statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']

  function goToToday() {
    setCurrentDate(new Date())
  }

  function navigate(dir: number) {
    if (view === 'day') {
      setCurrentDate(new Date(currentDate.getTime() + dir * 24 * 60 * 60 * 1000))
    } else if (view === 'week') {
      setCurrentDate(new Date(currentDate.getTime() + dir * 7 * 24 * 60 * 60 * 1000))
    } else {
      setCurrentDate(new Date(year, month + dir))
    }
  }

  function getTitle() {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    return currentDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
  }

  function openEditModal(appt: any) {
    setSelectedAppt(appt)
    setEditForm({
      date: appt.date,
      start_time: appt.start_time,
      end_time: appt.end_time,
      modality: appt.modality,
      therapist_id: appt.therapist_id || '',
      status: appt.status,
      notes: appt.notes || ''
    })
  }

  function closeModal() {
    setSelectedAppt(null)
    setEditForm(null)
  }

  async function saveAppointment() {
    if (!selectedAppt || !editForm) return
    setSaving(true)
    try {
      await fetch(`/api/appointments/${selectedAppt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      // Refresh appointments
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0]
      const res = await fetch(`/api/appointments?start_date=${startDate}&end_date=${endDate}`)
      const data = await res.json()
      setAppointments(data.appointments || [])
      closeModal()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function renderAppointment(a: any, showDate = false) {
    const time = a.start_time?.slice(0, 5)
    const service = a.modality || ''
    const clientName = a.client_name || ''
    const petName = a.patient_name || ''
    const phone = a.client_phone || ''
    
    return (
      <button
        key={a.id}
        onClick={(e) => { e.preventDefault(); openEditModal(a) }}
        className={`block w-full text-left text-xs text-white px-1.5 py-1 rounded hover:opacity-90 transition-opacity ${treatmentColors[a.modality] || 'bg-gray-400'}`}
        title={`${time} • ${service}\n${clientName} - ${petName}\n${phone}`}
      >
        <div className="font-medium">{time} {service}</div>
        <div className="opacity-90 truncate">{clientName} • {petName}</div>
        <div className="opacity-75 text-[10px]">{phone}</div>
      </button>
    )
  }

  // Month View
  function renderMonthView() {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    while (days.length % 7 !== 0) days.push(null)

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-gray-50 px-2 py-3 text-center text-sm font-semibold text-gray-600">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="bg-white min-h-[120px]" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayAppts = apptsByDate[dateStr] || []
          const isToday = dateStr === todayStr

          return (
            <div key={dateStr}
              className={`bg-white min-h-[120px] p-2 ${isToday ? 'ring-2 ring-inset ring-brand-pink bg-pink-50/30' : ''}`}>
              <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-brand-pink text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>{day}</div>
              <div className="space-y-1">
                {dayAppts.slice(0, 4).map(a => renderAppointment(a))}
                {dayAppts.length > 4 && (
                  <div className="text-xs text-gray-500 px-1">+{dayAppts.length - 4} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Week View
  function renderWeekView() {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const weekDays: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      weekDays.push(d)
    }
    const hours = Array.from({ length: 12 }, (_, i) => i + 8)

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden min-w-[800px]">
          <div className="bg-gray-50 p-2" />
          {weekDays.map(d => {
            const dateStr = d.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            return (
              <div key={dateStr} className={`bg-gray-50 p-2 text-center ${isToday ? 'bg-pink-50' : ''}`}>
                <div className="text-xs text-gray-500">{d.toLocaleDateString('en-SG', { weekday: 'short' })}</div>
                <div className={`text-lg font-semibold ${isToday ? 'bg-brand-pink text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-gray-800'}`}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
          {hours.map(hour => (
            <>
              <div key={`hour-${hour}`} className="bg-white p-2 text-xs text-gray-500 text-right pr-3 border-t border-gray-100">
                {hour}:00
              </div>
              {weekDays.map(d => {
                const dateStr = d.toISOString().split('T')[0]
                const dayAppts = apptsByDate[dateStr] || []
                const hourAppts = dayAppts.filter((a: any) => {
                  const apptHour = parseInt(a.start_time?.split(':')[0] || '0')
                  return apptHour === hour
                })
                const isToday = dateStr === todayStr
                return (
                  <div key={`${dateStr}-${hour}`} className={`bg-white min-h-[60px] p-1 border-t border-gray-100 ${isToday ? 'bg-pink-50/30' : ''}`}>
                    {hourAppts.map(a => renderAppointment(a))}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>
    )
  }

  // Day View — Provider column layout
  function renderDayView() {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayAppts = apptsByDate[dateStr] || []
    const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8:00 – 20:00

    // Build provider columns from appointments (only providers with appts that day)
    const providerMap: Record<string, { id: string; name: string; role: string; photo_url?: string }> = {}
    for (const a of dayAppts) {
      if (a.therapist_id && a.therapist_name) {
        providerMap[a.therapist_id] = { id: a.therapist_id, name: a.therapist_name, role: a.therapist_role || '', photo_url: a.therapist_photo }
      }
    }
    const providers = Object.values(providerMap)
    const hasUnassigned = dayAppts.some((a: any) => !a.therapist_id)
    if (hasUnassigned) providers.push({ id: '__unassigned__', name: 'Unassigned', role: '' })

    const roleLabel: Record<string, string> = {
      veterinarian: 'Veterinarian', senior_therapist: 'Sr. Therapist',
      assistant_therapist: 'Asst. Therapist', hydrotherapist: 'Hydrotherapist',
      marketing: 'Marketing', office_manager: 'Office Manager',
      administrator: 'Administrator', vet: 'Veterinarian', therapist: 'Therapist',
    }
    const roleBadgeColor: Record<string, string> = {
      veterinarian: 'bg-green-100 text-green-700', senior_therapist: 'bg-blue-100 text-blue-700',
      assistant_therapist: 'bg-sky-100 text-sky-700', hydrotherapist: 'bg-cyan-100 text-cyan-700',
      administrator: 'bg-red-100 text-red-700', office_manager: 'bg-pink-100 text-pink-700',
      vet: 'bg-green-100 text-green-700', therapist: 'bg-blue-100 text-blue-700',
    }

    const CELL_HEIGHT = 72 // px per hour

    function timeToMinutes(t: string) {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    return (
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Provider header row */}
        <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="w-16 flex-shrink-0 border-r border-gray-100" />
          {providers.length === 0 ? (
            <div className="flex-1 p-4 text-sm text-gray-400 text-center">No appointments today</div>
          ) : providers.map(p => (
            <div key={p.id} className="flex-1 min-w-[160px] px-3 py-2.5 border-r border-gray-100 last:border-r-0 text-center">
              <div className="flex items-center justify-center gap-2">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink text-xs font-bold flex-shrink-0">
                    {p.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                  {p.role && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColor[p.role] || 'bg-gray-100 text-gray-600'}`}>
                      {roleLabel[p.role] || p.role}
                    </span>
                  )}
                </div>
              </div>
              {/* Appointment count */}
              <p className="text-[10px] text-gray-400 mt-1">
                {dayAppts.filter((a: any) => p.id === '__unassigned__' ? !a.therapist_id : a.therapist_id === p.id).length} appts
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative flex" style={{ minHeight: `${CELL_HEIGHT * hours.length}px` }}>
          {/* Hour lines + labels */}
          <div className="w-16 flex-shrink-0 border-r border-gray-100 relative z-10">
            {hours.map(hour => (
              <div key={hour} style={{ height: CELL_HEIGHT }} className="border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-gray-400">{String(hour).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>

          {/* Provider columns */}
          {providers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
              No appointments scheduled
            </div>
          ) : providers.map(p => {
            const colAppts = dayAppts.filter((a: any) =>
              p.id === '__unassigned__' ? !a.therapist_id : a.therapist_id === p.id
            )
            return (
              <div key={p.id} className="flex-1 min-w-[160px] border-r border-gray-100 last:border-r-0 relative">
                {/* Hour grid lines */}
                {hours.map(hour => (
                  <div key={hour} style={{ height: CELL_HEIGHT }} className="border-b border-gray-100" />
                ))}
                {/* Appointments (absolutely positioned) */}
                {colAppts.map((a: any) => {
                  const startMins = timeToMinutes(a.start_time || '08:00')
                  const endMins = timeToMinutes(a.end_time || (a.start_time || '08:00'))
                  const gridStartMins = 8 * 60
                  const top = ((startMins - gridStartMins) / 60) * CELL_HEIGHT
                  const heightMins = Math.max(endMins - startMins, 30)
                  const height = (heightMins / 60) * CELL_HEIGHT - 2
                  const color = treatmentColors[a.modality] || 'bg-gray-400'

                  return (
                    <button
                      key={a.id}
                      onClick={() => openEditModal(a)}
                      style={{ top: `${top}px`, height: `${height}px`, left: '4px', right: '4px' }}
                      className={`absolute text-left text-white px-2 py-1 rounded-lg hover:opacity-90 hover:shadow-md transition-all text-xs overflow-hidden ${color}`}
                      title={`${a.start_time} - ${a.end_time}\n${a.modality}\n${a.patient_name} (${a.client_name})\n${a.client_phone}`}
                    >
                      <div className="font-semibold leading-tight">{a.start_time?.slice(0,5)} {a.modality}</div>
                      <div className="opacity-90 leading-tight mt-0.5 truncate">{a.client_name} • <span className="font-medium">{a.patient_name}</span></div>
                      {height > 50 && <div className="opacity-75 text-[10px] mt-0.5">{a.client_phone}</div>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={goToToday} className="btn-secondary text-sm">Today</button>
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{getTitle()}</h1>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month'] as ViewType[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                view === v ? 'bg-white text-brand-pink shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 flex flex-col min-h-0">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Legend */}
      {view === 'month' && (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          {treatmentTypes.slice(0, 12).map(t => (
            <div key={t.name} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${t.color}`} />
              <span className="text-xs text-gray-500">{t.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Edit Appointment Modal */}
      <Modal open={!!selectedAppt} onClose={closeModal} title="Edit Appointment">
        {selectedAppt && editForm && (
          <div className="space-y-4">
            {/* Patient info (read-only) */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900">{selectedAppt.patient_name}</span>
              </div>
              <p className="text-sm text-gray-500">{selectedAppt.client_name} • {selectedAppt.client_phone}</p>
            </div>

            {/* Date */}
            <DatePicker
              label="Date"
              value={editForm.date}
              onChange={date => setEditForm({...editForm, date})}
            />

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <TimePicker
                label="Start Time"
                value={editForm.start_time}
                onChange={time => setEditForm({...editForm, start_time: time})}
              />
              <TimePicker
                label="End Time"
                value={editForm.end_time}
                onChange={time => setEditForm({...editForm, end_time: time})}
                minTime={editForm.start_time}
              />
            </div>

            {/* Treatment Type */}
            <div>
              <label className="label">Treatment Type</label>
              <select
                className="input"
                value={editForm.modality}
                onChange={e => setEditForm({...editForm, modality: e.target.value})}
              >
                <option value="">Select treatment...</option>
                {Object.entries(treatmentGrouped).map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {(items as any[]).map(t => (
                      <option key={t.name} value={t.name}>{t.name} ({formatDuration(t.duration)})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Therapist */}
            <div>
              <label className="label">Provider</label>
              <select
                className="input"
                value={editForm.therapist_id}
                onChange={e => setEditForm({...editForm, therapist_id: e.target.value})}
              >
                <option value="">Select provider...</option>
                {staff.filter(s => s.role === 'therapist' || s.role === 'vet').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={editForm.status}
                onChange={e => setEditForm({...editForm, status: e.target.value})}
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={editForm.notes}
                onChange={e => setEditForm({...editForm, notes: e.target.value})}
                placeholder="Any additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={saveAppointment} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
