'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calculator, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Printer, Loader2, History, TrendingUp } from 'lucide-react'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', nets: 'NETS', visa: 'Visa', mastercard: 'Mastercard', bank_transfer: 'Bank Transfer', paynow: 'PayNow', other: 'Other',
}
const METHODS = ['cash', 'nets', 'visa', 'mastercard', 'bank_transfer', 'paynow', 'other']

interface MethodRow { method: string; label: string; expected: number; counted: number; variance: number }

export default function EODPage() {
  const today = new Date().toISOString().split('T')[0]
  const [tab, setTab] = useState<'cashup'|'history'>('cashup')
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [existingEod, setExistingEod] = useState<any>(null)

  const [floatIn, setFloatIn] = useState(68)
  const [floatOut, setFloatOut] = useState(68)
  const [breakdown, setBreakdown] = useState<MethodRow[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [totalExpected, setTotalExpected] = useState(0)
  const [notes, setNotes] = useState('')
  const [showInvoices, setShowInvoices] = useState(false)

  // History state
  const [history, setHistory] = useState<any[]>([])
  const [historyPeriod, setHistoryPeriod] = useState<'week'|'month'|'all'>('month')
  const [historyLoading, setHistoryLoading] = useState(false)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const res = await fetch(`/api/eod?date=${d}`).then(r => r.json())
    setFloatIn(res.float_in ?? 68)
    setFloatOut(res.float_in ?? 68) // default float_out = float_in
    setTotalExpected(res.total_expected ?? 0)
    setInvoiceCount(res.invoice_count ?? 0)
    setInvoices(res.invoices || [])

    if (res.existing_eod) {
      const e = res.existing_eod
      setExistingEod(e)
      setSubmitted(true)
      setSavedId(e.id)
      setFloatIn(parseFloat(e.float_in))
      setFloatOut(parseFloat(e.float_out))
      setNotes(e.notes || '')
      const bd: any[] = typeof e.payment_breakdown === 'string' ? JSON.parse(e.payment_breakdown) : (e.payment_breakdown || [])
      setBreakdown(bd)
    } else {
      setExistingEod(null)
      setSubmitted(false)
      setSavedId(null)
      setNotes('')
      const rows: MethodRow[] = (res.payments_by_method || []).map((m: any) => ({
        method: m.method,
        label: m.label,
        expected: m.expected,
        counted: m.expected, // non-cash defaults to expected
        variance: 0,
      }))
      setBreakdown(rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  useEffect(() => {
    if (tab !== 'history') return
    setHistoryLoading(true)
    fetch(`/api/eod?history=1&period=${historyPeriod}`)
      .then(r => r.json())
      .then(d => { setHistory(d.closings || []); setHistoryLoading(false) })
  }, [tab, historyPeriod])

  function setCashCounted(val: number) {
    setBreakdown(prev => prev.map(m => {
      if (m.method !== 'cash') return m
      return { ...m, counted: val, variance: parseFloat((val - m.expected).toFixed(2)) }
    }))
  }

  const cashRow = breakdown.find(m => m.method === 'cash')
  const cashCounted = cashRow?.counted ?? 0
  const banking = parseFloat((cashCounted - floatOut).toFixed(2))
  const totalCounted = breakdown.reduce((s, m) => s + m.counted, 0)
  const totalVariance = parseFloat((totalCounted - totalExpected).toFixed(2))

  async function handleSubmit() {
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
    if (res.success) { setSubmitted(true); setSavedId(res.id); load(date) }
  }

  const varianceAbs = Math.abs(totalVariance)
  const hasWarning = varianceAbs > 0
  const hasBigWarning = varianceAbs > 5

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-pink" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Calculator className="w-6 h-6 text-brand-pink" /> End of Day Cash-Up</h1>
          <p className="text-sm text-gray-500 mt-1">Reconcile daily payments and close the books</p>
        </div>
        {savedId && tab === 'cashup' && (
          <a href={`/api/eod/${savedId}/pdf`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-brand-pink text-brand-pink rounded-lg hover:bg-pink-50 text-sm font-medium">
            <Printer className="w-4 h-4" /> Print Report
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('cashup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'cashup' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          <Calculator className="w-4 h-4" /> Cash-Up
        </button>
        <button onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          <History className="w-4 h-4" /> History
        </button>
      </div>

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['week','month','all'] as const).map(p => (
              <button key={p} onClick={() => setHistoryPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${historyPeriod === p ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p === 'week' ? 'Last 7 days' : p === 'month' ? 'Last 30 days' : 'All time'}
              </button>
            ))}
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-pink" /></div>
          ) : history.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No cash-ups found for this period</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Sales', value: `S$${history.reduce((s,r) => s + parseFloat(r.total_expected||0), 0).toFixed(2)}`, color: 'text-gray-900' },
                  { label: 'Total Banking', value: `S$${history.reduce((s,r) => s + parseFloat(r.banking||0), 0).toFixed(2)}`, color: 'text-brand-pink' },
                  { label: 'Days Closed', value: history.length.toString(), color: 'text-gray-900' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* History table */}
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Sales</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Variance</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Banking</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Submitted by</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map(r => {
                      const variance = parseFloat(r.total_variance || 0)
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {new Date(r.date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">S${parseFloat(r.total_expected||0).toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${Math.abs(variance) > 5 ? 'text-red-600' : Math.abs(variance) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {variance >= 0 ? '+' : ''}S${variance.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-pink">S${parseFloat(r.banking||0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{r.submitted_by_name || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => { setTab('cashup'); setDate(r.date) }}
                                className="text-xs text-brand-pink hover:underline">View</button>
                              <a href={`/api/eod/${r.id}/pdf`} target="_blank" rel="noreferrer"
                                className="text-gray-400 hover:text-gray-600">
                                <Printer className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'cashup' && (<>

      {/* Date selector */}
      <div className="card p-4 flex items-center gap-4">
        <label className="label mb-0 whitespace-nowrap">Date</label>
        <input type="date" className="input max-w-xs" value={date} max={today}
          onChange={e => setDate(e.target.value)} disabled={submitted} />
        {submitted && (
          <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Submitted {existingEod?.submitted_by_name ? `by ${existingEod.submitted_by_name}` : ''}
          </span>
        )}
      </div>

      {/* Variance warning */}
      {!submitted && hasWarning && breakdown.length > 0 && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${hasBigWarning ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{hasBigWarning ? 'Large variance detected' : 'Minor variance detected'}</p>
            <p className="text-sm mt-0.5">Cash variance is S${totalVariance.toFixed(2)}. Please recount before submitting.</p>
          </div>
        </div>
      )}

      {/* Payment breakdown */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Payment Breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Method</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Expected (App)</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Counted</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {breakdown.map(m => (
              <tr key={m.method} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-800">{m.label}</td>
                <td className="px-5 py-3 text-right text-gray-600">S${m.expected.toFixed(2)}</td>
                <td className="px-5 py-3 text-right">
                  {m.method === 'cash' && !submitted ? (
                    <input type="number" step="0.01" min="0"
                      className="input text-right w-32 py-1 text-sm"
                      value={m.counted}
                      onChange={e => setCashCounted(parseFloat(e.target.value) || 0)} />
                  ) : (
                    <span className="text-gray-600">S${m.counted.toFixed(2)}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {m.method === 'cash' ? (
                    <span className={`font-medium ${Math.abs(m.variance) > 5 ? 'text-red-600' : Math.abs(m.variance) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {m.variance >= 0 ? '+' : ''}S${m.variance.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold border-t border-gray-200">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right">S${totalExpected.toFixed(2)}</td>
              <td className="px-5 py-3 text-right">S${totalCounted.toFixed(2)}</td>
              <td className={`px-5 py-3 text-right font-bold ${varianceAbs > 5 ? 'text-red-600' : varianceAbs > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {totalVariance >= 0 ? '+' : ''}S${totalVariance.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cash float */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm border-b border-gray-100 pb-3">Cash Float & Banking</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Float In (from previous day)</label>
            <div className="input bg-gray-50 text-gray-500">S${floatIn.toFixed(2)}</div>
          </div>
          <div>
            <label className="label">Cash Counted</label>
            <div className="input bg-gray-50 text-gray-700 font-medium">S${cashCounted.toFixed(2)}</div>
          </div>
          <div>
            <label className="label">Float Out (leave in till)</label>
            {submitted ? (
              <div className="input bg-gray-50 text-gray-700">S${floatOut.toFixed(2)}</div>
            ) : (
              <input type="number" step="0.01" min="0" className="input" value={floatOut}
                onChange={e => setFloatOut(parseFloat(e.target.value) || 0)} />
            )}
          </div>
          <div>
            <label className="label">Banking Today</label>
            <div className={`input font-bold text-lg ${banking < 0 ? 'text-red-600' : 'text-green-600'} bg-gray-50`}>
              S${banking.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Sales', value: `S$${totalExpected.toFixed(2)}`, color: 'text-gray-900' },
          { label: 'Total Counted', value: `S$${totalCounted.toFixed(2)}`, color: 'text-gray-900' },
          { label: 'Variance', value: `S$${totalVariance.toFixed(2)}`, color: varianceAbs > 5 ? 'text-red-600' : varianceAbs > 0 ? 'text-amber-600' : 'text-green-600' },
          { label: 'Banking Today', value: `S$${banking.toFixed(2)}`, color: 'text-brand-pink' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Invoice breakdown */}
      {invoices.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <button className="w-full px-5 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
            onClick={() => setShowInvoices(v => !v)}>
            <span className="font-semibold text-gray-700 text-sm">Invoice Breakdown ({invoices.length} payments)</span>
            {showInvoices ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showInvoices && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Invoice #</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Patient</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Method</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-brand-pink text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-2 text-gray-700">{inv.client_name}</td>
                    <td className="px-4 py-2 text-gray-500">{inv.patient_name || '—'}</td>
                    <td className="px-4 py-2"><span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{inv.method_label}</span></td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800">S${inv.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Notes */}
      {!submitted && (
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input w-full" rows={2} placeholder="Any notes for this cash-up..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      )}
      {submitted && existingEod?.notes && (
        <div className="card p-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{existingEod.notes}</p>
        </div>
      )}

      {/* Submit */}
      {!submitted ? (
        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={saving || breakdown.length === 0}
            className="btn-primary px-8 py-3 text-base disabled:opacity-40 flex items-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : '✓ Submit Cash-Up'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Cash-up submitted successfully</p>
              {existingEod?.submitted_by_name && (
                <p className="text-xs text-green-600 mt-0.5">
                  By {existingEod.submitted_by_name}
                  {existingEod.submitted_at ? ` · ${new Date(existingEod.submitted_at).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' })}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`/api/eod/${savedId}/pdf`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-green-600 text-green-700 rounded-lg hover:bg-green-100">
              <Printer className="w-3.5 h-3.5" /> Print Report
            </a>
            <button onClick={() => { setTab('history') }}
              className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
              View History
            </button>
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}
