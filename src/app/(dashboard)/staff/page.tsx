'use client'

import { useRef, useState, useEffect } from 'react'
import { Plus, Trash2, KeyRound, Pencil } from 'lucide-react'
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
  const [showAdd, setShowAdd] = useState(false)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [showReset, setShowReset] = useState<any>(null)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '+65 ', role: 'assistant_therapist', password: '', photo_url: '', specializations: [] as string[] })
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '+65 ', role: 'assistant_therapist', photo_url: '', specializations: [] as string[], active: true, schedule: DEFAULT_SCHEDULE as WeekSchedule })
  const [pageTab, setPageTab] = useState<'profile'|'schedule'>('profile')
  const [showScheduleEdit, setShowScheduleEdit] = useState<any>(null)
  const editPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const addPhotoInputRef = useRef<HTMLInputElement | null>(null)

  async function fetchStaff() {
    setLoading(true)
    const res = await fetch('/api/staff')
    const data = await res.json()
    setStaff(data.staff || [])
    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

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
    const specs = s.specializations ? JSON.parse(s.specializations) : []
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
    const specs = s.specializations ? JSON.parse(s.specializations) : []
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

  // Schedule summary label for a staff member
  function scheduleSummary(s: any): string {
    try {
      const sched: WeekSchedule = s.schedule ? { ...DEFAULT_SCHEDULE, ...JSON.parse(s.schedule) } : DEFAULT_SCHEDULE
      const onDays = DAYS.filter(d => sched[d].on).map(d => DAY_LABELS[d].slice(0,3))
      return onDays.length ? onDays.join(', ') : 'All days off'
    } catch { return 'Not set' }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm">Clinic team members and roles</p>
        </div>
        {pageTab === 'profile' && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </button>
        )}
      </div>

      {/* Page tabs */}
      <div className="flex border-b border-gray-200">
        {(['profile','schedule'] as const).map(tab => (
          <button key={tab} onClick={() => setPageTab(tab)}
            className={`px-6 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              pageTab === tab ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{tab}</button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {pageTab === 'profile' && (loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(s => {
            const specs = s.specializations ? JSON.parse(s.specializations) : []
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
                  <button
                    onClick={() => { setShowReset(s); setTempPassword(null); setResetPassword('') }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-brand-navy hover:bg-brand-navy/5"
                    title="Reset password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDelete(s)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                    title="Remove staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
      {pageTab === 'schedule' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
          ) : staff.map(s => {
            let sched: WeekSchedule = DEFAULT_SCHEDULE
            try { if (s.schedule) sched = { ...DEFAULT_SCHEDULE, ...JSON.parse(s.schedule) } } catch {}
            return (
              <div key={s.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {s.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photo_url} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-sm">
                        {s.name.split(' ').map((n: string) => n[0]).join('').substring(0,2)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400">{scheduleSummary(s)}</p>
                    </div>
                  </div>
                  <button onClick={() => openScheduleEdit(s)} className="btn-secondary text-xs px-3 py-1.5">
                    Edit Schedule
                  </button>
                </div>
                {/* Week grid */}
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map(day => {
                    const d = sched[day]
                    return (
                      <div key={day} className={`rounded-lg p-1.5 text-center ${d.on ? 'bg-brand-pink/10' : 'bg-gray-100'}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 ${d.on ? 'text-brand-pink' : 'text-gray-400'}`}>
                          {DAY_LABELS[day].slice(0,3)}
                        </p>
                        {d.on ? (
                          <>
                            <p className="text-[10px] text-gray-700 font-medium leading-tight">{fmtTime(d.start)}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">–</p>
                            <p className="text-[10px] text-gray-700 font-medium leading-tight">{fmtTime(d.end)}</p>
                            {d.breaks.length > 0 && (
                              <p className="text-[9px] text-orange-400 mt-0.5">{d.breaks.length} break{d.breaks.length > 1 ? 's' : ''}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">Off</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Staff Member">
        <form onSubmit={handleAdd} className="space-y-4">

          {/* Photo upload — top of form */}
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

      {/* Edit Staff Modal — profile only */}
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
      <Modal open={!!showScheduleEdit} onClose={() => setShowScheduleEdit(null)} title={`Schedule — ${showScheduleEdit?.name || ''}`}>
        {showScheduleEdit && (
          <form onSubmit={e => { e.preventDefault(); handleEdit(e).then(() => { setShowScheduleEdit(null) }) }} className="space-y-1">
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
                      <span className="text-gray-400 text-xs">–</span>
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
              <button type="submit" className="btn-primary">Save Schedule</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!showReset} onClose={() => { setShowReset(null); setTempPassword(null); setResetPassword('') }} title="Reset Staff Password">
        {showReset && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-gray-600">
              Reset password for <strong>{showReset.name}</strong> ({showReset.email}).
            </p>
            <div>
              <label className="label">New password (leave blank to generate a temporary password)</label>
              <input type="text" className="input" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
            </div>
            {tempPassword && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm text-green-800 font-semibold">Temporary password generated:</p>
                <p className="text-sm font-mono text-green-900 break-all">{tempPassword}</p>
                <p className="text-xs text-green-700 mt-1">Copy this now — it won’t be shown again.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowReset(null); setTempPassword(null); setResetPassword('') }} className="btn-secondary">Close</button>
              <button type="submit" className="btn-primary">Reset Password</button>
            </div>
          </form>
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
