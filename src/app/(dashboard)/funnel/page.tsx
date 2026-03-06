'use client'

import { useState, useEffect } from 'react'

const STEPS = [
  { key: 'landed',       label: 'Visited page',    color: 'bg-blue-500' },
  { key: 'started_step1', label: 'Started form',   color: 'bg-indigo-500' },
  { key: 'started_step2', label: 'Pet details',    color: 'bg-purple-500' },
  { key: 'started_step3', label: 'Service info',   color: 'bg-pink-500' },
  { key: 'started_step4', label: 'Review step',    color: 'bg-orange-400' },
  { key: 'submitted',     label: 'Submitted',      color: 'bg-green-500' },
]

export default function FunnelPage() {
  const [stats, setStats]   = useState<any>(null)
  const [daily, setDaily]   = useState<any[]>([])
  const [days,  setDays]    = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/funnel?days=${days}`)
      .then(r => r.json())
      .then(d => { setStats(d.stats); setDaily(d.daily || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  const top = stats?.landed || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Funnel</h1>
          <p className="text-sm text-gray-500 mt-0.5">How visitors convert through the appointment form</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="input text-sm w-36">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>
      ) : (
        <>
          {/* Funnel bars */}
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Conversion Funnel</h2>
            {STEPS.map((step, i) => {
              const val = stats?.[step.key] ?? 0
              const pct = top > 0 ? Math.round((val / top) * 100) : 0
              const prevVal = i === 0 ? top : (stats?.[STEPS[i-1].key] ?? 0)
              const dropoff = i > 0 && prevVal > 0 ? Math.round(((prevVal - val) / prevVal) * 100) : null
              return (
                <div key={step.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{step.label}</span>
                    <div className="flex items-center gap-3">
                      {dropoff !== null && dropoff > 0 && (
                        <span className="text-xs text-red-500">-{dropoff}% drop-off</span>
                      )}
                      <span className="text-sm font-bold text-gray-900 w-16 text-right">{val.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-lg transition-all duration-500 flex items-center px-3`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    >
                      {pct > 10 && <span className="text-white text-xs font-medium">{pct}%</span>}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Overall conversion rate */}
            {stats && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Overall conversion rate</span>
                <span className="text-2xl font-bold text-green-600">
                  {top > 0 ? Math.round(((stats.submitted || 0) / top) * 100) : 0}%
                </span>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total visitors', value: stats?.landed ?? 0, color: 'text-blue-600' },
              { label: 'Started form', value: stats?.started_step1 ?? 0, color: 'text-indigo-600' },
              { label: 'Submitted', value: stats?.submitted ?? 0, color: 'text-green-600' },
              { label: 'Drop-off', value: (stats?.landed ?? 0) - (stats?.submitted ?? 0), color: 'text-red-500' },
            ].map(c => (
              <div key={c.label} className="card text-center">
                <p className={`text-3xl font-bold ${c.color}`}>{c.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Daily trend table */}
          {daily.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Daily Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">Date</th>
                      <th className="table-header text-right">Visitors</th>
                      <th className="table-header text-right">Started</th>
                      <th className="table-header text-right">Submitted</th>
                      <th className="table-header text-right">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {daily.map((d: any) => (
                      <tr key={d.day} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">
                          {new Date(d.day).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="table-cell text-right">{d.landed}</td>
                        <td className="table-cell text-right">{d.step1}</td>
                        <td className="table-cell text-right text-green-600 font-medium">{d.submitted}</td>
                        <td className="table-cell text-right">
                          {d.landed > 0 ? `${Math.round((d.submitted / d.landed) * 100)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {daily.length === 0 && !loading && (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-gray-500 font-medium">No data yet</p>
              <p className="text-sm text-gray-400 mt-1">Funnel data will appear once visitors start using the booking form</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
