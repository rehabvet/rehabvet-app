'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Star } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'

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

function Row({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return <div className="flex justify-between text-xs"><span className="text-gray-400">{label}</span><span className="text-gray-300">—</span></div>
  return (
    <div className="flex justify-between items-start gap-3 text-xs">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  )
}

function RadioGroup({ label, name, options, value, onChange, required }: {
  label: string; name: string; options: { value: string | boolean; label: string }[];
  value: any; onChange: (v: any) => void; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 block mb-2">
        {label} {required && <span className="text-[#EC6496]">*</span>}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {options.map(opt => (
          <label key={String(opt.value)} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            borderRadius: '12px', cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
            border: `1.5px solid ${value === opt.value ? '#EC6496' : '#e5e7eb'}`,
            background: value === opt.value ? 'rgba(236,100,150,0.05)' : '#fff',
          }}>
            <input
              type="radio"
              name={name}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ width: 16, height: 16, accentColor: '#EC6496', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', lineHeight: 1.3 }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EC6496]/20 focus:border-[#EC6496] transition-colors bg-white'

async function reportError(message: string, stack: string, step: number, form: Record<string, unknown>) {
  try {
    await fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack,
        url: window.location.href,
        step,
        userAgent: navigator.userAgent,
        // strip sensitive data before sending
        formData: {
          has_first_name: !!form.first_name,
          has_email: !!form.owner_email,
          has_phone: !!form.owner_phone,
          has_postal: !!form.post_code,
          pet_name: form.pet_name,
          breed: form.breed,
          step,
        },
      }),
    })
  } catch { /* never let reporting crash the form */ }
}

