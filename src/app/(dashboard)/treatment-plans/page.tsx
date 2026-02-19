'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Filter } from 'lucide-react'
import Modal from '@/components/Modal'

const MODALITIES = ['Physiotherapy', 'Hydrotherapy', 'Acupuncture', 'HBOT', 'Chiropractic', 'TCM', 'Laser Therapy', 'Electrotherapy']

export default function TreatmentPlansPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [form, setForm] = useState({
    patient_id: '', title: '', diagnosis: '', goals: '', modalities: [] as string[],
    frequency: '', total_sessions: '', start_date: '', notes: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchPlans() }, [statusFilter])

  async function fetchPlans() {
    setLoading(true)
    const q = statusFilter ? `?status=${statusFilter}` : ''
    const data = await fetch(`/api/treatment-plans${q}`).then(r => r.json())
    setPlans(data.plans || [])
    setLoading(false)
  }

  function openAdd() {
    fetch('/api/patients').then(r => r.json()).then(d => {
      setPatients(d.patients || [])
      setShowAdd(true)
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/treatment-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, total_sessions: form.total_sessions ? parseInt(form.total_sessions) : null })
    })
    setShowAdd(false)
    fetchPlans()
  }

  function toggleModality(m: string) {
    setForm(f => ({
      ...f,
      modalities: f.modalities.includes(m) ? f.modalities.filter(x => x !== m) : [...f.modalities, m]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Plans</h1>
          <p className="text-gray-500 text-sm">Multi-session rehabilitation programs</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Plan</button>
      </div>

      <div className="flex gap-2">
        {['', 'active', 'pending_approval', 'draft', 'completed', 'discontinued'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${statusFilter === s ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
      ) : plans.length === 0 ? (
        <div className="card text-center text-gray-400 py-8">No treatment plans found</div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <Link key={plan.id} href={`/treatment-plans/${plan.id}`} className="card block hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                    <PlanStatusBadge status={plan.status} />
                  </div>
                  <p className="text-sm text-gray-500">{plan.patient_name} ({plan.species}{plan.breed ? ` · ${plan.breed}` : ''}) · {plan.client_name}</p>
                  {plan.diagnosis && <p className="text-sm text-gray-600 mt-1">{plan.diagnosis}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {plan.modalities && JSON.parse(plan.modalities).map((m: string) => (
                      <span key={m} className="badge-purple">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-900">{plan.completed_sessions}<span className="text-sm text-gray-400">/{plan.total_sessions || '∞'}</span></p>
                  <p className="text-xs text-gray-400">sessions</p>
                  {plan.total_sessions && (
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-2">
                      <div className="h-1.5 rounded-full bg-brand-pink transition-all" style={{ width: `${Math.min(100, plan.completed_sessions / plan.total_sessions * 100)}%` }} />
                    </div>
                  )}
                  {plan.frequency && <p className="text-xs text-gray-400 mt-1">{plan.frequency}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Treatment Plan" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Patient *</label>
            <select className="input" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} required>
              <option value="">Select patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species} - {p.client_name})</option>)}
            </select>
          </div>
          <div><label className="label">Plan Title *</label><input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Post-ACL Rehabilitation" /></div>
          <div><label className="label">Diagnosis</label><textarea className="input" rows={2} value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} /></div>
          <div><label className="label">Goals</label><textarea className="input" rows={2} value={form.goals} onChange={e => setForm({...form, goals: e.target.value})} /></div>
          <div>
            <label className="label">Modalities</label>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map(m => (
                <button key={m} type="button" onClick={() => toggleModality(m)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${form.modalities.includes(m) ? 'bg-brand-pink text-white border-brand-pink' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-pink'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Frequency</label><input className="input" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} placeholder="e.g. 2x per week" /></div>
            <div><label className="label">Total Sessions</label><input type="number" className="input" value={form.total_sessions} onChange={e => setForm({...form, total_sessions: e.target.value})} /></div>
            <div><label className="label">Start Date</label><input type="date" className="input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Plan</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function PlanStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { active: 'badge-green', draft: 'badge-gray', pending_approval: 'badge-yellow', completed: 'badge-blue', discontinued: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status.replace('_', ' ')}</span>
}
