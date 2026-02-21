'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
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

const CATEGORIES = ['Uncategorized', 'Pet Rehabilitation', 'Other Services', 'Consultation & Assessment']

export default function SettingsPage() {
  const [types, setTypes] = useState<any[]>([])
  const [grouped, setGrouped] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [form, setForm] = useState({ name: '', category: 'Pet Rehabilitation', duration: 60, color: 'bg-cyan-500' })

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
      setForm({ name: '', category: 'Pet Rehabilitation', duration: 60, color: 'bg-cyan-500' })
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
        category: showEdit.category,
        duration: showEdit.duration,
        color: showEdit.color
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Types</h1>
          <p className="text-gray-500 text-sm">Manage treatment categories, durations and colours</p>
        </div>
      </div>

      {/* Treatment Types Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Treatment Types</h2>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4 mr-1" /> Add Treatment
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" />
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map(category => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{category}</h3>
                <div className="space-y-2">
                  {(grouped[category] || []).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${t.color}`} />
                        <span className="font-medium text-gray-800">{t.name}</span>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(t.duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowEdit({ ...t })}
                          className="p-2 text-gray-400 hover:text-brand-pink hover:bg-white rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDelete(t)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!grouped[category] || grouped[category].length === 0) && (
                    <p className="text-sm text-gray-400 italic py-2">No treatments in this category</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Treatment Type">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (minutes) *</label>
            <input type="number" className="input" min="5" step="5" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)})} required />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({...form, color: c.value})}
                  className={`w-8 h-8 rounded-full ${c.preview} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-brand-pink' : ''}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Treatment</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Treatment Type">
        {showEdit && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={showEdit.name} onChange={e => setShowEdit({...showEdit, name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={showEdit.category} onChange={e => setShowEdit({...showEdit, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration (minutes) *</label>
              <input type="number" className="input" min="5" step="5" value={showEdit.duration} onChange={e => setShowEdit({...showEdit, duration: parseInt(e.target.value)})} required />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="grid grid-cols-6 gap-2 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setShowEdit({...showEdit, color: c.value})}
                    className={`w-8 h-8 rounded-full ${c.preview} ${showEdit.color === c.value ? 'ring-2 ring-offset-2 ring-brand-pink' : ''}`}
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
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Treatment Type">
        {showDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{showDelete.name}</strong>?
            </p>
            <p className="text-sm text-red-600">Existing appointments using this treatment type will not be affected.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
