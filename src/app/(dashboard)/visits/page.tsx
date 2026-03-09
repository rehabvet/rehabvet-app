'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ClipboardList, PawPrint, User, Plus, X } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function VisitsPage() {
  const router = useRouter()
  const [visits, setVisits]   = useState<any[]>([])
  const [total,  setTotal]    = useState(0)
  const [page,   setPage]     = useState(1)
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 25

  // New visit modal
  const [showModal, setShowModal]     = useState(false)
  const [creating, setCreating]       = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients]       = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [staff, setStaff]             = useState<any[]>([])
  const [newForm, setNewForm]         = useState({ staff_id: '', visit_date: new Date().toISOString().split('T')[0] })
  const patientRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { load() }, [page, search])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/visits?${params}`)
    const data = await res.json()
    setVisits(data.visits || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  function openModal() {
    setSelectedPatient(null)
    setPatientSearch('')
    setPatients([])
    setNewForm({ staff_id: '', visit_date: new Date().toISOString().split('T')[0] })
    setShowModal(true)
    fetch('/api/staff').then(r => r.json()).then(d => setStaff(d.staff || []))
  }

  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2) { setPatients([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=10`)
      const data = await res.json()
      setPatients(data.patients || [])
    }, 300)
    return () => clearTimeout(t)
  }, [patientSearch])

  async function createVisit() {
    if (!selectedPatient || !newForm.visit_date) return
    setCreating(true)
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedPatient.client_id,
        patient_id: selectedPatient.id,
        staff_id: newForm.staff_id || null,
        visit_date: newForm.visit_date,
      }),
    })
    const data = await res.json()
    setCreating(false)
    setShowModal(false)
    if (data.visit?.id) router.push(`/visits/${data.visit.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-pink" /> Visit Records
          </h1>
          <p className="text-gray-500 text-sm">{total > 0 ? `${total} visits recorded` : 'Clinical notes per appointment'}</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Visit
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search by patient or client name…" className="input pl-10"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : visits.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No visits recorded yet</p>
            <button onClick={openModal} className="btn-primary mt-4 flex items-center gap-2 mx-auto"><Plus className="w-4 h-4" /> Create First Visit</button>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visits.map(v => (
                <tr key={v.id} onClick={() => router.push(`/visits/${v.id}`)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-400 whitespace-nowrap hidden sm:table-cell">{v.visit_number || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5"><PawPrint className="w-3.5 h-3.5 text-brand-pink flex-shrink-0" />{v.patient_name || '—'}</span></td>
                  <td className="px-4 py-3 text-gray-600"><span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{v.client_name || '—'}</span></td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{v.staff_name ? <span className="badge-gray">{v.staff_name}</span> : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell max-w-[260px] truncate">{v.clinical_examination?.slice(0, 80) || v.history?.slice(0, 80) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={p => setPage(p)} />
      </div>

      {/* New Visit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Visit Record</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Patient search */}
            <div>
              <label className="text-sm font-medium text-gray-700">Patient *</label>
              {selectedPatient ? (
                <div className="mt-1.5 flex items-center justify-between bg-brand-pink/5 border border-brand-pink/20 rounded-xl px-3 py-2">
                  <div>
                    <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                    <p className="text-xs text-gray-500">{selectedPatient.species} · {selectedPatient.breed || 'Unknown'} · {selectedPatient.client_name}</p>
                  </div>
                  <button onClick={() => { setSelectedPatient(null); setPatientSearch('') }} className="text-gray-400 hover:text-gray-600 ml-2"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="relative mt-1.5" ref={patientRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="input pl-9 w-full"
                    placeholder="Search patient name…"
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    autoFocus
                  />
                  {patients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {patients.map((p: any) => (
                        <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(''); setPatients([]) }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2">
                          <PawPrint className="w-3.5 h-3.5 text-brand-pink flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.species} · {p.breed || '—'} · {p.client_name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-medium text-gray-700">Visit Date *</label>
              <input type="date" className="input w-full mt-1.5" value={newForm.visit_date} onChange={e => setNewForm({ ...newForm, visit_date: e.target.value })} />
            </div>

            {/* Staff */}
            <div>
              <label className="text-sm font-medium text-gray-700">Staff</label>
              <select className="input w-full mt-1.5" value={newForm.staff_id} onChange={e => setNewForm({ ...newForm, staff_id: e.target.value })}>
                <option value="">— Select staff —</option>
                {staff.map((s: any) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={createVisit} disabled={creating || !selectedPatient || !newForm.visit_date} className="btn-primary flex-1">
                {creating ? 'Creating…' : 'Create Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
