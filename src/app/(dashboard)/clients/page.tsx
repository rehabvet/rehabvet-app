'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Phone, Mail, ChevronRight, Trash2 } from 'lucide-react'
import Modal from '@/components/Modal'
import Pagination from '@/components/Pagination'
import PhoneInput from '@/components/PhoneInput'
import AddressInput from '@/components/AddressInput'
import BreedSearch from '@/components/BreedSearch'

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Guinea Pig', 'Reptile', 'Other']

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '+65 ',
    address: '',
    notes: '',
    pets: [{ name: '', species: 'Dog', breed: '', medical_history: '' }],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { fetchClients(page) }, [search, page])

  async function fetchClients(p = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', encodeURIComponent(search))
    params.set('page', String(p))
    params.set('limit', String(PAGE_SIZE))
    const res = await fetch(`/api/clients?${params}`)
    const data = await res.json()
    setClients(data.clients || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()

    const pets = (form.pets || [])
      .map(p => ({
        name: (p.name || '').trim(),
        species: p.species || 'Dog',
        breed: (p.breed || '').trim(),
        medical_history: (p.medical_history || '').trim(),
      }))
      .filter(p => p.name)

    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
        pets,
      })
    })

    setForm({
      name: '',
      email: '',
      phone: '+65 ',
      address: '',
      notes: '',
      pets: [{ name: '', species: 'Dog', breed: '', medical_history: '' }],
    })
    setShowAdd(false)
    fetchClients(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">{total > 0 ? `${total} clients total` : 'Manage pet owner profiles'}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search clients..." className="input pl-10"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : clients.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No clients found</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {clients.map(c => (
              <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink font-semibold text-sm">
                  {c.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="badge-pink">{c.patient_count} pet{c.patient_count !== 1 ? 's' : ''}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))}
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={p => setPage(p)} />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Client">
        <form onSubmit={handleAdd} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Owner Details</h3>
          <div>
            <label className="label">Owner Name *</label>
            <input className="input" placeholder="Pet owner's full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone *</label>
              <PhoneInput value={form.phone} onChange={v => setForm({...form, phone: v})} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <AddressInput value={form.address} onChange={v => setForm({...form, address: v})} />
          </div>

          <hr className="border-gray-200" />
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pet Details</h3>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setForm({
                ...form,
                pets: [...(form.pets || []), { name: '', species: 'Dog', breed: '', medical_history: '' }]
              })}
            >
              + Add Pet
            </button>
          </div>

          <div className="space-y-4">
            {(form.pets || []).map((pet: any, idx: number) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">Pet #{idx + 1}</p>
                  {(form.pets || []).length > 1 && (
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => setForm({
                        ...form,
                        pets: (form.pets || []).filter((_: any, i: number) => i !== idx)
                      })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Pet Name *</label>
                    <input
                      className="input"
                      placeholder="Pet's name"
                      value={pet.name}
                      onChange={e => {
                        const pets = [...(form.pets || [])]
                        pets[idx] = { ...pets[idx], name: e.target.value }
                        setForm({ ...form, pets })
                      }}
                      required={idx === 0}
                    />
                  </div>
                  <div>
                    <label className="label">Type of Animal</label>
                    <select
                      className="input"
                      value={pet.species}
                      onChange={e => {
                        const pets = [...(form.pets || [])]
                        pets[idx] = { ...pets[idx], species: e.target.value, breed: '' }
                        setForm({ ...form, pets })
                      }}
                    >
                      {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="label">Breed</label>
                    <BreedSearch
                      species={pet.species}
                      value={pet.breed}
                      onChange={v => {
                        const pets = [...(form.pets || [])]
                        pets[idx] = { ...pets[idx], breed: v }
                        setForm({ ...form, pets })
                      }}
                    />
                  </div>
                  <div>
                    <label className="label">Medical History</label>
                    <textarea
                      className="input"
                      rows={1}
                      placeholder="Pre-existing conditions, surgeries, medications..."
                      value={pet.medical_history}
                      onChange={e => {
                        const pets = [...(form.pets || [])]
                        pets[idx] = { ...pets[idx], medical_history: e.target.value }
                        setForm({ ...form, pets })
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Additional notes about the client" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Client</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
