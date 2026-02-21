'use client'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react'
import Modal from '@/components/Modal'

interface PricingEntry {
  id: string
  service_id: string
  label: string
  sessions: number
  price: number
  service: { id: string; name: string; category: string; color: string }
}

const EMPTY_FORM = { service_id: '', label: '', sessions: '1', price: '' }

export default function ServicePricingPanel() {
  const [pricing, setPricing] = useState<PricingEntry[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<PricingEntry | null>(null)
  const [showDelete, setShowDelete] = useState<PricingEntry | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      fetch('/api/service-pricing').then(r => r.json()),
      fetch('/api/treatment-types').then(r => r.json()),
    ])
    setPricing(pRes.pricing || [])
    setServices(sRes.types || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/service-pricing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sessions: parseInt(form.sessions)||1, price: parseFloat(form.price) }),
    })
    setSaving(false); setShowAdd(false); setForm({ ...EMPTY_FORM }); load()
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!showEdit) return
    setSaving(true)
    await fetch(`/api/service-pricing/${showEdit.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: showEdit.service_id,
        label: showEdit.label,
        sessions: showEdit.sessions,
        price: showEdit.price,
      }),
    })
    setSaving(false); setShowEdit(null); load()
  }

  async function handleDelete() {
    if (!showDelete) return
    await fetch(`/api/service-pricing/${showDelete.id}`, { method: 'DELETE' })
    setShowDelete(null); load()
  }

  // Group by service name
  const grouped: Record<string, PricingEntry[]> = {}
  for (const p of pricing) {
    const key = p.service?.name || 'Unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Service Pricing</h2>
          <p className="text-sm text-gray-500">Manage prices and session packages for each service.</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true) }} className="btn-primary text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add Pricing
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
      ) : pricing.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No pricing set yet.</p>
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true) }} className="mt-3 btn-primary text-sm">
            Add First Pricing Entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([svcName, entries]) => {
            const color = entries[0]?.service?.color || 'bg-gray-400'
            return (
              <div key={svcName}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{svcName}</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{entries.length}</span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Label / Type</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-28">No. of Sessions</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-28">Price (S$)</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {entries.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.label}</td>
                          <td className="px-4 py-3 text-gray-600">{p.sessions}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">S${p.price.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setShowEdit({ ...p })} className="p-1.5 text-gray-400 hover:text-brand-pink rounded-lg"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => setShowDelete(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Pricing Entry">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Service *</label>
            <select className="input" value={form.service_id} onChange={e => setForm({...form, service_id: e.target.value})} required>
              <option value="">— Select a service —</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Label / Type *</label>
            <input className="input" placeholder="e.g. Single Session, 5-Session Package…" value={form.label} onChange={e => setForm({...form, label: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">No. of Sessions *</label>
              <input type="number" className="input" min="1" placeholder="e.g. 1" value={form.sessions} onChange={e => setForm({...form, sessions: e.target.value})} required />
            </div>
            <div>
              <label className="label">Price (S$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S$</span>
                <input type="number" className="input pl-9" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add Pricing'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Pricing Entry">
        {showEdit && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="label">Service *</label>
              <select className="input" value={showEdit.service_id} onChange={e => setShowEdit({...showEdit, service_id: e.target.value})} required>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Label / Type *</label>
              <input className="input" value={showEdit.label} onChange={e => setShowEdit({...showEdit, label: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">No. of Sessions *</label>
                <input type="number" className="input" min="1" value={showEdit.sessions} onChange={e => setShowEdit({...showEdit, sessions: parseInt(e.target.value)||1})} required />
              </div>
              <div>
                <label className="label">Price (S$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S$</span>
                  <input type="number" className="input pl-9" min="0" step="0.01" value={showEdit.price} onChange={e => setShowEdit({...showEdit, price: parseFloat(e.target.value)||0})} required />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Remove Pricing Entry">
        {showDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">Remove <strong>{showDelete.label}</strong> for <strong>{showDelete.service?.name}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Remove</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
