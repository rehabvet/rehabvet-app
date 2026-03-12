'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import BillingModal from '@/components/BillingModal'

const PAGE_SIZE = 50

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showBilling, setShowBilling] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => { setPage(1) }, [statusFilter])
  useEffect(() => { fetchInvoices() }, [statusFilter, page])

  async function fetchInvoices() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), _t: String(Date.now()) })
    if (statusFilter) params.set('status', statusFilter)
    const data = await fetch(`/api/invoices?${params}`, { cache: 'no-store' }).then(r => r.json())
    setInvoices(data.invoices || [])
    setTotalPages(data.totalPages || 1)
    setTotalCount(data.total || 0)
    setLoading(false)
  }

  const totalOutstanding = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).reduce((sum, i) => sum + i.total - i.amount_paid, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-500 text-sm">Manage invoices and payments</p>
        </div>
        <button onClick={() => setShowBilling(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </button>
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
          <p className="text-xl font-bold text-gray-900">{totalCount}</p>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} invoices
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BillingModal — client/patient search built-in */}
      <BillingModal
        open={showBilling}
        onClose={() => setShowBilling(false)}
        visitId={null}
        onSaved={() => { setShowBilling(false); fetchInvoices() }}
      />
    </div>
  )
}

function InvStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { paid: 'badge-green', partial: 'badge-yellow', sent: 'badge-blue', draft: 'badge-gray', overdue: 'badge-red', cancelled: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status}</span>
}
