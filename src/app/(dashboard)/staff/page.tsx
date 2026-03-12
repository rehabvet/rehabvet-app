'use client'

import { useRef, useState, useEffect } from 'react'
import { Plus, Trash2, KeyRound, Pencil, CalendarDays } from 'lucide-react'
import Modal from '@/components/Modal'
import PhoneInput from '@/components/PhoneInput'

// ── Schedule types ────────────────────────────────────────────────────────────
type Break = { start: string; end: string }
type DaySchedule = { on: boolean; start: string; end: string; breaks: Break[] }
type WeekSchedule = Record<'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday', DaySchedule>

const DAYS: (keyof WeekSchedule)[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS: Record<keyof WeekSchedule, string> = {
  monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday',
  friday:'Friday', saturday:'Saturday', sunday:'Sunday'
}

const DEFAULT_DAY = (on: boolean): DaySchedule => ({ on, start: '09:00', end: '18:00', breaks: [] })
const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: DEFAULT_DAY(true), tuesday: DEFAULT_DAY(true), wednesday: DEFAULT_DAY(true),
  thursday: DEFAULT_DAY(true), friday: DEFAULT_DAY(true),
  saturday: DEFAULT_DAY(false), sunday: DEFAULT_DAY(false),
}

// Local date helper — avoids UTC offset shifting date in SGT (UTC+8)
function localTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// Generate time slots from 06:00 to 23:00 in 30-min steps
const TIME_SLOTS: string[] = []
for (let h = 6; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`)
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`)
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`
}

const ROLES = [
  { value: 'veterinarian', label: 'Veterinarian' },
  { value: 'senior_therapist', label: 'Senior Therapist' },
  { value: 'assistant_therapist', label: 'Assistant Therapist' },
  { value: 'hydrotherapist', label: 'Hydrotherapist' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'office_manager', label: 'Office Manager' },
  { value: 'administrator', label: 'Administrator' },
]

const SPEC_OPTIONS = [
  'Physiotherapy', 'Hydrotherapy', 'Acupuncture', 'HBOT', 'Chiropractic',
  'TCM', 'Laser Therapy', 'Electrotherapy', 'Rehabilitation', 'CCRT', 'CVA',
  'Holistic Medicine', 'Veterinary Medicine', 'Pet Handling', 'Equine Rehabilitation',
  'Canine Rehabilitation', 'Feline Rehabilitation',
]

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [showReset, setShowReset] = useState<any>(null)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '+65 ', role: 'assistant_therapist', password: '', photo_url: '', specializations: [] as string[] })
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '+65 ', role: 'assistant_therapist', photo_url: '', specializations: [] as string[], active: true, schedule: DEFAULT_SCHEDULE as WeekSchedule })
  const [pageTab, setPageTab] = useState<'profile'|'schedule'>('schedule')
  // ── Monthly Roster ─────────────────────────────────────────────────────────
  const [rosterMonth, setRosterMonth] = useState(() => {
    const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  })
  const [rosterData, setRosterData] = useState<Set<string>>(new Set()) // "staff_id|date"
  const [rosterLoading, setRosterLoading] = useState(false)
  const [savingRoster, setSavingRoster] = useState<string | null>(null) // staff_id being saved
  const [showScheduleEdit, setShowScheduleEdit] = useState<any>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
  // ── Weekly Pattern ──────────────────────────────────────────────────────────
  const [showPatternModal, setShowPatternModal] = useState<any>(null) // staff object
  const [patternDays, setPatternDays] = useState<Set<number>>(new Set([1,2,3,4,5])) // 0=Sun…6=Sat
  const [applyingPattern, setApplyingPattern] = useState(false)
  // ── Annual Leave ──────────────────────────────────────────────────────────
  const [scheduleSubTab, setScheduleSubTab] = useState<'roster'|'leave'>('roster')
  const [leaveRecords, setLeaveRecords] = useState<any[]>([])
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [showAddLeave, setShowAddLeave] = useState<any>(null) // staff object
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' })
  const [savingLeave, setSavingLeave] = useState(false)
  const editPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const addPhotoInputRef = useRef<HTMLInputElement | null>(null)

  async function fetchStaff() {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      const data = await res.json()
      setStaff(data.staff || [])
    } catch (err) {
      console.error('Failed to load staff:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
    fetch('/api/auth/me').then(r => r.json()).then(d => setCurrentUserRole(d.user?.role || ''))
  }, [])

  const isAdmin = ['admin', 'administrator', 'office_manager'].includes(currentUserRole)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setForm({ name: '', email: '', phone: '+65 ', role: 'assistant_therapist', password: '', photo_url: '', specializations: [] })
      setShowAdd(false)
      fetchStaff()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to add staff')
    }
  }

  function openEditModal(s: any) {
    const specs = (() => { try { return s.specializations ? JSON.parse(s.specializations) : [] } catch { return [] } })()
    let sched: WeekSchedule = DEFAULT_SCHEDULE
    try { if (s.schedule) sched = { ...DEFAULT_SCHEDULE, ...JSON.parse(s.schedule) } } catch {}
    setEditForm({
      id: s.id,
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '+65 ',
      role: s.role || 'assistant_therapist',
      photo_url: s.photo_url || '',
      specializations: Array.isArray(specs) ? specs : [],
      active: !!s.active,
      schedule: sched,
    })
    setShowEdit(s)
  }

  function openScheduleEdit(s: any) {
    const specs = (() => { try { return s.specializations ? JSON.parse(s.specializations) : [] } catch { return [] } })()
    let sched: WeekSchedule = DEFAULT_SCHEDULE
    try { if (s.schedule) sched = { ...DEFAULT_SCHEDULE, ...JSON.parse(s.schedule) } } catch {}
    setEditForm({
      id: s.id, name: s.name, email: s.email, phone: s.phone || '+65 ',
      role: s.role, photo_url: s.photo_url || '',
      specializations: Array.isArray(specs) ? specs : [],
      active: !!s.active, schedule: sched,
    })
    setShowScheduleEdit(s)
  }

  // ── Schedule helpers ──────────────────────────────────────────────────────
  function setDay(day: keyof WeekSchedule, patch: Partial<DaySchedule>) {
    setEditForm(f => ({ ...f, schedule: { ...f.schedule, [day]: { ...f.schedule[day], ...patch } } }))
  }
  function addBreak(day: keyof WeekSchedule) {
    const d = editForm.schedule[day]
    setDay(day, { breaks: [...d.breaks, { start: '12:00', end: '13:00' }] })
  }
  function removeBreak(day: keyof WeekSchedule, i: number) {
    const d = editForm.schedule[day]
    setDay(day, { breaks: d.breaks.filter((_, idx) => idx !== i) })
  }
  function setBreak(day: keyof WeekSchedule, i: number, patch: Partial<Break>) {
    const d = editForm.schedule[day]
    setDay(day, { breaks: d.breaks.map((b, idx) => idx === i ? { ...b, ...patch } : b) })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/staff', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, schedule: editForm.schedule }),
    })
    if (res.ok) {
      setShowEdit(null)
      fetchStaff()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to update staff')
    }
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSavingSchedule(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm }),
      })
      if (res.ok) {
        setShowScheduleEdit(null)
        fetchStaff()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to save schedule')
      }
    } catch {
      alert('Network error - please try again')
    } finally {
      setSavingSchedule(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!showReset) return
    setTempPassword(null)
    const res = await fetch('/api/staff/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: showReset.id, password: resetPassword || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      setTempPassword(data.tempPassword || null)
      setResetPassword('')
      fetchStaff()
    } else {
      alert(data.error || 'Failed to reset password')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    if (res.ok) {
      setShowDelete(null)
      fetchStaff()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to remove staff')
    }
  }

  function toggleSpec(spec: string) {
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter(s => s !== spec)
        : [...f.specializations, spec]
    }))
  }

  function toggleEditSpec(spec: string) {
    setEditForm(f => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter(s => s !== spec)
        : [...f.specializations, spec]
    }))
  }

  function triggerEditPhotoUpload() {
    editPhotoInputRef.current?.click()
  }

  function onEditPhotoSelected(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result) setEditForm(f => ({ ...f, photo_url: result }))
    }
    reader.readAsDataURL(file)
  }

  function onAddPhotoSelected(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result) setForm(f => ({ ...f, photo_url: result }))
    }
    reader.readAsDataURL(file)
  }

  const roleLabel: Record<string, string> = {
    admin: 'Administrator',
    vet: 'Veterinarian',
    therapist: 'Senior Therapist',
    receptionist: 'Office Manager',
    veterinarian: 'Veterinarian',
    senior_therapist: 'Senior Therapist',
    assistant_therapist: 'Assistant Therapist',
    hydrotherapist: 'Hydrotherapist',
    marketing: 'Marketing',
    office_manager: 'Office Manager',
    administrator: 'Administrator',
  }
  const roleColor: Record<string, string> = {
    admin: 'badge-red',
    receptionist: 'badge-pink',
    vet: 'badge-green',
    therapist: 'badge-blue',
    veterinarian: 'badge-green',
    senior_therapist: 'badge-blue',
    assistant_therapist: 'badge-gray',
    hydrotherapist: 'badge-purple',
    marketing: 'badge-yellow',
    office_manager: 'badge-pink',
    administrator: 'badge-red',
  }

  // ── Monthly Roster helpers ──────────────────────────────────────────────────
  async function loadRoster(month: string) {
    setRosterLoading(true)
    const res = await fetch(`/api/staff/roster?month=${month}`)
    const data = await res.json()
    const set = new Set<string>((data.roster || []).map((r: any) => `${r.staff_id}|${r.date}`))
    setRosterData(set)
    setRosterLoading(false)
  }

  useEffect(() => { if (pageTab === 'schedule') loadRoster(rosterMonth) }, [pageTab, rosterMonth])

  function rosterKey(staffId: string, date: string) { return `${staffId}|${date}` }

  async function toggleRosterDay(staffId: string, date: string) {
    const key = rosterKey(staffId, date)
    const isOn = rosterData.has(key)
    // Optimistic update
    setRosterData(prev => {
      const next = new Set(prev)
      isOn ? next.delete(key) : next.add(key)
      return next
    })
    // Build new dates list for this staff+month and save
    setSavingRoster(staffId)
    const newSet = new Set(rosterData)
    isOn ? newSet.delete(key) : newSet.add(key)
    const dates = [...newSet].filter(k => k.startsWith(`${staffId}|`)).map(k => k.split('|')[1])
    await fetch('/api/staff/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: rosterMonth, staff_id: staffId, dates }),
    })
    setSavingRoster(null)
  }

  function getRosterDaysInMonth(month: string) {
    const [y, m] = month.split('-').map(Number)
    const days: { date: string; label: number; weekday: string }[] = []
    const daysInMonth = new Date(y, m, 0).getDate()
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2,'0')}`
      const dow = DOW[new Date(y, m-1, d).getDay()]
      days.push({ date, label: d, weekday: dow })
    }
    return days
  }

  // Schedule summary label for a staff member
  function scheduleSummary(s: any): string {
    try {
      const sched: WeekSchedule = s.schedule ? { ...DEFAULT_SCHEDULE, ...JSON.parse(s.schedule) } : DEFAULT_SCHEDULE
      const onDays = DAYS.filter(d => sched[d].on).map(d => DAY_LABELS[d].slice(0,3))
      return onDays.length ? onDays.join(', ') : 'All days off'
    } catch { return 'Not set' }
  }

  // ── Weekly Pattern helpers ─────────────────────────────────────────────────
  // DOW mapping: JS getDay() → schedule key
  const DOW_TO_KEY: Record<number, keyof WeekSchedule> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday'
  }
  const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  function openPatternModal(s: any) {
    // Pre-fill from staff's saved schedule
    try {
      const sched: WeekSchedule = s.schedule ? { ...DEFAULT_SCHEDULE, ...JSON.parse(s.schedule) } : DEFAULT_SCHEDULE
      const days = new Set<number>()
      Object.entries(DOW_TO_KEY).forEach(([dow, key]) => {
        if (sched[key].on) days.add(Number(dow))
      })
      setPatternDays(days)
    } catch {
      setPatternDays(new Set([1,2,3,4,5]))
    }
    setShowPatternModal(s)
  }

  async function applyWeeklyPattern() {
    if (!showPatternModal) return
    setApplyingPattern(true)
    try {
      const staffId = showPatternModal.id
      // Generate all dates for the next 52 weeks starting from today
      const today = new Date()
      today.setHours(0,0,0,0)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 364) // 52 weeks

      // Helper: format a Date as local YYYY-MM-DD (avoids UTC offset shifting the date)
      const localDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

      const todayStr = localDateStr(today)

      // Collect dates grouped by month
      const byMonth: Record<string, string[]> = {}
      const cur = new Date(today)
      while (cur <= endDate) {
        const dow = cur.getDay()
        if (patternDays.has(dow)) {
          const month = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`
          const dateStr = localDateStr(cur)
          if (!byMonth[month]) byMonth[month] = []
          byMonth[month].push(dateStr)
        }
        cur.setDate(cur.getDate() + 1)
      }

      // For each affected month: load existing past dates (before today) and merge
      const months = Object.keys(byMonth)
      for (const month of months) {
        // Load existing roster for this month
        let existingDates: string[] = []
        try {
          const res = await fetch(`/api/staff/roster?month=${month}`)
          const data = await res.json()
          existingDates = (data.roster || [])
            .filter((r: any) => r.staff_id === staffId)
            .map((r: any) => r.date as string)
        } catch { /* ignore */ }

        // Keep past dates as-is, replace future dates with the pattern
        const pastDates = existingDates.filter(d => d < todayStr)
        const merged = [...new Set([...pastDates, ...byMonth[month]])]

        await fetch('/api/staff/roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, staff_id: staffId, dates: merged }),
        })
      }

      // Refresh current month view
      await loadRoster(rosterMonth)
      setShowPatternModal(null)
    } finally {
      setApplyingPattern(false)
    }
  }

  // ── Annual Leave functions ────────────────────────────────────────────────
  async function loadLeave() {
    setLeaveLoading(true)
    setLeaveError(null)
    try {
      const res = await fetch('/api/staff/leave')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setLeaveRecords(data.leave || [])
    } catch (err: any) {
      console.error('Failed to load leave:', err)
      setLeaveError(err.message || 'Failed to load leave records')
      setLeaveRecords([])
    } finally {
      setLeaveLoading(false)
    }
  }

  useEffect(() => {
    if (pageTab === 'schedule' && scheduleSubTab === 'leave') loadLeave()
  }, [pageTab, scheduleSubTab])

  async function handleAddLeave(e: React.FormEvent) {
    e.preventDefault()
    if (!showAddLeave || !leaveForm.start_date || !leaveForm.end_date) return
    setSavingLeave(true)
    await fetch('/api/staff/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: showAddLeave.id, ...leaveForm }),
    })
    setSavingLeave(false)
    setShowAddLeave(null)
    setLeaveForm({ start_date: '', end_date: '', reason: '' })
    loadLeave()
  }

  async function handleDeleteLeave(id: string) {
    await fetch('/api/staff/leave', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setLeaveRecords(prev => prev.filter(l => l.id !== id))
  }

  function formatDateRange(start: string, end: string) {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const fmt = (d: Date) => d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
    return `${fmt(s)}${start !== end ? ` – ${fmt(e)}` : ''} · ${days} day${days !== 1 ? 's' : ''}`
  }

  function isCurrentlyOnLeave(start: string, end: string) {
    const today = localTodayStr()
    return today >= start && today <= end
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm">Clinic team members and roles</p>
        </div>
        {pageTab === 'profile' && isAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </button>
        )}
      </div>

      {/* Page tabs — Profile only visible to admins */}
      <div className="flex border-b border-gray-200">
        {isAdmin && (
          <button onClick={() => setPageTab('profile')}
            className={`px-6 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              pageTab === 'profile' ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>Staff</button>
        )}
        <button onClick={() => setPageTab('schedule')}
          className={`px-6 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
            pageTab === 'schedule' ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>Schedule</button>
      </div>

      {/* ── Profile Tab ── */}
      {pageTab === 'profile' && (loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(s => {
            const specs = (() => { try { return s.specializations ? JSON.parse(s.specializations) : [] } catch { return [] } })()
            return (
              <div key={s.id} className="card group relative">
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-brand-navy hover:bg-brand-navy/5"
                    title="Edit profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setShowReset(s); setTempPassword(null); setResetPassword('') }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-brand-navy hover:bg-brand-navy/5"
                      title="Reset password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setShowDelete(s)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                      title="Remove staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  {s.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo_url} alt={s.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-sm">
                      {s.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <span className={roleColor[s.role] || 'badge-gray'}>{roleLabel[s.role] || s.role}</span>
                    <p className="text-xs text-gray-500 mt-1">{s.email}</p>
                    {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
                    {specs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {specs.map((sp: string) => <span key={sp} className="badge-purple">{sp}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* ── Schedule Tab ── */}
      {pageTab === 'schedule' && (() => {
        const days = getRosterDaysInMonth(rosterMonth)
        const [y, m] = rosterMonth.split('-').map(Number)
        const monthLabel = new Date(y, m-1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
        const today = localTodayStr()
        const activeStaff = staff.filter(s => s.active !== false)

        return (
          <div className="space-y-4">
            {/* Sub-tab switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              <button
                onClick={() => setScheduleSubTab('roster')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${scheduleSubTab === 'roster' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Monthly Roster
              </button>
              <button
                onClick={() => setScheduleSubTab('leave')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${scheduleSubTab === 'leave' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Annual Leave
              </button>
            </div>

            {/* ── Annual Leave sub-tab ── */}
            {scheduleSubTab === 'leave' && (
              <div className="space-y-3">
                {leaveLoading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>
                ) : leaveError ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-red-500 mb-3">{leaveError}</p>
                    <button onClick={loadLeave} className="btn-secondary text-sm">Retry</button>
                  </div>
                ) : (
                  <>
                    {activeStaff.map(s => {
                      const staffLeave = leaveRecords.filter(l => l.staff_id === s.id).sort((a: any, b: any) => a.start_date.localeCompare(b.start_date))
                      return (
                        <div key={s.id} className="card p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {s.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={s.photo_url} alt={s.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-xs">
                                  {s.name.split(' ').map((n: string) => n[0]).join('').substring(0,2)}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                                <p className="text-xs text-gray-400">{staffLeave.length} leave period{staffLeave.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => { setShowAddLeave(s); setLeaveForm({ start_date: today, end_date: today, reason: '' }) }}
                              className="btn-secondary text-xs flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Leave
                            </button>
                          </div>
                          {staffLeave.length > 0 ? (
                            <div className="space-y-2">
                              {staffLeave.map((l: any) => {
                                const active = isCurrentlyOnLeave(l.start_date, l.end_date)
                                const isPast = l.end_date < today
                                return (
                                  <div key={l.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                                    active ? 'bg-amber-50 border-amber-200' : isPast ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-blue-50 border-blue-100'
                                  }`}>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                          active ? 'bg-amber-100 text-amber-700' : isPast ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                          {active ? 'On leave now' : isPast ? 'Past' : 'Upcoming'}
                                        </span>
                                      </div>
                                      <p className="text-sm font-medium text-gray-800 mt-1">{formatDateRange(l.start_date, l.end_date)}</p>
                                      {l.reason && <p className="text-xs text-gray-500 mt-0.5">{l.reason}</p>}
                                    </div>
                                    <button
                                      onClick={() => handleDeleteLeave(l.id)}
                                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Remove leave"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No leave periods</p>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── Monthly Roster sub-tab ── */}
            {scheduleSubTab === 'roster' && <>
            {/* Month navigation */}
            <div className="card p-4 flex items-center justify-between">
              <button
                onClick={() => {
                  const d = new Date(y, m-2, 1)
                  setRosterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-lg">{monthLabel}</p>
                <p className="text-xs text-gray-400">{activeStaff.length} staff · click a cell to toggle working day</p>
              </div>
              <button
                onClick={() => {
                  const d = new Date(y, m, 1)
                  setRosterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {rosterLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {/* Staff column header */}
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 z-10 min-w-[160px] border-r border-gray-200">
                          Staff
                        </th>
                        {days.map(({ date, label, weekday }) => {
                          const isToday = date === today
                          const isWeekend = weekday === 'Sat' || weekday === 'Sun'
                          return (
                            <th key={date} className={`text-center px-1 py-2 min-w-[44px] ${isWeekend ? 'bg-gray-100/80' : ''}`}>
                              <div className={`text-[10px] font-semibold uppercase mb-0.5 ${isWeekend ? 'text-gray-400' : 'text-gray-400'}`}>{weekday}</div>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto
                                ${isToday ? 'bg-brand-pink text-white' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                                {label}
                              </div>
                            </th>
                          )
                        })}
                        <th className="px-3 text-xs text-gray-400 font-normal whitespace-nowrap">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStaff.map((s, si) => {
                        const initials = s.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
                        const workedDays = days.filter(({ date }) => rosterData.has(rosterKey(s.id, date))).length
                        const isSaving = savingRoster === s.id
                        return (
                          <tr key={s.id} className={`border-b border-gray-100 last:border-0 ${si % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            {/* Staff name — sticky left */}
                            <td className={`px-4 py-2.5 sticky left-0 z-10 border-r border-gray-200 ${si % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                              <div className="flex items-center gap-2.5">
                                {s.photo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={s.photo_url} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-xs flex-shrink-0">
                                    {initials}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-800 truncate leading-tight">{s.name}</p>
                                  {isSaving && <p className="text-[10px] text-brand-pink animate-pulse">Saving…</p>}
                                </div>
                                <button
                                  onClick={() => openPatternModal(s)}
                                  title="Set weekly work pattern"
                                  className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-brand-pink hover:bg-pink-50 transition-colors"
                                >
                                  <CalendarDays className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            {/* Day cells */}
                            {days.map(({ date, weekday }) => {
                              const isOn = rosterData.has(rosterKey(s.id, date))
                              const isWeekend = weekday === 'Sat' || weekday === 'Sun'
                              const isToday = date === today
                              const isPast = date < today
                              return (
                                <td key={date} className={`text-center px-1 py-2 ${isWeekend ? 'bg-gray-50' : ''}`}>
                                  <button
                                    onClick={() => !isPast && toggleRosterDay(s.id, date)}
                                    disabled={isPast}
                                    title={isPast ? `${date} — past days are locked` : isOn ? `${s.name} working ${date} — click to remove` : `Mark ${s.name} working on ${date}`}
                                    className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all duration-100
                                      ${isPast
                                        ? isOn
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : 'bg-gray-50 cursor-not-allowed'
                                        : isOn
                                          ? 'bg-brand-pink text-white shadow-sm hover:bg-brand-pink/80 hover:scale-105 active:scale-95'
                                          : isToday
                                            ? 'bg-pink-50 border-2 border-dashed border-brand-pink/30 text-gray-300 hover:border-brand-pink/60 hover:scale-105 active:scale-95'
                                            : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:scale-105 active:scale-95'
                                      }`}
                                  >
                                    {isOn ? (
                                      <svg className={`w-4 h-4 ${isPast ? 'opacity-40' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    ) : !isPast ? (
                                      <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    ) : null}
                                  </button>
                                </td>
                              )
                            })}
                            {/* Days count */}
                            <td className="px-3 text-center">
                              <span className={`text-xs font-semibold ${workedDays > 0 ? 'text-brand-pink' : 'text-gray-300'}`}>
                                {workedDays > 0 ? workedDays : '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-6 px-4 py-3 border-t border-gray-100 bg-gray-50/60 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-brand-pink flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    Working
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-gray-100" />
                    Day off
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-gray-50 border-2 border-dashed border-brand-pink/30" />
                    Today
                  </div>
                  <p className="ml-auto text-gray-400">Changes save automatically</p>
                </div>
              </div>
            )}
            </>}
          </div>
        )
      })()}

      {/* Add Staff Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Staff Member">
        <form onSubmit={handleAdd} className="space-y-4">

          {/* Photo upload - top of form */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="relative">
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-brand-pink/30" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink text-3xl font-bold border-2 border-dashed border-brand-pink/30">
                  {form.name ? form.name.split(' ').map(n => n[0]).join('').substring(0, 2) : '?'}
                </div>
              )}
              <button
                type="button"
                onClick={() => addPhotoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-pink text-white flex items-center justify-center shadow-md hover:bg-brand-pink/90 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-center">
              <button type="button" onClick={() => addPhotoInputRef.current?.click()} className="text-sm text-brand-pink hover:underline font-medium">
                {form.photo_url ? 'Change photo' : 'Upload photo'}
              </button>
              {form.photo_url && (
                <button type="button" onClick={() => setForm({...form, photo_url: ''})} className="ml-3 text-sm text-gray-400 hover:text-red-500">Remove</button>
              )}
              <p className="text-xs text-gray-400 mt-0.5">Optional · JPG, PNG</p>
            </div>
            <input ref={addPhotoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => onAddPhotoSelected(e.target.files?.[0])} />
          </div>

          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" placeholder="name@rehabvet.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <PhoneInput value={form.phone} onChange={v => setForm({...form, phone: v})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Default: password123" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Specializations</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SPEC_OPTIONS.map(sp => (
                <button
                  key={sp} type="button"
                  onClick={() => toggleSpec(sp)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.specializations.includes(sp)
                      ? 'bg-brand-pink text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Staff</button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal - profile only */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Staff Profile">
        {showEdit && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              {editForm.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editForm.photo_url} alt={editForm.name || 'Staff photo'} className="w-24 h-24 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-lg">
                  {(editForm.name || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
              )}
              <button type="button" onClick={triggerEditPhotoUpload} className="text-sm text-brand-pink hover:underline">Edit photo</button>
              <input ref={editPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={e => onEditPhotoSelected(e.target.files?.[0])} />
              {editForm.photo_url && (
                <button type="button" onClick={() => setEditForm({ ...editForm, photo_url: '' })} className="text-xs text-gray-500 hover:text-red-600">Remove photo</button>
              )}
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <PhoneInput value={editForm.phone} onChange={v => setEditForm({ ...editForm, phone: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Role *</label>
                <select className="input" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editForm.active} onChange={e => setEditForm({ ...editForm, active: e.target.checked })} />
                  Active account
                </label>
              </div>
            </div>
            <div>
              <label className="label">Specializations</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SPEC_OPTIONS.map(sp => (
                  <button key={sp} type="button" onClick={() => toggleEditSpec(sp)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      editForm.specializations.includes(sp) ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{sp}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Schedule Edit Modal */}
      <Modal open={!!showScheduleEdit} onClose={() => setShowScheduleEdit(null)} title={`Schedule - ${showScheduleEdit?.name || ''}`}>
        {showScheduleEdit && (
          <form onSubmit={handleSaveSchedule} className="space-y-1">
            <p className="text-xs text-gray-400 mb-3">Toggle days on/off, set working hours and breaks.</p>
            {DAYS.map(day => {
              const d = editForm.schedule[day]
              return (
                <div key={day} className={`rounded-xl border p-3 transition-colors ${d.on ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button type="button" onClick={() => setDay(day, { on: !d.on })}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${d.on ? 'bg-brand-pink' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${d.on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`w-24 text-sm font-semibold ${d.on ? 'text-gray-800' : 'text-gray-400'}`}>{DAY_LABELS[day]}</span>
                    {d.on ? (
                      <>
                        <select value={d.start} onChange={e => setDay(day, { start: e.target.value })}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink/30">
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                        </select>
                        <span className="text-gray-400 text-sm">to</span>
                        <select value={d.end} onChange={e => setDay(day, { end: e.target.value })}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink/30">
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                        </select>
                        <button type="button" onClick={() => addBreak(day)} className="ml-auto text-xs text-brand-pink hover:underline font-medium">+ Add break</button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Day off</span>
                    )}
                  </div>
                  {d.on && d.breaks.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 mt-2 ml-12 flex-wrap">
                      <span className="text-xs text-gray-400 w-12">Break</span>
                      <select value={b.start} onChange={e => setBreak(day, i, { start: e.target.value })}
                        className="text-sm border border-gray-100 rounded-lg px-2 py-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-pink/30">
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                      </select>
                      <span className="text-gray-400 text-xs">-</span>
                      <select value={b.end} onChange={e => setBreak(day, i, { end: e.target.value })}
                        className="text-sm border border-gray-100 rounded-lg px-2 py-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-pink/30">
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                      </select>
                      <button type="button" onClick={() => removeBreak(day, i)} className="text-xs text-red-400 hover:text-red-600 ml-1">Remove</button>
                    </div>
                  ))}
                </div>
              )
            })}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
              <button type="button" onClick={() => setShowScheduleEdit(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={savingSchedule} className="btn-primary">
                {savingSchedule ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!showReset} onClose={() => { setShowReset(null); setTempPassword(null); setResetPassword('') }} title="Reset Staff Password">
        {showReset && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Resetting password for <strong>{showReset.name}</strong> · <span className="text-gray-400">{showReset.email}</span>
            </p>

            {/* Send reset link */}
            <div className="rounded-xl border border-brand-pink/20 bg-pink-50/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-800">Send reset link by email</p>
              <p className="text-xs text-gray-500">A password reset link will be emailed to <strong>{showReset.email}</strong>. It expires in 1 hour.</p>
              <button
                onClick={async () => {
                  await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: showReset.email }) })
                  setTempPassword('__sent__')
                }}
                className="btn-primary text-sm w-full"
              >
                Send Reset Link
              </button>
              {tempPassword === '__sent__' && (
                <p className="text-xs text-green-700 font-medium text-center pt-1">✓ Reset link sent to {showReset.email}</p>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" /><span>or set manually</span><div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Manual password set */}
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="label">New password (leave blank to auto-generate)</label>
                <input type="text" className="input" placeholder="Min. 8 characters" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
              </div>
              {tempPassword && tempPassword !== '__sent__' && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm text-green-800 font-semibold">Temporary password:</p>
                  <p className="text-sm font-mono text-green-900 break-all">{tempPassword}</p>
                  <p className="text-xs text-green-700 mt-1">Copy this now — it won't be shown again.</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowReset(null); setTempPassword(null); setResetPassword('') }} className="btn-secondary">Close</button>
                <button type="submit" className="btn-primary">Set Password</button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* ── Weekly Pattern Modal ── */}
      <Modal open={!!showPatternModal} onClose={() => setShowPatternModal(null)} title="Weekly Work Pattern" size="sm">
        {showPatternModal && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {showPatternModal.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={showPatternModal.photo_url} alt={showPatternModal.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-sm">
                  {showPatternModal.name.split(' ').map((n: string) => n[0]).join('').substring(0,2)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{showPatternModal.name}</p>
                <p className="text-xs text-gray-400">Select which days they work each week</p>
              </div>
            </div>

            {/* Day toggles */}
            <div className="grid grid-cols-7 gap-1.5">
              {DOW_LABELS.map((label, dow) => {
                const isOn = patternDays.has(dow)
                const isWeekend = dow === 0 || dow === 6
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => setPatternDays(prev => {
                      const next = new Set(prev)
                      isOn ? next.delete(dow) : next.add(dow)
                      return next
                    })}
                    className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all font-medium text-sm
                      ${isOn
                        ? 'bg-brand-pink border-brand-pink text-white shadow-sm scale-105'
                        : isWeekend
                          ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-brand-pink/40 hover:bg-pink-50'
                      }`}
                  >
                    <span className="text-xs font-semibold">{label}</span>
                    <div className={`mt-1 w-2 h-2 rounded-full ${isOn ? 'bg-white/70' : 'bg-gray-200'}`} />
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl bg-pink-50 border border-pink-100 px-4 py-3 text-sm text-pink-700">
              <p className="font-semibold mb-0.5">
                {patternDays.size === 0
                  ? 'No days selected'
                  : `${patternDays.size} day${patternDays.size !== 1 ? 's' : ''}/week · ${DOW_LABELS.filter((_,i) => patternDays.has(i)).join(', ')}`}
              </p>
              <p className="text-xs text-pink-500">
                This will fill the next <strong>52 weeks</strong> (from today through{' '}
                {(() => {
                  const d = new Date(); d.setDate(d.getDate() + 364)
                  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
                })()}). Past dates are not affected.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowPatternModal(null)} className="btn-secondary">Cancel</button>
              <button
                type="button"
                onClick={applyWeeklyPattern}
                disabled={applyingPattern || patternDays.size === 0}
                className="btn-primary flex items-center gap-2"
              >
                {applyingPattern ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Applying…</>
                ) : (
                  <><CalendarDays className="w-4 h-4" /> Apply 52 weeks</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Remove Staff Member">
        {showDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to remove <strong>{showDelete.name}</strong> ({showDelete.email})?
            </p>
            <p className="text-sm text-red-600">This action cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDelete.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
