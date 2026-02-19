'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '@/components/Modal'
import PhoneInput from '@/components/PhoneInput'

const ROLES = [
  { value: 'admin', label: 'Office Manager' },
  { value: 'vet', label: 'Veterinarian' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'receptionist', label: 'Receptionist' },
]

const SPEC_OPTIONS = [
  'Physiotherapy', 'Hydrotherapy', 'Acupuncture', 'HBOT', 'Chiropractic',
  'TCM', 'Laser Therapy', 'Electrotherapy', 'Rehabilitation', 'CCRT', 'CVA',
  'Holistic Medicine', 'Veterinary Medicine', 'Pet Handling', 'Equine Rehabilitation',
  'Canine Rehabilitation', 'Feline Rehabilitation',
]

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '+65 ', role: 'therapist', password: '', specializations: [] as string[] })

  async function fetchStaff() {
    setLoading(true)
    const res = await fetch('/api/staff')
    const data = await res.json()
    setStaff(data.staff || [])
    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setForm({ name: '', email: '', phone: '+65 ', role: 'therapist', password: '', specializations: [] })
      setShowAdd(false)
      fetchStaff()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to add staff')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    if (res.ok) {
      setShowDelete(null)
      fetchStaff()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to remove staff')
    }
  }

  function toggleSpec(spec: string) {
    setForm(f => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter(s => s !== spec)
        : [...f.specializations, spec]
    }))
  }

  const roleLabel: Record<string, string> = { admin: 'Office Manager', vet: 'Veterinarian', therapist: 'Therapist', receptionist: 'Receptionist' }
  const roleColor: Record<string, string> = { admin: 'badge-pink', vet: 'badge-green', therapist: 'badge-blue', receptionist: 'badge-yellow' }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm">Clinic team members and roles</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(s => {
            const specs = s.specializations ? JSON.parse(s.specializations) : []
            return (
              <div key={s.id} className="card group relative">
                <button
                  onClick={() => setShowDelete(s)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove staff"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-sm">
                    {s.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <span className={roleColor[s.role] || 'badge-gray'}>{roleLabel[s.role] || s.role}</span>
                    <p className="text-xs text-gray-500 mt-1">{s.email}</p>
                    {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
                    {specs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {specs.map((sp: string) => <span key={sp} className="badge-purple">{sp}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Staff Member">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" placeholder="name@rehabvet.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <PhoneInput value={form.phone} onChange={v => setForm({...form, phone: v})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Default: password123" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Specializations</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SPEC_OPTIONS.map(sp => (
                <button
                  key={sp} type="button"
                  onClick={() => toggleSpec(sp)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.specializations.includes(sp)
                      ? 'bg-brand-pink text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Staff</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Remove Staff Member">
        {showDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to remove <strong>{showDelete.name}</strong> ({showDelete.email})?
            </p>
            <p className="text-sm text-red-600">This action cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDelete.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
