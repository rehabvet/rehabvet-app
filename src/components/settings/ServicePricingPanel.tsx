'use client'
import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, DollarSign, Search, Tag } from 'lucide-react'
import Modal from '@/components/Modal'

interface Service {
  id: string
  name: string
  category: string
  bin_no: number | null
  duration: number
  price: number | null
  appointment_names: string[]
  appointment_durations: Record<string, number>
  active: boolean
  color: string
}

const CAT_COLORS: Record<string, string> = {
  'Acupuncture':       'bg-purple-100 text-purple-700 border-purple-200',
  'Diagnostics':       'bg-blue-100 text-blue-700 border-blue-200',
  'Fees':              'bg-gray-100 text-gray-600 border-gray-200',
  'Consultation':      'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Fitness Swim':      'bg-cyan-100 text-cyan-700 border-cyan-200',
  'UWTM':              'bg-teal-100 text-teal-700 border-teal-200',
  'Hyperbaric Oxygen': 'bg-sky-100 text-sky-700 border-sky-200',
  'Laser Therapy':     'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Rehabilitation':    'bg-pink-100 text-pink-700 border-pink-200',
  'Other Treatments':  'bg-orange-100 text-orange-700 border-orange-200',
}

const DOT_COLORS: Record<string, string> = {
  'Acupuncture': 'bg-purple-400', 'Diagnostics': 'bg-blue-400',
  'Fees': 'bg-gray-400', 'Consultation': 'bg-indigo-400',
  'Fitness Swim': 'bg-cyan-400', 'UWTM': 'bg-teal-400',
  'Hyperbaric Oxygen': 'bg-sky-400', 'Laser Therapy': 'bg-yellow-400',
  'Rehabilitation': 'bg-pink-400', 'Other Treatments': 'bg-orange-400',
}

const EMPTY_FORM = {
  name: '', category: '', bin_no: '', duration: '', price: '', appointment_names: '',
}

const ALL_CATEGORIES = [
  'Acupuncture', 'Consultation', 'Diagnostics', 'Fees', 'Fitness Swim',
  'Hyperbaric Oxygen', 'Laser Therapy', 'Other Treatments', 'Rehabilitation', 'UWTM',
]

