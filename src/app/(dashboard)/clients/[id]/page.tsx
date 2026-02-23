'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, PawPrint, FileText, CalendarClock, Edit2, Save, X, Package, Plus, MinusCircle, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import AddressInput from '@/components/AddressInput'
import Modal from '@/components/Modal'

function splitAddress(full?: string) {
  const out = { block: '', street: '', unit: '', building: '', postalCode: '' }
  if (!full) return out
  const parts = full.split(',').map(p => p.trim()).filter(Boolean)
  const postal = parts.find(p => /(?:Singapore\s+)?\d{6}$/i.test(p))
  if (postal) {
    const m = postal.match(/(\d{6})$/)
    if (m) out.postalCode = m[1]
  }
  const unit = parts.find(p => /^#/.test(p))
  if (unit) out.unit = unit.replace(/^#/, '')
  const normal = parts.filter(p => !/^#/.test(p) && !/(?:Singapore\s+)?\d{6}$/i.test(p))
  out.block = normal[0] || ''
  out.street = normal[1] || ''
  out.building = normal[2] || ''
  return out
}

const PKG_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-50 text-red-500',
  cancelled: 'bg-red-50 text-red-400',
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  // Packages state
  const [packages, setPackages] = useState<any[]>([])
  const [treatmentTypes, setTreatmentTypes] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [showAddPkg, setShowAddPkg] = useState(false)
  const [pkgForm, setPkgForm] = useState({ treatment_type_id: '', patient_id: '', sessions_total: '', price_paid: '', purchase_date: new Date().toISOString().split('T')[0], expiry_date: '', notes: '' })
  const [addingPkg, setAddingPkg] = useState(false)
  const [deductModal, setDeductModal] = useState<any>(null) // package to deduct from
  const [deductForm, setDeductForm] = useState({ used_date: new Date().toISOString().split('T')[0], notes: '' })
  const [deducting, setDeducting] = useState(false)
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null)
  const [confirmUndoPkgId, setConfirmUndoPkgId] = useState<string | null>(null)
  const [undoing, setUndoing] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${id}`).then(r => r.json()).then(d => {
      setData(d)
      setForm(d.client)
      setPatients(d.patients || [])
    })
    fetchPackages()
    fetch('/api/treatment-types').then(r => r.json()).then(d => setTreatmentTypes(d.types || []))
  }, [id])

  async function fetchPackages() {
    const res = await fetch(`/api/packages?client_id=${id}`)
    const d = await res.json()
    setPackages(d.packages || [])
  }

  async function handleSave() {
    await fetch(`/api/clients/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    setEditing(false)
    const d = await fetch(`/api/clients/${id}`).then(r => r.json())
    setData(d)
    setForm(d.client)
  }

  async function handleAddPackage() {
    if (!pkgForm.treatment_type_id || !pkgForm.sessions_total) return
    setAddingPkg(true)
    await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: id,
        patient_id: pkgForm.patient_id || null,
        treatment_type_id: pkgForm.treatment_type_id,
        sessions_total: parseInt(pkgForm.sessions_total),
        price_paid: pkgForm.price_paid ? parseFloat(pkgForm.price_paid) : null,
        purchase_date: pkgForm.purchase_date,
        expiry_date: pkgForm.expiry_date || null,
        notes: pkgForm.notes || null,
      }),
    })
    setAddingPkg(false)
    setShowAddPkg(false)
    setPkgForm({ treatment_type_id: '', patient_id: '', sessions_total: '', price_paid: '', purchase_date: new Date().toISOString().split('T')[0], expiry_date: '', notes: '' })
    fetchPackages()
  }

  async function handleDeduct() {
    if (!deductModal) return
    setDeducting(true)
    await fetch(`/api/packages/${deductModal.id}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deductForm),
    })
    setDeducting(false)
    setDeductModal(null)
    setDeductForm({ used_date: new Date().toISOString().split('T')[0], notes: '' })
    fetchPackages()
  }

  async function doUndoLast() {
    if (!confirmUndoPkgId) return
    setUndoing(true)
    try {
      await fetch(`/api/packages/${confirmUndoPkgId}/unuse`, { method: 'POST' })
      setConfirmUndoPkgId(null)
      fetchPackages()
    } finally {
      setUndoing(false)
    }
  }

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  const { client, invoices, appointments } = data
  const addr = splitAddress(client.address)

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink font-bold text-lg">
              {client.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              {editing ? (
                <input className="input text-lg font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              ) : (
                <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              )}
            </div>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary"><X className="w-4 h-4" /></button>
              <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4 mr-1" /> Save</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary"><Edit2 className="w-4 h-4 mr-1" /> Edit</button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {editing ? (
            <>
              <div><label className="label">Phone</label><input className="input" autoComplete="off" value={form.phone||''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="label">Email</label><input className="input" autoComplete="off" value={form.email||''} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="sm:col-span-3">
                <label className="label">Address</label>
                <AddressInput value={form.address||''} onChange={v => setForm({...form, address: v})} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{client.phone || '—'}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{client.email || '—'}</div>
              <div className="sm:col-span-3 rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><MapPin className="w-4 h-4 text-gray-400" />Address</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div><span className="text-gray-400">Block:</span> {addr.block || '—'}</div>
                  <div><span className="text-gray-400">Street:</span> {addr.street || '—'}</div>
                  <div><span className="text-gray-400">Unit:</span> {addr.unit || '—'}</div>
                  <div><span className="text-gray-400">Building:</span> {addr.building || '—'}</div>
                  <div className="sm:col-span-2"><span className="text-gray-400">Postal Code:</span> {addr.postalCode || '—'}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Patients */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><PawPrint className="w-5 h-5 text-brand-gold" /> Pets</h2>
        {(patients || []).length === 0 ? (
          <p className="text-gray-400 text-sm">No pets registered</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patients.map((p: any) => (
              <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-pink/50 hover:bg-pink-50/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-lg">
                  {p.species === 'Dog' ? '🐕' : p.species === 'Cat' ? '🐈' : '🐾'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.species} · {p.breed || 'Unknown breed'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── PACKAGES ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-pink" /> Packages
            {packages.filter(p => p.status === 'active').length > 0 && (
              <span className="ml-1 text-xs bg-brand-pink text-white rounded-full px-2 py-0.5">{packages.filter(p => p.status === 'active').length} active</span>
            )}
          </h2>
          <button onClick={() => setShowAddPkg(true)} className="btn-secondary text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Package
          </button>
        </div>

        {packages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No packages yet</p>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg: any) => {
              const remaining = pkg.sessions_total - pkg.sessions_used
              const pct = Math.round((pkg.sessions_used / pkg.sessions_total) * 100)
              const isExpanded = expandedPkg === pkg.id
              return (
                <div key={pkg.id} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Package header */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{pkg.treatment_type?.name}</p>
                        {pkg.patient && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{pkg.patient.name}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PKG_STATUS_COLORS[pkg.status] || 'bg-gray-100 text-gray-500'}`}>
                          {pkg.status}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span><span className="font-bold text-gray-900">{pkg.sessions_used}</span> / {pkg.sessions_total} sessions used</span>
                          <span className={`font-semibold ${remaining === 0 ? 'text-gray-400' : remaining <= 2 ? 'text-amber-600' : 'text-green-600'}`}>
                            {remaining} remaining
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-gray-400' : pct >= 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>Purchased: {pkg.purchase_date}</span>
                        {pkg.price_paid && <span>S${Number(pkg.price_paid).toFixed(2)}</span>}
                        {pkg.expiry_date && <span>Expires: {pkg.expiry_date}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {pkg.status === 'active' && remaining > 0 && (
                        <button
                          onClick={() => { setDeductModal(pkg); setDeductForm({ used_date: new Date().toISOString().split('T')[0], notes: '' }) }}
                          className="flex items-center gap-1.5 bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <MinusCircle className="w-3.5 h-3.5" /> Deduct Session
                        </button>
                      )}
                      {pkg.sessions_used > 0 && (
                        <button onClick={() => setConfirmUndoPkgId(pkg.id)} className="p-1.5 text-gray-400 hover:text-amber-500 transition-colors" title="Undo last session">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)} className="p-1.5 text-gray-400 hover:text-gray-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Session history (expandable) */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Session History</p>
                      {pkg.usage_logs?.length === 0 ? (
                        <p className="text-xs text-gray-400">No sessions recorded yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {pkg.usage_logs?.map((log: any, i: number) => (
                            <div key={log.id} className="flex items-center gap-3 text-xs text-gray-600">
                              <span className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                                {pkg.usage_logs.length - i}
                              </span>
                              <span className="font-medium text-gray-800">{log.used_date}</span>
                              {log.notes && <span className="text-gray-400 truncate">{log.notes}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Package Modal */}
      <Modal open={showAddPkg} onClose={() => setShowAddPkg(false)} title="Add Package">
        <div className="space-y-4">
          <div>
            <label className="label">Treatment Type *</label>
            <select className="input" value={pkgForm.treatment_type_id} onChange={e => setPkgForm({...pkgForm, treatment_type_id: e.target.value})}>
              <option value="">Select treatment...</option>
              {treatmentTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">No. of Sessions *</label>
              <input className="input" type="number" min="1" placeholder="e.g. 10" value={pkgForm.sessions_total} onChange={e => setPkgForm({...pkgForm, sessions_total: e.target.value})} />
            </div>
            <div>
              <label className="label">Price Paid (S$)</label>
              <input className="input" type="number" step="0.01" placeholder="e.g. 1149.00" value={pkgForm.price_paid} onChange={e => setPkgForm({...pkgForm, price_paid: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">For Pet (optional)</label>
            <select className="input" value={pkgForm.patient_id} onChange={e => setPkgForm({...pkgForm, patient_id: e.target.value})}>
              <option value="">All pets / not specified</option>
              {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Purchase Date</label>
              <input className="input" type="date" value={pkgForm.purchase_date} onChange={e => setPkgForm({...pkgForm, purchase_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Expiry Date (optional)</label>
              <input className="input" type="date" value={pkgForm.expiry_date} onChange={e => setPkgForm({...pkgForm, expiry_date: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Any notes about this package..." value={pkgForm.notes} onChange={e => setPkgForm({...pkgForm, notes: e.target.value})} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowAddPkg(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAddPackage} disabled={!pkgForm.treatment_type_id || !pkgForm.sessions_total || addingPkg} className="btn-primary">
              {addingPkg ? 'Adding...' : 'Add Package'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deduct Session Modal */}
      <Modal open={!!deductModal} onClose={() => setDeductModal(null)} title={`Deduct Session — ${deductModal?.treatment_type?.name}`}>
        {deductModal && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sessions remaining</span>
                <span className="text-2xl font-bold text-gray-900">{deductModal.sessions_total - deductModal.sessions_used - 1} <span className="text-sm font-normal text-gray-400">after deduction</span></span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-brand-pink rounded-full transition-all"
                  style={{ width: `${Math.round(((deductModal.sessions_used + 1) / deductModal.sessions_total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 text-center">{deductModal.sessions_used + 1} / {deductModal.sessions_total} sessions will be used</p>
            </div>

            <div>
              <label className="label">Date of Session</label>
              <input className="input" type="date" value={deductForm.used_date} onChange={e => setDeductForm({...deductForm, used_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input resize-none" rows={2} placeholder="e.g. Session 3 — showed improved mobility..." value={deductForm.notes} onChange={e => setDeductForm({...deductForm, notes: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setDeductModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDeduct} disabled={deducting} className="bg-brand-pink hover:bg-brand-pink/90 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50">
                {deducting ? 'Saving...' : '✓ Confirm Deduction'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Previous Appointments */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CalendarClock className="w-5 h-5 text-brand-gold" /> Previous Appointments</h2>
        {appointments?.length === 0 ? (
          <p className="text-gray-400 text-sm">No appointments found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="table-header">Date</th>
                <th className="table-header">Time</th>
                <th className="table-header">Pet</th>
                <th className="table-header">Provider</th>
                <th className="table-header">Treatment</th>
                <th className="table-header">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(appointments || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-cell">{a.date}</td>
                    <td className="table-cell">{a.start_time} - {a.end_time}</td>
                    <td className="table-cell">{a.patient?.name || '—'}</td>
                    <td className="table-cell">{a.therapist?.name || 'Unassigned'}</td>
                    <td className="table-cell"><span className="badge-purple">{a.modality}</span></td>
                    <td className="table-cell"><ApptStatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-brand-pink" /> Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-gray-400 text-sm">No invoices</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="table-header">Invoice #</th>
                <th className="table-header">Date</th>
                <th className="table-header">Total</th>
                <th className="table-header">Paid</th>
                <th className="table-header">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/billing/${inv.id}`)}>
                    <td className="table-cell font-medium">{inv.invoice_number}</td>
                    <td className="table-cell">{inv.date}</td>
                    <td className="table-cell">${inv.total.toFixed(2)}</td>
                    <td className="table-cell">${inv.amount_paid.toFixed(2)}</td>
                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Confirm Undo Session Modal ── */}
      <Modal open={!!confirmUndoPkgId} onClose={() => setConfirmUndoPkgId(null)} title="Undo Last Session">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-700">Undo last session deduction</p>
              <p className="text-sm text-orange-600 mt-0.5">This will restore 1 session to the package.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmUndoPkgId(null)} className="btn-secondary" disabled={undoing}>Cancel</button>
            <button onClick={doUndoLast} disabled={undoing}
              className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50">
              {undoing ? 'Undoing…' : 'Yes, undo'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ApptStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { scheduled: 'badge-blue', confirmed: 'badge-green', in_progress: 'badge-yellow', completed: 'badge-gray', cancelled: 'badge-red', no_show: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{String(status || '').replace('_', ' ')}</span>
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { paid: 'badge-green', partial: 'badge-yellow', sent: 'badge-blue', draft: 'badge-gray', overdue: 'badge-red', cancelled: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status}</span>
}
