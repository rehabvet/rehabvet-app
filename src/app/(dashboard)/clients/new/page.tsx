'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'
import AddressInput from '@/components/AddressInput'
import BreedSearch from '@/components/BreedSearch'

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Guinea Pig', 'Reptile', 'Other']

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '+65 ',
    address: '',
    notes: '',
    pets: [{ name: '', species: 'Dog', breed: '', medical_history: '' }],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const pets = form.pets
      .map(p => ({
        name: (p.name || '').trim(),
        species: p.species || 'Dog',
        breed: (p.breed || '').trim(),
        medical_history: (p.medical_history || '').trim(),
      }))
      .filter(p => p.name)

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
        pets,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const newId = data?.client?.id || data?.id
      if (newId) {
        router.push(`/clients/${newId}`)
      } else {
        router.push('/clients')
      }
    } else {
      setSaving(false)
      alert('Failed to create client. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clients" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>
          <p className="text-sm text-gray-500">Create a new pet owner profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* Owner Details */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Owner Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input
                className="input"
                placeholder="e.g. John"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input
                className="input"
                placeholder="e.g. Tan"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone *</label>
              <PhoneInput value={form.phone} onChange={v => setForm({ ...form, phone: v })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="email@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <AddressInput value={form.address} onChange={v => setForm({ ...form, address: v })} />
          </div>
        </div>

        {/* Pet Details */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pet Details</h2>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() =>
                setForm({
                  ...form,
                  pets: [...form.pets, { name: '', species: 'Dog', breed: '', medical_history: '' }],
                })
              }
            >
              + Add Pet
            </button>
          </div>

          <div className="space-y-4">
            {form.pets.map((pet, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">Pet #{idx + 1}</p>
                  {form.pets.length > 1 && (
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() =>
                        setForm({ ...form, pets: form.pets.filter((_, i) => i !== idx) })
                      }
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
                        const pets = [...form.pets]
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
                        const pets = [...form.pets]
                        pets[idx] = { ...pets[idx], species: e.target.value, breed: '' }
                        setForm({ ...form, pets })
                      }}
                    >
                      {SPECIES_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
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
                        const pets = [...form.pets]
                        pets[idx] = { ...pets[idx], breed: v }
                        setForm({ ...form, pets })
                      }}
                    />
                  </div>
                  <div>
                    <label className="label">Medical History</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Pre-existing conditions, surgeries, medications..."
                      value={pet.medical_history}
                      onChange={e => {
                        const pets = [...form.pets]
                        pets[idx] = { ...pets[idx], medical_history: e.target.value }
                        setForm({ ...form, pets })
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          <textarea
            className="input"
            rows={3}
            placeholder="Additional notes about the client"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/clients" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add Client'}
          </button>
        </div>
      </form>
    </div>
  )
}
