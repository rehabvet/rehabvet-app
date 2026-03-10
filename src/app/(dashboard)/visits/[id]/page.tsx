'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, ChevronDown, ChevronUp, Plus, Trash2, User, PawPrint, Calendar, DollarSign, CreditCard, Receipt, AlertTriangle } from 'lucide-react'

type ListItem = { id: string; text: string }

function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  }
  useEffect(() => { resize() }, [value])
  return (
    <textarea
      ref={ref}
      className={className}
      placeholder={placeholder}
      value={value}
      style={{ overflow: 'hidden', resize: 'none', minHeight: '4rem' }}
      onChange={e => { onChange(e.target.value); resize() }}
    />
  )
}

function uid() { return Math.random().toString(36).slice(2) }

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card p-0">
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
  const [visit,    setVisit]    = useState<any>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle'|'pending'|'saving'|'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formLoaded = useRef(false)
  const [staff,    setStaff]    = useState<any[]>([])
  const [invoice,  setInvoice]  = useState<any>(null)
  const [lineItems,setLineItems]= useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [newItem,  setNewItem]  = useState({ description: '', item_type: 'service', qty: '1', unit_price: '0', dispensing_instructions: '', is_package_redemption: false })
  const [newPay,   setNewPay]   = useState({ amount: '', method: 'paynow', reference: '' })
  const [addingItem,setAddingItem]=useState(false)
  const [addingPay, setAddingPay] =useState(false)
  const [showItemForm,setShowItemForm]=useState(false)
  const [showPayForm, setShowPayForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [form, setForm] = useState<any>({
    staff_id: '', visit_date: '', weight_kg: '', temperature_c: '',
    heart_rate_bpm: '', respiratory_rate_bpm: '', body_condition_score: '',
    history: '', clinical_examination: '', diagnosis: '',
    treatment: '' as string, hep: [] as ListItem[],
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
        weight_kg:              v.weight_kg ?? '',
        temperature_c:          v.temperature_c ?? '',
        heart_rate_bpm:         v.heart_rate_bpm ?? '',
        respiratory_rate_bpm:   v.respiratory_rate_bpm ?? '',
        body_condition_score:   v.body_condition_score ?? '',
        history:             v.history || '',
        clinical_examination:v.clinical_examination || '',
        diagnosis:           v.diagnosis || '',
        treatment:           Array.isArray(v.treatment) ? v.treatment.map((t: any) => typeof t === 'string' ? t : (t.description || t.text || '')).join('\n') : (v.treatment || ''),
        hep:                 (v.hep || []).map((h: any) => typeof h === 'string' ? { id: uid(), text: h } : { id: uid(), text: h.instruction || h.text || '' }),
        internal_notes:      v.internal_notes || '',
        client_notes:        v.client_notes || '',
        plan:                v.plan || '',
      })
      // Mark form as loaded so auto-save can trigger on future changes
      setTimeout(() => { formLoaded.current = true }, 100)
    })
    fetch('/api/staff').then(r => r.json()).then(d => setStaff(d.staff || []))
    loadInvoice()
  }, [id])

  async function loadInvoice() {
    const res = await fetch(`/api/visits/${id}/invoice`)
    const data = await res.json()
    if (data.invoice) {
      setInvoice(data.invoice)
      setLineItems(data.line_items || [])
      setPayments(data.payments || [])
    }
  }

  async function createInvoice() {
    const res = await fetch(`/api/visits/${id}/invoice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const data = await res.json()
    if (data.invoice) { setInvoice(data.invoice); setLineItems([]); setPayments([]) }
  }

  async function addLineItem() {
    if (!newItem.description) return
    setAddingItem(true)
    await fetch(`/api/invoices/${invoice.id}/line-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, qty: parseFloat(newItem.qty), unit_price: parseFloat(newItem.unit_price) }),
    })
    setNewItem({ description: '', item_type: 'service', qty: '1', unit_price: '0', dispensing_instructions: '', is_package_redemption: false })
    setShowItemForm(false)
    setAddingItem(false)
    await loadInvoice()
  }

  async function deleteLineItem(lineItemId: string) {
    await fetch(`/api/invoices/${invoice.id}/line-items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_item_id: lineItemId }),
    })
    await loadInvoice()
  }

  async function addPayment() {
    if (!newPay.amount) return
    setAddingPay(true)
    await fetch(`/api/invoices/${invoice.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newPay, client_id: visit.client_id }),
    })
    setNewPay({ amount: '', method: 'paynow', reference: '' })
    setShowPayForm(false)
    setAddingPay(false)
    await loadInvoice()
  }

  function buildPayload(form: any) {
    return {
      ...form,
      treatment: form.treatment ? form.treatment.split('\n').filter((s: string) => s.trim()).map((s: string, i: number) => ({ step: i + 1, description: s.trim() })) : [],
      hep:       form.hep.map((h: ListItem) => ({ instruction: h.text })).filter((h: any) => h.instruction),
      weight_kg:             form.weight_kg             ? parseFloat(form.weight_kg)             : null,
      temperature_c:         form.temperature_c         ? parseFloat(form.temperature_c)         : null,
      heart_rate_bpm:        form.heart_rate_bpm        ? parseInt(form.heart_rate_bpm)          : null,
      respiratory_rate_bpm:  form.respiratory_rate_bpm  ? parseInt(form.respiratory_rate_bpm)    : null,
      body_condition_score:  form.body_condition_score  ? parseInt(form.body_condition_score)    : null,
    }
  }

  // Auto-save: 2s debounce after any form change (skip initial load)
  useEffect(() => {
    if (!formLoaded.current) return
    setAutoSaveStatus('pending')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving')
      await fetch(`/api/visits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form)),
      })
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    }, 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [form])

  const handleSave = useCallback(async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setSaving(true)
    await fetch(`/api/visits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(form)),
    })
    setSaving(false)
    setSaved(true)
    setAutoSaveStatus('saved')
    setTimeout(() => { setSaved(false); setAutoSaveStatus('idle') }, 2000)
  }, [form, id])

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/visits/${id}`, { method: 'DELETE' })
    router.back()
  }

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  if (!visit) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          {autoSaveStatus === 'pending' && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block animate-pulse" /> Unsaved
            </span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block animate-pulse" /> Saving…
            </span>
          )}
          {autoSaveStatus === 'saved' && !saving && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Auto-saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Delete Visit Record?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete this visit record and any associated invoice. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary text-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit info bar */}
      <div className="card py-3 px-5">
        {visit.visit_number && (
          <p className="text-xs text-gray-400 font-mono mb-2">{visit.visit_number}</p>
        )}
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
            <label className="label">Resp. Rate (bpm)</label>
            <input className="input" type="number" placeholder="e.g. 24" value={form.respiratory_rate_bpm} onChange={e => f('respiratory_rate_bpm', e.target.value)} />
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
        <AutoTextarea className="input mt-3 w-full" placeholder="Owner's observations and complaints since last visit…" value={form.history} onChange={v => f('history', v)} />
      </Section>

      {/* Clinical Examination */}
      <Section title="🔍 Clinical Examination">
        <AutoTextarea className="input mt-3 w-full" placeholder="Gait, palpation, ROM, CP, muscle assessment, special tests…" value={form.clinical_examination} onChange={v => f('clinical_examination', v)} />
      </Section>

      {/* Diagnosis */}
      <Section title="📌 Diagnosis" defaultOpen={false}>
        <AutoTextarea className="input mt-3 w-full" placeholder="Diagnosis and clinical impression…" value={form.diagnosis} onChange={v => f('diagnosis', v)} />
      </Section>

      {/* Treatment */}
      <Section title="💊 Treatment Performed">
        <AutoTextarea className="input mt-3 w-full" placeholder="Describe all treatments performed…" value={form.treatment} onChange={v => f('treatment', v)} />
      </Section>

      {/* HEP */}
      <Section title="🏠 Home Exercise Programme (HEP)" defaultOpen={false}>
        <OrderedList items={form.hep} onChange={v => f('hep', v)} placeholder="Exercise" />
      </Section>

      {/* Plan */}
      <Section title="📅 Plan (Next Session)" defaultOpen={false}>
        <AutoTextarea className="input mt-3 w-full" placeholder="What to do at next session…" value={form.plan} onChange={v => f('plan', v)} />
      </Section>

      {/* Client Notes */}
      <Section title="💬 Client-Facing Notes (visible to owner)" defaultOpen={false}>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">⚠️ These notes are visible to the client on their portal/app.</p>
        <AutoTextarea className="input mt-2 w-full" placeholder="Notes to share with the owner — home care advice, observations…" value={form.client_notes} onChange={v => f('client_notes', v)} />
      </Section>

      {/* Internal Notes */}
      <Section title="🔒 Internal Notes (staff only)" defaultOpen={false}>
        <AutoTextarea className="input mt-3 w-full" placeholder="Internal staff notes — not visible to the client…" value={form.internal_notes} onChange={v => f('internal_notes', v)} />
      </Section>

      {/* ── BILLING ───────────────────────────────────────────────────────── */}
      <Section title="💳 Billing & Payment" defaultOpen={false}>
        {!invoice ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400 mb-3">No invoice created for this visit yet.</p>
            <button onClick={createInvoice} className="btn-primary flex items-center gap-2 mx-auto">
              <Receipt className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Invoice header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Invoice</p>
                <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Status</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {invoice.status?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</p>
                <button onClick={() => setShowItemForm(v => !v)} className="text-xs text-brand-pink flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {showItemForm && (
                <div className="rounded-xl border border-gray-200 p-4 mb-3 space-y-3 bg-gray-50/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="label">Description *</label>
                      <input className="input" placeholder="e.g. Rehab 5 Visit, Gabapentin 50mg…" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Type</label>
                      <select className="input" value={newItem.item_type} onChange={e => setNewItem(p => ({ ...p, item_type: e.target.value }))}>
                        <option value="service">Service</option>
                        <option value="package_redemption">Package Redemption</option>
                        <option value="medication">Medication</option>
                        <option value="supplement">Supplement</option>
                        <option value="product">Product</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Qty</label>
                      <input className="input" type="number" step="0.5" min="0" value={newItem.qty} onChange={e => setNewItem(p => ({ ...p, qty: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Unit Price (S$)</label>
                      <input className="input" type="number" step="0.01" min="0" value={newItem.unit_price} onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="checkbox" id="pkg_redemption" checked={newItem.is_package_redemption} onChange={e => setNewItem(p => ({ ...p, is_package_redemption: e.target.checked, unit_price: e.target.checked ? '0' : p.unit_price }))} />
                      <label htmlFor="pkg_redemption" className="text-sm text-gray-600">From Package (S$0)</label>
                    </div>
                    {newItem.item_type === 'medication' || newItem.item_type === 'supplement' ? (
                      <div className="col-span-2">
                        <label className="label">Dispensing Instructions</label>
                        <input className="input" placeholder="e.g. 1 tablet every 8 hours…" value={newItem.dispensing_instructions} onChange={e => setNewItem(p => ({ ...p, dispensing_instructions: e.target.value }))} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowItemForm(false)} className="btn-secondary text-sm">Cancel</button>
                    <button onClick={addLineItem} disabled={addingItem || !newItem.description} className="btn-primary text-sm">
                      {addingItem ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {lineItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No items yet</p>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Item</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Price</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineItems.map((li: any) => (
                        <tr key={li.id}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900">{li.description}</p>
                            {li.is_package_redemption && <span className="text-xs text-brand-pink">Package</span>}
                            {li.dispensing_instructions && <p className="text-xs text-gray-400 mt-0.5">{li.dispensing_instructions}</p>}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">{li.qty}</td>
                          <td className="px-3 py-2 text-right text-gray-600">S${parseFloat(li.unit_price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">S${parseFloat(li.total).toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <button onClick={() => deleteLineItem(li.id)} className="text-red-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      <tr><td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-500">Subtotal</td><td className="px-3 py-2 text-right text-sm font-semibold">S${parseFloat(invoice.subtotal||0).toFixed(2)}</td><td /></tr>

                      <tr><td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-gray-800">Total</td><td className="px-3 py-2 text-right text-sm font-bold text-gray-900">S${parseFloat(invoice.total||0).toFixed(2)}</td><td /></tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Payments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payments</p>
                <button onClick={() => setShowPayForm(v => !v)} className="text-xs text-brand-pink flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Record Payment
                </button>
              </div>

              {showPayForm && (
                <div className="rounded-xl border border-gray-200 p-4 mb-3 space-y-3 bg-gray-50/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Amount (S$) *</label>
                      <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={newPay.amount} onChange={e => setNewPay(p => ({ ...p, amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Method</label>
                      <select className="input" value={newPay.method} onChange={e => setNewPay(p => ({ ...p, method: e.target.value }))}>
                        <option value="paynow">PayNow</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="nets">NETS</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Reference (optional)</label>
                      <input className="input" placeholder="Transaction reference…" value={newPay.reference} onChange={e => setNewPay(p => ({ ...p, reference: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowPayForm(false)} className="btn-secondary text-sm">Cancel</button>
                    <button onClick={addPayment} disabled={addingPay || !newPay.amount} className="btn-primary text-sm">
                      {addingPay ? 'Recording…' : 'Record Payment'}
                    </button>
                  </div>
                </div>
              )}

              {payments.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No payments recorded</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{p.method}</p>
                          {p.reference && <p className="text-xs text-gray-400">{p.reference}</p>}
                        </div>
                      </div>
                      <p className="font-semibold text-green-600">S${parseFloat(p.amount).toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm px-1 pt-1">
                    <span className="text-gray-500">Amount Paid</span>
                    <span className="font-bold text-green-700">S${parseFloat(invoice.amount_paid||0).toFixed(2)}</span>
                  </div>
                  {parseFloat(invoice.total||0) > parseFloat(invoice.amount_paid||0) && (
                    <div className="flex justify-between text-sm px-1">
                      <span className="text-gray-500">Balance Due</span>
                      <span className="font-bold text-red-500">S${(parseFloat(invoice.total||0) - parseFloat(invoice.amount_paid||0)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
