'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, KeyRound, Pencil } from 'lucide-react'
import Modal from '@/components/Modal'
import PhoneInput from '@/components/PhoneInput'

const ROLES = [
  { value: 'veterinarian', label: 'Veterinarian' },
  { value: 'senior_therapist', label: 'Senior Therapist' },
  { value: 'assistant_therapist', label: 'Assistant Therapist' },
  { value: 'hydrotherapist', label: 'Hydrotherapist' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'office_manager', label: 'Office Manager' },
  { value: 'administrator', label: 'Administrator' },
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
  const [showEdit, setShowEdit] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [showReset, setShowReset] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '+65 ', role: 'assistant_therapist', password: '', photo_url: '', specializations: [] as string[] })
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '+65 ', role: 'assistant_therapist', photo_url: '', specializations: [] as string[], active: true })

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
      setForm({ name: '', email: '', phone: '+65 ', role: 'assistant_therapist', password: '', photo_url: '', specializations: [] })
      setShowAdd(false)
      fetchStaff()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to add staff')
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!showReset) return
    setTempPassword(null)
    const res = await fetch('/api/staff/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: showReset.id, password: resetPassword || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      setTempPassword(data.tempPassword || null)
      setResetPassword('')
      fetchStaff()
    } else {
      alert(data.error || 'Failed to reset password')
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

  function openEdit(staffMember: any) {
    const specs = staffMember.specializations ? JSON.parse(staffMember.specializations) : []
    setEditForm({
      id: staffMember.id,
      name: staffMember.name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '+65 ',
      role: staffMember.role || 'assistant_therapist',
      photo_url: staffMember.photo_url || '',
      specializations: specs,
      active: staffMember.active !== false,
    })
    setShowEdit(staffMember)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/staff', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setShowEdit(null)
      fetchStaff()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to update staff')
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

  function toggleSpecEdit(spec: string) {
    setEditForm(f => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter(s => s !== spec)
        : [...f.specializations, spec]
    }))
  }

  const roleLabel: Record<string, string> = {
    administrator: 'Administrator',
    office_manager: 'Office Manager',
    marketing: 'Marketing',
    veterinarian: 'Veterinarian',
    senior_therapist: 'Senior Therapist',
    assistant_therapist: 'Assistant Therapist',
    hydrotherapist: 'Hydrotherapist',
    admin: 'Administrator',
    vet: 'Veterinarian',
    therapist: 'Senior Therapist',
    receptionist: 'Receptionist',
  }
  const roleColor: Record<string, string> = {
    administrator: 'badge-pink',
    office_manager: 'badge-pink',
    marketing: 'badge-yellow',
    veterinarian: 'badge-green',
    senior_therapist: 'badge-blue',
    assistant_therapist: 'badge-blue',
    hydrotherapist: 'badge-blue',
    admin: 'badge-pink',
    vet: 'badge-green',
    therapist: 'badge-blue',
    receptionist: 'badge-yellow',
  }

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
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-brand-navy hover:bg-brand-navy/5"
                    title="Edit profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setShowReset(s); setTempPassword(null); setResetPassword('') }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-brand-navy hover:bg-brand-navy/5"
                    title="Reset password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDelete(s)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                    title="Remove staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-start gap-3">
                  {s.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo_url} alt={s.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-sm">
                      {s.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                  )}
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
            <label className="label">Photo URL</label>
            <input className="input" placeholder="https://..." value={form.photo_url} onChange={e => setForm({...form, photo_url: e.target.value})} />
            <p className="text-xs text-gray-500 mt-1">Optional. If set, it will show as the staff avatar.</p>
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

      {/* Edit Staff Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Edit Staff Profile">
        {showEdit && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <PhoneInput value={editForm.phone} onChange={v => setEditForm({...editForm, phone: v})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Role *</label>
                <select className="input" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={editForm.active ? 'active' : 'inactive'} onChange={e => setEditForm({...editForm, active: e.target.value === 'active'})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Photo URL</label>
              <input className="input" placeholder="https://..." value={editForm.photo_url} onChange={e => setEditForm({...editForm, photo_url: e.target.value})} />
            </div>
            <div>
              <label className="label">Specializations</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SPEC_OPTIONS.map(sp => (
                  <button
                    key={sp} type="button"
                    onClick={() => toggleSpecEdit(sp)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      editForm.specializations.includes(sp)
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
              <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!showReset} onClose={() => { setShowReset(null); setTempPassword(null); setResetPassword('') }} title="Reset Staff Password">
        {showReset && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-gray-600">
              Reset password for <strong>{showReset.name}</strong> ({showReset.email}).
            </p>
            <div>
              <label className="label">New password (leave blank to generate a temporary password)</label>
              <input type="text" className="input" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
            </div>
            {tempPassword && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm text-green-800 font-semibold">Temporary password generated:</p>
                <p className="text-sm font-mono text-green-900 break-all">{tempPassword}</p>
                <p className="text-xs text-green-700 mt-1">Copy this now — it won’t be shown again.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowReset(null); setTempPassword(null); setResetPassword('') }} className="btn-secondary">Close</button>
              <button type="submit" className="btn-primary">Reset Password</button>
            </div>
          </form>
        )}
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
