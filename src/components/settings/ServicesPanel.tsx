'use client'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import Modal from '@/components/Modal'

const COLOR_OPTIONS = [
  { value: 'bg-gray-400', label: 'Gray' }, { value: 'bg-gray-500', label: 'Dark Gray' },
  { value: 'bg-red-400', label: 'Red' }, { value: 'bg-red-500', label: 'Dark Red' },
  { value: 'bg-orange-400', label: 'Orange' }, { value: 'bg-orange-500', label: 'Dark Orange' },
  { value: 'bg-yellow-400', label: 'Yellow' }, { value: 'bg-yellow-500', label: 'Dark Yellow' },
  { value: 'bg-green-400', label: 'Green' }, { value: 'bg-green-500', label: 'Dark Green' },
  { value: 'bg-emerald-500', label: 'Emerald' }, { value: 'bg-teal-500', label: 'Teal' },
  { value: 'bg-cyan-400', label: 'Cyan' }, { value: 'bg-cyan-500', label: 'Dark Cyan' },
  { value: 'bg-sky-400', label: 'Sky' }, { value: 'bg-sky-500', label: 'Dark Sky' },
  { value: 'bg-blue-400', label: 'Blue' }, { value: 'bg-blue-500', label: 'Dark Blue' },
  { value: 'bg-indigo-400', label: 'Indigo' }, { value: 'bg-indigo-500', label: 'Dark Indigo' },
  { value: 'bg-purple-400', label: 'Purple' }, { value: 'bg-purple-500', label: 'Dark Purple' },
  { value: 'bg-pink-400', label: 'Pink' }, { value: 'bg-pink-500', label: 'Dark Pink' },
]

const CATEGORIES = [
  'Consultation & Assessment', 'Pet Rehabilitation', 'Hydrotherapy',
  'Hyperbaric Oxygen Treatment', 'Other Services', 'Uncategorized',
]

const EMPTY = { name: '', description: '', category: 'Pet Rehabilitation', duration: 60, color: 'bg-cyan-500' }

export default function ServicesPanel() {
  const [types, setTypes] = useState<any[]>([])
  const [grouped, setGrouped] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY })

  async function load() {
    setLoading(true)
    const data = await fetch('/api/treatment-types').then(r => r.json())
    setTypes(data.types || [])
    setGrouped(data.grouped || {})
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/treatment-types', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (res.ok) { setForm({ ...EMPTY }); setShowAdd(false); load() }
    else { const d = await res.json(); alert(d.error || 'Failed') }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!showEdit) return
    await fetch(`/api/treatment-types/${showEdit.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: showEdit.name, description: showEdit.description, category: showEdit.category, duration: showEdit.duration, color: showEdit.color, price: showEdit.price, sessions_in_package: showEdit.sessions_in_package }),
    })
    setShowEdit(null); load()
  }

  async function handleDelete() {
    await fetch(`/api/treatment-types/${showDelete.id}`, { method: 'DELETE' })
    setShowDelete(null); load()
  }

  function fmt(m: number) {
    if (m >= 60) { const h = Math.floor(m / 60); const r = m % 60; return r ? `${h}h ${r}min` : `${h}h` }
    return `${m}min`
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Services</h2>
          <p className="text-sm text-gray-500">{types.length} services · Manage types, durations and calendar colours</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setShowAdd(true) }} className="btn-primary text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add Service
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const items = grouped[cat] || []
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{cat}</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{items.length}</span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="w-4 px-4 py-2"></th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Service Name</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Description</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-24">Duration</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><div className={`w-3 h-3 rounded-full ${t.color}`} /></td>
                          <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                          <td className="px-4 py-3 text-gray-400 hidden sm:table-cell text-xs">{t.description || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration > 0 ? fmt(t.duration) : '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setShowEdit({ ...t })} className="p-1.5 text-gray-400 hover:text-brand-pink rounded-lg"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => setShowDelete(t)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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

      {/* Add */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Service">
        <form onSubmit={handleAdd} className="space-y-4">
          <div><label className="label">Service Name *</label>
            <input className="input" placeholder="e.g. Hydrotherapy Session" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div><label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div><label className="label">Category *</label>
            <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div><label className="label">Duration (mins)</label>
            <input type="number" className="input" min="0" step="5" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)||0})} /></div>
          <div><label className="label">Calendar Colour</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_OPTIONS.map(c => (
                <button key={c.value} type="button" onClick={() => setForm({...form, color: c.value})}
                  className={`w-7 h-7 rounded-full ${c.value} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-brand-pink' : ''}`} title={c.label} />
              ))}
            </div></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Service</button>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Service">
        {showEdit && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div><label className="label">Service Name *</label>
              <input className="input" value={showEdit.name} onChange={e => setShowEdit({...showEdit, name: e.target.value})} required /></div>
            <div><label className="label">Description</label>
              <textarea className="input" rows={2} value={showEdit.description || ''} onChange={e => setShowEdit({...showEdit, description: e.target.value})} /></div>
            <div><label className="label">Category</label>
              <select className="input" value={showEdit.category} onChange={e => setShowEdit({...showEdit, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="label">Duration (mins)</label>
              <input type="number" className="input" min="0" step="5" value={showEdit.duration} onChange={e => setShowEdit({...showEdit, duration: parseInt(e.target.value)||0})} /></div>
            <div><label className="label">Calendar Colour</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setShowEdit({...showEdit, color: c.value})}
                    className={`w-7 h-7 rounded-full ${c.value} ${showEdit.color === c.value ? 'ring-2 ring-offset-2 ring-brand-pink' : ''}`} title={c.label} />
                ))}
              </div></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Remove Service">
        {showDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">Remove <strong>{showDelete.name}</strong>? Existing appointments won&apos;t be affected.</p>
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
