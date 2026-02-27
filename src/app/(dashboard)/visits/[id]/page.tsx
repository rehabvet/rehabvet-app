'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, User, PawPrint, Calendar, Weight } from 'lucide-react'

type ListItem = { id: string; text: string }

function uid() { return Math.random().toString(36).slice(2) }

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  )
}

function OrderedList({ items, onChange, placeholder }: { items: ListItem[]; onChange: (items: ListItem[]) => void; placeholder: string }) {
  function add() { onChange([...items, { id: uid(), text: '' }]) }
  function remove(id: string) { onChange(items.filter(i => i.id !== id)) }
  function update(id: string, text: string) { onChange(items.map(i => i.id === id ? { ...i, text } : i)) }
  function move(idx: number, dir: -1 | 1) {
    const next = [...items]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }
  return (
    <div className="space-y-2 mt-3">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>
          <input
            className="input flex-1 text-sm"
            value={item.text}
            onChange={e => update(item.id, e.target.value)}
            placeholder={`${placeholder} ${idx + 1}`}
          />
          <div className="flex gap-1 flex-shrink-0">
            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => move(idx, 1)}  disabled={idx === items.length - 1} className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => remove(item.id)} className="p-1 text-red-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs text-brand-pink hover:text-brand-pink/80 mt-1">
        <Plus className="w-3.5 h-3.5" /> Add step
      </button>
    </div>
  )
}

