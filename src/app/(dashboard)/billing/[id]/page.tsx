'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, Printer } from 'lucide-react'
import Modal from '@/components/Modal'

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paynow', label: 'PayNow' },
  { value: 'other', label: 'Other' },
]

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [payForm, setPayForm] = useState({
    amount: '', method: 'paynow', reference: '', date: new Date().toISOString().split('T')[0], notes: ''
  })

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const d = await fetch(`/api/invoices/${id}`).then(r => r.json())
    setData(d)
    setPayForm(f => ({ ...f, amount: (d.invoice.total - d.invoice.amount_paid).toFixed(2) }))
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_payment', ...payForm, amount: parseFloat(payForm.amount) })
    })
    setShowPayment(false)
    fetchData()
  }

  async function updateStatus(status: string) {
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    fetchData()
  }

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  const { invoice, items, payments } = data
  const balance = invoice.total - invoice.amount_paid

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Invoice Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
              <InvStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-gray-500">Client: <span className="font-medium text-gray-700">{invoice.client_name}</span></p>
            {invoice.patient_name && <p className="text-sm text-gray-500">Patient: <span className="font-medium text-gray-700">{invoice.patient_name}</span></p>}
            <p className="text-sm text-gray-500 mt-1">Date: {invoice.date} · Due: {invoice.due_date}</p>
          </div>
          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <button onClick={() => updateStatus('sent')} className="btn-secondary text-sm">Mark as Sent</button>
            )}
            {['sent', 'partial', 'overdue'].includes(invoice.status) && (
              <button onClick={() => setShowPayment(true)} className="btn-primary text-sm">
                <DollarSign className="w-4 h-4 mr-1" /> Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Line Items</h2>
        <table className="w-full">
          <thead><tr className="border-b border-gray-200">
            <th className="table-header">Description</th>
            <th className="table-header text-center">Qty</th>
            <th className="table-header text-right">Unit Price</th>
            <th className="table-header text-right">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item: any) => (
              <tr key={item.id}>
                <td className="table-cell">
                  {item.description}
                  {item.modality && <span className="badge-purple ml-2">{item.modality}</span>}
                </td>
                <td className="table-cell text-center">{item.qty ?? item.quantity}</td>
                <td className="table-cell text-right">S${parseFloat(item.unit_price||0).toFixed(2)}</td>
                <td className="table-cell text-right font-medium">S${parseFloat(item.total||item.amount||0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td colSpan={3} className="table-cell text-right text-gray-500">Subtotal</td>
              <td className="table-cell text-right font-medium">${invoice.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="table-cell text-right text-gray-500">GST (9%)</td>
              <td className="table-cell text-right">${invoice.tax.toFixed(2)}</td>
            </tr>
            <tr className="border-t border-gray-300">
              <td colSpan={3} className="table-cell text-right font-bold text-lg">Total</td>
              <td className="table-cell text-right font-bold text-lg">${invoice.total.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="table-cell text-right text-green-600">Paid</td>
              <td className="table-cell text-right text-green-600 font-medium">${invoice.amount_paid.toFixed(2)}</td>
            </tr>
            {balance > 0 && (
              <tr>
                <td colSpan={3} className="table-cell text-right text-red-600 font-bold">Balance Due</td>
                <td className="table-cell text-right text-red-600 font-bold">${balance.toFixed(2)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Payment History</h2>
          <div className="space-y-3">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                <div>
                  <p className="text-sm font-medium text-green-800">${p.amount.toFixed(2)} via {p.method}</p>
                  <p className="text-xs text-green-600">{p.date} {p.reference && `· Ref: ${p.reference}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment">
        <form onSubmit={recordPayment} className="space-y-4">
          <div>
            <label className="label">Amount (SGD) *</label>
            <input type="number" step="0.01" className="input" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} required />
            <p className="text-xs text-gray-400 mt-1">Outstanding: ${balance.toFixed(2)}</p>
          </div>
          <div>
            <label className="label">Payment Method *</label>
            <select className="input" value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div><label className="label">Reference</label><input className="input" value={payForm.reference} onChange={e => setPayForm({...payForm, reference: e.target.value})} placeholder="e.g. VISA-****-1234" /></div>
          <div><label className="label">Date *</label><input type="date" className="input" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} required /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Record Payment</button>
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
