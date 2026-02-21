'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'

const HOW_HEARD = [
  'Google Search',
  'Vet or clinic referred',
  'Friend or Family',
  'IG/FB/TikTok',
  'Events and Expo',
  'Other',
]

const GENDERS = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Male Neutered', label: 'Male Neutered' },
  { id: 'Female Neutered', label: 'Female Neutered' },
]

type Step = 1 | 2 | 3

export default function AppointmentPage() {
  const [step, setStep] = useState<Step>(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '', last_name: '', owner_email: '', owner_phone: '', post_code: '',
    pet_name: '', breed: '', age: '', pet_gender: '',
    vet_friendly: null as boolean | null,
    reactive_to_pets: null as boolean | null,
    clinic_name: '', attending_vet: '',
    has_pain: null as boolean | null,
    condition: '', how_heard: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const canNext1 = form.first_name && form.last_name && form.owner_email && form.owner_phone && form.post_code
  const canNext2 = form.pet_name && form.breed && form.age && form.pet_gender && form.vet_friendly !== null && form.reactive_to_pets !== null
  const canSubmit = form.clinic_name && form.attending_vet && form.has_pain !== null && form.how_heard

  async function submit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          owner_name: `${form.first_name} ${form.last_name}`.trim(),
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or call us at 6291 6881.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Received!</h2>
          <p className="text-gray-500 mb-2">Thank you for reaching out to RehabVet.</p>
          <p className="text-gray-500">Our team will be in touch shortly to confirm your appointment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo.webp" alt="RehabVet" className="h-12 mx-auto mb-4" onError={e => (e.currentTarget.style.display = 'none')} />
          <h1 className="text-2xl font-bold text-gray-900">Make an Appointment</h1>
          <p className="text-gray-500 text-sm mt-1">Restore Your Pet's Mobility</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                step > s ? 'bg-green-500 text-white' : step === s ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 rounded transition-all ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">

          {/* ─── STEP 1: Customer Information ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Customer Information</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-rose-500">*</span></label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Jane" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-rose-500">*</span></label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Smith" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-rose-500">*</span></label>
                <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="jane@email.com" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-rose-500">*</span></label>
                <input type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="+65 9123 4567" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code <span className="text-rose-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="123456" value={form.post_code} onChange={e => set('post_code', e.target.value)} />
              </div>

              <button onClick={() => setStep(2)} disabled={!canNext1} className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Pet's Information ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Pet's Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name of Pet <span className="text-rose-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Buddy" value={form.pet_name} onChange={e => set('pet_name', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Breed <span className="text-rose-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Golden Retriever" value={form.breed} onChange={e => set('breed', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age <span className="text-rose-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="e.g. 3 years" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map(g => (
                    <button key={g.id} type="button" onClick={() => set('pet_gender', g.id)}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${form.pet_gender === g.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-300'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vet Friendly? <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ val: true, label: 'Yes' }, { val: false, label: 'No (Aggressive)' }].map(o => (
                    <button key={String(o.val)} type="button" onClick={() => set('vet_friendly', o.val)}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${form.vet_friendly === o.val ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-300'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Is Your Pet Reactive To Other Pets? <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(o => (
                    <button key={String(o.val)} type="button" onClick={() => set('reactive_to_pets', o.val)}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${form.reactive_to_pets === o.val ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-300'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!canNext2} className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Vet Info + Mobility + How Heard ─── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Veterinarian Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Veterinarian Information</h2>
                <p className="text-sm text-gray-500 -mt-2">Let us know who is your attending vet and clinic</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name of Clinic(s) <span className="text-rose-500">*</span></label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="e.g. Mount Pleasant Vet" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name of Attending Vet <span className="text-rose-500">*</span></label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Dr. Lee" value={form.attending_vet} onChange={e => set('attending_vet', e.target.value)} />
                </div>
              </div>

              {/* Pet's Current Mobility Condition */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Pet's Current Mobility Condition</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Does your pet display symptoms of pain? <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(o => (
                      <button key={String(o.val)} type="button" onClick={() => set('has_pain', o.val)}
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${form.has_pain === o.val ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-300'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">What is the current issue with your pet's mobility?</label>
                  <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" rows={4} placeholder="Please describe your pet's condition..." value={form.condition} onChange={e => set('condition', e.target.value)} />
                </div>
              </div>

              {/* How did you find out */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">How did you find out about us?</h2>
                <p className="text-sm text-gray-500 -mt-1">We are interested to know how you learned about us <span className="text-rose-500">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {HOW_HEARD.map(h => (
                    <button key={h} type="button" onClick={() => set('how_heard', h)}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all text-left ${form.how_heard === h ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-300'}`}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={submit} disabled={!canSubmit || loading} className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition">
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">RehabVet Clinic · 6291 6881</p>
      </div>
    </div>
  )
}
