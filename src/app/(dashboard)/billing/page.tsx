'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, DollarSign, Filter } from 'lucide-react'
import Modal from '@/components/Modal'
import BillingModal from '@/components/BillingModal'

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Step 1: pick client + patient
  const [showPicker, setShowPicker] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [showPatientDrop, setShowPatientDrop] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)
  const patientRef = useRef<HTMLDivElement>(null)

  // Step 2: open BillingModal
  const [showBilling, setShowBilling] = useState(false)

  useEffect(() => { fetchInvoices() }, [statusFilter])

  async function fetchInvoices() {
    setLoading(true)
    const q = statusFilter ? `?status=${statusFilter}` : ''
    const sep = q ? '&' : '?'
    const data = await fetch(`/api/invoices${q}${sep}_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
    setInvoices(data.invoices || [])
    setLoading(false)
  }

  function openPicker() {
    setClientSearch(''); setPatientSearch('')
    setSelectedClient(null); setSelectedPatient(null)
    Promise.all([
      fetch('/api/clients?limit=5000').then(r => r.json()),
      fetch('/api/patients?limit=5000').then(r => r.json()),
    ]).then(([c, p]) => {
      setClients(c.clients || [])
      setPatients(p.patients || [])
      setShowPicker(true)
    })
  }

  function proceedToBilling() {
    if (!selectedClient) return
    setShowPicker(false)
    setShowBilling(true)
  }

  function resetPicker() {
    setShowPicker(false)
    setClientSearch(''); setPatientSearch('')
    setSelectedClient(null); setSelectedPatient(null)
  }

  const totalOutstanding = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).reduce((sum, i) => sum + i.total - i.amount_paid, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)

  const filteredClients = clients.filter(c => `${c.name} ${c.phone || ''}`.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20)
  const filteredPatients = patients.filter(p => (!selectedClient || p.client_id === selectedClient.id) && p.name.toLowerCase().includes(patientSearch.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-500 text-sm">Manage invoices and payments</p>
        </div>
        <button onClick={openPicker} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> New Invoice</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-red-600">S${totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Collected (paid invoices)</p>
          <p className="text-xl font-bold text-green-600">S${totalPaid.toFixed(2)}</p>
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

      {/* Step 1: Select client + patient */}
      <Modal open={showPicker} onClose={resetPicker} title="New Invoice — Select Client" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Client *</label>
            <div className="relative" ref={clientRef}>
              <input
                className="input"
                placeholder="Search by name or phone..."
                value={clientSearch}
                autoFocus
                onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); if (!e.target.value) { setSelectedClient(null); setSelectedPatient(null); setPatientSearch('') } }}
                onFocus={() => setShowClientDrop(true)}
              />
              {selectedClient && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">✓ {selectedClient.name}</span>}
              {showClientDrop && clientSearch && !selectedClient && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {filteredClients.map(c => (
                    <div key={c.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onMouseDown={() => { setSelectedClient(c); setClientSearch(c.name); setSelectedPatient(null); setPatientSearch(''); setShowClientDrop(false) }}>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </div>
                  ))}
                  {filteredClients.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No clients found</p>}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Patient <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="relative" ref={patientRef}>
              <input
                className="input"
                placeholder={selectedClient ? 'Search patient...' : 'Select a client first'}
                value={patientSearch}
                disabled={!selectedClient}
                onChange={e => { setPatientSearch(e.target.value); setShowPatientDrop(true); if (!e.target.value) { setSelectedPatient(null) } }}
                onFocus={() => setShowPatientDrop(true)}
              />
              {selectedPatient && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">✓ {selectedPatient.name}</span>}
              {showPatientDrop && patientSearch && !selectedPatient && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredPatients.map(p => (
                    <div key={p.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onMouseDown={() => { setSelectedPatient(p); setPatientSearch(p.name); setShowPatientDrop(false) }}>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      {p.species && <p className="text-xs text-gray-400 capitalize">{p.species}{p.breed ? ` · ${p.breed}` : ''}</p>}
                    </div>
                  ))}
                  {filteredPatients.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No patients found</p>}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetPicker} className="btn-secondary">Cancel</button>
            <button type="button" onClick={proceedToBilling} disabled={!selectedClient} className="btn-primary disabled:opacity-40">Next →</button>
          </div>
        </div>
      </Modal>

      {/* Step 2: Full BillingModal with service/product picker */}
      {showBilling && selectedClient && (
        <BillingModal
          open={showBilling}
          onClose={() => { setShowBilling(false); resetPicker() }}
          visitId={null}
          clientId={selectedClient.id}
          patientId={selectedPatient?.id || ''}
          clientName={selectedClient.name}
          patientName={selectedPatient?.name}
          onSaved={() => { setShowBilling(false); resetPicker(); fetchInvoices() }}
        />
      )}
    </div>
  )
}

function InvStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { paid: 'badge-green', partial: 'badge-yellow', sent: 'badge-blue', draft: 'badge-gray', overdue: 'badge-red', cancelled: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status}</span>
}
