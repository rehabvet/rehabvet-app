'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from '@/components/Modal'
import DatePicker from '@/components/DatePicker'
import TimePicker from '@/components/TimePicker'

function formatDuration(mins: number) {
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    if (remaining === 0) return `${hours}h`
    return `${hours}h ${remaining}min`
  }
  return `${mins}min`
}

export default function AppointmentsPage() {
  const roleLabel: Record<string, string> = {
    veterinarian: 'Veterinarian',
    senior_therapist: 'Senior Therapist',
    assistant_therapist: 'Assistant Therapist',
    hydrotherapist: 'Hydrotherapist',
    marketing: 'Marketing',
    office_manager: 'Office Manager',
    administrator: 'Administrator',
    vet: 'Veterinarian',
    therapist: 'Senior Therapist',
    receptionist: 'Office Manager',
    admin: 'Administrator',
  }
  const roleBadge: Record<string, string> = {
    veterinarian: 'badge-green',
    senior_therapist: 'badge-blue',
    assistant_therapist: 'badge-gray',
    hydrotherapist: 'badge-purple',
    marketing: 'badge-yellow',
    office_manager: 'badge-pink',
    administrator: 'badge-red',
    vet: 'badge-green',
    therapist: 'badge-blue',
    receptionist: 'badge-pink',
    admin: 'badge-red',
  }

  const [appointments, setAppointments] = useState<any[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showAdd, setShowAdd] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [treatmentGrouped, setTreatmentGrouped] = useState<Record<string, any[]>>({})
  const [form, setForm] = useState({ patient_id: '', client_id: '', therapist_id: '', date: '', start_time: '09:00', end_time: '09:45', modality: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  useEffect(() => { fetchAppointments() }, [date])
  
  useEffect(() => {
    fetch('/api/treatment-types').then(r => r.json()).then(d => setTreatmentGrouped(d.grouped || {}))
  }, [])

  async function fetchAppointments() {
    setLoading(true)
    const res = await fetch(`/api/appointments?date=${date}`)
    const data = await res.json()
    setAppointments(data.appointments || [])
    setLoading(false)
  }

  function openAdd() {
    setForm({ ...form, date })
    Promise.all([
      fetch('/api/patients').then(r => r.json()),
      fetch('/api/staff').then(r => r.json()),
    ]).then(([p, s]) => {
      setPatients(p.patients || [])
      setStaff((s.staff || []).filter((st: any) => ['vet', 'therapist', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'].includes(st.role)))
      setShowAdd(true)
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const patient = patients.find(p => p.id === form.patient_id)
    const res = await fetch('/api/appointments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, client_id: patient?.client_id || form.client_id })
    })
    if (res.ok) { setShowAdd(false); fetchAppointments() }
    else { const err = await res.json(); alert(err.error) }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    fetchAppointments()
  }

  function openEdit(appt: any) {
    Promise.all([
      fetch('/api/staff').then(r => r.json()),
      fetch('/api/treatment-types').then(r => r.json()),
    ]).then(([s, t]) => {
      setStaff((s.staff || []).filter((st: any) => ['vet', 'therapist', 'veterinarian', 'senior_therapist', 'assistant_therapist', 'hydrotherapist'].includes(st.role)))
      setTreatmentGrouped(t.grouped || {})
      setEditing({
        id: appt.id,
        patient_name: appt.patient_name,
        client_name: appt.client_name,
        therapist_id: appt.therapist_id || '',
        date: appt.date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        modality: appt.modality,
        status: appt.status,
        notes: appt.notes || '',
      })
      setShowEdit(true)
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing?.id) return
    const res = await fetch(`/api/appointments/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        therapist_id: editing.therapist_id,
        date: editing.date,
        start_time: editing.start_time,
        end_time: editing.end_time,
        modality: editing.modality,
        status: editing.status,
        notes: editing.notes,
      })
    })
    if (res.ok) {
      setShowEdit(false)
      setEditing(null)
      fetchAppointments()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to update appointment')
    }
  }

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().split('T')[0])
  }

  const modalityBorder: Record<string, string> = {
    Physiotherapy: 'border-l-blue-400',
    Hydrotherapy: 'border-l-cyan-400',
    Acupuncture: 'border-l-purple-400',
    HBOT: 'border-l-orange-400',
    Chiropractic: 'border-l-green-400',
    TCM: 'border-l-red-400',
    'Laser Therapy': 'border-l-yellow-400',
    Electrotherapy: 'border-l-indigo-400',
    Assessment: 'border-l-gray-400',
    Consultation: 'border-l-pink-400',
  }
  const modalityBg: Record<string, string> = {
    Physiotherapy: 'bg-blue-50 text-blue-700',
    Hydrotherapy: 'bg-cyan-50 text-cyan-700',
    Acupuncture: 'bg-purple-50 text-purple-700',
    HBOT: 'bg-orange-50 text-orange-700',
    Chiropractic: 'bg-green-50 text-green-700',
    TCM: 'bg-red-50 text-red-700',
    'Laser Therapy': 'bg-yellow-50 text-yellow-700',
    Electrotherapy: 'bg-indigo-50 text-indigo-700',
    Assessment: 'bg-gray-50 text-gray-700',
    Consultation: 'bg-pink-50 text-pink-700',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-400 text-sm">Schedule and manage sessions</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Appointment</button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2.5 w-fit shadow-sm">
        <button onClick={() => shiftDate(-1)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
        <input type="date" className="text-sm font-medium text-gray-700 border-0 outline-none bg-transparent cursor-pointer" value={date} onChange={e => setDate(e.target.value)} />
        <button onClick={() => shiftDate(1)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="text-xs font-medium text-brand-pink hover:text-brand-pink/80 px-2 py-1 rounded-lg hover:bg-pink-50 transition-colors">Today</button>
        <span className="text-xs text-gray-400 ml-1 hidden sm:block">
          {new Date(date + 'T00:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Count */}
      {!loading && appointments.length > 0 && (
        <p className="text-xs text-gray-400 font-medium">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} today</p>
      )}

      {/* Appointments List */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="space-y-0">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="px-4 py-3 border-b border-gray-100 animate-pulse flex gap-4 items-center">
                <div className="w-12 h-8 bg-gray-100 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-64" />
                </div>
                <div className="w-24 h-5 bg-gray-100 rounded" />
                <div className="w-20 h-6 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-300 text-4xl mb-3">📅</p>
            <p className="text-gray-400 text-sm">No appointments scheduled for this day</p>
            <button onClick={openAdd} className="mt-3 text-sm text-brand-pink hover:underline">+ Add one</button>
          </div>
        ) : (
          <div>
            {appointments.map((a, idx) => (
              <div
                key={a.id}
                onClick={() => openEdit(a)}
                className={`flex items-center gap-0 cursor-pointer hover:bg-gray-50/80 transition-colors border-l-4 ${modalityBorder[a.modality] || 'border-l-gray-200'} ${idx !== 0 ? 'border-t border-t-gray-100' : ''}`}
              >
                {/* Time */}
                <div className="w-20 flex-shrink-0 px-3 py-3 text-center border-r border-gray-100">
                  <p className="text-sm font-bold text-gray-800 leading-tight">{a.start_time}</p>
                  <p className="text-xs text-gray-400 leading-tight">{a.end_time}</p>
                </div>

                {/* Patient + Owner + Provider */}
                <div className="flex-1 min-w-0 px-3 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{a.patient_name}</span>
                    <span className="text-xs text-gray-400">({a.species}{a.breed ? ` · ${a.breed}` : ''})</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.client_name} · <span className="font-mono">{a.client_phone}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400">Provider:</span>
                    <span className="text-xs text-gray-600 font-medium">{a.therapist_name || 'Unassigned'}</span>
                    {a.therapist_role && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleBadge[a.therapist_role] || 'badge-gray'}`}>{roleLabel[a.therapist_role] || a.therapist_role}</span>}
                  </div>
                </div>

                {/* Modality */}
                <div className="px-3 py-3 hidden sm:block">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${modalityBg[a.modality] || 'bg-gray-50 text-gray-700'}`}>
                    {a.modality}
                  </span>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-2 px-3 py-3" onClick={e => e.stopPropagation()}>
                  <ApptStatusBadge status={a.status} />
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 cursor-pointer hover:border-gray-300 outline-none"
                    value={a.status}
                    onChange={e => updateStatus(a.id, e.target.value)}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Appointment" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Patient *</label>
            <select className="input" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} required>
              <option value="">Select patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species} - {p.client_name})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Provider</label>
            <select className="input" value={form.therapist_id} onChange={e => setForm({...form, therapist_id: e.target.value})}>
              <option value="">Select provider...</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({roleLabel[s.role] || s.role})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <DatePicker label="Date *" value={form.date} onChange={date => setForm({...form, date})} />
            <TimePicker label="Start Time *" value={form.start_time} onChange={time => setForm({...form, start_time: time})} />
            <TimePicker label="End Time *" value={form.end_time} onChange={time => setForm({...form, end_time: time})} minTime={form.start_time} />
          </div>
          <div>
            <label className="label">Treatment Type *</label>
            <select className="input" value={form.modality} onChange={e => setForm({...form, modality: e.target.value})} required>
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
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Book Appointment</button>
          </div>
        </form>
      </Modal>

      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditing(null) }} title="Edit Appointment" size="lg">
        {editing && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <strong>{editing.patient_name}</strong> · {editing.client_name}
            </div>
            <div>
              <label className="label">Provider</label>
              <select className="input" value={editing.therapist_id} onChange={e => setEditing({ ...editing, therapist_id: e.target.value })}>
                <option value="">Select provider...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({roleLabel[s.role] || s.role})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <DatePicker label="Date *" value={editing.date} onChange={date => setEditing({ ...editing, date })} />
              <TimePicker label="Start Time *" value={editing.start_time} onChange={time => setEditing({ ...editing, start_time: time })} />
              <TimePicker label="End Time *" value={editing.end_time} onChange={time => setEditing({ ...editing, end_time: time })} minTime={editing.start_time} />
            </div>
            <div>
              <label className="label">Treatment Type *</label>
              <select className="input" value={editing.modality} onChange={e => setEditing({ ...editing, modality: e.target.value })} required>
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
            <div>
              <label className="label">Status</label>
              <select className="input" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowEdit(false); setEditing(null) }} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function ApptStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { scheduled: 'badge-blue', confirmed: 'badge-green', in_progress: 'badge-yellow', completed: 'badge-gray', cancelled: 'badge-red', no_show: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status.replace('_', ' ')}</span>
}
