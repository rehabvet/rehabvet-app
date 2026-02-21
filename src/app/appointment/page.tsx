'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, CheckCircle, Star, Shield, Award, Clock } from 'lucide-react'

const HOW_HEARD = [
  'Google Search',
  'Vet or clinic referred',
  'Friend or Family',
  'IG/FB/TikTok',
  'Events and Expo',
  'Other',
]

const GENDERS = ['Male', 'Female', 'Male Neutered', 'Female Neutered']

const REVIEWS = [
  {
    name: 'Sarah T.',
    pet: 'Labrador owner',
    stars: 5,
    text: 'After Max\'s surgery, we were told he might never walk normally again. After 8 sessions at RehabVet, he\'s running on the beach. The team is incredible.',
  },
  {
    name: 'James L.',
    pet: 'Golden Retriever owner',
    stars: 5,
    text: 'Our vet referred us here and it was the best decision. Buddy had severe hip dysplasia and the hydrotherapy sessions transformed his quality of life.',
  },
  {
    name: 'Priya M.',
    pet: 'Dachshund owner',
    stars: 5,
    text: 'Cookie had IVDD and could barely move. The rehab team was so patient and professional. 3 months later she\'s back to her cheeky self.',
  },
]

const STATS = [
  { value: '10+', label: 'Years of Experience' },
  { value: '5000+', label: 'Pets Rehabilitated' },
  { value: '4.9★', label: 'Google Rating' },
  { value: 'SG\'s 1st', label: 'Vet Rehab Clinic' },
]

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all text-left ${
        active ? 'bg-brand-pink text-white border-brand-pink shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-pink hover:text-brand-pink'
      }`}>
      {children}
    </button>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30 focus:border-brand-pink transition-colors bg-gray-50 focus:bg-white'

export default function AppointmentPage() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewIdx, setReviewIdx] = useState(0)

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
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, owner_name: `${form.first_name} ${form.last_name}`.trim() }),
      })
      if (!res.ok) throw new Error()
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
          <img src="/rehabvet-logo.jpg" alt="RehabVet" className="h-14 mx-auto mb-8 object-contain" />
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-brand-green" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're on your way!</h2>
          <p className="text-gray-500 mb-4">Our team will review your request and be in touch within <strong>1 business day</strong> to confirm your appointment.</p>
          <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl p-4 text-sm text-gray-600">
            📞 Need to speak to us sooner? Call <strong>6291 6881</strong>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src="/rehabvet-logo.jpg" alt="RehabVet" className="h-10 object-contain" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <span className="font-semibold text-gray-700">4.9</span>
            <span className="hidden sm:inline">· Google Reviews</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ─── LEFT: Value proposition ─── */}
          <div className="space-y-8">

            {/* Hero copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-pink/10 text-brand-pink text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Award className="w-3.5 h-3.5" /> Singapore's First Veterinary Rehabilitation Clinic
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
                Help Your Pet Move <span className="text-brand-pink">Without Pain</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed">
                Whether your pet is recovering from surgery, managing arthritis, or needs physiotherapy — our expert team creates personalised recovery plans that work.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATS.map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
                  <p className="text-xl font-extrabold text-brand-pink">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Trust points */}
            <div className="space-y-3">
              {[
                { icon: Shield, text: 'Certified veterinary rehabilitation therapists' },
                { icon: Clock, text: 'Flexible weekday & weekend slots available' },
                { icon: CheckCircle, text: 'Hydrotherapy, HBOT, Acupuncture & more' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-yellow/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-brand-yellow-dark" />
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{text}</p>
                </div>
              ))}
            </div>

            {/* Review carousel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex mb-3">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-4 min-h-[60px]">"{REVIEWS[reviewIdx].text}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{REVIEWS[reviewIdx].name}</p>
                  <p className="text-xs text-gray-400">{REVIEWS[reviewIdx].pet}</p>
                </div>
                <div className="flex gap-1.5">
                  {REVIEWS.map((_, i) => (
                    <button key={i} onClick={() => setReviewIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === reviewIdx ? 'bg-brand-pink' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                <img src="https://www.google.com/favicon.ico" className="w-3 h-3" alt="" /> Google Review
              </p>
            </div>

          </div>

          {/* ─── RIGHT: The form ─── */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

              {/* Form header */}
              <div className="bg-gradient-to-r from-brand-pink to-brand-pink-light px-6 py-5">
                <h2 className="text-white font-bold text-lg">Book Your Appointment</h2>
                <p className="text-white/80 text-sm mt-0.5">Free to request · No commitment required</p>
                {/* Progress */}
                <div className="flex items-center gap-2 mt-4">
                  {['Your Info', "Pet's Info", 'Health & Vet'].map((label, i) => (
                    <div key={label} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          step > i + 1 ? 'bg-brand-green text-white' : step === i + 1 ? 'bg-white text-brand-pink' : 'bg-white/30 text-white/60'
                        }`}>
                          {step > i + 1 ? '✓' : i + 1}
                        </div>
                        <span className={`text-xs mt-1 hidden sm:block ${step === i + 1 ? 'text-white font-semibold' : 'text-white/50'}`}>{label}</span>
                      </div>
                      {i < 2 && <div className={`flex-1 h-0.5 mx-1.5 mb-4 sm:mb-5 rounded transition-all ${step > i + 1 ? 'bg-brand-green' : 'bg-white/30'}`} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 space-y-4">

                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">First Name <span className="text-brand-pink">*</span></label>
                        <input className={inputCls} placeholder="Jane" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Last Name <span className="text-brand-pink">*</span></label>
                        <input className={inputCls} placeholder="Smith" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Email <span className="text-brand-pink">*</span></label>
                      <input type="email" className={inputCls} placeholder="jane@email.com" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number <span className="text-brand-pink">*</span></label>
                      <input type="tel" className={inputCls} placeholder="9123 4567" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Postal Code <span className="text-brand-pink">*</span></label>
                      <input className={inputCls} placeholder="123456" value={form.post_code} onChange={e => set('post_code', e.target.value)} />
                    </div>
                    <button onClick={() => setStep(2)} disabled={!canNext1}
                      className="w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm shadow-brand-pink/30">
                      Next: Tell us about your pet <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Name of Pet <span className="text-brand-pink">*</span></label>
                      <input className={inputCls} placeholder="Buddy" value={form.pet_name} onChange={e => set('pet_name', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Breed <span className="text-brand-pink">*</span></label>
                        <input className={inputCls} placeholder="Golden Retriever" value={form.breed} onChange={e => set('breed', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Age <span className="text-brand-pink">*</span></label>
                        <input className={inputCls} placeholder="3 years" value={form.age} onChange={e => set('age', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Gender <span className="text-brand-pink">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {GENDERS.map(g => <ToggleBtn key={g} active={form.pet_gender === g} onClick={() => set('pet_gender', g)}>{g}</ToggleBtn>)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Vet Friendly? <span className="text-brand-pink">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleBtn active={form.vet_friendly === true} onClick={() => set('vet_friendly', true)}>Yes</ToggleBtn>
                        <ToggleBtn active={form.vet_friendly === false} onClick={() => set('vet_friendly', false)}>No (Aggressive)</ToggleBtn>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Reactive to Other Pets? <span className="text-brand-pink">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleBtn active={form.reactive_to_pets === true} onClick={() => set('reactive_to_pets', true)}>Yes</ToggleBtn>
                        <ToggleBtn active={form.reactive_to_pets === false} onClick={() => set('reactive_to_pets', false)}>No</ToggleBtn>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm flex items-center justify-center gap-1">
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <button onClick={() => setStep(3)} disabled={!canNext2}
                        className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-1 shadow-sm shadow-brand-pink/30">
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Veterinarian Information</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Name of Clinic(s) <span className="text-brand-pink">*</span></label>
                          <input className={inputCls} placeholder="e.g. Mount Pleasant Vet" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Name of Attending Vet <span className="text-brand-pink">*</span></label>
                          <input className={inputCls} placeholder="Dr. Lee" value={form.attending_vet} onChange={e => set('attending_vet', e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Pet's Mobility Condition</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Displays symptoms of pain? <span className="text-brand-pink">*</span></label>
                          <div className="grid grid-cols-2 gap-2">
                            <ToggleBtn active={form.has_pain === true} onClick={() => set('has_pain', true)}>Yes</ToggleBtn>
                            <ToggleBtn active={form.has_pain === false} onClick={() => set('has_pain', false)}>No</ToggleBtn>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Current mobility issue</label>
                          <textarea className={inputCls + ' resize-none'} rows={3} placeholder="Describe your pet's condition…" value={form.condition} onChange={e => set('condition', e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">How did you hear about us? <span className="text-brand-pink">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {HOW_HEARD.map(h => <ToggleBtn key={h} active={form.how_heard === h} onClick={() => set('how_heard', h)}>{h}</ToggleBtn>)}
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div className="flex gap-3">
                      <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm flex items-center justify-center gap-1">
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <button onClick={submit} disabled={!canSubmit || loading}
                        className="flex-1 bg-brand-green hover:bg-brand-green-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm shadow-brand-green/30">
                        {loading ? 'Submitting…' : '🐾 Request Appointment'}
                      </button>
                    </div>
                  </>
                )}

              </div>

              {/* Bottom trust bar */}
              <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Your info is secure</span>
                <span>·</span>
                <span>No spam, ever</span>
                <span>·</span>
                <span>📞 6291 6881</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