export default function ServicePricingPanel() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<Service | null>(null)
  const [showDelete, setShowDelete] = useState<Service | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/service-pricing').then(r => r.json())
    setServices(res.services || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let s = services
    if (filterCat !== 'All') s = s.filter(x => x.category === filterCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      s = s.filter(x =>
        x.name.toLowerCase().includes(q) ||
        (x.bin_no?.toString() || '').includes(q) ||
        x.appointment_names.some(a => a.toLowerCase().includes(q))
      )
    }
    return s
  }, [services, filterCat, search])

  const grouped = useMemo(() => {
    const g: Record<string, Service[]> = {}
    for (const s of filtered) {
      if (!g[s.category]) g[s.category] = []
      g[s.category].push(s)
    }
    return g
  }, [filtered])

  const categories = useMemo(() => [...new Set(services.map(s => s.category))].sort(), [services])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/service-pricing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price) || 0,
        duration: parseInt(form.duration) || 0,
        bin_no: form.bin_no ? parseInt(form.bin_no) : null,
        appointment_names: form.appointment_names
          ? form.appointment_names.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      }),
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
        name: showEdit.name,
        category: showEdit.category,
        bin_no: showEdit.bin_no,
        duration: showEdit.duration,
        price: showEdit.price,
        appointment_names: showEdit.appointment_names,
        appointment_durations: showEdit.appointment_durations || {},
      }),
    })
    setSaving(false); setShowEdit(null); load()
  }

  async function handleDelete() {
    if (!showDelete) return
    await fetch(`/api/service-pricing/${showDelete.id}`, { method: 'DELETE' })
    setShowDelete(null); load()
  }

  const totalServices = services.length

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Service Pricing</h2>
          <p className="text-sm text-gray-500">{totalServices} services across {categories.length} categories</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true) }} className="btn-primary text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add Service
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search by name, bin no, or appointment type…"
            className="input pl-9 text-sm"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['All', ...categories].map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterCat === c
                  ? 'bg-brand-pink text-white border-brand-pink'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {c === 'All' ? `All (${services.length})` : c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{search || filterCat !== 'All' ? 'No services match your search.' : 'No services yet.'}</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-auto" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-64" />
              <col className="w-28" />
              <col className="w-20" />
            </colgroup>
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Service Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Bin No</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Appt Type(s)</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Price (S$)</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, entries]) => (
                <>
                  {/* Category header row */}
                  <tr key={`cat-${cat}`} className="bg-gray-50/80 border-t border-gray-100">
                    <td colSpan={6} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[cat] || 'bg-gray-400'}`} />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{entries.length}</span>
                      </div>
                    </td>
                  </tr>
                  {/* Service rows */}
                  {entries.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/60 border-t border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 truncate">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.bin_no || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.duration > 0 ? `${s.duration} mins` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.appointment_names.length > 0
                            ? s.appointment_names.map(a => (
                                <span key={a} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border font-medium ${CAT_COLORS[cat] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  <Tag className="w-2.5 h-2.5" />{a}
                                </span>
                              ))
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {s.price != null ? `S$${s.price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setShowEdit({ ...s })} className="p-1.5 text-gray-400 hover:text-brand-pink rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setShowDelete(s)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Service">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Service Name *</label>
            <input className="input" placeholder="e.g. Rehab Single Session &lt;15kg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                <option value="">— Select —</option>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bin No</label>
              <input type="number" className="input" placeholder="e.g. 1467" value={form.bin_no} onChange={e => setForm({...form, bin_no: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duration (mins)</label>
              <input type="number" className="input" placeholder="e.g. 60" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
            </div>
            <div>
              <label className="label">Price (S$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S$</span>
                <input type="number" className="input pl-9" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Appointment Type(s)</label>
            <input className="input" placeholder="e.g. Rehabilitation, TCVM Tui Na (comma-separated)" value={form.appointment_names} onChange={e => setForm({...form, appointment_names: e.target.value})} />
            <p className="text-xs text-gray-400 mt-1">Separate multiple types with commas.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add Service'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Service">
        {showEdit && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="label">Service Name *</label>
              <input className="input" value={showEdit.name} onChange={e => setShowEdit({...showEdit, name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category *</label>
                <select className="input" value={showEdit.category} onChange={e => setShowEdit({...showEdit, category: e.target.value})} required>
                  {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Bin No</label>
                <input type="number" className="input" value={showEdit.bin_no ?? ''} onChange={e => setShowEdit({...showEdit, bin_no: parseInt(e.target.value)||0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Duration (mins)</label>
                <input type="number" className="input" value={showEdit.duration} onChange={e => setShowEdit({...showEdit, duration: parseInt(e.target.value)||0})} />
              </div>
              <div>
                <label className="label">Price (S$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S$</span>
                  <input type="number" className="input pl-9" min="0" step="0.01" value={showEdit.price ?? ''} onChange={e => setShowEdit({...showEdit, price: parseFloat(e.target.value)||0})} required />
                </div>
              </div>
            </div>
            <div>
              <label className="label">Appointment Type(s)</label>
              <input className="input" placeholder="Comma-separated" value={showEdit.appointment_names.join(', ')} onChange={e => setShowEdit({...showEdit, appointment_names: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
            </div>
            {showEdit.appointment_names.length > 0 && (
              <div>
                <label className="label">Duration per Appt Type (mins)</label>
                <p className="text-xs text-gray-400 mb-2">Leave blank to use the default service duration ({showEdit.duration} mins)</p>
                <div className="space-y-2">
                  {showEdit.appointment_names.map(apptName => (
                    <div key={apptName} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1 truncate">{apptName}</span>
                      <input
                        type="number"
                        className="input w-24 text-sm"
                        placeholder={`${showEdit.duration}`}
                        value={(showEdit.appointment_durations || {})[apptName] ?? ''}
                        onChange={e => {
                          const val = e.target.value ? parseInt(e.target.value) : undefined
                          const durations = { ...(showEdit.appointment_durations || {}) }
                          if (val) durations[apptName] = val
                          else delete durations[apptName]
                          setShowEdit({ ...showEdit, appointment_durations: durations })
                        }}
                      />
                      <span className="text-xs text-gray-400 w-8">mins</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Remove Service">
        {showDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">Remove <strong>{showDelete.name}</strong>? It will be hidden from all pricing and booking options.</p>
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
