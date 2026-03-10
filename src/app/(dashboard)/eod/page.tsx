'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calculator, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Download, Send } from 'lucide-react'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card (NETS/Visa/MC)', bank_transfer: 'Bank Transfer', paynow: 'PayNow', other: 'Other',
}
const DEFAULT_FLOAT = 68

interface PaymentMethod { method: string; label: string; expected: number; counted: number; variance: number }
interface Invoice { invoice_number: string; client_name: string; patient_name: string; amount: number; method: string; method_label: string }

function today() { return new Date().toISOString().split('T')[0] }

export default function EODPage() {
  const [date, setDate] = useState(today())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [eodId, setEodId] = useState<string | null>(null)

  const [breakdown, setBreakdown] = useState<PaymentMethod[]>([])
  const [floatIn, setFloatIn] = useState(DEFAULT_FLOAT)
  const [floatOut, setFloatOut] = useState(DEFAULT_FLOAT)
  const [cashCounted, setCashCounted] = useState(0)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [totalExpected, setTotalExpected] = useState(0)
  const [notes, setNotes] = useState('')
  const [showInvoices, setShowInvoices] = useState(false)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const res = await fetch(`/api/eod?date=${d}`).then(r => r.json())

    if (res.existing_eod) {
      const e = res.existing_eod
      const bd = Array.isArray(e.payment_breakdown) ? e.payment_breakdown : JSON.parse(e.payment_breakdown || '[]')
      setBreakdown(bd)
      setFloatIn(parseFloat(e.float_in))
      setFloatOut(parseFloat(e.float_out))
      setCashCounted(bd.find((m: any) => m.method === 'cash')?.counted || 0)
      setTotalExpected(parseFloat(e.total_expected))
      setNotes(e.notes || '')
      setSubmitted(true)
      setEodId(e.id)
    } else {
      const bd: PaymentMethod[] = res.payments_by_method.map((m: any) => ({
        method: m.method, label: m.label, expected: m.expected,
        counted: m.method === 'cash' ? 0 : m.expected,
        variance: m.method === 'cash' ? -m.expected : 0,
      }))
      setBreakdown(bd)
      setFloatIn(res.float_in)
      setFloatOut(res.float_in) // default float out = float in
      setCashCounted(0)
      setTotalExpected(res.total_expected)
      setNotes('')
      setSubmitted(false)
      setEodId(null)
    }
    setInvoices(res.invoices || [])
    setInvoiceCount(res.invoice_count || 0)
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  function updateCashCounted(val: number) {
    setCashCounted(val)
    setBreakdown(prev => prev.map(m =>
      m.method === 'cash'
        ? { ...m, counted: val, variance: parseFloat((val - m.expected).toFixed(2)) }
        : m
    ))
  }

  const totalCounted = breakdown.reduce((s, m) => s + parseFloat(String(m.counted || 0)), 0)
  const totalVariance = parseFloat((totalCounted - totalExpected).toFixed(2))
  const banking = parseFloat((cashCounted - floatOut).toFixed(2))

  const hasVariance = Math.abs(totalVariance) > 0
  const bigVariance = Math.abs(totalVariance) > 5

  async function handleSubmit() {
    if (saving) return
    setSaving(true)
    const res = await fetch('/api/eod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, float_in: floatIn, float_out: floatOut, cash_counted: cashCounted,
        payment_breakdown: breakdown, notes, total_expected: totalExpected,
        invoice_count: invoiceCount, invoices,
      }),
    }).then(r => r.json())
    setSaving(false)
    if (res.success) { setSubmitted(true); setEodId(res.id) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-pink/10 rounded-xl">
            <Calculator className="w-6 h-6 text-brand-pink" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">End of Day Cash-Up</h1>
            <p className="text-sm text-gray-500">Reconcile daily payments and banking</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" className="input w-40" value={date} max={today()} onChange={e => setDate(e.target.value)} />
          {eodId && (
            <a href={`/api/eod/${eodId}/pdf`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Print / PDF
            </a>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>
      ) : (
        <>
          {/* Submitted banner */}
          {submitted && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">EOD submitted for {date}. This record is locked.</p>
            </div>
          )}

          {/* Variance warning */}
          {!submitted && hasVariance && (
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${bigVariance ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 ${bigVariance ? 'text-red-500' : 'text-amber-500'}`} />
              <p className={`text-sm font-medium ${bigVariance ? 'text-red-700' : 'text-amber-700'}`}>
                {bigVariance ? '⚠️ Large variance detected:' : 'Minor variance:'} S${Math.abs(totalVariance).toFixed(2)} {totalVariance < 0 ? 'short' : 'over'}.
                {bigVariance ? ' Please recount before submitting.' : ' Double-check before submitting.'}
              </p>
            </div>
          )}

          {/* Payment breakdown */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <h2 className="font-semibold text-gray-800">Payment Breakdown</h2>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{invoiceCount} invoices</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Method</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Expected (App)</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Counted</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {breakdown.map(m => {
                  const v = parseFloat(String(m.variance || 0))
                  const vColor = Math.abs(v) > 5 ? 'text-red-600 font-semibold' : Math.abs(v) > 0 ? 'text-amber-600' : 'text-green-600'
                  return (
                    <tr key={m.method} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-800">{m.label}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-600">S${parseFloat(String(m.expected || 0)).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right">
                        {m.method === 'cash' && !submitted ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-500 text-xs">S$</span>
                            <input
                              type="number" step="0.01" min="0"
                              className="w-28 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
                              value={cashCounted}
                              onChange={e => updateCashCounted(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-gray-600">S${parseFloat(String(m.counted || 0)).toFixed(2)}</span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right font-mono ${vColor}`}>
                        {v >= 0 ? '+' : ''}S${v.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-5 py-3 font-bold text-gray-900">Total</td>
                  <td className="px-5 py-3 text-right font-bold font-mono">S${totalExpected.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-bold font-mono">S${totalCounted.toFixed(2)}</td>
                  <td className={`px-5 py-3 text-right font-bold font-mono ${Math.abs(totalVariance) > 5 ? 'text-red-600' : Math.abs(totalVariance) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {totalVariance >= 0 ? '+' : ''}S${totalVariance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cash float */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Cash Float & Banking</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="label">Float In (from yesterday)</label>
                <div className="input bg-gray-50 text-gray-500 font-mono">S${floatIn.toFixed(2)}</div>
              </div>
              <div>
                <label className="label">Cash Counted</label>
                <div className="input bg-gray-50 text-gray-700 font-mono">S${cashCounted.toFixed(2)}</div>
              </div>
              <div>
                <label className="label">Float Left in Till</label>
                {submitted ? (
                  <div className="input bg-gray-50 text-gray-700 font-mono">S${floatOut.toFixed(2)}</div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">S$</span>
                    <input type="number" step="0.01" min="0" className="input font-mono"
                      value={floatOut} onChange={e => setFloatOut(parseFloat(e.target.value) || 0)} />
                  </div>
                )}
              </div>
              <div>
                <label className="label">Banking Today</label>
                <div className="input bg-brand-pink/5 border-brand-pink/20 text-brand-pink font-bold font-mono">
                  S${banking.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice breakdown */}
          <div className="card p-0 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setShowInvoices(v => !v)}
            >
              <span className="font-semibold text-gray-800">Invoice Breakdown ({invoices.length})</span>
              {showInvoices ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showInvoices && (
              <div className="border-t border-gray-100">
                {invoices.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-400">No paid invoices for this date.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/60 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Invoice #</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Client</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Patient</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Method</th>
                        <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {invoices.map((inv, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-5 py-2.5 font-mono text-xs text-brand-pink">{inv.invoice_number}</td>
                          <td className="px-5 py-2.5 text-gray-700">{inv.client_name}</td>
                          <td className="px-5 py-2.5 text-gray-500">{inv.patient_name || '—'}</td>
                          <td className="px-5 py-2.5 text-gray-500 text-xs">{inv.method_label}</td>
                          <td className="px-5 py-2.5 text-right font-mono font-medium">S${inv.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {!submitted && (
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input w-full" rows={2} placeholder="Any discrepancies, comments or handover notes..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          )}
          {submitted && notes && (
            <div className="card">
              <p className="text-xs text-gray-500 mb-1 font-medium">Notes</p>
              <p className="text-sm text-gray-700">{notes}</p>
            </div>
          )}

          {/* Submit */}
          {!submitted && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-pink text-white font-semibold rounded-xl hover:bg-[#d4547f] transition-colors disabled:opacity-50"
              >
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send className="w-4 h-4" />}
                {saving ? 'Submitting...' : 'Submit End of Day'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
