'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, Phone, Mail, ChevronRight, ChevronDown } from 'lucide-react'
import Modal from '@/components/Modal'
import PhoneInput from '@/components/PhoneInput'
import AddressInput from '@/components/AddressInput'
import { DOG_BREEDS, CAT_BREEDS } from '@/lib/breeds'

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Guinea Pig', 'Reptile', 'Other']

function BreedSearch({ species, value, onChange }: { species: string, value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  
  const breeds = species === 'Cat' ? CAT_BREEDS : DOG_BREEDS
  const filtered = useMemo(() => {
    if (!query) return breeds.slice(0, 50)
    return breeds.filter(b => b.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
  }, [query, breeds])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className="input pr-8"
          placeholder="Search breed..."
          value={open ? query : value}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setQuery(value) }}
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {query && !breeds.some(b => b.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors text-green-600 font-medium border-b border-gray-100"
              onClick={() => { onChange(query); setOpen(false) }}
            >
              + Add "{query}"
            </button>
          )}
          {filtered.length === 0 && !query ? (
            <div className="px-3 py-2 text-sm text-gray-400">Type to search breeds</div>
          ) : (
            filtered.map(b => (
              <button
                key={b} type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-pink/10 transition-colors ${b === value ? 'bg-brand-pink/10 text-brand-pink font-medium' : 'text-gray-700'}`}
                onClick={() => { onChange(b); setOpen(false); setQuery(b) }}
              >
                {b}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '+65 ', address: '', notes: '',
    petName: '', species: 'Dog', breed: '', medicalHistory: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [search])

  async function fetchClients() {
    setLoading(true)
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    const res = await fetch(`/api/clients${q}`)
    const data = await res.json()
    setClients(data.clients || [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, email: form.email, phone: form.phone, address: form.address, notes: form.notes,
        pet: form.petName ? { name: form.petName, species: form.species, breed: form.breed, medical_history: form.medicalHistory } : undefined
      })
    })
    setForm({ name: '', email: '', phone: '+65 ', address: '', notes: '', petName: '', species: 'Dog', breed: '', medicalHistory: '' })
    setShowAdd(false)
    fetchClients()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">Manage pet owner profiles</p>
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
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pet Details</h3>
          <div>
            <label className="label">Pet Name *</label>
            <input className="input" placeholder="Pet's name" value={form.petName} onChange={e => setForm({...form, petName: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type of Animal</label>
              <select className="input" value={form.species} onChange={e => setForm({...form, species: e.target.value, breed: ''})}>
                {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Breed</label>
              <BreedSearch species={form.species} value={form.breed} onChange={v => setForm({...form, breed: v})} />
            </div>
          </div>
          <div>
            <label className="label">Medical History</label>
            <textarea className="input" rows={3} placeholder="Pre-existing conditions, surgeries, medications..." value={form.medicalHistory} onChange={e => setForm({...form, medicalHistory: e.target.value})} />
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
