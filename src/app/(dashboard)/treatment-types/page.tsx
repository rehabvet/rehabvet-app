'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Clock, Tag } from 'lucide-react'
import Modal from '@/components/Modal'

const COLOR_OPTIONS = [
  { value: 'bg-gray-400', label: 'Gray', preview: 'bg-gray-400' },
  { value: 'bg-gray-500', label: 'Dark Gray', preview: 'bg-gray-500' },
  { value: 'bg-red-400', label: 'Red', preview: 'bg-red-400' },
  { value: 'bg-red-500', label: 'Dark Red', preview: 'bg-red-500' },
  { value: 'bg-orange-400', label: 'Orange', preview: 'bg-orange-400' },
  { value: 'bg-orange-500', label: 'Dark Orange', preview: 'bg-orange-500' },
  { value: 'bg-yellow-400', label: 'Yellow', preview: 'bg-yellow-400' },
  { value: 'bg-yellow-500', label: 'Dark Yellow', preview: 'bg-yellow-500' },
  { value: 'bg-green-400', label: 'Green', preview: 'bg-green-400' },
  { value: 'bg-green-500', label: 'Dark Green', preview: 'bg-green-500' },
  { value: 'bg-emerald-500', label: 'Emerald', preview: 'bg-emerald-500' },
  { value: 'bg-teal-500', label: 'Teal', preview: 'bg-teal-500' },
  { value: 'bg-cyan-400', label: 'Cyan', preview: 'bg-cyan-400' },
  { value: 'bg-cyan-500', label: 'Dark Cyan', preview: 'bg-cyan-500' },
  { value: 'bg-sky-400', label: 'Sky', preview: 'bg-sky-400' },
  { value: 'bg-sky-500', label: 'Dark Sky', preview: 'bg-sky-500' },
  { value: 'bg-blue-400', label: 'Blue', preview: 'bg-blue-400' },
  { value: 'bg-blue-500', label: 'Dark Blue', preview: 'bg-blue-500' },
  { value: 'bg-indigo-400', label: 'Indigo', preview: 'bg-indigo-400' },
  { value: 'bg-indigo-500', label: 'Dark Indigo', preview: 'bg-indigo-500' },
  { value: 'bg-purple-400', label: 'Purple', preview: 'bg-purple-400' },
  { value: 'bg-purple-500', label: 'Dark Purple', preview: 'bg-purple-500' },
  { value: 'bg-pink-400', label: 'Pink', preview: 'bg-pink-400' },
  { value: 'bg-pink-500', label: 'Dark Pink', preview: 'bg-pink-500' },
]

const CATEGORIES = ['Consultation & Assessment', 'Pet Rehabilitation', 'Hydrotherapy', 'Hyperbaric Oxygen Treatment', 'Other Services', 'Uncategorized']

const EMPTY_FORM = { name: '', description: '', category: 'Pet Rehabilitation', duration: 60, price: '', sessions_in_package: '', color: 'bg-cyan-500' }

export default function ServicesPage() {
  const [types, setTypes] = useState<any[]>([])
  const [grouped, setGrouped] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  async function fetchTypes() {
    setLoading(true)
    const res = await fetch('/api/treatment-types')
    const data = await res.json()
    setTypes(data.types || [])
    setGrouped(data.grouped || {})
    setLoading(false)
  }

  useEffect(() => { fetchTypes() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/treatment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setForm({ ...EMPTY_FORM })
      setShowAdd(false)
      fetchTypes()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to add')
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!showEdit) return
    const res = await fetch(`/api/treatment-types/${showEdit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: showEdit.name,
        description: showEdit.description,
        category: showEdit.category,
        duration: showEdit.duration,
        sessions_in_package: showEdit.sessions_in_package || null,
        price: showEdit.price,
        color: showEdit.color,
      })
    })
    if (res.ok) {
      setShowEdit(null)
      fetchTypes()
    }
  }

  async function handleDelete() {
    if (!showDelete) return
    await fetch(`/api/treatment-types/${showDelete.id}`, { method: 'DELETE' })
    setShowDelete(null)
    fetchTypes()
  }

  function formatDuration(mins: number) {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remaining = mins % 60
      if (remaining === 0) return `${hours}h`
      return `${hours}h ${remaining}min`
    }
    return `${mins}min`
  }

  const totalServices = types.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm">{totalServices} services · Manage types, durations and calendar colours</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true) }} className="btn-primary text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add Service
        </button>
      </div>

      {/* Services by Category */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" />
          </div>
        ) : (
          <div className="space-y-8">
            {CATEGORIES.map(category => {
              const items = grouped[category] || []
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{category}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-2 pl-2">No services in this category</p>
                  ) : (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-4"></th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Service Name</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden sm:table-cell">Description</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-24">Duration</th>
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className={`w-3 h-3 rounded-full ${t.color}`} />
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                              <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                                {t.description || <span className="italic text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {t.duration > 0 ? formatDuration(t.duration) : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setShowEdit({ ...t, price: t.price ?? '' })}
                                    className="p-1.5 text-gray-400 hover:text-brand-pink hover:bg-white rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setShowDelete(t)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Service">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Service Name *</label>
            <input className="input" placeholder="e.g. Hydrotherapy Session" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} placeholder="Brief description shown to staff..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Duration (mins)</label>
              <input type="number" className="input" min="0" step="5" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">Package Sessions</label>
              <input type="number" className="input" min="1" placeholder="e.g. 10" value={form.sessions_in_package} onChange={e => setForm({...form, sessions_in_package: e.target.value})} />
              <p className="text-xs text-gray-400 mt-1">Leave blank for single sessions</p>
            </div>
            <div>
              <label className="label">Price (S$)</label>
              <input type="number" className="input" min="0" step="0.01" placeholder="e.g. 120.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Calendar Colour</label>
            <div className="grid grid-cols-8 gap-2 mt-1">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({...form, color: c.value})}
                  className={`w-7 h-7 rounded-full ${c.preview} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-brand-pink' : ''}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Service</button>
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
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={2} placeholder="Brief description shown to staff..." value={showEdit.description || ''} onChange={e => setShowEdit({...showEdit, description: e.target.value})} />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={showEdit.category} onChange={e => setShowEdit({...showEdit, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Duration (mins)</label>
                <input type="number" className="input" min="0" step="5" value={showEdit.duration} onChange={e => setShowEdit({...showEdit, duration: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="label">Package Sessions</label>
                <input type="number" className="input" min="1" placeholder="e.g. 10" value={showEdit.sessions_in_package ?? ''} onChange={e => setShowEdit({...showEdit, sessions_in_package: e.target.value || null})} />
                <p className="text-xs text-gray-400 mt-1">Blank = single session</p>
              </div>
              <div>
                <label className="label">Price (S$)</label>
                <input type="number" className="input" min="0" step="0.01" placeholder="e.g. 120.00" value={showEdit.price ?? ''} onChange={e => setShowEdit({...showEdit, price: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label">Calendar Colour</label>
              <div className="grid grid-cols-8 gap-2 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setShowEdit({...showEdit, color: c.value})}
                    className={`w-7 h-7 rounded-full ${c.preview} ${showEdit.color === c.value ? 'ring-2 ring-offset-2 ring-brand-pink' : ''}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Remove Service">
        {showDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to remove <strong>{showDelete.name}</strong>?
            </p>
            <p className="text-sm text-red-600">Existing appointments using this service will not be affected.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                Remove Service
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
