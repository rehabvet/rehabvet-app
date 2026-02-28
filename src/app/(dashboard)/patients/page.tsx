'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import Modal from '@/components/Modal'
import BreedSearch from '@/components/BreedSearch'
import Pagination from '@/components/Pagination'

const SPECIES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Horse', 'Other']
const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutered_male', label: 'Neutered Male' },
  { value: 'spayed_female', label: 'Spayed Female' },
]

function calcAge(dob: string | null) {
  if (!dob) return '—'
  const birth = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years === 0) return `${months}mo`
  if (years < 2) return `${years}y ${months}mo`
  return `${years}y`
}

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ client_id: '', name: '', species: 'Dog', breed: '', date_of_birth: '', weight: '', sex: '', microchip: '', medical_history: '', allergies: '', is_reactive: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { fetchPatients(page) }, [search, page])
  useEffect(() => { fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || [])) }, [])

  async function fetchPatients(p = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', encodeURIComponent(search))
    params.set('page', String(p))
    params.set('limit', String(PAGE_SIZE))
    const res = await fetch(`/api/patients?${params}`)
    const data = await res.json()
    setPatients(data.patients || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, weight: form.weight ? parseFloat(form.weight) : null })
    })
    setShowAdd(false)
    setForm({ client_id: '', name: '', species: 'Dog', breed: '', date_of_birth: '', weight: '', sex: '', microchip: '', medical_history: '', allergies: '', is_reactive: false })
    fetchPatients(page)
  }

  const speciesEmoji: Record<string, string> = { Dog: '🐕', Cat: '🐈', Rabbit: '🐇', Bird: '🐦', Horse: '🐴', Other: '🐾' }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm">{total > 0 ? `${total} patients total` : 'Manage pet profiles and medical records'}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> Add Patient</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search patients..." className="input pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : patients.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No patients found</p>
        ) : (
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Breed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Weight</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Plans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map(p => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/patients/${p.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {/* Patient name + species */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{speciesEmoji[p.species] || '🐾'}</span>
                      <div>
                        <span className="font-semibold text-gray-900">{p.name}</span>
                        {p.is_reactive && (
                          <span className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">⚠️ Reactive</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Breed */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-gray-600">{p.breed || <span className="text-gray-300">—</span>}</span>
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3">
                    <span className="text-gray-700">{p.client_name}</span>
                  </td>

                  {/* Age */}
                  <td className="px-4 py-3">
                    <span className="text-gray-700 font-medium">{calcAge(p.date_of_birth)}</span>
                  </td>

                  {/* Weight */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-500">{p.weight ? `${p.weight} kg` : <span className="text-gray-300">—</span>}</span>
                  </td>

                  {/* Active plans */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.active_plans > 0
                      ? <span className="badge-green">{p.active_plans} active</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={p => setPage(p)} />
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
              <select className="input" value={form.species} onChange={e => setForm({...form, species: e.target.value, breed: ''})}>
                {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Breed</label>
              <BreedSearch species={form.species} value={form.breed} onChange={v => setForm({ ...form, breed: v })} />
            </div>
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
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors">
            <input
              type="checkbox"
              checked={form.is_reactive}
              onChange={e => setForm({...form, is_reactive: e.target.checked})}
              className="w-4 h-4 accent-red-500"
            />
            <div>
              <p className="text-sm font-semibold text-red-700">⚠️ Reactive Patient</p>
              <p className="text-xs text-red-500">Mark this pet as reactive — a warning will show on all appointments and visit records</p>
            </div>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Patient</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
