'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, ChevronLeft, ChevronRight, X, Trash2, AlertTriangle, ClipboardList } from 'lucide-react'
import { useRouter } from 'next/navigation'
import BillingModal from '@/components/BillingModal'
import Modal from '@/components/Modal'
import DatePicker from '@/components/DatePicker'
import TimePicker from '@/components/TimePicker'

function formatDuration(mins: number) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60), m = mins % 60
    return m === 0 ? `${h}h` : `${h}h ${m}min`
  }
  return `${mins}min`
}

const roleLabel: Record<string, string> = {
  veterinarian: 'Vet', senior_therapist: 'Sr Therapist',
  assistant_therapist: 'Asst Therapist', hydrotherapist: 'Hydrotherapist',
  vet: 'Vet', therapist: 'Therapist', office_manager: 'Office Manager',
  administrator: 'Admin', marketing: 'Marketing',
}
const roleBadge: Record<string, string> = {
  veterinarian: 'badge-green', senior_therapist: 'badge-blue',
  assistant_therapist: 'badge-gray', hydrotherapist: 'badge-purple',
  vet: 'badge-green', therapist: 'badge-blue',
}
const statusBadge: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-green-50 text-green-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-500',
  no_show: 'bg-red-50 text-red-500',
}
const modalityBorder: Record<string, string> = {
  Physiotherapy: 'border-l-blue-400', Hydrotherapy: 'border-l-cyan-400',
  Acupuncture: 'border-l-purple-400', HBOT: 'border-l-orange-400',
  Chiropractic: 'border-l-green-400', TCM: 'border-l-red-400',
  'Laser Therapy': 'border-l-yellow-400', Assessment: 'border-l-gray-400',
}
const modalityBg: Record<string, string> = {
  Physiotherapy: 'bg-blue-50 text-blue-700', Hydrotherapy: 'bg-cyan-50 text-cyan-700',
  Acupuncture: 'bg-purple-50 text-purple-700', HBOT: 'bg-orange-50 text-orange-700',
  Chiropractic: 'bg-green-50 text-green-700', TCM: 'bg-red-50 text-red-700',
  'Laser Therapy': 'bg-yellow-50 text-yellow-700', Assessment: 'bg-gray-50 text-gray-700',
}

