'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronDown, ChevronUp, RotateCcw, CheckCircle, Package, Clock, AlertTriangle, Search } from 'lucide-react'
import Modal from '@/components/Modal'

const STATUS_TABS = ['all', 'active', 'completed', 'expired', 'cancelled']

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-500',
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Add Package modal
  const [showAdd, setShowAdd] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [treatmentTypes, setTreatmentTypes] = useState<any[]>([])
  const [addForm, setAddForm] = useState({
    client_id: '', patient_id: '', treatment_type_id: '',
    sessions_total: '', purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '', price_paid: '', notes: '',
  })

  // Use Session modal
  const [useModal, setUseModal] = useState<any>(null)
  const [useForm, setUseForm] = useState({ used_date: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    const status = activeTab === 'all' ? '' : activeTab
    const res = await fetch(`/api/packages?status=${status}&search=${encodeURIComponent(search)}`)
    const data = await res.json()
    setPackages(data.packages || [])
    setLoading(false)
  }, [activeTab, search])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  useEffect(() => {
    // Fetch clients for add form
    fetch('/api/clients?limit=500').then(r => r.json()).then(d => setClients(d.clients || []))
    // Fetch treatment types (packages only)
    fetch('/api/treatment-types').then(r => r.json()).then(d => setTreatmentTypes(d.types || []))
  }, [])

  useEffect(() => {
    if (addForm.client_id) {
      fetch(`/api/patients?client_id=${addForm.client_id}`).then(r => r.json()).then(d => setPatients(d.patients || []))
    } else {
      setPatients([])
    }
  }, [addForm.client_id])

  // Auto-fill price when treatment type is selected
  useEffect(() => {
    if (addForm.treatment_type_id) {
      const tt = treatmentTypes.find((t: any) => t.id === addForm.treatment_type_id)
      if (tt) {
        setAddForm(f => ({
          ...f,
          price_paid: tt.price ? String(tt.price) : f.price_paid,
          sessions_total: tt.sessions_in_package ? String(tt.sessions_in_package) : f.sessions_total,
        }))
      }
    }
  }, [addForm.treatment_type_id, treatmentTypes])

  async function handleAddPackage(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    setSaving(false)
    if (res.ok) {
      setShowAdd(false)
      setAddForm({ client_id: '', patient_id: '', treatment_type_id: '', sessions_total: '', purchase_date: new Date().toISOString().split('T')[0], expiry_date: '', price_paid: '', notes: '' })
      fetchPackages()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to create package')
    }
  }

  async function handleUseSession() {
    if (!useModal) return
    setSaving(true)
    const res = await fetch(`/api/packages/${useModal.id}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(useForm),
    })
    setSaving(false)
    if (res.ok) {
      setUseModal(null)
      setUseForm({ used_date: new Date().toISOString().split('T')[0], notes: '' })
      fetchPackages()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed')
    }
  }

  async function handleUndo(pkg: any) {
    if (!confirm(`Undo last session for ${pkg.client.name} / ${pkg.patient?.name || ''}?`)) return
    await fetch(`/api/packages/${pkg.id}/unuse`, { method: 'POST' })
    fetchPackages()
  }

  // Stats
  const allActive = packages.filter(p => p.status === 'active')
  const lowSessions = allActive.filter(p => (p.sessions_total - p.sessions_used) <= 2)
  const todayStr = new Date().toISOString().split('T')[0]
  const usedToday = packages.flatMap(p => p.usage_logs || []).filter((l: any) => l.used_date === todayStr).length

  const packageTypes = treatmentTypes.filter(t => t.sessions_in_package)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Packages</h1>
          <p className="text-gray-500 text-sm">Track purchased session packages and remaining sessions</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add Package
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{allActive.length}</p>
            <p className="text-xs text-gray-500">Active Packages</p>
          </div>
        </div>
        <div className="card py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{usedToday}</p>
            <p className="text-xs text-gray-500">Sessions Used Today</p>
          </div>
        </div>
        <div className="card py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{lowSessions.length}</p>
            <p className="text-xs text-gray-500">Low Sessions (≤2 left)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search client or patient..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Packages List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-pink" />
          </div>
        ) : packages.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No packages found</p>
            <p className="text-sm mt-1">Add a package to start tracking sessions</p>
          </div>
        ) : (
          packages.map(pkg => {
            const remaining = pkg.sessions_total - pkg.sessions_used
            const pct = (pkg.sessions_used / pkg.sessions_total) * 100
            const isLow = remaining <= 2 && pkg.status === 'active'
            const isExpanded = expanded === pkg.id

            return (
              <div key={pkg.id} className={`card transition-all ${isLow ? 'border-orange-200' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Color dot */}
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${pkg.treatment_type.color}`} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">{pkg.client.name}
                          {pkg.patient && <span className="text-gray-400 font-normal"> · {pkg.patient.name}</span>}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">{pkg.treatment_type.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[pkg.status] || 'bg-gray-100 text-gray-500'}`}>
                          {pkg.status}
                        </span>
                        {isLow && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                            ⚠ Low
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-gray-500">{pkg.sessions_used} of {pkg.sessions_total} sessions used</span>
                        <span className={`font-bold text-lg leading-none ${remaining === 0 ? 'text-gray-400' : isLow ? 'text-orange-600' : 'text-green-600'}`}>
                          {remaining} left
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${pct >= 100 ? 'bg-blue-400' : isLow ? 'bg-orange-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      {/* Session dots */}
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {Array.from({ length: pkg.sessions_total }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-all ${
                              i < pkg.sessions_used
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-300 border border-gray-200'
                            }`}
                          >
                            {i < pkg.sessions_used ? '✓' : i + 1}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>Purchased: {pkg.purchase_date}</span>
                        {pkg.expiry_date && <span>Expires: {pkg.expiry_date}</span>}
                        {pkg.price_paid && <span>S${Number(pkg.price_paid).toFixed(2)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : pkg.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                        >
                          History {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {pkg.status === 'active' && pkg.sessions_used > 0 && (
                          <button
                            onClick={() => handleUndo(pkg)}
                            className="text-xs text-gray-400 hover:text-orange-500 flex items-center gap-1 transition-colors"
                            title="Undo last session"
                          >
                            <RotateCcw className="w-3 h-3" /> Undo
                          </button>
                        )}
                        {pkg.status === 'active' && remaining > 0 && (
                          <button
                            onClick={() => { setUseModal(pkg); setUseForm({ used_date: new Date().toISOString().split('T')[0], notes: '' }) }}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Use Session
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded history */}
                    {isExpanded && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Session History</p>
                        {pkg.usage_logs.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No sessions used yet</p>
                        ) : (
                          <div className="space-y-2">
                            {pkg.usage_logs.map((log: any, i: number) => (
                              <div key={log.id} className="flex items-center gap-3 text-sm">
                                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {pkg.usage_logs.length - i}
                                </div>
                                <span className="font-medium text-gray-700">{log.used_date}</span>
                                {log.notes && <span className="text-gray-400">— {log.notes}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Package Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Client Package">
        <form onSubmit={handleAddPackage} className="space-y-4">
          <div>
            <label className="label">Client *</label>
            <select className="input" value={addForm.client_id} onChange={e => setAddForm(f => ({ ...f, client_id: e.target.value, patient_id: '' }))} required>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          </div>
          {addForm.client_id && (
            <div>
              <label className="label">Patient</label>
              <select className="input" value={addForm.patient_id} onChange={e => setAddForm(f => ({ ...f, patient_id: e.target.value }))}>
                <option value="">No specific patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Service / Package Type *</label>
            <select className="input" value={addForm.treatment_type_id} onChange={e => setAddForm(f => ({ ...f, treatment_type_id: e.target.value }))} required>
              <option value="">Select service…</option>
              {packageTypes.length > 0 && (
                <optgroup label="— Packages —">
                  {packageTypes.map(t => <option key={t.id} value={t.id}>{t.name} {t.price ? `(S$${t.price})` : ''}</option>)}
                </optgroup>
              )}
              <optgroup label="— Single Sessions —">
                {treatmentTypes.filter(t => !t.sessions_in_package).map(t => <option key={t.id} value={t.id}>{t.name} {t.price ? `(S$${t.price})` : ''}</option>)}
              </optgroup>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sessions Total *</label>
              <input type="number" className="input" min="1" value={addForm.sessions_total} onChange={e => setAddForm(f => ({ ...f, sessions_total: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Price Paid (S$)</label>
              <input type="number" className="input" min="0" step="0.01" value={addForm.price_paid} onChange={e => setAddForm(f => ({ ...f, price_paid: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Purchase Date *</label>
              <input type="date" className="input" value={addForm.purchase_date} onChange={e => setAddForm(f => ({ ...f, purchase_date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input type="date" className="input" value={addForm.expiry_date} onChange={e => setAddForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Any additional notes…" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add Package'}</button>
          </div>
        </form>
      </Modal>

      {/* Use Session Modal */}
      <Modal open={!!useModal} onClose={() => setUseModal(null)} title="Mark Session as Used">
        {useModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-900">{useModal.client.name} · {useModal.patient?.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{useModal.treatment_type.name}</p>
              <p className="text-sm font-medium text-green-600 mt-2">
                {useModal.sessions_total - useModal.sessions_used} session{useModal.sessions_total - useModal.sessions_used !== 1 ? 's' : ''} remaining → will become {useModal.sessions_total - useModal.sessions_used - 1}
              </p>
            </div>
            <div>
              <label className="label">Session Date *</label>
              <input type="date" className="input" value={useForm.used_date} onChange={e => setUseForm(f => ({ ...f, used_date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" placeholder="e.g. Good session, improved mobility" value={useForm.notes} onChange={e => setUseForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setUseModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleUseSession} disabled={saving} className="btn-primary">
                <CheckCircle className="w-4 h-4 mr-1" />
                {saving ? 'Saving…' : 'Confirm Session Used'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
