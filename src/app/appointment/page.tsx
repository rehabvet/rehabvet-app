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

const STEPS = [
  { n: 1, label: 'Your Info' },
  { n: 2, label: "Pet's Info" },
  { n: 3, label: 'Health & Vet' },
]

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
        active
          ? 'bg-brand-pink text-white border-brand-pink'
          : 'bg-white text-gray-700 border-gray-300 hover:border-brand-pink hover:text-brand-pink'
      }`}
    >
      {children}
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-gray-900 border-b-2 border-brand-yellow pb-2 mb-4">
      {children}
    </h2>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-brand-pink">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors'

export default function AppointmentPage() {
  const [step, setStep] = useState<Step>(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '', last_name: '', owner_email: '', owner_phone: '+65 ', post_code: '',
    pet_name: '', breed: '', age: '', pet_gender: '',
    vet_friendly: null as boolean | null,
    reactive_to_pets: null as boolean | null,
    clinic_name: '', attending_vet: '',
    has_pain: null as boolean | null,
    condition: '', how_heard: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const canNext1 = form.first_name && form.last_name && form.owner_email && form.owner_phone.trim().length > 4 && form.post_code
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
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <img src="/rehabvet-logo.jpg" alt="RehabVet" className="h-16 mx-auto mb-8 object-contain" />
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-brand-green" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Received!</h2>
          <p className="text-gray-500 mb-1">Thank you for reaching out to RehabVet.</p>
          <p className="text-gray-500">Our team will be in touch shortly to confirm your appointment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50 py-10 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <img src="/rehabvet-logo.jpg" alt="RehabVet" className="h-16 mx-auto mb-2 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Make an Appointment</h1>
          <p className="text-sm font-medium text-brand-pink mt-1">Proven steps to pain free mobility</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-start gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                  step > s.n ? 'bg-brand-green text-white' : step === s.n ? 'bg-brand-pink text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className={`text-xs font-medium hidden sm:block transition-colors ${step === s.n ? 'text-brand-pink' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-1 mx-2 mb-4 rounded transition-all ${step > s.n ? 'bg-brand-green' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">

          {/* ─── STEP 1: Customer Information ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionTitle>Customer Information</SectionTitle>

              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" required>
                  <input className={inputClass} placeholder="Jane" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </Field>
                <Field label="Last Name" required>
                  <input className={inputClass} placeholder="Smith" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </Field>
              </div>

              <Field label="Email" required>
                <input type="email" className={inputClass} placeholder="jane@email.com" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
              </Field>

              <Field label="Phone Number" required>
                <input type="tel" className={inputClass} placeholder="9123 4567" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
              </Field>

              <Field label="Postal Code" required>
                <input className={inputClass} placeholder="123456" value={form.post_code} onChange={e => set('post_code', e.target.value)} />
              </Field>

              <button
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Pet's Information ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle>Pet's Information</SectionTitle>

              <Field label="Name of Pet" required>
                <input className={inputClass} placeholder="Buddy" value={form.pet_name} onChange={e => set('pet_name', e.target.value)} />
              </Field>

              <Field label="Breed" required>
                <input className={inputClass} placeholder="e.g. Golden Retriever" value={form.breed} onChange={e => set('breed', e.target.value)} />
              </Field>

              <Field label="Age" required>
                <input className={inputClass} placeholder="e.g. 3 years" value={form.age} onChange={e => set('age', e.target.value)} />
              </Field>

              <Field label="Gender" required>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map(g => (
                    <ToggleButton key={g.id} active={form.pet_gender === g.id} onClick={() => set('pet_gender', g.id)}>
                      {g.label}
                    </ToggleButton>
                  ))}
                </div>
              </Field>

              <Field label="Vet Friendly?" required>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleButton active={form.vet_friendly === true} onClick={() => set('vet_friendly', true)}>Yes</ToggleButton>
                  <ToggleButton active={form.vet_friendly === false} onClick={() => set('vet_friendly', false)}>No (Aggressive)</ToggleButton>
                </div>
              </Field>

              <Field label="Is Your Pet Reactive To Other Pets?" required>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleButton active={form.reactive_to_pets === true} onClick={() => set('reactive_to_pets', true)}>Yes</ToggleButton>
                  <ToggleButton active={form.reactive_to_pets === false} onClick={() => set('reactive_to_pets', false)}>No</ToggleButton>
                </div>
              </Field>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!canNext2} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3 ─── */}
          {step === 3 && (
            <div className="space-y-6">

              {/* Veterinarian Information */}
              <div className="space-y-4">
                <SectionTitle>Veterinarian Information</SectionTitle>
                <p className="text-sm text-gray-500 -mt-3">Let us know who is your attending vet and clinic</p>

                <Field label="Name of Clinic(s)" required>
                  <input className={inputClass} placeholder="e.g. Mount Pleasant Vet" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
                </Field>

                <Field label="Name of Attending Vet" required>
                  <input className={inputClass} placeholder="Dr. Lee" value={form.attending_vet} onChange={e => set('attending_vet', e.target.value)} />
                </Field>
              </div>

              {/* Pet's Current Mobility Condition */}
              <div className="space-y-4">
                <SectionTitle>Pet's Current Mobility Condition</SectionTitle>

                <Field label="Does your pet display symptoms of pain?" required>
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleButton active={form.has_pain === true} onClick={() => set('has_pain', true)}>Yes</ToggleButton>
                    <ToggleButton active={form.has_pain === false} onClick={() => set('has_pain', false)}>No</ToggleButton>
                  </div>
                </Field>

                <Field label="What is the current issue with your pet's mobility?">
                  <textarea className={inputClass + ' resize-none'} rows={4} placeholder="Please describe your pet's condition…" value={form.condition} onChange={e => set('condition', e.target.value)} />
                </Field>
              </div>

              {/* How did you find out */}
              <div className="space-y-3">
                <SectionTitle>How did you find out about us?</SectionTitle>
                <p className="text-sm text-gray-500 -mt-3">
                  We are interested to know how you learned about us <span className="text-brand-pink">*</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {HOW_HEARD.map(h => (
                    <ToggleButton key={h} active={form.how_heard === h} onClick={() => set('how_heard', h)}>
                      {h}
                    </ToggleButton>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={submit}
                  disabled={!canSubmit || loading}
                  className="flex-1 bg-brand-green hover:bg-brand-green-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
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