export default function AppointmentsPage() {
  const router = useRouter()
  // ── List state ──────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<any[]>([])
  const [total, setTotal]               = useState(0)
  const [totalPages, setTotalPages]     = useState(1)
  const [loading, setLoading]           = useState(true)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [q, setQ]           = useState('')
  const [qInput, setQInput] = useState('')          // debounced
  const [status, setStatus] = useState('all')
  const [dateFilter, setDateFilter] = useState('')  // single date filter
  const [page, setPage]     = useState(1)
  const PER_PAGE = 20
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [showAdd,         setShowAdd]         = useState(false)
  const [showEdit,        setShowEdit]        = useState(false)
  const [editing,         setEditing]         = useState<any>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [apptTab,         setApptTab]         = useState<'visit'|'billing'>('visit')
  const [apptVisit,       setApptVisit]       = useState<any>(null)
  const [apptInvoice,     setApptInvoice]     = useState<any>(null)
  const [apptLineItems,   setApptLineItems]   = useState<any[]>([])
  const [showBillingModal,setShowBillingModal]= useState(false)
  const [deleting,        setDeleting]        = useState(false)

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const [patients,         setPatients]         = useState<any[]>([])
  const [clients,          setClients]          = useState<any[]>([])
  const [staff,            setStaff]            = useState<any[]>([])
  const [treatmentGrouped, setTreatmentGrouped] = useState<Record<string, any[]>>({})

  const [form, setForm] = useState({
    patient_id: '', client_id: '', therapist_id: '',
    date: '', start_time: '09:00', end_time: '10:00', modality: '', notes: '',
  })
  // client/patient search state for Add modal
  const [clientSearch,   setClientSearch]   = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clientPatients, setClientPatients] = useState<any[]>([])
  const [patientSearch,  setPatientSearch]  = useState('')

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchAppts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) })
    if (q)          params.set('q', q)
    if (status !== 'all') params.set('status', status)
    if (dateFilter) params.set('date', dateFilter)
    const res  = await fetch(`/api/appointments?${params}`)
    const data = await res.json()
    setAppointments(data.appointments || [])
    setTotal(data.total || 0)
    setTotalPages(data.total_pages || 1)
    setLoading(false)
  }, [q, status, dateFilter, page])

  useEffect(() => { fetchAppts() }, [fetchAppts])

  // load treatment types once
  useEffect(() => {
    fetch('/api/treatment-types').then(r => r.json()).then(d => setTreatmentGrouped(d.grouped || {}))
    fetch('/api/patients?per_page=999').then(r => r.json()).then(d => setPatients(d.patients || []))
    fetch('/api/clients?per_page=999').then(r => r.json()).then(d => setClients(d.clients || []))
    fetch('/api/staff').then(r => r.json()).then(d =>
      setStaff((d.staff || []).filter((s: any) =>
        ['vet','therapist','veterinarian','senior_therapist','assistant_therapist','hydrotherapist'].includes(s.role)
      ))
    )
  }, [])

  // Debounce search input
  function handleSearch(val: string) {
    setQInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setQ(val); setPage(1) }, 400)
  }

  // ── Client select for Add modal ───────────────────────────────────────────────
  function selectClient(c: any) {
    setSelectedClient(c)
    setClientSearch('')
    const pets = patients.filter((p: any) => p.client_id === c.id)
    setClientPatients(pets)
    if (pets.length === 1) {
      setForm(f => ({ ...f, client_id: c.id, patient_id: pets[0].id }))
    } else {
      setForm(f => ({ ...f, client_id: c.id, patient_id: '' }))
    }
  }

  function resetAddModal() {
    setShowAdd(false)
    setSelectedClient(null); setClientSearch(''); setClientPatients([])
    setForm({ patient_id: '', client_id: '', therapist_id: '', date: '', start_time: '09:00', end_time: '10:00', modality: '', notes: '' })
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/appointments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { resetAddModal(); fetchAppts() }
    else { const err = await res.json(); alert(err.error) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing?.id) return
    const res = await fetch(`/api/appointments/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        therapist_id: editing.therapist_id, date: editing.date,
        start_time: editing.start_time, end_time: editing.end_time,
        modality: editing.modality, status: editing.status, notes: editing.notes,
      }),
    })
    if (res.ok) { setShowEdit(false); setEditing(null); fetchAppts() }
    else { const err = await res.json(); alert(err.error || 'Failed to update') }
  }

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchAppts()
  }

  async function deleteAppt() {
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
      // Close edit modal too if it was open for this appointment
      if (editing?.id === confirmDeleteId) { setShowEdit(false); setEditing(null) }
      fetchAppts()
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(appt: any) {
    setApptTab('visit')
    setApptVisit(null)
    setApptInvoice(null)
    setApptLineItems([])
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
    setEditing({
      id: appt.id, patient_name: appt.patient_name, client_name: appt.client_name,
      therapist_id: appt.therapist_id || '', date: appt.date,
      start_time: appt.start_time, end_time: appt.end_time,
      modality: appt.modality, status: appt.status, notes: appt.notes || '',
    })
    setShowEdit(true)
  }

  // ── Formatted date label ──────────────────────────────────────────────────────
  function fmtApptDate(d: string) {
    const dt = new Date(d + 'T00:00')
    const today = new Date(); today.setHours(0,0,0,0)
    const diff = Math.round((dt.getTime() - today.getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff === -1) return 'Yesterday'
    return dt.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-400 text-sm">{total > 0 ? `${total} appointment${total !== 1 ? 's' : ''}` : 'No appointments found'}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> New Appointment
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient, client, therapist..."
            value={qInput}
            onChange={e => handleSearch(e.target.value)}
            className="input pl-9 pr-8"
          />
          {qInput && (
            <button onClick={() => { setQInput(''); setQ(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date filter */}
        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1) }}
            className="input pr-8 text-sm text-gray-600"
          />
          {dateFilter && (
            <button onClick={() => { setDateFilter(''); setPage(1) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="input text-sm w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto shadow-sm">
        {loading ? (
          <div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-5 py-3.5 border-b border-gray-100 animate-pulse flex gap-4 items-center">
                <div className="w-14 h-9 bg-gray-100 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
                <div className="w-24 h-5 bg-gray-100 rounded-full" />
                <div className="w-20 h-6 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-gray-400 text-sm font-medium">No appointments found</p>
            {(q || status !== 'all' || dateFilter) && (
              <button onClick={() => { setQ(''); setQInput(''); setStatus('all'); setDateFilter(''); setPage(1) }}
                className="mt-2 text-sm text-brand-pink hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Time</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Treatment</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Provider</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map(a => (
                <tr key={a.id} onClick={() => openEdit(a)}
                  className={`cursor-pointer hover:bg-gray-50/80 transition-colors border-l-4 ${modalityBorder[a.modality] || 'border-l-gray-200'}`}>

                  {/* Date */}
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-800 leading-tight text-xs">{fmtApptDate(a.date)}</p>
                    <p className="text-[11px] text-gray-400 leading-tight">
                      {new Date(a.date + 'T00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </td>

                  {/* Time */}
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-gray-800 leading-tight tabular-nums">{a.start_time?.slice(0,5)}</p>
                    <p className="text-xs text-gray-400 leading-tight tabular-nums">{a.end_time?.slice(0,5)}</p>
                  </td>

                  {/* Patient + Client */}
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{a.patient_name}</p>
                    <p className="text-xs text-gray-500">{a.client_name}
                      {a.client_phone && (
                        <span onClick={e => e.stopPropagation()} className="ml-2">
                          <a href={`tel:${a.client_phone.replace(/\s/g,'')}`}
                            className="text-brand-pink hover:underline">{a.client_phone}</a>
                        </span>
                      )}
                    </p>
                  </td>

                  {/* Treatment */}
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${modalityBg[a.modality] || 'bg-gray-50 text-gray-600'}`}>
                      {a.modality || '—'}
                    </span>
                  </td>

                  {/* Provider */}
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {a.therapist_name
                      ? <><p className="text-gray-800 font-medium text-xs">{a.therapist_name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge[a.therapist_role] || 'badge-gray'}`}>
                            {roleLabel[a.therapist_role] || a.therapist_role}
                          </span></>
                      : <span className="text-gray-300 text-xs">Unassigned</span>}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <select
                      value={a.status}
                      onChange={e => updateStatus(a.id, e.target.value)}
                      className={`text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer hover:border-gray-300 outline-none font-medium ${statusBadge[a.status] || ''}`}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </td>

                  {/* Delete */}
                  <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmDeleteId(a.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete appointment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${pg === page ? 'bg-brand-pink text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                  {pg}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Add Appointment Modal ── */}
      <Modal open={showAdd} onClose={resetAddModal} title="New Appointment" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">

          {/* Provider */}
          <div>
            <label className="label">Provider</label>
            <select className="input" value={form.therapist_id} onChange={e => setForm({...form, therapist_id: e.target.value})}>
              <option value="">Select provider...</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name} · {roleLabel[s.role] || s.role}</option>)}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-3 gap-4">
            <DatePicker label="Date *" value={form.date} onChange={d => setForm({...form, date: d})} />
            <TimePicker label="Start *" value={form.start_time} onChange={t => {
              const [h, m] = t.split(':').map(Number)
              const end = `${String(Math.floor((h*60+m+60)/60)).padStart(2,'0')}:${String((h*60+m+60)%60).padStart(2,'0')}`
              setForm({...form, start_time: t, end_time: end})
            }} />
            <TimePicker label="End *" value={form.end_time} onChange={t => setForm({...form, end_time: t})} minTime={form.start_time} />
          </div>

          {/* Client search */}
          <div className="relative">
            <label className="label">Client *</label>
            {selectedClient ? (
              <div className="input flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-900">{selectedClient.name}
                  {selectedClient.phone && <span className="text-gray-400 font-normal ml-2 text-xs">{selectedClient.phone}</span>}
                </span>
                <button type="button" onClick={() => { setSelectedClient(null); setClientPatients([]); setForm(f => ({...f, client_id: '', patient_id: ''})); setClientSearch('') }}
                  className="text-gray-400 hover:text-red-400 text-xs flex-shrink-0 ml-2">✕ Change</button>
              </div>
            ) : (
              <>
                <input className="input" placeholder="Search client name or phone..."
                  value={clientSearch} onChange={e => setClientSearch(e.target.value)} autoComplete="off" />
                {clientSearch.length >= 1 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {clients.filter((c: any) =>
                      c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                      c.phone?.includes(clientSearch)
                    ).slice(0,10).map((c: any) => (
                      <button key={c.id} type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        onClick={() => selectClient(c)}>
                        <span className="font-semibold text-sm">{c.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{c.phone}</span>
                      </button>
                    ))}
                    {clients.filter((c: any) => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-400">No clients found</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Patient */}
          {selectedClient && (
            <div>
              <label className="label">Patient *</label>
              {clientPatients.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No pets on record for this client</p>
              ) : clientPatients.length === 1 ? (
                <div className="input bg-gray-50 text-sm font-semibold text-gray-900">
                  {clientPatients[0].name}
                  <span className="text-gray-400 font-normal ml-2">· {clientPatients[0].breed || clientPatients[0].species}</span>
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Auto-selected</span>
                </div>
              ) : (
                <select className="input" value={form.patient_id}
                  onChange={e => setForm({...form, patient_id: e.target.value})} required>
                  <option value="">Select pet...</option>
                  {clientPatients.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.breed || p.species})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Treatment type */}
          <div>
            <label className="label">Treatment Type *</label>
            <select className="input" value={form.modality}
              onChange={e => {
                const [sh, sm] = form.start_time.split(':').map(Number)
                const found = Object.values(treatmentGrouped).flat().find((t: any) => t.name === e.target.value) as any
                const dur = found?.duration || 60
                const endTotal = sh*60+sm+dur
                setForm({...form, modality: e.target.value,
                  end_time: `${String(Math.floor(endTotal/60)).padStart(2,'0')}:${String(endTotal%60).padStart(2,'0')}`})
              }} required>
              <option value="">Select treatment...</option>
              {Object.entries(treatmentGrouped).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {(items as any[]).map(t => <option key={t.name} value={t.name}>{t.name} ({formatDuration(t.duration)})</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional..." />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={resetAddModal} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!form.patient_id || !form.date || !form.modality}>
              Book Appointment
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Appointment Modal ── */}
      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditing(null); setApptVisit(null); setApptInvoice(null) }} title="Edit Appointment" size="lg">
        {editing && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <strong>{editing.patient_name}</strong> · <span className="text-gray-500">{editing.client_name}</span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 -mx-1">
              {(['visit', 'billing'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setApptTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${apptTab === tab ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
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
                      <button type="button" onClick={() => { setShowEdit(false); router.push(`/visits/${apptVisit.id}`) }}
                        className="text-xs text-brand-pink font-medium hover:underline">Open Full Record →</button>
                    </div>
                    {(apptVisit.weight_kg || apptVisit.temperature_c || apptVisit.heart_rate_bpm) && (
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600 pt-1">
                        {apptVisit.weight_kg      && <span>⚖️ {apptVisit.weight_kg} kg</span>}
                        {apptVisit.temperature_c  && <span>🌡️ {apptVisit.temperature_c}°C</span>}
                        {apptVisit.heart_rate_bpm && <span>❤️ {apptVisit.heart_rate_bpm} bpm</span>}
                      </div>
                    )}
                    {apptVisit.clinical_examination && (
                      <p className="text-xs text-gray-500 line-clamp-2">{apptVisit.clinical_examination}</p>
                    )}
                    {apptVisit.staff_name && <p className="text-xs text-gray-400">by {apptVisit.staff_name}</p>}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-400 mb-3">No visit record for this appointment yet.</p>
                    <button type="button"
                      onClick={async () => {
                        const res = await fetch('/api/visits', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            appointment_id: editing.id,
                            client_id: editing.client_id,
                            patient_id: editing.patient_id,
                            staff_id: editing.therapist_id,
                            visit_date: editing.date,
                          }),
                        })
                        const data = await res.json()
                        if (data.visit?.id) { setShowEdit(false); router.push(`/visits/${data.visit.id}`) }
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
                {!apptInvoice && <p className="text-sm text-gray-400 text-center py-2">No bill created yet.</p>}
                <button type="button" onClick={() => setShowBillingModal(true)} className="btn-primary w-full text-sm">
                  {apptInvoice ? 'Edit Bill' : '+ Create Bill'}
                </button>
              </div>
            )}

            <div>
              <label className="label">Provider</label>
              <select className="input" value={editing.therapist_id} onChange={e => setEditing({...editing, therapist_id: e.target.value})}>
                <option value="">Unassigned</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name} · {roleLabel[s.role] || s.role}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <DatePicker label="Date *" value={editing.date} onChange={d => setEditing({...editing, date: d})} />
              <TimePicker label="Start *" value={editing.start_time} onChange={t => setEditing({...editing, start_time: t})} />
              <TimePicker label="End *" value={editing.end_time} onChange={t => setEditing({...editing, end_time: t})} minTime={editing.start_time} />
            </div>

            <div>
              <label className="label">Treatment Type *</label>
              <select className="input" value={editing.modality} onChange={e => setEditing({...editing, modality: e.target.value})} required>
                <option value="">Select treatment...</option>
                {Object.entries(treatmentGrouped).map(([cat, items]) => (
                  <optgroup key={cat} label={cat}>
                    {(items as any[]).map(t => <option key={t.name} value={t.name}>{t.name} ({formatDuration(t.duration)})</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select className="input" value={editing.status} onChange={e => setEditing({...editing, status: e.target.value})}>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={editing.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} />
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => { setShowEdit(false); setEditing(null); setConfirmDeleteId(editing?.id ?? null) }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </div>
          </form>
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
              onClick={deleteAppt}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Billing Modal */}
      {editing && (
        <BillingModal
          open={showBillingModal}
          onClose={() => setShowBillingModal(false)}
          visitId={apptVisit?.id || null}
          clientId={editing.client_id}
          patientId={editing.patient_id}
          existingInvoice={apptInvoice}
          existingLineItems={apptLineItems}
          onSaved={async (invoiceId) => {
            if (apptVisit) {
              const inv = await fetch(`/api/visits/${apptVisit.id}/invoice`).then(r => r.json())
              if (inv.invoice) { setApptInvoice(inv.invoice); setApptLineItems(inv.line_items || []) }
            }
            setShowEdit(false)
            router.push(`/billing/${invoiceId}`)
          }}
        />
      )}
    </div>
  )
}
