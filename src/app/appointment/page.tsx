'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, CheckCircle, Star, Phone } from 'lucide-react'

const HOW_HEARD = ['Google Search', 'Vet or clinic referred', 'Friend or Family', 'IG/FB/TikTok', 'Events and Expo', 'Other']
const GENDERS = ['Male', 'Female', 'Male Neutered', 'Female Neutered']

const FALLBACK_REVIEWS = [
  { author: 'Logan W.', rating: 5, time: 'a month ago', photo: '', text: 'Dr. Sara and the team\'s explanations on joint care were very helpful. When my dog was injured, the treatment and home care really helped his recovery. Kind team and a lovely newly renovated space!' },
  { author: 'Shalene L.', rating: 5, time: '2 months ago', photo: '', text: 'After consulting RehabVet, Scotty went from constant limping to running again. The therapists are so detailed and patient — couldn\'t recommend them more highly.' },
  { author: 'Cherly K.', rating: 5, time: '3 months ago', photo: '', text: 'Haru has been going to RehabVet since Nov 2025. We witnessed huge improvements through ultrasound/laser therapy, land exercises and hydrotherapy. Exceptional care all round!' },
  { author: 'Jas S.', rating: 5, time: '4 months ago', photo: '', text: 'Truly grateful to Dr. Sara, the entire team, and especially Xan. Milo was diagnosed with IVDD Grade 3. The whole team has shown such genuine care throughout his recovery journey.' },
  { author: 'Henrietta T.', rating: 5, time: '5 months ago', photo: '', text: 'Always a pleasant experience — clean area, calm ambience and super patient therapists. Staff share tips on home care and explain in detail how your pet\'s muscles work.' },
]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
      active ? 'border-[#EC6496] bg-[#EC6496] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-[#EC6496] hover:text-[#EC6496]'
    }`}>{children}</button>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EC6496]/20 focus:border-[#EC6496] transition-colors bg-white'

export default function AppointmentPage() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviews, setReviews] = useState(FALLBACK_REVIEWS)
  const [gRating, setGRating] = useState({ rating: 4.8, total: 193 })

  const [form, setForm] = useState({
    first_name: '', last_name: '', owner_email: '', owner_phone: '+65 ', post_code: '',
    pet_name: '', breed: '', age: '', pet_gender: '',
    vet_friendly: null as boolean | null,
    reactive_to_pets: null as boolean | null,
    clinic_name: '', attending_vet: '',
    has_pain: null as boolean | null,
    condition: '', how_heard: '',
  })

  const s = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/google-reviews').then(r => r.json()).then(d => {
      if (d.reviews?.length > 0) setReviews(d.reviews)
      if (d.rating) setGRating({ rating: d.rating, total: d.total })
    }).catch(() => {})

    // Auto-rotate reviews
    const t = setInterval(() => setReviewIdx(i => (i + 1) % 5), 5000)
    return () => clearInterval(t)
  }, [])

  const ok1 = form.first_name && form.last_name && form.owner_email && form.owner_phone.trim().length > 4 && form.post_code
  const ok2 = form.pet_name && form.breed && form.age && form.pet_gender && form.vet_friendly !== null && form.reactive_to_pets !== null
  const ok3 = form.clinic_name && form.attending_vet && form.has_pain !== null && form.how_heard

  async function submit() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, owner_name: `${form.first_name} ${form.last_name}`.trim() }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch { setError('Something went wrong. Please try again or call us at 6291 6881.') }
    finally { setLoading(false) }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <img src="/rehabvet-logo.jpg" alt="RehabVet" className="h-14 object-contain mb-10" />
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Request Received!</h1>
        <p className="text-gray-500 max-w-sm mb-6">We'll review your request and be in touch within <strong>1 business day</strong> to confirm your appointment.</p>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-5 py-3">
          <Phone className="w-4 h-4" /> Need us sooner? Call <a href="tel:62916881" className="font-semibold text-gray-800">6291 6881</a>
        </div>
      </div>
    )
  }

  const progress = ((step - 1) / 2) * 100

  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src="/rehabvet-logo.jpg" alt="RehabVet" className="h-9 object-contain" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-[#FDC61C] text-[#FDC61C]" />)}</div>
              <span className="text-sm font-bold text-gray-800">{gRating.rating}</span>
              <span className="text-sm text-gray-400 hidden sm:inline">({gRating.total} reviews)</span>
            </div>
            <a href="tel:62916881" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
              <Phone className="w-3.5 h-3.5" /> 6291 6881
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 lg:py-14">
        <div className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-16 items-start">

          {/* ── LEFT ── */}
          <div className="space-y-10">

            {/* Hero */}
            <div>
              <span className="inline-block text-xs font-bold tracking-widest text-[#EC6496] uppercase mb-4">Singapore's First Vet Rehab Clinic</span>
              <h1 className="text-4xl lg:text-[52px] font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5">
                Give Your Pet<br />
                <span className="text-[#EC6496]">Their Life Back.</span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                Personalised physiotherapy, hydrotherapy and rehabilitation plans — helping pets recover from surgery, manage pain, and move freely again.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 lg:gap-10">
              {[
                { n: '10+', l: 'Years' },
                { n: '5,000+', l: 'Pets treated' },
                { n: `${gRating.rating}★`, l: 'Google rating' },
                { n: `${gRating.total}+`, l: 'Reviews' },
              ].map(({ n, l }) => (
                <div key={l}>
                  <p className="text-2xl font-extrabold text-gray-900">{n}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="w-12 h-1 rounded-full bg-[#FDC61C]" />

            {/* Services pills */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">What we treat</p>
              <div className="flex flex-wrap gap-2">
                {['Hydrotherapy', 'HBOT', 'Physiotherapy', 'Acupuncture', 'TCVM', 'Post-Surgery Rehab', 'Arthritis Management', 'IVDD Recovery'].map(t => (
                  <span key={t} className="text-xs font-medium bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full shadow-sm">{t}</span>
                ))}
              </div>
            </div>

            {/* Review */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-[#FDC61C] text-[#FDC61C]" />)}</div>
                <span className="text-xs text-gray-400">{reviews[reviewIdx]?.time || ''}</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-5 min-h-[56px]">
                "{reviews[reviewIdx]?.text}"
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#EC6496]/10 flex items-center justify-center text-[#EC6496] text-xs font-bold flex-shrink-0">
                    {reviews[reviewIdx]?.author?.[0] || '?'}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{reviews[reviewIdx]?.author}</span>
                </div>
                <div className="flex gap-1.5">
                  {reviews.slice(0, 5).map((_, i) => (
                    <button key={i} onClick={() => setReviewIdx(i)}
                      className={`transition-all rounded-full ${i === reviewIdx ? 'w-4 h-2 bg-[#EC6496]' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`} />
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-1.5">
                <img src="https://www.google.com/favicon.ico" className="w-3 h-3" alt="" />
                <span className="text-xs text-gray-400">Verified Google Review</span>
              </div>
            </div>

          </div>

          {/* ── RIGHT: Form ── */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

              {/* Form top */}
              <div className="px-6 pt-7 pb-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Book Your Assessment</h2>
                <p className="text-sm text-gray-400 mt-0.5">Free · No commitment · We'll confirm within 1 day</p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span className={step >= 1 ? 'text-[#EC6496] font-semibold' : ''}>Your info</span>
                    <span className={step >= 2 ? 'text-[#EC6496] font-semibold' : ''}>Pet info</span>
                    <span className={step >= 3 ? 'text-[#EC6496] font-semibold' : ''}>Health & Vet</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#EC6496] rounded-full transition-all duration-500" style={{ width: `${progress + 34}%` }} />
                  </div>
                </div>
              </div>

              {/* Form body */}
              <div className="px-6 py-6 space-y-4">

                {step === 1 && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">First Name <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="Jane" value={form.first_name} onChange={e => s('first_name', e.target.value)} /></div>
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Last Name <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="Smith" value={form.last_name} onChange={e => s('last_name', e.target.value)} /></div>
                  </div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Email <span className="text-[#EC6496]">*</span></label>
                    <input type="email" className={inp} placeholder="jane@email.com" value={form.owner_email} onChange={e => s('owner_email', e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Phone <span className="text-[#EC6496]">*</span></label>
                    <input type="tel" className={inp} placeholder="9123 4567" value={form.owner_phone} onChange={e => s('owner_phone', e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Postal Code <span className="text-[#EC6496]">*</span></label>
                    <input className={inp} placeholder="123456" value={form.post_code} onChange={e => s('post_code', e.target.value)} /></div>
                  <button onClick={() => setStep(2)} disabled={!ok1}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: ok1 ? '#EC6496' : '#f0a0bc' }}>
                    Continue <ChevronRight className="w-4 h-4" /></button>
                </>}

                {step === 2 && <>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Pet's Name <span className="text-[#EC6496]">*</span></label>
                    <input className={inp} placeholder="Buddy" value={form.pet_name} onChange={e => s('pet_name', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Breed <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="Golden Retriever" value={form.breed} onChange={e => s('breed', e.target.value)} /></div>
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Age <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="3 years" value={form.age} onChange={e => s('age', e.target.value)} /></div>
                  </div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Gender <span className="text-[#EC6496]">*</span></label>
                    <div className="grid grid-cols-2 gap-2">{GENDERS.map(g => <Chip key={g} active={form.pet_gender === g} onClick={() => s('pet_gender', g)}>{g}</Chip>)}</div></div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Vet Friendly? <span className="text-[#EC6496]">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <Chip active={form.vet_friendly === true} onClick={() => s('vet_friendly', true)}>Yes</Chip>
                      <Chip active={form.vet_friendly === false} onClick={() => s('vet_friendly', false)}>No (Aggressive)</Chip>
                    </div></div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Reactive to Other Pets? <span className="text-[#EC6496]">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <Chip active={form.reactive_to_pets === true} onClick={() => s('reactive_to_pets', true)}>Yes</Chip>
                      <Chip active={form.reactive_to_pets === false} onClick={() => s('reactive_to_pets', false)}>No</Chip>
                    </div></div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setStep(1)} className="flex-none w-10 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                      <ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setStep(3)} disabled={!ok2}
                      className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: ok2 ? '#EC6496' : '#f0a0bc' }}>
                      Continue <ChevronRight className="w-4 h-4" /></button>
                  </div>
                </>}

                {step === 3 && <>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vet Details</p>
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Clinic Name <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="e.g. Mount Pleasant Vet" value={form.clinic_name} onChange={e => s('clinic_name', e.target.value)} /></div>
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Attending Vet <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="Dr. Lee" value={form.attending_vet} onChange={e => s('attending_vet', e.target.value)} /></div>
                  </div>
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mobility Condition</p>
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Showing pain symptoms? <span className="text-[#EC6496]">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        <Chip active={form.has_pain === true} onClick={() => s('has_pain', true)}>Yes</Chip>
                        <Chip active={form.has_pain === false} onClick={() => s('has_pain', false)}>No</Chip>
                      </div></div>
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Current issue</label>
                      <textarea className={inp + ' resize-none'} rows={3} placeholder="Describe your pet's condition…" value={form.condition} onChange={e => s('condition', e.target.value)} /></div>
                  </div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">How did you hear about us? <span className="text-[#EC6496]">*</span></label>
                    <div className="grid grid-cols-2 gap-2">{HOW_HEARD.map(h => <Chip key={h} active={form.how_heard === h} onClick={() => s('how_heard', h)}>{h}</Chip>)}</div></div>
                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setStep(2)} className="flex-none w-10 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                      <ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={submit} disabled={!ok3 || loading}
                      className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: ok3 && !loading ? '#19BC00' : '#7dd67a' }}>
                      {loading ? 'Submitting…' : '🐾 Request Appointment'}</button>
                  </div>
                </>}

              </div>

              {/* Footer */}
              <div className="px-6 pb-5 text-center">
                <p className="text-xs text-gray-400">🔒 Your info is safe &nbsp;·&nbsp; No spam &nbsp;·&nbsp; Free to request</p>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
