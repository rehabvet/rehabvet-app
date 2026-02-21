'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Search, ChevronDown, Eye, CheckCircle, Calendar, Trash2, X, Phone, Mail, PawPrint, Megaphone } from 'lucide-react'
import Modal from '@/components/Modal'

interface Lead {
  id: string
  owner_name: string; owner_email: string; owner_phone: string; how_heard: string | null
  pet_name: string; species: string; breed: string | null; age: string | null
  service: string | null; condition: string | null; preferred_date: string | null
  first_visit: boolean; notes: string | null; status: string; staff_notes: string | null
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:        { label: 'New',       color: 'text-blue-700',   bg: 'bg-blue-100' },
  contacted:  { label: 'Contacted', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  scheduled:  { label: 'Scheduled', color: 'text-purple-700', bg: 'bg-purple-100' },
  converted:  { label: 'Converted', color: 'text-green-700',  bg: 'bg-green-100' },
  lost:       { label: 'Lost',      color: 'text-gray-500',   bg: 'bg-gray-100' },
}

const SERVICE_LABELS: Record<string, string> = {
  rehabilitation: 'Vet Rehabilitation', physiotherapy: 'Physiotherapy',
  hydrotherapy: 'Hydrotherapy', hyperbaric: 'Hyperbaric Oxygen',
  tcm: 'TCM', acupuncture: 'Acupuncture', unsure: "Not Sure",
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewLead, setViewLead] = useState<Lead | null>(null)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [convertDate, setConvertDate] = useState('')
  const [converting, setConverting] = useState(false)
  const [staffNote, setStaffNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/leads?${params}`)
    const data = await res.json()
    setLeads(data.leads || [])
    setStatusCounts(data.statusCounts || {})
    setLoading(false)
  }, [search, filterStatus])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    fetchLeads()
    if (viewLead?.id === id) setViewLead(l => l ? { ...l, status } : null)
  }

  async function saveNote() {
    if (!viewLead) return
    setSavingNote(true)
    await fetch(`/api/leads/${viewLead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_notes: staffNote }) })
    setSavingNote(false)
    fetchLeads()
  }

  async function doConvert() {
    if (!convertLead) return
    setConverting(true)
    await fetch(`/api/leads/${convertLead.id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_date: convertDate || undefined })
    })
    setConvertLead(null)
    setConverting(false)
    fetchLeads()
  }

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead?')) return
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    setViewLead(null)
    fetchLeads()
  }

  const totalLeads = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalLeads} total enquiries via app.rehabvet.com/appointment</p>
        </div>
        <a href="/appointment" target="_blank"
          className="btn-secondary flex items-center gap-2 text-sm">
          <Megaphone className="w-4 h-4" /> View Booking Page ↗
        </a>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-sm ${filterStatus === key ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'}`}>
            <p className="text-2xl font-bold text-gray-900">{statusCounts[key] || 0}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 w-full" placeholder="Search by name, email or pet..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="relative">
          <select className="input appearance-none pr-8 min-w-[140px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No leads yet — share app.rehabvet.com/appointment to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Preferred Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(lead => {
                  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.owner_name}</p>
                        <p className="text-xs text-gray-400">{lead.owner_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.pet_name}</p>
                        <p className="text-xs text-gray-400">{lead.species}{lead.breed ? ` · ${lead.breed}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{SERVICE_LABELS[lead.service || ''] || lead.service || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{lead.preferred_date || '—'}</td>
                      <td className="px-4 py-3">
                        <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${sc.bg} ${sc.color}`}>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(lead.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setViewLead(lead); setStaffNote(lead.staff_notes || '') }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          {lead.status !== 'converted' && (
                            <button onClick={() => setConvertLead(lead)} className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors" title="Convert to appointment">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => deleteLead(lead.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Lead Modal */}
      <Modal open={!!viewLead} onClose={() => setViewLead(null)} title="Lead Details">
        {viewLead && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Owner</p>
                <p className="font-semibold text-gray-900">{viewLead.owner_name}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" />{viewLead.owner_email}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{viewLead.owner_phone}</p>
                {viewLead.how_heard && <p className="text-xs text-gray-400">Via: {viewLead.how_heard}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><PawPrint className="w-3.5 h-3.5" /> Pet</p>
                <p className="font-semibold text-gray-900">{viewLead.pet_name}</p>
                <p className="text-sm text-gray-600">{viewLead.species}{viewLead.breed ? ` · ${viewLead.breed}` : ''}</p>
                {viewLead.age && <p className="text-xs text-gray-500">Age: {viewLead.age}</p>}
                {viewLead.weight && <p className="text-xs text-gray-500">Weight: {viewLead.weight}</p>}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Visit Request</p>
              <p className="text-sm text-gray-700"><span className="font-medium">Service:</span> {SERVICE_LABELS[viewLead.service || ''] || viewLead.service || '—'}</p>
              {viewLead.preferred_date && <p className="text-sm text-gray-700"><span className="font-medium">Preferred date:</span> {viewLead.preferred_date}</p>}
              <p className="text-sm text-gray-700"><span className="font-medium">First visit:</span> {viewLead.first_visit ? 'Yes' : 'No'}</p>
              {viewLead.condition && <div><p className="text-sm font-medium text-gray-700 mb-1">Condition / Notes:</p><p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">{viewLead.condition}</p></div>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Status</p>
              </div>
              <select value={viewLead.status} onChange={e => updateStatus(viewLead.id, e.target.value)} className="input w-full">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Staff Notes</p>
              <textarea rows={3} className="input w-full resize-none" placeholder="Internal notes..." value={staffNote} onChange={e => setStaffNote(e.target.value)} />
              <button onClick={saveNote} disabled={savingNote} className="mt-2 btn-secondary text-sm">{savingNote ? 'Saving...' : 'Save Note'}</button>
            </div>

            <div className="flex gap-2 pt-2">
              {viewLead.status !== 'converted' && (
                <button onClick={() => { setConvertLead(viewLead); setViewLead(null) }} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  <CheckCircle className="w-4 h-4" /> Convert to Appointment
                </button>
              )}
              <button onClick={() => deleteLead(viewLead.id)} className="btn-secondary text-red-500 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Convert Modal */}
      <Modal open={!!convertLead} onClose={() => setConvertLead(null)} title="Convert to Appointment">
        {convertLead && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-900">{convertLead.owner_name} — {convertLead.pet_name}</p>
              <p className="text-sm text-gray-500">{convertLead.owner_email} · {convertLead.owner_phone}</p>
            </div>
            <p className="text-sm text-gray-600">This will create a <strong>Client</strong>, <strong>Patient</strong>, and (optionally) an <strong>Appointment</strong> in the system.</p>
            <div>
              <label className="label">Appointment Date (optional)</label>
              <input type="datetime-local" className="input w-full" value={convertDate} onChange={e => setConvertDate(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Leave blank to just create the client & patient records</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConvertLead(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={doConvert} disabled={converting} className="btn-primary flex-[2] flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> {converting ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
