'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/Modal'
import { Plus, Trash2, Search, ChevronDown } from 'lucide-react'

type LineItem = {
  id: string
  type: 'service' | 'product'
  item_id: string
  name: string
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
  existingInvoice?: any
  existingLineItems?: any[]
  onSaved: (invoiceId: string) => void
}

export default function BillingModal({ open, onClose, visitId, clientId, patientId, existingInvoice, existingLineItems = [], onSaved }: Props) {
  const [services, setServices]   = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [items, setItems]         = useState<LineItem[]>([])
  const [saving, setSaving]       = useState(false)

  // Item picker state
  const [pickerType, setPickerType] = useState<'service'|'product'>('service')
  const [search, setSearch]         = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/service-pricing').then(r => r.json()).then(d => setServices(d.pricing || []))
    fetch('/api/inventory?limit=500').then(r => r.json()).then(d => setInventory(d.items || []))
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
        // Create invoice from visit
        const res = await fetch(`/api/visits/${visitId}/invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const d = await res.json()
        invoiceId = d.invoice?.id
      }

      if (!invoiceId) {
        // Create a standalone invoice
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            patient_id: patientId,
            items: [], // we'll add via line-items API
          }),
        })
        const d = await res.json()
        invoiceId = d.invoice?.id
      }

      if (!invoiceId) { setSaving(false); return }

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

      onSaved(invoiceId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Bill" size="lg">
      <div className="space-y-4">

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
                    : Object.entries(groupedServices).map(([cat, items]) => (
                      <div key={cat}>
                        <div className="px-4 py-1.5 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0">
                          {cat}
                        </div>
                        {items.map(s => (
                          <button key={s.id} type="button" onClick={() => addService(s)}
                            className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-pink-50 text-sm text-left border-b border-gray-50 last:border-0">
                            <span className="font-medium text-gray-800">{s.label || s.service?.name}</span>
                            <span className="text-brand-pink font-semibold ml-4 flex-shrink-0">S${parseFloat(s.price||0).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
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

        {/* Line Items */}
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">No items added yet</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="rounded-xl border border-gray-200 px-3 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.type === 'product' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-brand-pink'}`}>
                      {item.type}
                    </span>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500 flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-0.5 block">Qty</label>
                    <input type="number" min="0.5" step="0.5" className="input text-sm py-1"
                      value={item.qty} onChange={e => updateQty(item.id, parseFloat(e.target.value) || 1)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-0.5 block">Unit Price (S$)</label>
                    <input type="number" min="0" step="0.01" className="input text-sm py-1"
                      value={item.unit_price} onChange={e => updatePrice(item.id, parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-0.5 block">Total</label>
                    <p className="text-sm font-semibold text-gray-900 pt-1.5">S${(item.qty * item.unit_price).toFixed(2)}</p>
                  </div>
                </div>
                {item.type === 'product' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Dispensing Instructions</label>
                    <input type="text" className="input text-sm py-1" placeholder="e.g. 1 tablet every 8 hours…"
                      value={item.dispensing_instructions || ''}
                      onChange={e => updateInstructions(item.id, e.target.value)} />
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-gray-900">S${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || items.length === 0}
            className="btn-primary">
            {saving ? 'Saving…' : existingInvoice ? 'Update Bill' : 'Create Bill'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
