'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, CheckCircle, Heart, Award, Clock, MapPin, Phone } from 'lucide-react'

const SERVICES = [
  { id: 'rehabilitation', label: 'Veterinary Rehabilitation', desc: 'Specialist recovery from injury or illness' },
  { id: 'physiotherapy', label: 'Physiotherapy', desc: 'Improve mobility and wellbeing' },
  { id: 'hydrotherapy', label: 'Hydrotherapy', desc: 'Natural aquatic therapy for dogs' },
  { id: 'hyperbaric', label: 'Hyperbaric Oxygen Treatment', desc: 'Increased oxygen for faster healing' },
  { id: 'tcm', label: 'Traditional Chinese Medicine', desc: 'Holistic ancient wisdom for pets' },
  { id: 'acupuncture', label: 'Acupuncture', desc: 'Pain relief through targeted therapy' },
  { id: 'unsure', label: "I'm Not Sure", desc: "We'll help figure out what's best" },
]

const HOW_HEARD = [
  'Google Search', 'Instagram', 'Facebook', 'Friend or Family',
  'Vet or clinic referred', 'Events and Expo', 'Other',
]

const SPECIES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Reptile', 'Other']

const GENDERS = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Male Neutered', label: 'Male (Neutered)' },
  { id: 'Female Neutered', label: 'Female (Neutered)' },
]

type Step = 1 | 2 | 3

