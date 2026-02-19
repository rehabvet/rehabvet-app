'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight } from 'lucide-react'
import Modal from '@/components/Modal'

const SPECIES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Horse', 'Other']
const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutered_male', label: 'Neutered Male' },
  { value: 'spayed_female', label: 'Spayed Female' },
]

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ client_id: '', name: '', species: 'Dog', breed: '', date_of_birth: '', weight: '', sex: '', microchip: '', medical_history: '', allergies: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchPatients() }, [search])
  useEffect(() => { fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || [])) }, [])

  async function fetchPatients() {
    setLoading(true)
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    const res = await fetch(`/api/patients${q}`)
    const data = await res.json()
    setPatients(data.patients || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, weight: form.weight ? parseFloat(form.weight) : null })
    })
    setShowAdd(false)
    setForm({ client_id: '', name: '', species: 'Dog', breed: '', date_of_birth: '', weight: '', sex: '', microchip: '', medical_history: '', allergies: '' })
    fetchPatients()
  }

  const speciesEmoji: Record<string, string> = { Dog: '🐕', Cat: '🐈', Rabbit: '🐇', Bird: '🐦', Horse: '🐴', Other: '🐾' }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm">Manage pet profiles and medical records</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> Add Patient</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search patients..." className="input pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : patients.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No patients found</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {patients.map(p => (
              <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-lg">
                  {speciesEmoji[p.species] || '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.species} · {p.breed || 'Unknown breed'} · Owner: {p.client_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.active_plans > 0 && <span className="badge-green">{p.active_plans} active plan{p.active_plans > 1 ? 's' : ''}</span>}
                  {p.weight && <span className="text-xs text-gray-400">{p.weight}kg</span>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Patient" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Owner *</label>
            <select className="input" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} required>
              <option value="">Select owner...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Pet Name *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div>
              <label className="label">Species *</label>
              <select className="input" value={form.species} onChange={e => setForm({...form, species: e.target.value})}>
                {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Breed</label><input className="input" value={form.breed} onChange={e => setForm({...form, breed: e.target.value})} /></div>
            <div><label className="label">Date of Birth</label><input type="date" className="input" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} /></div>
            <div><label className="label">Weight (kg)</label><input type="number" step="0.1" className="input" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Sex</label>
              <select className="input" value={form.sex} onChange={e => setForm({...form, sex: e.target.value})}>
                <option value="">Select...</option>
                {SEX_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div><label className="label">Microchip #</label><input className="input" value={form.microchip} onChange={e => setForm({...form, microchip: e.target.value})} /></div>
          </div>
          <div><label className="label">Medical History</label><textarea className="input" rows={3} value={form.medical_history} onChange={e => setForm({...form, medical_history: e.target.value})} /></div>
          <div><label className="label">Allergies</label><input className="input" value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Patient</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