export default function AppointmentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviews, setReviews] = useState(FALLBACK_REVIEWS)
  const [gRating, setGRating] = useState({ rating: 4.8, total: 193 })

  const [form, setForm] = useState({
    first_name: '', last_name: '', owner_email: '', owner_phone: '+65 ', post_code: '',
    address: '',
    pet_name: '', breed: '', age: '', pet_gender: '',
    vet_friendly: null as boolean | null,
    reactive_to_pets: null as boolean | null,
    clinic_name: '', attending_vet: '',
    has_pain: null as boolean | null,
    condition: '', how_heard: '',
  })
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState('')

  const s = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function lookupPostal(code: string) {
    s('post_code', code)
    s('address', '')
    setAddressError('')
    if (code.replace(/\s/g, '').length !== 6) return
    setAddressLoading(true)
    try {
      const res = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${code}&returnGeom=N&getAddrDetails=Y&pageNum=1`
      )
      const data = await res.json()
      if (data.found > 0) {
        const r = data.results[0]
        // Use full ADDRESS field from OneMap (e.g. "BLK 513 SERANGOON RD SINGAPORE 218154")
        const addr = (r.ADDRESS && r.ADDRESS !== 'NIL')
          ? r.ADDRESS
          : [r.BLK_NO, r.ROAD_NAME, r.BUILDING, `Singapore ${code}`]
              .map((v: string) => v?.trim()).filter(v => v && v !== 'NIL').join(', ')
        s('address', addr)
        setAddressError('')
      } else {
        setAddressError('Postal code not found')
      }
    } catch {
      setAddressError('Could not look up address')
    } finally {
      setAddressLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/google-reviews').then(r => r.json()).then(d => {
      if (d.reviews?.length > 0) setReviews(d.reviews)
      if (d.rating) setGRating({ rating: d.rating, total: d.total })
    }).catch(() => {})

    // Auto-rotate reviews
    const t = setInterval(() => setReviewIdx(i => (i + 1) % 5), 5000)

    // Global JS error catcher
    const handleError = (event: ErrorEvent) => {
      reportError(event.message, event.error?.stack ?? '', step, form)
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason instanceof Error ? event.reason.message : String(event.reason)
      const stack = event.reason instanceof Error ? event.reason.stack ?? '' : ''
      reportError(msg, stack, step, form)
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      clearInterval(t)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [step, form])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email)
  const ok1 = form.first_name && form.last_name && emailValid && form.owner_phone.trim().length > 4 && form.post_code
  const ok2 = form.pet_name && form.breed && form.age && form.pet_gender && form.vet_friendly !== null && form.reactive_to_pets !== null
  const ok3 = form.clinic_name && form.attending_vet && form.has_pain !== null && form.how_heard

  async function submit() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/appointment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, owner_name: `${form.first_name} ${form.last_name}`.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = `HTTP ${res.status}: ${body?.error ?? 'Unknown error'}`
        reportError(msg, '', step, form as unknown as Record<string, unknown>)
        throw new Error(msg)
      }
      router.push('/appointment/thank-you')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      setError('Something went wrong. Please try again or call us at 6291 6881.')
      // Only report if not already reported above (i.e. non-HTTP error like network failure)
      if (!(msg.startsWith('HTTP '))) {
        reportError(msg, err instanceof Error ? (err.stack ?? '') : '', step, form as unknown as Record<string, unknown>)
      }
    } finally {
      setLoading(false)
    }
  }

  const progress = ((step - 1) / 3) * 100

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
            <a href="https://wa.me/6587987554" target="_blank" rel="noopener noreferrer"
               className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#25D366] transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              8798 7554
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-6 lg:py-14">
        <div className="grid lg:grid-cols-[1fr_440px] gap-8 lg:gap-16 items-start">

          {/* ── LEFT ── hero + reviews — shows BELOW form on mobile */}
          <div className="space-y-8 lg:space-y-10 order-2 lg:order-1">

            {/* Hero */}
            <div>
              <span className="inline-block text-xs font-bold tracking-widest text-[#EC6496] uppercase mb-3">Singapore's First Vet Rehab Clinic</span>
              <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-gray-900 tracking-tight mb-4" style={{ lineHeight: 1.6 }}>
                Proven Steps to<br />Pain Free Mobility
              </h1>
              <p className="text-gray-500 text-base sm:text-lg leading-relaxed max-w-md">
                Personalised physiotherapy, hydrotherapy and rehabilitation plans — helping pets recover from surgery, manage pain, and move freely again.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-6 lg:gap-10">
              {[
                { n: '10+', l: 'Years' },
                { n: '2,500+', l: 'Pets treated' },
                { n: `${gRating.rating}★`, l: 'Google rating' },
                { n: `${gRating.total}+`, l: 'Reviews' },
              ].map(({ n, l }) => (
                <div key={l}>
                  <p className="text-2xl font-extrabold text-gray-900">{n}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Review */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              {/* Reviewer photo at top */}
              <div className="flex items-center gap-3 mb-4">
                {reviews[reviewIdx]?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reviews[reviewIdx].photo} alt={reviews[reviewIdx].author} className="w-11 h-11 rounded-full object-cover border border-gray-100 flex-shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#EC6496]/10 flex items-center justify-center text-[#EC6496] text-sm font-bold flex-shrink-0">
                    {reviews[reviewIdx]?.author?.[0] || '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{reviews[reviewIdx]?.author}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-[#FDC61C] text-[#FDC61C]" />)}</div>
                    <span className="text-xs text-gray-400">{reviews[reviewIdx]?.time || ''}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-5 min-h-[56px]">
                "{reviews[reviewIdx]?.text}"
              </p>
              <div className="flex items-center justify-between">
                <div />
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

          {/* ── RIGHT: Form — appears FIRST on mobile ── */}
          <div id="book" className="lg:sticky lg:top-24 order-1 lg:order-2">
            <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 overflow-hidden">

              {/* Form top */}
              <div className="px-4 sm:px-6 pt-6 sm:pt-7 pb-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Book Your Assessment</h2>
                <p className="text-sm text-gray-400 mt-0.5">We'll confirm with you within a day</p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span className={step >= 1 ? 'text-[#EC6496] font-semibold' : ''}>Your info</span>
                    <span className={step >= 2 ? 'text-[#EC6496] font-semibold' : ''}>Pet info</span>
                    <span className={step >= 3 ? 'text-[#EC6496] font-semibold' : ''}>Health</span>
                    <span className={step >= 4 ? 'text-[#EC6496] font-semibold' : ''}>Review</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#EC6496] rounded-full transition-all duration-500" style={{ width: `${progress + 34}%` }} />
                  </div>
                </div>
              </div>

              {/* Form body */}
              <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">

                {step === 1 && <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">First Name <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="Jane" value={form.first_name} onChange={e => s('first_name', e.target.value)} /></div>
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Last Name <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="Smith" value={form.last_name} onChange={e => s('last_name', e.target.value)} /></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Email <span className="text-[#EC6496]">*</span></label>
                    <input type="email" className={inp} placeholder="jane@email.com" value={form.owner_email} onChange={e => s('owner_email', e.target.value)} autoComplete="off" />
                    {form.owner_email && !emailValid && (
                      <p className="text-xs text-red-400 mt-1.5">Please enter a valid email address</p>
                    )}
                  </div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Phone <span className="text-[#EC6496]">*</span></label>
                    <PhoneInput value={form.owner_phone} onChange={v => s('owner_phone', v)} required /></div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Postal Code <span className="text-[#EC6496]">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      name="rv-postal"
                      className={inp}
                      placeholder="e.g. 218154"
                      value={form.post_code}
                      maxLength={6}
                      onChange={e => lookupPostal(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    {addressLoading && (
                      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-[#EC6496] rounded-full animate-spin" />
                        Looking up address…
                      </p>
                    )}
                    {form.address && !addressLoading && (
                      <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 font-medium">
                        📍 {form.address}
                      </p>
                    )}
                    {addressError && !addressLoading && (
                      <p className="text-xs text-red-400 mt-1.5">{addressError}</p>
                    )}
                  </div>
                  <button onClick={() => setStep(2)} disabled={!ok1}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: ok1 ? '#EC6496' : '#f0a0bc' }}>
                    Continue <ChevronRight className="w-4 h-4" /></button>
                </>}

                {step === 2 && <>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Pet's Name <span className="text-[#EC6496]">*</span></label>
                    <input className={inp} placeholder="Buddy" value={form.pet_name} onChange={e => s('pet_name', e.target.value)} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Breed <span className="text-[#EC6496]">*</span></label>
                      <input className={inp} placeholder="Golden Retriever" value={form.breed} onChange={e => s('breed', e.target.value)} /></div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1.5">Age (years) <span className="text-[#EC6496]">*</span></label>
                      <input
                        className={inp}
                        placeholder="e.g. 3"
                        inputMode="numeric"
                        value={form.age}
                        onChange={e => s('age', e.target.value.replace(/[^0-9]/g, ''))}
                      />
                    </div>
                  </div>
                  <RadioGroup
                    label="Gender"
                    name="pet_gender"
                    required
                    options={GENDERS.map(g => ({ value: g, label: g }))}
                    value={form.pet_gender}
                    onChange={v => s('pet_gender', v)}
                  />
                  <RadioGroup
                    label="Vet Friendly?"
                    name="vet_friendly"
                    required
                    options={[{ value: true, label: 'Yes' }, { value: false, label: 'No (Aggressive)' }]}
                    value={form.vet_friendly}
                    onChange={v => s('vet_friendly', v)}
                  />
                  <RadioGroup
                    label="Reactive to Other Pets?"
                    name="reactive_to_pets"
                    required
                    options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]}
                    value={form.reactive_to_pets}
                    onChange={v => s('reactive_to_pets', v)}
                  />
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
                    <RadioGroup
                      label="Showing pain symptoms?"
                      name="has_pain"
                      required
                      options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]}
                      value={form.has_pain}
                      onChange={v => s('has_pain', v)}
                    />
                    <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Current issue</label>
                      <textarea className={inp + ' resize-none'} rows={3} placeholder="Describe your pet's condition…" value={form.condition} onChange={e => s('condition', e.target.value)} /></div>
                  </div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">How did you hear about us? <span className="text-[#EC6496]">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{HOW_HEARD.map(h => <Chip key={h} active={form.how_heard === h} onClick={() => s('how_heard', h)}>{h}</Chip>)}</div></div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setStep(2)} className="flex-none w-10 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                      <ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setStep(4)} disabled={!ok3}
                      className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: ok3 ? '#EC6496' : '#f0a0bc' }}>
                      Review & Confirm <ChevronRight className="w-4 h-4" /></button>
                  </div>
                </>}

                {step === 4 && <>
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Please review before submitting</p>

                    {/* Owner */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Info</span>
                        <button onClick={() => setStep(1)} className="text-xs font-semibold text-[#EC6496] hover:underline">Edit</button>
                      </div>
                      <Row label="Name" value={`${form.first_name} ${form.last_name}`.trim()} />
                      <Row label="Email" value={form.owner_email} />
                      <Row label="Phone" value={form.owner_phone} />
                      {form.address && <Row label="Address" value={form.address} />}
                    </div>

                    {/* Pet */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pet Info</span>
                        <button onClick={() => setStep(2)} className="text-xs font-semibold text-[#EC6496] hover:underline">Edit</button>
                      </div>
                      <Row label="Name" value={form.pet_name} />
                      {form.breed && <Row label="Breed" value={form.breed} />}
                      {form.age && <Row label="Age" value={form.age} />}
                      {form.pet_gender && <Row label="Gender" value={form.pet_gender} />}
                      <Row label="Vet-friendly" value={form.vet_friendly === true ? 'Yes' : form.vet_friendly === false ? 'No' : '—'} />
                      <Row label="Reactive to pets" value={form.reactive_to_pets === true ? 'Yes' : form.reactive_to_pets === false ? 'No' : '—'} />
                    </div>

                    {/* Health */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Health & Vet</span>
                        <button onClick={() => setStep(3)} className="text-xs font-semibold text-[#EC6496] hover:underline">Edit</button>
                      </div>
                      <Row label="Clinic" value={form.clinic_name} />
                      <Row label="Vet" value={form.attending_vet} />
                      <Row label="In pain" value={form.has_pain === true ? 'Yes' : form.has_pain === false ? 'No' : '—'} />
                      {form.condition && <Row label="Condition" value={form.condition} />}
                      {form.how_heard && <Row label="How heard" value={form.how_heard} />}
                    </div>

                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setStep(3)} className="flex-none w-10 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                        <ChevronLeft className="w-4 h-4" /></button>
                      <button onClick={submit} disabled={loading}
                        className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: loading ? '#7dd67a' : '#19BC00' }}>
                        {loading ? 'Submitting…' : '🐾 Confirm & Request Appointment'}
                      </button>
                    </div>
                  </div>
                </>}

              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 pb-5 text-center">
                <p className="text-xs text-gray-400">🔒 Your info is safe &nbsp;·&nbsp; No spam &nbsp;·&nbsp; Free to request</p>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