export default function AppointmentPage() {
  const [step, setStep] = useState<Step>(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Pet
    pet_name: '', species: '', breed: '', age: '', weight: '',
    pet_gender: '', vet_friendly: null as boolean | null, reactive_to_pets: null as boolean | null,
    // Owner
    owner_name: '', owner_email: '', owner_phone: '', post_code: '', how_heard: '',
    // Visit
    service: '', condition: '', has_pain: null as boolean | null,
    clinic_name: '', attending_vet: '',
    preferred_date: '', first_visit: true, notes: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const canNext1 = form.pet_name && form.species
  const canNext2 = form.owner_name && form.owner_email && form.owner_phone
  const canSubmit = form.service

  async function submit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">You're all set! 🐾</h1>
          <p className="text-gray-600 text-lg mb-2">
            Thank you, <strong>{form.owner_name}</strong>. We've received your request for <strong>{form.pet_name}</strong>.
          </p>
          <p className="text-gray-500 mb-8">
            Our team will review your enquiry and reach out to <strong>{form.owner_email}</strong> within 1 business day to confirm your appointment.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left space-y-3 mb-8">
            <h3 className="font-semibold text-gray-900">What happens next?</h3>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <p className="text-sm text-gray-600">Our team reviews your submission and checks availability</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <p className="text-sm text-gray-600">We call or email you to confirm the appointment time</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
              <p className="text-sm text-gray-600">Bring your pet in and start the journey to recovery!</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">Need urgent help? Call us at <a href="tel:62916881" className="text-rose-600 font-medium">6291 6881</a></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">RehabVet</p>
              <p className="text-xs text-gray-500 leading-tight">Singapore's #1 Pet Rehab Clinic</p>
            </div>
          </div>
          <a href="tel:62916881" className="hidden sm:flex items-center gap-2 text-sm text-gray-600 hover:text-rose-600 transition-colors">
            <Phone className="w-4 h-4" />
            6291 6881
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

          {/* Left — Trust column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-rose-600 font-semibold text-sm uppercase tracking-wide mb-2">Book an Appointment</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                Restore Your Pet's <span className="text-rose-600">Mobility</span> & Quality of Life
              </h1>
              <p className="text-gray-600 mt-4 leading-relaxed">
                Singapore's first full-fledged animal rehabilitation clinic. Our experienced vets and therapists offer the widest range of physical therapies to help your pet recover.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Award, title: "Singapore's First", desc: "Pioneer in veterinary rehabilitation since day one" },
                { icon: Heart, title: 'Compassionate Care', desc: 'Expert team dedicated to your pet\'s wellbeing' },
                { icon: Clock, title: 'Quick Response', desc: 'We confirm your appointment within 1 business day' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-gray-500 text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="font-semibold text-gray-900 text-sm">Visit Us</p>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                513 Serangoon Road #01-01, Singapore 218154
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-rose-500 flex-shrink-0" />
                6291 6881
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="lg:col-span-3">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step > s ? 'bg-green-500 text-white' :
                    step === s ? 'bg-rose-600 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {step > s ? '✓' : s}
                  </div>
                  <div className={`text-xs font-medium hidden sm:block ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s === 1 ? "Your Pet" : s === 2 ? "About You" : "Your Visit"}
                  </div>
                  {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">

              {/* Step 1 — Pet info */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Tell us about your pet</h2>
                    <p className="text-gray-500 text-sm mt-1">We'll use this to prepare the right treatment plan</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pet's Name <span className="text-rose-500">*</span></label>
                    <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. Max" value={form.pet_name} onChange={e => set('pet_name', e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Species <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-3 gap-2">
                      {SPECIES.map(s => (
                        <button key={s} onClick={() => set('species', s)}
                          className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${form.species === s ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Breed</label>
                      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. Golden Retriever" value={form.breed} onChange={e => set('breed', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
                      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. 5 years" value={form.age} onChange={e => set('age', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GENDERS.map(g => (
                        <button key={g.id} onClick={() => set('pet_gender', g.id)}
                          className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all text-left ${form.pet_gender === g.id ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight (optional)</label>
                    <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. 12 kg" value={form.weight} onChange={e => set('weight', e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Is your pet vet-friendly?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: true, l: 'Yes' }, { v: false, l: 'No / Nervous' }].map(({ v, l }) => (
                        <button key={l} onClick={() => set('vet_friendly', v)}
                          className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${form.vet_friendly === v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Is your pet reactive to other animals?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
                        <button key={l} onClick={() => set('reactive_to_pets', v)}
                          className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${form.reactive_to_pets === v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setStep(2)} disabled={!canNext1}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
                    Next: About You <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Step 2 — Owner info */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Your details</h2>
                    <p className="text-gray-500 text-sm mt-1">We'll use this to confirm your appointment</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name <span className="text-rose-500">*</span></label>
                    <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. Sarah Tan" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-rose-500">*</span></label>
                    <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="sarah@email.com" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-rose-500">*</span></label>
                      <input type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. 9123 4567" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
                      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. 218154" value={form.post_code} onChange={e => set('post_code', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">How did you hear about us?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {HOW_HEARD.map(h => (
                        <button key={h} onClick={() => set('how_heard', h)}
                          className={`py-2.5 px-3 rounded-xl border text-sm text-left transition-all ${form.how_heard === h ? 'border-rose-500 bg-rose-50 text-rose-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 border border-gray-200 text-gray-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                      <ChevronLeft className="w-5 h-5" /> Back
                    </button>
                    <button onClick={() => setStep(3)} disabled={!canNext2}
                      className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
                      Next: Your Visit <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 — Visit info */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">About your visit</h2>
                    <p className="text-gray-500 text-sm mt-1">Help us prepare the best care for {form.pet_name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Interested In <span className="text-rose-500">*</span></label>
                    <div className="space-y-2">
                      {SERVICES.map(s => (
                        <button key={s.id} onClick={() => set('service', s.id)}
                          className={`w-full p-4 rounded-xl border text-left transition-all ${form.service === s.id ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <p className={`font-medium text-sm ${form.service === s.id ? 'text-rose-700' : 'text-gray-900'}`}>{s.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Does your pet display symptoms of pain?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: true, l: 'Yes' }, { v: false, l: 'No / Not sure' }].map(({ v, l }) => (
                        <button key={l} onClick={() => set('has_pain', v)}
                          className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${form.has_pain === v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">What is the current issue with your pet's mobility?</label>
                    <textarea rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900 resize-none" placeholder="e.g. My dog has been limping after surgery and can't put weight on his back leg..." value={form.condition} onChange={e => set('condition', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Vet Clinic(s)</label>
                      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. Mount Pleasant" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Attending Vet</label>
                      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" placeholder="e.g. Dr Sarah Wong" value={form.attending_vet} onChange={e => set('attending_vet', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Appointment Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition text-gray-900" value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Is this your first visit?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: true, l: 'Yes, first visit' }, { v: false, l: 'No, returning patient' }].map(({ v, l }) => (
                        <button key={l} onClick={() => set('first_visit', v)}
                          className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${form.first_visit === v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl p-3">{error}</p>}

                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 border border-gray-200 text-gray-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                      <ChevronLeft className="w-5 h-5" /> Back
                    </button>
                    <button onClick={submit} disabled={loading || !canSubmit}
                      className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
                      {loading ? <span className="animate-spin">⏳</span> : '🐾'} {loading ? 'Submitting...' : 'Request Appointment'}
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-400">
                    By submitting you agree to be contacted by RehabVet regarding your appointment request.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
