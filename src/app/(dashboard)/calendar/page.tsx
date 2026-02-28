'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, User, Trash2, AlertTriangle, CalendarDays, ClipboardList } from 'lucide-react'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import BillingModal from '@/components/BillingModal'
import Modal from '@/components/Modal'
import DatePicker from '@/components/DatePicker'
import TimePicker from '@/components/TimePicker'

type ViewType = 'day' | 'week' | 'month'

// Always derive date strings in SGT — en-CA locale gives YYYY-MM-DD format
function toSGTDateStr(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('day')
  const [appointments, setAppointments] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [treatmentTypes, setTreatmentTypes] = useState<any[]>([])
  const [treatmentGrouped, setTreatmentGrouped] = useState<Record<string, any[]>>({})
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [saving,          setSaving]          = useState(false)
  const [apptTab, setApptTab] = useState<'visit'|'billing'>('visit')
  const [apptVisit, setApptVisit] = useState<any>(null)
  const [apptInvoice, setApptInvoice] = useState<any>(null)
  const [apptLineItems, setApptLineItems] = useState<any[]>([])
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting,        setDeleting]        = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [showDateJumper, setShowDateJumper] = useState(false)
  const dayScrollRef = useRef<HTMLDivElement>(null)
  const dateJumperRef = useRef<HTMLDivElement>(null)
  // New appointment via double-click
  const [newApptForm, setNewApptForm] = useState<any>(null)
  const [newApptSaving, setNewApptSaving] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([])
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clientPatients, setClientPatients] = useState<any[]>([])
  // Simple in-memory cache: key = `${year}-${month}` → appointments[]
  const apptCache = useRef<Map<string, any[]>>(new Map())
  // Drag-and-drop state
  const [dragging, setDragging] = useState<{ apptId: string; durationMins: number; offsetMins: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ providerId: string; snapMins: number } | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    const startDate = toSGTDateStr(new Date(year, month - 1, 1))
    const endDate = toSGTDateStr(new Date(year, month + 2, 0))
    fetch(`/api/appointments?start_date=${startDate}&end_date=${endDate}&per_page=3000`)
      .then(r => r.json())
      .then(d => {
        const appts = d.appointments || []
        apptCache.current.set(`${year}-${month}`, appts)
        setAppointments(appts)
      })
    fetch('/api/staff')
      .then(r => r.json()).then(d => setStaff(d.staff || []))
    fetch('/api/treatment-types')
      .then(r => r.json()).then(d => { setTreatmentTypes(d.types || []); setTreatmentGrouped(d.grouped || {}) })
    fetch('/api/patients?per_page=999')
      .then(r => r.json()).then(d => setPatients(d.patients || []))
  }, [year, month])

  // Debounced client search via API
  function handleClientSearchChange(val: string) {
    setClientSearch(val)
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current)
    if (!val.trim()) { setClientSearchResults([]); return }
    setClientSearchLoading(true)
    clientSearchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(val)}&limit=20`)
      const data = await res.json()
      setClientSearchResults(data.clients || [])
      setClientSearchLoading(false)
    }, 250)
  }

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Close date jumper on outside click
  useEffect(() => {
    if (!showDateJumper) return
    function handleClick(e: MouseEvent) {
      if (dateJumperRef.current && !dateJumperRef.current.contains(e.target as Node)) {
        setShowDateJumper(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDateJumper])

  // Auto-scroll day view to current time on mount / view change
  useEffect(() => {
    if (view !== 'day' || !dayScrollRef.current) return
    const CELL_HEIGHT = 72
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const gridStartMins = 8 * 60
    const topPx = ((mins - gridStartMins) / 60) * CELL_HEIGHT
    dayScrollRef.current.scrollTo({ top: Math.max(0, topPx - 200), behavior: 'smooth' })
  }, [view])
  
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
  const todayStr = toSGTDateStr(today)

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

  function getTitle(compact = false) {
    if (view === 'day') {
      if (compact) return currentDate.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
      return currentDate.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      if (compact) return `${startOfWeek.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} – ${endOfWeek.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}`
      return `${startOfWeek.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} – ${endOfWeek.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    if (compact) return currentDate.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
    return currentDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
  }

  function selectNewApptClient(client: any) {
    setSelectedClient(client)
    setClientSearch('')
    const pets = patients.filter((p: any) => p.client_id === client.id)
    setClientPatients(pets)
    // Auto-select if only 1 pet
    if (pets.length === 1) {
      setNewApptForm((f: any) => ({ ...f, client_id: client.id, patient_id: pets[0].id }))
    } else {
      setNewApptForm((f: any) => ({ ...f, client_id: client.id, patient_id: '' }))
    }
  }

  function resetNewApptModal() {
    setNewApptForm(null)
    setClientSearch('')
    setSelectedClient(null)
    setClientPatients([])
  }

  function openNewApptModal(date: string, time: string, therapistId = '') {
    // Round time to nearest 30 min
    const [h, m] = time.split(':').map(Number)
    const roundedM = m < 15 ? 0 : m < 45 ? 30 : 0
    const roundedH = m >= 45 ? h + 1 : h
    const start = `${String(roundedH).padStart(2,'0')}:${String(roundedM).padStart(2,'0')}`
    // Default end = start + 1 hour
    const endTotal = roundedH * 60 + roundedM + 60
    const end = `${String(Math.floor(endTotal / 60)).padStart(2,'0')}:${String(endTotal % 60).padStart(2,'0')}`
    setNewApptForm({ date, start_time: start, end_time: end, therapist_id: therapistId, patient_id: '', client_id: '', modality: '', notes: '' })
  }

  async function saveNewAppt() {
    if (!newApptForm || !newApptForm.patient_id || !newApptForm.modality) return
    setNewApptSaving(true)
    try {
      const patient = patients.find((p: any) => p.id === newApptForm.patient_id)
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newApptForm, client_id: patient?.client_id || newApptForm.client_id }),
      })
      // Invalidate cache & reload
      apptCache.current.delete(`${year}-${month}`)
      const startDate = toSGTDateStr(new Date(year, month - 1, 1))
      const endDate = toSGTDateStr(new Date(year, month + 2, 0))
      const res = await fetch(`/api/appointments?start_date=${startDate}&end_date=${endDate}&per_page=3000`)
      const data = await res.json()
      const fresh = data.appointments || []
      apptCache.current.set(`${year}-${month}`, fresh)
      setAppointments(fresh)
      setNewApptForm(null)
    } catch (err) { console.error(err) }
    finally { setNewApptSaving(false) }
  }

  function openEditModal(appt: any) {
    setSelectedAppt(appt)
    setApptTab('visit')
    setApptVisit(null)
    setApptInvoice(null)
    setApptLineItems([])
    setEditForm({
      date: appt.date,
      start_time: appt.start_time,
      end_time: appt.end_time,
      modality: appt.modality,
      therapist_id: appt.therapist_id || '',
      status: appt.status,
      notes: appt.notes || ''
    })
    // Load visit & invoice for this appointment
    fetch(`/api/visits?appointment_id=${appt.id}&limit=1`)
      .then(r => r.json())
      .then(d => {
        const v = d.visits?.[0]
        if (v) {
          setApptVisit(v)
          fetch(`/api/visits/${v.id}/invoice`)
            .then(r => r.json())
            .then(inv => {
              if (inv.invoice) { setApptInvoice(inv.invoice); setApptLineItems(inv.line_items || []) }
            })
        }
      })
  }

  function closeModal() {
    setSelectedAppt(null)
    setEditForm(null)
    setApptVisit(null)
    setApptInvoice(null)
    setApptLineItems([])
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
      // Invalidate cache and refresh
      apptCache.current.delete(`${year}-${month}`)
      const startDate = toSGTDateStr(new Date(year, month - 1, 1))
      const endDate = toSGTDateStr(new Date(year, month + 2, 0))
      const res = await fetch(`/api/appointments?start_date=${startDate}&end_date=${endDate}&per_page=3000`)
      const data = await res.json()
      const fresh = data.appointments || []
      apptCache.current.set(`${year}-${month}`, fresh)
      setAppointments(fresh)
      closeModal()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/appointments/${confirmDeleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
        return
      }
      setConfirmDeleteId(null)
      // Close edit modal if it was for this appointment
      if (selectedAppt?.id === confirmDeleteId) closeModal()
      // Refresh calendar
      apptCache.current.delete(`${year}-${month}`)
      const startDate = toSGTDateStr(new Date(year, month - 1, 1))
      const endDate = toSGTDateStr(new Date(year, month + 2, 0))
      const res2 = await fetch(`/api/appointments?start_date=${startDate}&end_date=${endDate}&per_page=3000`)
      const data2 = await res2.json()
      const fresh = data2.appointments || []
      apptCache.current.set(`${year}-${month}`, fresh)
      setAppointments(fresh)
    } finally {
      setDeleting(false)
    }
  }

  async function saveDraggedAppt(
    apptId: string,
    startMins: number,
    durationMins: number,
    newTherapistId: string | null,
    providers: { id: string; name: string; role: string; photo_url?: string }[]
  ) {
    const endMins = startMins + durationMins
    const startTime = `${String(Math.floor(startMins / 60)).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`
    const endTime   = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`
    const provider  = providers.find(p => p.id === newTherapistId)

    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === apptId ? {
      ...a,
      start_time: startTime,
      end_time: endTime,
      therapist_id: newTherapistId,
      therapist_name: provider?.name ?? null,
      therapist_role: provider?.role ?? null,
      therapist_photo: provider?.photo_url ?? null,
    } : a))
    apptCache.current.delete(`${year}-${month}`)

    try {
      await fetch(`/api/appointments/${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: startTime, end_time: endTime, therapist_id: newTherapistId })
      })
    } catch (err) {
      console.error('Drag save failed', err)
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
        className={`block w-full text-left text-[11px] leading-tight text-white px-1 py-0.5 rounded hover:opacity-90 transition-opacity ${treatmentColors[a.modality] || 'bg-gray-400'}`}
        title={`${time} • ${service}\n${clientName} - ${petName}\n${phone}`}
      >
        <div className="font-semibold truncate">{time} {service}</div>
        <div className="opacity-90 truncate">{clientName} • {petName}</div>
        {a.therapist_name && <div className="opacity-75 truncate text-[10px]">👤 {a.therapist_name}</div>}
        {phone && <div className="opacity-75 truncate text-[10px]">📱 {phone}</div>}
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
      <>
      <div className="flex-1 overflow-y-auto rounded-lg">
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {[['S','Sun'],['M','Mon'],['T','Tue'],['W','Wed'],['T','Thu'],['F','Fri'],['S','Sat']].map(([short, full]) => (
          <div key={full} className="bg-gray-50 px-1 py-2 text-center font-semibold text-gray-600 sticky top-0 z-10">
            <span className="hidden sm:inline text-sm">{full}</span>
            <span className="sm:hidden text-xs">{short}</span>
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="bg-white min-h-[60px] sm:min-h-[100px]" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayAppts = apptsByDate[dateStr] || []
          const isToday = dateStr === todayStr

          return (
            <div key={dateStr}
              className={`group bg-white min-h-[60px] sm:h-[250px] p-1 sm:p-1.5 flex flex-col ${isToday ? 'ring-2 ring-inset ring-brand-pink bg-pink-50/30' : ''}`}>
              {/* Date number */}
              <div className={`text-xs sm:text-sm font-medium mb-0.5 flex-shrink-0 ${isToday ? 'bg-brand-pink text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs' : 'text-gray-700'}`}>{day}</div>
              {/* Mobile: dots only */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {dayAppts.slice(0, 3).map(a => (
                  <div key={a.id} className={`w-1.5 h-1.5 rounded-full ${treatmentColors[a.modality] || 'bg-gray-400'}`} />
                ))}
                {dayAppts.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
              </div>
              {/* Desktop: first 4 visible, hover to scroll rest */}
              <div className="hidden sm:block flex-1 min-h-0 overflow-y-hidden group-hover:overflow-y-auto space-y-0.5">
                {dayAppts.map(a => renderAppointment(a))}
              </div>
              {/* "+X more" indicator — always visible when > 4 */}
              {dayAppts.length > 4 && (
                <button
                  onClick={e => { e.stopPropagation(); setExpandedDay(dateStr) }}
                  className="hidden sm:block text-[11px] text-brand-pink hover:underline px-1 font-medium flex-shrink-0 text-left mt-0.5"
                >
                  +{dayAppts.length - 4} more
                </button>
              )}
              {/* Mobile: tap to expand */}
              {dayAppts.length > 0 && (
                <button
                  className="sm:hidden absolute inset-0 w-full h-full opacity-0"
                  onClick={e => { e.stopPropagation(); setExpandedDay(dateStr) }}
                  aria-label={`View ${dayAppts.length} appointments`}
                />
              )}
            </div>
          )
        })}
      </div>
      </div>{/* end scrollable wrapper */}

      {/* Day detail modal for month view */}
      <Modal open={!!expandedDay} onClose={() => setExpandedDay(null)} title={expandedDay ? new Date(expandedDay + 'T00:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}>
        {expandedDay && (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(apptsByDate[expandedDay] || []).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No appointments</p>
            ) : (apptsByDate[expandedDay] || []).map((a: any) => (
              <div key={a.id} className={`flex gap-3 p-3 rounded-xl bg-gray-50 border-l-4 ${treatmentColors[a.modality] ? '' : 'border-l-gray-300'}`}
                   style={{ borderLeftColor: '' }}>
                <div className="min-w-[44px] text-center">
                  <p className="text-sm font-bold text-gray-900">{a.start_time?.slice(0,5)}</p>
                  <p className="text-xs text-gray-400">{a.end_time?.slice(0,5)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{a.patient_name}</p>
                  <p className="text-xs text-gray-500">{a.client_name} · {a.modality}</p>
                  {a.client_phone && <p className="text-xs font-mono text-brand-pink">{a.client_phone}</p>}
                  {a.therapist_name && <p className="text-xs text-gray-400">Provider: {a.therapist_name}</p>}
                </div>
                <button onClick={() => { setExpandedDay(null); openEditModal(a) }} className="text-xs text-brand-pink hover:underline flex-shrink-0">Edit</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
      </>
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
    const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 8–22
    const CELL_H = 60      // px per hour
    const TIME_W = 48      // px — time label column
    const MIN_DAY_W = 80   // px — minimum day column width

    const gridCols = `${TIME_W}px repeat(7, 1fr)`
    const minW     = TIME_W + 7 * MIN_DAY_W

    // Current time indicator
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes()
    const gridStartMins = 8 * 60
    const timeTop = ((nowMins - gridStartMins) / 60) * CELL_H
    const todayInWeek = weekDays.some(d => toSGTDateStr(d) === todayStr)

    return (
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Sticky header row */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm"
             style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: `${minW}px` }}>
          <div className="border-r border-gray-100" />
          {weekDays.map(d => {
            const dateStr = toSGTDateStr(d)
            const isToday = dateStr === todayStr
            return (
              <div key={dateStr} className={`border-r border-gray-100 last:border-r-0 p-1 sm:p-2 text-center ${isToday ? 'bg-pink-50' : ''}`}>
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase">{d.toLocaleDateString('en-SG', { weekday: 'short', timeZone: 'Asia/Singapore' })}</div>
                <div className={`text-sm sm:text-base font-bold mx-auto w-fit px-1.5 rounded-full ${isToday ? 'bg-brand-pink text-white' : 'text-gray-800'}`}>
                  {parseInt(dateStr.split('-')[2])}
                </div>
              </div>
            )
          })}
        </div>

        {/* Body — same grid */}
        <div className="relative"
             style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: `${minW}px`, minHeight: `${CELL_H * hours.length}px` }}>

          {/* Red time indicator */}
          {todayInWeek && nowMins >= gridStartMins && nowMins <= gridStartMins + hours.length * 60 && (
            <div className="absolute z-30 pointer-events-none" style={{ top: `${timeTop}px`, left: 0, right: 0 }}>
              <div className="flex items-center" style={{ marginLeft: `${TIME_W}px` }}>
                <div className="absolute right-full flex justify-end pr-1 w-12">
                  <span className="text-[10px] font-bold text-red-500 bg-white rounded leading-none">
                    {String(currentTime.getHours()).padStart(2,'0')}:{String(currentTime.getMinutes()).padStart(2,'0')}
                  </span>
                </div>
                <div className="flex-1 h-px bg-red-400">
                  <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* Time labels column */}
          <div className="border-r border-gray-100">
            {hours.map(h => (
              <div key={h} style={{ height: CELL_H }} className="border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] sm:text-xs text-gray-400">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(d => {
            const dateStr = toSGTDateStr(d)
            const dayAppts = apptsByDate[dateStr] || []
            const isToday = dateStr === todayStr
            return (
              <div
                key={dateStr}
                className={`border-r border-gray-100 last:border-r-0 relative cursor-pointer ${isToday ? 'bg-pink-50/20' : ''}`}
                onDoubleClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const yPx = e.clientY - rect.top
                  const totalMins = gridStartMins + (yPx / CELL_H) * 60
                  const hh = Math.floor(totalMins / 60)
                  const mm = Math.floor(totalMins % 60)
                  openNewApptModal(dateStr, `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`)
                }}
              >
                {/* Hour grid lines */}
                {hours.map(h => (
                  <div key={h} style={{ height: CELL_H }} className="border-b border-gray-100" />
                ))}
                {/* Appointments */}
                {dayAppts.map((a: any) => {
                  const [sh, sm] = (a.start_time || '08:00').split(':').map(Number)
                  const [eh, em] = (a.end_time || a.start_time || '08:00').split(':').map(Number)
                  const startMins = sh * 60 + sm
                  const endMins = eh * 60 + em
                  const top = ((startMins - gridStartMins) / 60) * CELL_H
                  const height = Math.max((endMins - startMins) / 60, 0.5) * CELL_H - 2
                  const color = treatmentColors[a.modality] || 'bg-gray-400'
                  return (
                    <button
                      key={a.id}
                      onClick={() => openEditModal(a)}
                      style={{ top: `${top}px`, height: `${height}px`, left: 2, right: 2, position: 'absolute' }}
                      className={`text-left text-white px-1 py-0.5 rounded hover:opacity-90 transition-opacity text-xs overflow-hidden ${color}`}
                      title={`${a.start_time}–${a.end_time} • ${a.modality}\n${a.patient_name} (${a.client_name}) ${a.client_phone}`}
                    >
                      <div className="font-semibold leading-tight truncate text-[10px] sm:text-xs">{a.start_time?.slice(0,5)} {a.modality}</div>
                      <div className="opacity-90 truncate text-[10px]">{a.patient_name}{a.is_reactive ? ' ⚠️' : ''}</div>
                      {height > 38 && a.therapist_name && <div className="opacity-75 truncate text-[10px]">👤 {a.therapist_name}</div>}
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

  // Day View — Provider column layout (CSS Grid for perfect column alignment)
  function renderDayView() {
    const dateStr = toSGTDateStr(currentDate)
    const dayAppts = apptsByDate[dateStr] || []
    const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 8:00 – 22:00

    const providerMap: Record<string, { id: string; name: string; role: string; photo_url?: string }> = {}
    for (const a of dayAppts) {
      if (a.therapist_id && a.therapist_name) {
        providerMap[a.therapist_id] = { id: a.therapist_id, name: a.therapist_name, role: a.therapist_role || '', photo_url: a.therapist_photo }
      }
    }
    const providers = Object.values(providerMap)
    const hasUnassigned = dayAppts.some((a: any) => !a.therapist_id)
    if (hasUnassigned) providers.push({ id: '__unassigned__', name: 'Unassigned', role: '' })

    const roleBadgeColor: Record<string, string> = {
      veterinarian: 'bg-green-100 text-green-700', senior_therapist: 'bg-blue-100 text-blue-700',
      assistant_therapist: 'bg-sky-100 text-sky-700', hydrotherapist: 'bg-cyan-100 text-cyan-700',
      administrator: 'bg-red-100 text-red-700', office_manager: 'bg-pink-100 text-pink-700',
      vet: 'bg-green-100 text-green-700', therapist: 'bg-blue-100 text-blue-700',
    }
    const roleLabel: Record<string, string> = {
      veterinarian: 'Veterinarian', senior_therapist: 'Sr. Therapist',
      assistant_therapist: 'Asst. Therapist', hydrotherapist: 'Hydrotherapist',
      marketing: 'Marketing', office_manager: 'Office Manager',
      administrator: 'Administrator', vet: 'Veterinarian', therapist: 'Therapist',
    }

    const CELL_HEIGHT = 72
    const TIME_COL = 48   // px — time label column width (wide enough for "08:00")
    const MIN_COL  = 140  // px — minimum provider column width
    const numCols  = providers.length || 1

    // Both header and body share EXACTLY this grid template → columns always aligned
    const gridCols = `${TIME_COL}px repeat(${numCols}, 1fr)`
    const minW     = TIME_COL + numCols * MIN_COL

    function timeToMinutes(t: string) {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    const isToday = dateStr === todayStr
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes()
    const gridStartMins = 8 * 60
    const timeIndicatorTop = ((nowMins - gridStartMins) / 60) * CELL_HEIGHT

    return (
      <div ref={dayScrollRef} className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* ── HEADER (sticky) — identical gridTemplateColumns to body ── */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm"
             style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: `${minW}px` }}>
          {/* Empty time label cell */}
          <div className="border-r border-gray-100" />
          {providers.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">No appointments today</div>
          ) : providers.map(p => (
            <div key={p.id} className="border-r border-gray-100 last:border-r-0 px-2 py-2 text-center overflow-hidden">
              <div className="flex items-center justify-center gap-1.5">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink text-sm sm:text-base font-bold flex-shrink-0">
                    {p.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                )}
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight truncate">{p.name}</p>
                  {p.role && (
                    <span className={`hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColor[p.role] || 'bg-gray-100 text-gray-600'}`}>
                      {roleLabel[p.role] || p.role}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {dayAppts.filter((a: any) => p.id === '__unassigned__' ? !a.therapist_id : a.therapist_id === p.id).length} appts
              </p>
            </div>
          ))}
        </div>

        {/* ── BODY — same gridTemplateColumns as header ── */}
        <div className="relative"
             style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: `${minW}px`, minHeight: `${CELL_HEIGHT * hours.length}px` }}>

          {/* Current time indicator (absolutely positioned over the whole body) */}
          {isToday && nowMins >= gridStartMins && nowMins <= gridStartMins + (hours.length * 60) && (
            <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${timeIndicatorTop}px` }}>
              <div className="flex items-center" style={{ marginLeft: `${TIME_COL}px` }}>
                <div className="absolute right-full flex justify-end pr-1 w-14">
                  <span className="text-[10px] font-bold text-red-500 bg-white px-1 rounded leading-none whitespace-nowrap">
                    {String(currentTime.getHours()).padStart(2,'0')}:{String(currentTime.getMinutes()).padStart(2,'0')}
                  </span>
                </div>
                <div className="flex-1 h-px bg-red-400">
                  <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* Time labels column */}
          <div className="border-r border-gray-100">
            {hours.map(hour => (
              <div key={hour} style={{ height: CELL_HEIGHT }} className="border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] sm:text-xs text-gray-400">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>
              </div>
            ))}
          </div>

          {/* Provider columns */}
          {providers.length === 0 ? (
            <div className="flex items-center justify-center text-gray-300 text-sm" style={{ gridColumn: `2 / ${numCols + 2}` }}>
              No appointments scheduled
            </div>
          ) : providers.map(p => {
            const colAppts = dayAppts.filter((a: any) =>
              p.id === '__unassigned__' ? !a.therapist_id : a.therapist_id === p.id
            )
            const isDropTarget = dragOver?.providerId === p.id
            const ghostTop    = (isDropTarget && dragOver)
              ? ((dragOver.snapMins - gridStartMins) / 60) * CELL_HEIGHT
              : null
            const ghostHeight = dragging ? Math.max((dragging.durationMins / 60) * CELL_HEIGHT - 2, 24) : 0
            return (
              <div
                key={p.id}
                className={`border-r border-gray-100 last:border-r-0 relative overflow-hidden cursor-pointer ${isDropTarget ? 'bg-brand-pink/5' : ''}`}
                onDoubleClick={e => {
                  if (dragging) return
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const yPx = e.clientY - rect.top
                  const totalMins = gridStartMins + (yPx / CELL_HEIGHT) * 60
                  const hh = Math.floor(totalMins / 60)
                  const mm = Math.floor(totalMins % 60)
                  openNewApptModal(dateStr, `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`, p.id === '__unassigned__' ? '' : p.id)
                }}
                onDragOver={e => {
                  if (!dragging) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const yPx = e.clientY - rect.top
                  const rawMins = gridStartMins + (yPx / CELL_HEIGHT) * 60 - dragging.offsetMins
                  const snapMins = Math.round(rawMins / 15) * 15
                  const clampedMins = Math.max(gridStartMins, Math.min(snapMins, gridStartMins + hours.length * 60 - dragging.durationMins))
                  setDragOver({ providerId: p.id, snapMins: clampedMins })
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
                }}
                onDrop={async e => {
                  e.preventDefault()
                  if (!dragging || !dragOver) return
                  const newTherapistId = p.id === '__unassigned__' ? null : p.id
                  await saveDraggedAppt(dragging.apptId, dragOver.snapMins, dragging.durationMins, newTherapistId, providers)
                  setDragging(null)
                  setDragOver(null)
                }}
              >
                {/* Hour grid lines */}
                {hours.map(hour => (
                  <div key={hour} style={{ height: CELL_HEIGHT }} className="border-b border-gray-100" />
                ))}
                {/* Drag ghost preview */}
                {isDropTarget && ghostTop !== null && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded-lg border-2 border-brand-pink bg-brand-pink/20 pointer-events-none z-20"
                    style={{ top: `${ghostTop}px`, height: `${ghostHeight}px` }}
                  />
                )}
                {/* Appointments — absolutely positioned within this column */}
                {colAppts.map((a: any) => {

                  const startMins = timeToMinutes(a.start_time || '08:00')
                  const endMins   = timeToMinutes(a.end_time   || a.start_time || '08:00')
                  const top    = ((startMins - gridStartMins) / 60) * CELL_HEIGHT
                  const height = Math.max((endMins - startMins) / 60, 0.5) * CELL_HEIGHT - 2
                  const color  = treatmentColors[a.modality] || 'bg-gray-400'
                  const isDraggingThis = dragging?.apptId === a.id
                  return (
                    <button
                      key={a.id}
                      draggable
                      onDragStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const offsetY = e.clientY - rect.top
                        const offsetMins = Math.max(0, (offsetY / CELL_HEIGHT) * 60)
                        const dur = Math.max(15, endMins - startMins)
                        setDragging({ apptId: a.id, durationMins: dur, offsetMins })
                        e.dataTransfer.effectAllowed = 'move'
                        // Transparent drag image so we can draw our own ghost
                        const ghost = document.createElement('div')
                        ghost.style.cssText = 'position:fixed;top:-9999px;left:-9999px'
                        document.body.appendChild(ghost)
                        e.dataTransfer.setDragImage(ghost, 0, 0)
                        setTimeout(() => document.body.removeChild(ghost), 0)
                      }}
                      onDragEnd={() => { setDragging(null); setDragOver(null) }}
                      onClick={() => { if (!dragging) openEditModal(a) }}
                      style={{ top: `${top}px`, height: `${height}px`, left: 3, right: 3, position: 'absolute', opacity: isDraggingThis ? 0.3 : 1, cursor: 'grab' }}
                      className={`text-left text-white px-1.5 py-1 rounded-lg hover:opacity-90 hover:shadow-md transition-all text-xs overflow-hidden ${color}`}
                      title={`${a.start_time}–${a.end_time} • ${a.modality}\n${a.patient_name} (${a.client_name}) ${a.client_phone}`}
                    >
                      <div className="font-semibold leading-tight truncate">{a.start_time?.slice(0,5)} {a.modality}</div>
                      <div className="opacity-90 leading-tight mt-0.5 truncate">{a.client_name} • <span className="font-medium">{a.patient_name}</span></div>
                      {height > 52 && <div className="opacity-75 text-[10px] mt-0.5 truncate">{a.client_phone}</div>}
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
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        {/* Left: Today + nav + title */}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <button onClick={goToToday} className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">Today</button>
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
          </div>
          {/* Clickable title → date jumper */}
          <div className="relative" ref={dateJumperRef}>
            <button
              onClick={() => setShowDateJumper(v => !v)}
              className="flex items-center gap-1.5 group"
              title="Jump to date"
            >
              <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate group-hover:text-brand-pink transition-colors">
                <span className="sm:hidden">{getTitle(true)}</span>
                <span className="hidden sm:inline">{getTitle()}</span>
              </h1>
              <CalendarDays className="w-4 h-4 text-gray-400 group-hover:text-brand-pink transition-colors flex-shrink-0" />
            </button>

            {showDateJumper && (
              <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[220px]">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Jump to date</p>
                <input
                  type="date"
                  className="input text-sm w-full"
                  defaultValue={toSGTDateStr(currentDate)}
                  onChange={e => {
                    if (!e.target.value) return
                    const [y, m, d] = e.target.value.split('-').map(Number)
                    setCurrentDate(new Date(y, m - 1, d))
                    setShowDateJumper(false)
                  }}
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: 'Today', date: new Date() },
                    { label: 'Tomorrow', date: new Date(Date.now() + 86400000) },
                    { label: 'Next Mon', date: (() => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d })() },
                  ].map(({ label, date }) => (
                    <button key={label} onClick={() => { setCurrentDate(date); setShowDateJumper(false) }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-brand-pink hover:text-white rounded-lg transition-colors font-medium">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: View switcher */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 sm:p-1 flex-shrink-0">
          {(['day', 'week', 'month'] as ViewType[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                view === v ? 'bg-white text-brand-pink shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="sm:hidden capitalize">{v[0].toUpperCase()}</span>
              <span className="hidden sm:inline capitalize">{v}</span>
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
      {view === 'month' && treatmentTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 pt-3 border-t border-gray-100">
          {treatmentTypes.filter(t => !['Admin','Lunch','OFF','On Leave','Half Day Off','DO NOT BOOK'].includes(t.name)).slice(0, 12).map(t => (
            <div key={t.name} className="flex items-center gap-1 sm:gap-1.5">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${t.color}`} />
              <span className="text-[10px] sm:text-xs text-gray-500">{t.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* New Appointment Modal (double-click) */}
      <Modal open={!!newApptForm} onClose={resetNewApptModal} title="New Appointment">
        {newApptForm && (
          <div className="space-y-4">

            {/* 1. Provider — top */}
            <div>
              <label className="label">Provider</label>
              <select className="input" value={newApptForm.therapist_id} onChange={e => setNewApptForm({...newApptForm, therapist_id: e.target.value})}>
                <option value="">Select provider...</option>
                {staff.filter(s => ['therapist','vet','veterinarian','senior_therapist','assistant_therapist','hydrotherapist'].includes(s.role)).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Date + times */}
            <DatePicker label="Date" value={newApptForm.date} onChange={date => setNewApptForm({...newApptForm, date})} />
            <div className="grid grid-cols-2 gap-4">
              <TimePicker label="Start Time" value={newApptForm.start_time} onChange={t => {
                const [sh, sm] = t.split(':').map(Number)
                const endTotal = sh * 60 + sm + 60
                const autoEnd = `${String(Math.floor(endTotal/60)).padStart(2,'0')}:${String(endTotal%60).padStart(2,'0')}`
                setNewApptForm({...newApptForm, start_time: t, end_time: autoEnd})
              }} />
              <TimePicker label="End Time" value={newApptForm.end_time} onChange={t => setNewApptForm({...newApptForm, end_time: t})} minTime={newApptForm.start_time} />
            </div>

            {/* 3. Client search */}
            <div className="relative">
              <label className="label">Client *</label>
              {selectedClient ? (
                <div className="input flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{selectedClient.name}
                    {selectedClient.phone && <span className="text-gray-400 font-normal ml-2 text-xs">{selectedClient.phone}</span>}
                  </span>
                  <button type="button" onClick={() => { setSelectedClient(null); setClientPatients([]); setNewApptForm({...newApptForm, client_id: '', patient_id: ''}); setClientSearch(''); setClientSearchResults([]) }}
                    className="text-gray-400 hover:text-red-400 ml-2 text-xs flex-shrink-0">✕ Change</button>
                </div>
              ) : (
                <>
                  <input className="input" placeholder="Search by client name or phone..."
                    value={clientSearch} onChange={e => handleClientSearchChange(e.target.value)} autoComplete="off" />
                  {clientSearch.length >= 1 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                      {clientSearchLoading && <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>}
                      {!clientSearchLoading && clientSearchResults.map((c: any) => (
                        <button key={c.id} type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                          onClick={() => selectNewApptClient(c)}>
                          <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{c.phone}</span>
                        </button>
                      ))}
                      {!clientSearchLoading && clientSearchResults.length === 0 && (
                        <p className="px-4 py-3 text-sm text-gray-400">No clients found</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 4. Patient — dropdown filtered to selected client, auto-selected if only 1 */}
            {selectedClient && (
              <div>
                <label className="label">Patient *</label>
                {clientPatients.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No pets found for this client</p>
                ) : clientPatients.length === 1 ? (
                  <div className="input bg-gray-50 text-sm font-semibold text-gray-900">
                    {clientPatients[0].name} <span className="text-gray-400 font-normal">· {clientPatients[0].breed || clientPatients[0].species}</span>
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Auto-selected</span>
                  </div>
                ) : (
                  <select className="input" value={newApptForm.patient_id}
                    onChange={e => setNewApptForm({...newApptForm, patient_id: e.target.value})} required>
                    <option value="">Select pet...</option>
                    {clientPatients.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.breed || p.species})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* 4. Treatment Type */}
            <div>
              <label className="label">Treatment Type *</label>
              <select className="input" value={newApptForm.modality}
                onChange={e => {
                  const t = treatmentTypes.find((x: any) => x.name === e.target.value)
                  if (t) {
                    const [sh, sm] = newApptForm.start_time.split(':').map(Number)
                    const endTotal = sh * 60 + sm + (t.duration || 60)
                    setNewApptForm({...newApptForm, modality: e.target.value, end_time: `${String(Math.floor(endTotal/60)).padStart(2,'0')}:${String(endTotal%60).padStart(2,'0')}`})
                  } else {
                    setNewApptForm({...newApptForm, modality: e.target.value})
                  }
                }} required>
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

            {/* 5. Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={newApptForm.notes} onChange={e => setNewApptForm({...newApptForm, notes: e.target.value})} placeholder="Optional notes..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetNewApptModal} className="btn-secondary">Cancel</button>
              <button onClick={saveNewAppt} disabled={newApptSaving || !newApptForm.patient_id || !newApptForm.modality} className="btn-primary">
                {newApptSaving ? 'Saving...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal open={!!selectedAppt} onClose={closeModal} title="Edit Appointment">
        {selectedAppt && editForm && (
          <div className="space-y-4">
            {/* Patient info (read-only) */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900">
                  {selectedAppt.patient_name || <span className="text-gray-400 font-normal italic">No patient linked</span>}
                </span>
                {selectedAppt.is_reactive && (
                  <span className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">⚠️ Reactive</span>
                )}
              </div>
              {(selectedAppt.client_name || selectedAppt.client_phone) ? (
                <p className="text-sm text-gray-500">{selectedAppt.client_name}{selectedAppt.client_phone ? ` • ${selectedAppt.client_phone}` : ''}</p>
              ) : selectedAppt.notes?.startsWith('Client:') ? (
                <p className="text-sm text-amber-600">⚠️ Unmatched: {selectedAppt.notes.replace(/^Client:\s*/, '')}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No client linked</p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 -mx-1">
              {(['visit', 'billing'] as const).map(tab => (
                <button key={tab} onClick={() => setApptTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${apptTab === tab ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'visit' ? '📋 Visit Record' : '💳 Billing'}
                </button>
              ))}
            </div>

            {/* Visit Record Tab */}
            {apptTab === 'visit' && (
              <div>
                {apptVisit ? (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-400">{apptVisit.visit_number}</span>
                      <button onClick={() => { closeModal(); router.push(`/visits/${apptVisit.id}`) }}
                        className="text-xs text-brand-pink font-medium hover:underline">Open Full Record →</button>
                    </div>
                    {(apptVisit.weight_kg || apptVisit.temperature_c || apptVisit.heart_rate_bpm) && (
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-1">
                        {apptVisit.weight_kg     && <span>⚖️ {apptVisit.weight_kg} kg</span>}
                        {apptVisit.temperature_c && <span>🌡️ {apptVisit.temperature_c}°C</span>}
                        {apptVisit.heart_rate_bpm && <span>❤️ {apptVisit.heart_rate_bpm} bpm</span>}
                      </div>
                    )}
                    {apptVisit.clinical_examination && (
                      <p className="text-xs text-gray-500 line-clamp-2">{apptVisit.clinical_examination}</p>
                    )}
                    {apptVisit.staff_name && (
                      <p className="text-xs text-gray-400">by {apptVisit.staff_name}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400 mb-3">No visit record for this appointment yet.</p>
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/visits', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            appointment_id: selectedAppt.id,
                            client_id:  selectedAppt.client_id,
                            patient_id: selectedAppt.patient_id,
                            staff_id:   selectedAppt.therapist_id,
                            visit_date: selectedAppt.date,
                          }),
                        })
                        const data = await res.json()
                        if (data.visit?.id) { closeModal(); router.push(`/visits/${data.visit.id}`) }
                      }}
                      className="btn-primary flex items-center gap-2 mx-auto text-sm"
                    >
                      <ClipboardList className="w-4 h-4" /> Create Visit Record
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Billing Tab */}
            {apptTab === 'billing' && (
              <div className="space-y-3">
                {apptInvoice && apptLineItems.length > 0 && (
                  <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
                    {apptLineItems.map((li: any) => (
                      <div key={li.id} className="flex justify-between px-3 py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700">{li.description}{parseFloat(li.qty||li.quantity||1) !== 1 ? ` ×${li.qty||li.quantity}` : ''}</span>
                        <span className="font-medium">S${parseFloat(li.total||li.amount||0).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 bg-gray-50 font-semibold">
                      <span>Total</span>
                      <span>S${parseFloat(apptInvoice.total||0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {!apptInvoice && (
                  <p className="text-sm text-gray-400 text-center py-2">No bill created yet.</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowBillingModal(true)}
                  className="btn-primary w-full text-sm"
                >
                  {apptInvoice ? 'Edit Bill' : '+ Create Bill'}
                </button>
              </div>
            )}

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
                {staff.filter(s => ['therapist', 'vet', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'].includes(s.role)).map(s => (
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
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => { setConfirmDeleteId(selectedAppt.id) }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <div className="flex gap-2">

                <button onClick={saveAppointment} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Confirm Delete Modal ── */}
      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Delete Appointment">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Are you sure you want to delete this appointment?</p>
              <p className="text-sm text-red-600 mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary" disabled={deleting}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Billing Modal */}
      {selectedAppt && (
        <BillingModal
          open={showBillingModal}
          onClose={() => setShowBillingModal(false)}
          visitId={apptVisit?.id || null}
          clientId={selectedAppt.client_id}
          patientId={selectedAppt.patient_id}
          clientName={selectedAppt.client_name}
          patientName={selectedAppt.patient_name}
          appointmentDate={selectedAppt.date}
          existingInvoice={apptInvoice}
          existingLineItems={apptLineItems}
          onSaved={async (invoiceId) => {
            // Reload invoice data then navigate to invoice
            if (apptVisit) {
              const inv = await fetch(`/api/visits/${apptVisit.id}/invoice`).then(r => r.json())
              if (inv.invoice) { setApptInvoice(inv.invoice); setApptLineItems(inv.line_items || []) }
            }
            closeModal()
            router.push(`/billing/${invoiceId}`)
          }}
        />
      )}
    </div>
  )
}
