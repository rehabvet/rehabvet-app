'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/Modal'
import { Plus, Trash2, Search, ChevronDown } from 'lucide-react'

type LineItem = {
  id: string
  type: 'service' | 'product'
  item_id: string
  name: string
  category?: string
  unit_price: number
  qty: number
  dispensing_instructions?: string
}

function uid() { return Math.random().toString(36).slice(2) }

interface Props {
  open: boolean
  onClose: () => void
  visitId?: string | null
  clientId: string
  patientId: string
  clientName?: string
  patientName?: string
  appointmentDate?: string
  existingInvoice?: any
  existingLineItems?: any[]
  onSaved: (invoiceId: string) => void
}

export default function BillingModal({ open, onClose, visitId, clientId, patientId, clientName, patientName, appointmentDate, existingInvoice, existingLineItems = [], onSaved }: Props) {
  const [services, setServices]   = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [items, setItems]         = useState<LineItem[]>([])
  const [saving, setSaving]         = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [client, setClient]         = useState<any>(null)
  const [patient, setPatient]       = useState<any>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Item picker state
  const [pickerType, setPickerType] = useState<'service'|'product'>('service')
  const [search, setSearch]         = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/service-pricing').then(r => r.json()).then(d => setServices(d.pricing || []))
    fetch('/api/inventory?limit=500').then(r => r.json()).then(d => setInventory(d.items || []))
    if (clientId) fetch(`/api/clients/${clientId}`).then(r => r.json()).then(d => setClient(d.client || d))
    if (patientId) fetch(`/api/patients/${patientId}`).then(r => r.json()).then(d => setPatient(d.patient || d))
    setPaymentMethod('')
    // Pre-populate from existing line items
    if (existingLineItems.length > 0) {
      setItems(existingLineItems.map(li => ({
        id: uid(),
        type: li.item_type === 'product' ? 'product' : 'service',
        item_id: li.id,
        name: li.description,
        unit_price: parseFloat(li.unit_price || li.amount || 0),
        qty: parseFloat(li.qty || li.quantity || 1),
        dispensing_instructions: li.dispensing_instructions || '',
      })))
    } else {
      setItems([])
    }
  }, [open])

  useEffect(() => {
    if (showPicker) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showPicker, pickerType])

  const filteredServices = services.filter(s =>
    `${s.service?.name} ${s.label} ${s.service?.category}`.toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
  const groupedServices = filteredServices.reduce((acc: Record<string, any[]>, s) => {
    const cat = s.service?.category || 'Other Services'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})
  const filteredInventory = inventory.filter(i =>
    `${i.name} ${i.brand || ''} ${i.sku || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  function addService(s: any) {
    setItems(prev => [...prev, {
      id: uid(),
      type: 'service',
      item_id: s.id,
      name: s.label || s.service?.name || 'Service',
      category: s.service?.category || 'Service',
      unit_price: parseFloat(s.price || 0),
      qty: 1,
    }])
    setShowPicker(false)
    setSearch('')
  }

  function addProduct(p: any) {
    setItems(prev => [...prev, {
      id: uid(),
      type: 'product',
      item_id: p.id,
      name: p.name,
      category: p.category || 'Product',
      unit_price: parseFloat(p.sell_price || 0),
      qty: 1,
      dispensing_instructions: '',
    }])
    setShowPicker(false)
    setSearch('')
  }

  function removeItem(id: string) { setItems(prev => prev.filter(i => i.id !== id)) }
  function updateQty(id: string, qty: number) { setItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0.5, qty) } : i)) }
  function updatePrice(id: string, price: number) { setItems(prev => prev.map(i => i.id === id ? { ...i, unit_price: price } : i)) }
  function updateInstructions(id: string, v: string) { setItems(prev => prev.map(i => i.id === id ? { ...i, dispensing_instructions: v } : i)) }

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const total    = subtotal // no GST shown separately — price already inclusive

  async function handleSave() {
    setSaving(true)
    try {
      let invoiceId = existingInvoice?.id

      if (!invoiceId && visitId) {
        // Try create invoice from visit; if already exists (409) fetch the existing one
        const res = await fetch(`/api/visits/${visitId}/invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const d = await res.json()
        if (d.invoice?.id) {
          invoiceId = d.invoice.id
        } else {
          // 409 = already exists — fetch it
          const existing = await fetch(`/api/visits/${visitId}/invoice`).then(r => r.json())
          invoiceId = existing.invoice?.id
        }
      }

      if (!invoiceId) {
        // No visit — create standalone invoice via raw SQL endpoint
        const res = await fetch('/api/invoices/create-raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, patient_id: patientId }),
        })
        const d = await res.json()
        invoiceId = d.invoice?.id
      }

      if (!invoiceId) { alert('Could not create invoice. Please try again.'); setSaving(false); return }

      // Delete existing line items if editing
      if (existingLineItems.length > 0) {
        for (const li of existingLineItems) {
          await fetch(`/api/invoices/${invoiceId}/line-items`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line_item_id: li.id }),
          })
        }
      }

      // Add new line items
      for (const item of items) {
        await fetch(`/api/invoices/${invoiceId}/line-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_type: item.type === 'product' ? 'product' : 'service',
            description: item.name,
            qty: item.qty,
            unit_price: item.unit_price,
            dispensing_instructions: item.dispensing_instructions || null,
            is_package_redemption: item.unit_price === 0,
          }),
        })
      }

      // Record payment if method selected and total > 0
      if (paymentMethod && total > 0) {
        await fetch(`/api/invoices/${invoiceId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            method: paymentMethod,
            client_id: clientId,
          }),
        })
      }

      onSaved(invoiceId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Bill" size="xl">
      <div className="space-y-4">

        {/* Invoice Header */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Client</p>
            <p className="font-semibold text-gray-900">{client?.name || clientName || '—'}</p>
            {client?.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
            {client?.email && <p className="text-xs text-gray-500">{client.email}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Patient</p>
            <p className="font-semibold text-gray-900">{patient?.name || patientName || '—'}</p>
            {patient?.species && <p className="text-xs text-gray-500 capitalize">{patient.species}{patient.breed ? ` · ${patient.breed}` : ''}</p>}
          </div>
          {appointmentDate && (
            <div className="sm:text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Date</p>
              <p className="text-sm text-gray-700">{new Date(appointmentDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          )}
        </div>

        {/* Add Item */}
        <div>
          <div className="flex gap-2 mb-2">
            <button type="button"
              onClick={() => { setPickerType('service'); setSearch(''); setShowPicker(true) }}
              className="btn-secondary text-sm flex items-center gap-1.5 flex-1 justify-center">
              <Plus className="w-3.5 h-3.5" /> Add Service
            </button>
            <button type="button"
              onClick={() => { setPickerType('product'); setSearch(''); setShowPicker(true) }}
              className="btn-secondary text-sm flex items-center gap-1.5 flex-1 justify-center">
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
          </div>

          {/* Picker */}
          {showPicker && (
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex border-b border-gray-100">
                {(['service','product'] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => { setPickerType(t); setSearch('') }}
                    className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${pickerType === t ? 'bg-brand-pink/10 text-brand-pink' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {t === 'service' ? '🩺 Services' : '📦 Products'}
                  </button>
                ))}
              </div>
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input ref={searchRef} className="input pl-8 text-sm py-1.5" placeholder="Search…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                {pickerType === 'service' ? (
                  filteredServices.length === 0
                    ? <p className="text-center text-xs text-gray-400 py-4">No services found</p>
                    : filteredServices.map(s => (
                      <button key={s.id} type="button" onClick={() => addService(s)}
                        className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-pink-50 text-sm text-left border-b border-gray-50 last:border-0 gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.service?.category || 'Other'}</p>
                          <p className="font-medium text-gray-800">{s.label || s.service?.name}</p>
                        </div>
                        <span className="text-brand-pink font-semibold flex-shrink-0">S${parseFloat(s.price||0).toFixed(2)}</span>
                      </button>
                    ))
                ) : (
                  filteredInventory.length === 0
                    ? <p className="text-center text-xs text-gray-400 py-4">No products found</p>
                    : filteredInventory.map(p => (
                      <button key={p.id} type="button" onClick={() => addProduct(p)}
                        className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-left">
                        <div>
                          <span className="font-medium text-gray-800">{p.name}</span>
                          {p.brand && <span className="ml-2 text-xs text-gray-400">{p.brand}</span>}
                          <span className="ml-2 text-xs text-gray-400">({p.stock_on_hand} {p.unit || 'units'})</span>
                        </div>
                        <span className="text-brand-pink font-semibold ml-4 flex-shrink-0">S${parseFloat(p.sell_price||0).toFixed(2)}</span>
                      </button>
                    ))
                )}
              </div>
              <div className="border-t border-gray-100 p-2 flex justify-end">
                <button type="button" onClick={() => setShowPicker(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Close</button>
              </div>
            </div>
          )}
        </div>

        {/* Line Items — Invoice Table */}
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">No items added yet</p>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            {items.map((item, idx) => (
              <div key={item.id} className={`px-4 py-3 ${idx < items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Description */}
                  <div className="col-span-5">
                    <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${item.type === 'product' ? 'text-blue-500' : 'text-brand-pink'}`}>
                      {item.category || item.type}
                    </span>
                  </div>
                  {/* Qty */}
                  <div className="col-span-2">
                    <input type="number" min="0.5" step="0.5"
                      className="input text-sm py-1.5 text-center"
                      value={item.qty} onChange={e => updateQty(item.id, parseFloat(e.target.value) || 1)} />
                  </div>
                  {/* Unit Price */}
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01"
                      className="input text-sm py-1.5 text-right"
                      value={item.unit_price} onChange={e => updatePrice(item.id, parseFloat(e.target.value) || 0)} />
                  </div>
                  {/* Total */}
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-gray-900">S${(item.qty * item.unit_price).toFixed(2)}</p>
                  </div>
                  {/* Delete */}
                  <div className="col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {item.type === 'product' && (
                  <div className="mt-2">
                    <input type="text" className="input text-xs py-1 text-gray-500" placeholder="Dispensing instructions…"
                      value={item.dispensing_instructions || ''}
                      onChange={e => updateInstructions(item.id, e.target.value)} />
                  </div>
                )}
              </div>
            ))}

            {/* Total Row */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-t border-gray-200 items-center">
              <div className="col-span-9 text-right font-semibold text-gray-600">Total</div>
              <div className="col-span-2 text-right text-lg font-bold text-gray-900">S${total.toFixed(2)}</div>
              <div className="col-span-1" />
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Payment Method <span className="text-red-400">*</span>
          </label>
          <select
            className="input text-sm"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
          >
            <option value="">— Select payment method —</option>
            <option value="visa">VISA</option>
            <option value="mastercard">MASTER</option>
            <option value="paynow">PayNow</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="nets">NETS</option>
          </select>
          {!paymentMethod && items.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">Required to mark as paid. Leave blank to save as unpaid draft.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button"
            onClick={() => paymentMethod ? setShowConfirm(true) : handleSave()}
            disabled={saving || items.length === 0}
            className="btn-primary">
            {saving ? 'Saving…' : existingInvoice
              ? (paymentMethod ? 'Update & Record Payment' : 'Update Bill')
              : (paymentMethod ? 'Create Bill & Mark Paid' : 'Create Bill')}
          </button>
        </div>
      </div>
    </Modal>

    {/* Confirmation Dialog */}
    <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Payment" size="sm">
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Client</span>
            <span className="font-medium">{client?.name || clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Patient</span>
            <span className="font-medium">{patient?.name || patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Items</span>
            <span className="font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="text-gray-500">Total</span>
            <span className="text-lg font-bold text-gray-900">S${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment via</span>
            <span className="font-semibold text-brand-pink uppercase">{paymentMethod.replace('_', ' ')}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 text-center">This will create the bill and record the payment. Are you sure?</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setShowConfirm(false)} className="btn-secondary">Cancel</button>
          <button type="button" onClick={() => { setShowConfirm(false); handleSave() }} className="btn-primary">
            Yes, Confirm
          </button>
        </div>
      </div>
    </Modal>
  )
}
