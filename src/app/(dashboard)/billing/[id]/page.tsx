'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, Printer, Receipt, User, PawPrint, CalendarDays, CreditCard, ClipboardList } from 'lucide-react'
import Modal from '@/components/Modal'

const METHODS = [
  { value: 'visa',          label: 'VISA' },
  { value: 'mastercard',    label: 'MASTER' },
  { value: 'paynow',        label: 'PayNow' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash',          label: 'Cash' },
  { value: 'nets',          label: 'NETS' },
]

const fmt = (v: any) => parseFloat(v || 0).toFixed(2)
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-500',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-500',
  }
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const [data, setData]           = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string|null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [payForm, setPayForm]     = useState({
    amount: '', method: 'paynow', reference: '', date: new Date().toISOString().split('T')[0], notes: ''
  })

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      const d = await res.json()
      if (d.error) { setError(d.error); setLoading(false); return }
      setData(d)
      const outstanding = parseFloat(d.invoice?.total || 0) - parseFloat(d.invoice?.amount_paid || 0)
      setPayForm(f => ({ ...f, amount: Math.max(0, outstanding).toFixed(2) }))
    } catch (e: any) {
      setError(e.message || 'Failed to load invoice')
    }
    setLoading(false)
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/invoices/${id}/payments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(payForm.amount),
        method: payForm.method,
        reference: payForm.reference,
        client_id: data.invoice.client_id,
        date: payForm.date,
        notes: payForm.notes,
      })
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

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>
  if (error) return (
    <div className="text-center py-16 space-y-3">
      <p className="text-red-500 font-medium">{error}</p>
      <button onClick={fetchData} className="btn-secondary text-sm">Retry</button>
      <button onClick={() => router.back()} className="btn-secondary text-sm ml-2">Go Back</button>
    </div>
  )
  if (!data?.invoice) return <div className="text-center py-16 text-gray-400">Invoice not found</div>

  const { invoice, items = [], payments = [] } = data
  const total      = parseFloat(invoice.total || 0)
  const amountPaid = parseFloat(invoice.amount_paid || 0)
  const balance    = Math.max(0, total - amountPaid)

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">

      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Billing
      </button>

      {/* Header Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Receipt className="w-5 h-5 text-brand-pink" />
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number || invoice.bill_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <User className="w-3.5 h-3.5" />
                <span>Client</span>
                <span className="font-medium text-gray-900">{invoice.client_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <PawPrint className="w-3.5 h-3.5" />
                <span>Patient</span>
                <span className="font-medium text-gray-900">{invoice.patient_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Date</span>
                <span className="font-medium text-gray-900">{fmtDate(invoice.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Due</span>
                <span className="font-medium text-gray-900">{fmtDate(invoice.due_date)}</span>
              </div>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-6 py-4 text-right min-w-[180px]">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total</p>
            <p className="text-3xl font-bold text-gray-900">S${fmt(invoice.total)}</p>
            {amountPaid > 0 && <p className="text-xs text-green-600 mt-1">Paid: S${fmt(invoice.amount_paid)}</p>}
            {balance > 0 && <p className="text-xs text-red-500 font-semibold mt-0.5">Balance: S${balance.toFixed(2)}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100 flex-wrap">
          {invoice.status !== 'cancelled' && (
            <button onClick={() => setShowPayment(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> Record Payment
            </button>
          )}
          {invoice.status === 'draft' && (
            <button onClick={() => updateStatus('sent')} className="btn-secondary text-sm">Mark as Sent</button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={() => updateStatus('paid')} className="btn-secondary text-sm">Mark as Paid</button>
          )}
          {invoice.visit_id && (
            <button onClick={() => router.push(`/visits/${invoice.visit_id}`)} className="btn-secondary text-sm flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" /> View Visit Record
            </button>
          )}
          <button onClick={() => window.print()} className="btn-secondary text-sm flex items-center gap-1.5 ml-auto">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Line Items */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No line items</p>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.description}
                      {item.dispensing_instructions && (
                        <p className="text-xs text-gray-400 mt-0.5 font-normal">{item.dispensing_instructions}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${item.item_type === 'product' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-brand-pink'}`}>
                        {item.item_type || 'service'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{parseFloat(item.qty ?? item.quantity ?? 1)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">S${fmt(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">S${fmt(item.total ?? item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900 text-base">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 text-lg">S${fmt(invoice.total)}</td>
                </tr>
                {amountPaid > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-green-600 text-sm">Paid</td>
                    <td className="px-4 py-2 text-right text-green-600 font-semibold">S${fmt(invoice.amount_paid)}</td>
                  </tr>
                )}
                {balance > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-red-600 font-bold">Balance Due</td>
                    <td className="px-4 py-2 text-right text-red-600 font-bold">S${balance.toFixed(2)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No payments recorded yet</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">S${fmt(p.amount)}</p>
                    <p className="text-xs text-green-700">{fmtDate(p.date)} · {METHODS.find(m => m.value === p.method)?.label || p.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  {p.reference && <p className="text-xs text-gray-500">Ref: {p.reference}</p>}
                  {p.recorded_by_name && <p className="text-xs text-gray-400">by {p.recorded_by_name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Record Payment" size="md">
        <form onSubmit={recordPayment} className="space-y-4">
          <div>
            <label className="label">Amount (S$) *</label>
            <input type="number" step="0.01" min="0.01" className="input" value={payForm.amount}
              onChange={e => setPayForm({...payForm, amount: e.target.value})} required />
            {balance > 0 && <p className="text-xs text-gray-400 mt-1">Outstanding: S${balance.toFixed(2)}</p>}
          </div>
          <div>
            <label className="label">Payment Method *</label>
            <select className="input" value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})} required>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input className="input" value={payForm.reference} onChange={e => setPayForm({...payForm, reference: e.target.value})} placeholder="e.g. PayNow ref, cheque no." />
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} required />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> Record Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
