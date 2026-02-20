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
  const [appointments, setAppointments] = useState<any[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showAdd, setShowAdd] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [treatmentGrouped, setTreatmentGrouped] = useState<Record<string, any[]>>({})
  const [form, setForm] = useState({ patient_id: '', client_id: '', therapist_id: '', date: '', start_time: '09:00', end_time: '09:45', modality: '', notes: '' })
  const [loading, setLoading] = useState(true)

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
      setStaff((s.staff || []).filter((st: any) => ['vet', 'therapist'].includes(st.role)))
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

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().split('T')[0])
  }

  const modalityColor: Record<string, string> = {
    Physiotherapy: 'bg-blue-100 text-blue-800',
    Hydrotherapy: 'bg-cyan-100 text-cyan-800',
    Acupuncture: 'bg-purple-100 text-purple-800',
    HBOT: 'bg-orange-100 text-orange-800',
    Chiropractic: 'bg-green-100 text-green-800',
    TCM: 'bg-red-100 text-red-800',
    'Laser Therapy': 'bg-yellow-100 text-yellow-800',
    Electrotherapy: 'bg-indigo-100 text-indigo-800',
    Assessment: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm">Schedule and manage sessions</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Appointment</button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center gap-4">
        <button onClick={() => shiftDate(-1)} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
        <input type="date" className="input max-w-[200px]" value={date} onChange={e => setDate(e.target.value)} />
        <button onClick={() => shiftDate(1)} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="btn-secondary text-sm">Today</button>
        <span className="text-sm text-gray-500">{new Date(date + 'T00:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* Appointments List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : appointments.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No appointments for this date</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map(a => (
              <div key={a.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="text-center min-w-[80px]">
                  <p className="text-sm font-bold text-gray-900">{a.start_time}</p>
                  <p className="text-xs text-gray-400">{a.end_time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.patient_name} <span className="text-gray-400">({a.species}{a.breed ? ` · ${a.breed}` : ''})</span></p>
                  <p className="text-xs text-gray-500">Owner: {a.client_name} · {a.client_phone}</p>
                  <p className="text-xs text-gray-500">Provider: {a.therapist_name || 'Unassigned'}</p>
                </div>
                <span className={`badge ${modalityColor[a.modality] || 'bg-gray-100 text-gray-800'}`}>{a.modality}</span>
                <div className="flex items-center gap-2">
                  <ApptStatusBadge status={a.status} />
                  <select
                    className="input text-xs py-1 w-auto"
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
              {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
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
    </div>
  )
}

function ApptStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { scheduled: 'badge-blue', confirmed: 'badge-green', in_progress: 'badge-yellow', completed: 'badge-gray', cancelled: 'badge-red', no_show: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status.replace('_', ' ')}</span>
}
