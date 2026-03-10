'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, DollarSign, Filter } from 'lucide-react'
import Modal from '@/components/Modal'

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clientSearch, setClientSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [showPatientDrop, setShowPatientDrop] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)
  const patientRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    client_id: '', patient_id: '', date: new Date().toISOString().split('T')[0],
    due_date: '', notes: '',
    items: [{ description: '', modality: '', quantity: 1, unit_price: 0 }]
  })

  useEffect(() => { fetchInvoices() }, [statusFilter])

  async function fetchInvoices() {
    setLoading(true)
    const q = statusFilter ? `?status=${statusFilter}` : ''
    const sep = q ? '&' : '?'
    const data = await fetch(`/api/invoices${q}${sep}_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
    setInvoices(data.invoices || [])
    setLoading(false)
  }

  function openAdd() {
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14)
    setForm({ ...form, due_date: dueDate.toISOString().split('T')[0] })
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/patients').then(r => r.json()),
    ]).then(([c, p]) => {
      setClients(c.clients || [])
      setPatients(p.patients || [])
      setShowAdd(true)
    })
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { description: '', modality: '', quantity: 1, unit_price: 0 }] })
  }

  function updateItem(idx: number, field: string, value: any) {
    const items = [...form.items]
    ;(items[idx] as any)[field] = value
    setForm({ ...form, items })
  }

  function removeItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setShowAdd(false)
    fetchInvoices()
  }

  const subtotal = form.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const tax = 0
  const total = subtotal

  const totalOutstanding = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).reduce((sum, i) => sum + i.total - i.amount_paid, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-500 text-sm">Manage invoices and payments</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Invoice</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-red-600">${totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Collected (paid invoices)</p>
          <p className="text-xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
          <p className="text-xl font-bold text-gray-900">{invoices.length}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {['', 'draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No invoices found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="table-header">Invoice #</th>
                <th className="table-header">Old Invoice No.</th>
                <th className="table-header">Client</th>
                <th className="table-header">Patient</th>
                <th className="table-header">Date</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-right">Paid</th>
                <th className="table-header text-right">Balance</th>
                <th className="table-header">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/billing/${inv.id}`}>
                    <td className="table-cell font-medium text-brand-pink">{inv.invoice_number}</td>
                    <td className="table-cell text-gray-400 text-sm">{inv.bill_number || '—'}</td>
                    <td className="table-cell">{inv.client_name}</td>
                    <td className="table-cell">{inv.patient_name || '—'}</td>
                    <td className="table-cell">{inv.date}</td>
                    <td className="table-cell text-right font-medium">S${parseFloat(inv.total||0).toFixed(2)}</td>
                    <td className="table-cell text-right text-green-600">S${parseFloat(inv.amount_paid||0).toFixed(2)}</td>
                    <td className="table-cell text-right text-red-600 font-medium">S${(parseFloat(inv.total||0) - parseFloat(inv.amount_paid||0)).toFixed(2)}</td>
                    <td className="table-cell"><InvStatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setClientSearch(''); setPatientSearch(''); setSelectedClient(null); setSelectedPatient(null); }} title="Create Invoice" size="xl">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client *</label>
              <div className="relative" ref={clientRef}>
                <input
                  className="input"
                  placeholder="Search client..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); if (!e.target.value) { setSelectedClient(null); setForm(f => ({...f, client_id: '', patient_id: ''})); setSelectedPatient(null); setPatientSearch('') } }}
                  onFocus={() => setShowClientDrop(true)}
                  required={!form.client_id}
                />
                {selectedClient && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">✓</span>}
                {showClientDrop && clientSearch && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {clients.filter(c => `${c.name} ${c.phone || ''}`.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20).map(c => (
                      <div key={c.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onMouseDown={() => { setSelectedClient(c); setClientSearch(c.name); setForm(f => ({...f, client_id: c.id, patient_id: ''})); setSelectedPatient(null); setPatientSearch(''); setShowClientDrop(false) }}>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </div>
                    ))}
                    {clients.filter(c => `${c.name} ${c.phone || ''}`.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">No clients found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="label">Patient</label>
              <div className="relative" ref={patientRef}>
                <input
                  className="input"
                  placeholder="Search patient..."
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setShowPatientDrop(true); if (!e.target.value) { setSelectedPatient(null); setForm(f => ({...f, patient_id: ''})) } }}
                  onFocus={() => setShowPatientDrop(true)}
                  disabled={!form.client_id}
                />
                {selectedPatient && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">✓</span>}
                {showPatientDrop && patientSearch && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {patients.filter(p => (!form.client_id || p.client_id === form.client_id) && p.name.toLowerCase().includes(patientSearch.toLowerCase())).map(p => (
                      <div key={p.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onMouseDown={() => { setSelectedPatient(p); setPatientSearch(p.name); setForm(f => ({...f, patient_id: p.id})); setShowPatientDrop(false) }}>
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                        {p.species && <p className="text-xs text-gray-400 capitalize">{p.species}{p.breed ? ` · ${p.breed}` : ''}</p>}
                      </div>
                    ))}
                    {patients.filter(p => (!form.client_id || p.client_id === form.client_id) && p.name.toLowerCase().includes(patientSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">No patients found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Invoice Date *</label><input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
            <div><label className="label">Due Date *</label><input type="date" className="input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Line Items</label>
              <button type="button" onClick={addItem} className="text-xs text-brand-pink hover:underline">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1"><input className="input" placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} required /></div>
                  <div className="w-20"><input type="number" min="1" className="input" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} /></div>
                  <div className="w-28"><input type="number" step="0.01" className="input" placeholder="Price" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} /></div>
                  <div className="w-24 text-sm font-medium text-right py-2">${(item.quantity * item.unit_price).toFixed(2)}</div>
                  {form.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 pb-2">×</button>}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 text-right text-sm space-y-1">
            <p>Subtotal: <span className="font-medium">${subtotal.toFixed(2)}</span></p>

            <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
          </div>

          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Invoice</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function InvStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { paid: 'badge-green', partial: 'badge-yellow', sent: 'badge-blue', draft: 'badge-gray', overdue: 'badge-red', cancelled: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status}</span>
}