export default function VisitPage() {
  const { id } = useParams()
  const router = useRouter()
  const [visit, setVisit]   = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [staff,  setStaff]  = useState<any[]>([])

  // Form state
  const [form, setForm] = useState<any>({
    staff_id: '', visit_date: '', weight_kg: '', temperature_c: '',
    heart_rate_bpm: '', body_condition_score: '',
    history: '', clinical_examination: '', diagnosis: '',
    treatment: [] as ListItem[], hep: [] as ListItem[],
    internal_notes: '', client_notes: '', plan: '',
  })

  useEffect(() => {
    fetch(`/api/visits/${id}`).then(r => r.json()).then(d => {
      if (!d.visit) return
      const v = d.visit
      setVisit(v)
      setForm({
        staff_id:            v.staff_id || '',
        visit_date:          v.visit_date?.split('T')[0] || '',
        weight_kg:           v.weight_kg ?? '',
        temperature_c:       v.temperature_c ?? '',
        heart_rate_bpm:      v.heart_rate_bpm ?? '',
        body_condition_score:v.body_condition_score ?? '',
        history:             v.history || '',
        clinical_examination:v.clinical_examination || '',
        diagnosis:           v.diagnosis || '',
        treatment:           (v.treatment || []).map((t: any) => typeof t === 'string' ? { id: uid(), text: t } : { id: uid(), text: t.description || t.text || '' }),
        hep:                 (v.hep || []).map((h: any) => typeof h === 'string' ? { id: uid(), text: h } : { id: uid(), text: h.instruction || h.text || '' }),
        internal_notes:      v.internal_notes || '',
        client_notes:        v.client_notes || '',
        plan:                v.plan || '',
      })
    })
    fetch('/api/staff').then(r => r.json()).then(d => setStaff(d.staff || []))
  }, [id])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const payload = {
      ...form,
      treatment: form.treatment.map((t: ListItem, i: number) => ({ step: i + 1, description: t.text })).filter((t: any) => t.description),
      hep:       form.hep.map((h: ListItem) => ({ instruction: h.text })).filter((h: any) => h.instruction),
      weight_kg:           form.weight_kg           ? parseFloat(form.weight_kg)           : null,
      temperature_c:       form.temperature_c       ? parseFloat(form.temperature_c)       : null,
      heart_rate_bpm:      form.heart_rate_bpm      ? parseInt(form.heart_rate_bpm)        : null,
      body_condition_score:form.body_condition_score ? parseInt(form.body_condition_score)  : null,
    }
    await fetch(`/api/visits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [form, id])

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  if (!visit) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Visit info bar */}
      <div className="card py-3 px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-gray-900">
            <PawPrint className="w-4 h-4 text-brand-pink" />{visit.patient_name}
            <span className="text-gray-400 font-normal">({visit.patient_species})</span>
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />{visit.client_name}
          </span>
          <span className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" className="input py-0.5 px-2 text-sm" value={form.visit_date} onChange={e => f('visit_date', e.target.value)} />
          </span>
          <span className="flex items-center gap-1.5 text-gray-500">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <select className="input py-0.5 px-2 text-sm" value={form.staff_id} onChange={e => f('staff_id', e.target.value)}>
              <option value="">— Staff —</option>
              {staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </span>
        </div>
      </div>

      {/* Vitals */}
      <Section title="🩺 Vitals">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          <div>
            <label className="label">Weight (kg)</label>
            <input className="input" type="number" step="0.01" placeholder="e.g. 6.25" value={form.weight_kg} onChange={e => f('weight_kg', e.target.value)} />
          </div>
          <div>
            <label className="label">Temp (°C)</label>
            <input className="input" type="number" step="0.1" placeholder="e.g. 37.3" value={form.temperature_c} onChange={e => f('temperature_c', e.target.value)} />
          </div>
          <div>
            <label className="label">Heart Rate (bpm)</label>
            <input className="input" type="number" placeholder="e.g. 108" value={form.heart_rate_bpm} onChange={e => f('heart_rate_bpm', e.target.value)} />
          </div>
          <div>
            <label className="label">BCS (1–9)</label>
            <select className="input" value={form.body_condition_score} onChange={e => f('body_condition_score', e.target.value)}>
              <option value="">—</option>
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* History */}
      <Section title="📋 History (Owner's Report)">
        <textarea className="input mt-3 w-full" rows={4} placeholder="Owner's observations and complaints since last visit…" value={form.history} onChange={e => f('history', e.target.value)} />
      </Section>

      {/* Clinical Examination */}
      <Section title="🔍 Clinical Examination">
        <textarea className="input mt-3 w-full" rows={6} placeholder="Gait, palpation, ROM, CP, muscle assessment, special tests…" value={form.clinical_examination} onChange={e => f('clinical_examination', e.target.value)} />
      </Section>

      {/* Diagnosis */}
      <Section title="📌 Diagnosis" defaultOpen={false}>
        <textarea className="input mt-3 w-full" rows={3} placeholder="Diagnosis and clinical impression…" value={form.diagnosis} onChange={e => f('diagnosis', e.target.value)} />
      </Section>

      {/* Treatment */}
      <Section title="💊 Treatment Performed">
        <OrderedList items={form.treatment} onChange={v => f('treatment', v)} placeholder="Treatment step" />
      </Section>

      {/* HEP */}
      <Section title="🏠 Home Exercise Programme (HEP)" defaultOpen={false}>
        <OrderedList items={form.hep} onChange={v => f('hep', v)} placeholder="Exercise" />
      </Section>

      {/* Plan */}
      <Section title="📅 Plan (Next Session)" defaultOpen={false}>
        <textarea className="input mt-3 w-full" rows={2} placeholder="What to do at next session…" value={form.plan} onChange={e => f('plan', e.target.value)} />
      </Section>

      {/* Client Notes */}
      <Section title="💬 Client-Facing Notes (visible to owner)" defaultOpen={false}>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">⚠️ These notes are visible to the client on their portal/app.</p>
        <textarea className="input mt-2 w-full" rows={3} placeholder="Notes to share with the owner — home care advice, observations…" value={form.client_notes} onChange={e => f('client_notes', e.target.value)} />
      </Section>

      {/* Internal Notes */}
      <Section title="🔒 Internal Notes (staff only)" defaultOpen={false}>
        <textarea className="input mt-3 w-full" rows={3} placeholder="Internal staff notes — not visible to the client…" value={form.internal_notes} onChange={e => f('internal_notes', e.target.value)} />
      </Section>

      {/* Save button at bottom too */}
      <div className="flex justify-end pb-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Visit Record'}
        </button>
      </div>
    </div>
  )
}
