'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react'

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    fetch(`/api/reports?period=${period}`).then(r => r.json()).then(setData)
  }, [period])

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm">Practice performance overview</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${period === p ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${data.revenue?.total?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-gray-500">Revenue ({period})</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.revenue?.count || 0}</p>
              <p className="text-xs text-gray-500">Payments Received</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.patientOutcomes?.total_sessions || 0}</p>
              <p className="text-xs text-gray-500">Sessions Completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions by Modality */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sessions by Modality</h2>
          {data.sessionsByModality?.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No data</p>
          ) : (
            <div className="space-y-3">
              {data.sessionsByModality?.map((m: any) => {
                const maxCount = Math.max(...data.sessionsByModality.map((x: any) => x.count))
                return (
                  <div key={m.modality}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.modality}</span>
                      <span className="text-gray-500">{m.count} sessions · avg {Math.round(m.avg_duration || 0)}min</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="h-3 rounded-full bg-brand-pink transition-all" style={{ width: `${(m.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Revenue by Modality */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Revenue by Modality</h2>
          {data.revenueByModality?.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No data</p>
          ) : (
            <div className="space-y-3">
              {data.revenueByModality?.map((m: any) => {
                const maxRev = Math.max(...data.revenueByModality.map((x: any) => x.revenue))
                return (
                  <div key={m.modality}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.modality}</span>
                      <span className="text-gray-500">${m.revenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="h-3 rounded-full bg-brand-gold transition-all" style={{ width: `${(m.revenue / maxRev) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Patient Outcomes */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Patient Outcomes (Averages)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{data.patientOutcomes?.avg_pain != null ? data.patientOutcomes.avg_pain.toFixed(1) : '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Avg Pain Score</p>
              <p className="text-xs text-gray-400">(lower is better)</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{data.patientOutcomes?.avg_mobility != null ? data.patientOutcomes.avg_mobility.toFixed(1) : '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Avg Mobility Score</p>
              <p className="text-xs text-gray-400">(higher is better)</p>
            </div>
          </div>
        </div>

        {/* Therapist Utilization */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Staff Utilization</h2>
          {data.therapistUtilization?.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200">
                  <th className="table-header">Name</th>
                  <th className="table-header text-center">Sessions</th>
                  <th className="table-header text-right">Total Hours</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.therapistUtilization?.map((t: any) => (
                    <tr key={t.name}>
                      <td className="table-cell font-medium">{t.name}</td>
                      <td className="table-cell text-center">{t.session_count}</td>
                      <td className="table-cell text-right">{t.total_minutes ? (t.total_minutes / 60).toFixed(1) : '0'}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Appointment Stats */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Appointment Statistics</h2>
          <div className="flex flex-wrap gap-4">
            {data.appointmentStats?.map((s: any) => {
              const colors: Record<string, string> = {
                scheduled: 'bg-blue-100 text-blue-800',
                confirmed: 'bg-green-100 text-green-800',
                completed: 'bg-gray-100 text-gray-800',
                cancelled: 'bg-red-100 text-red-800',
                no_show: 'bg-red-100 text-red-800',
                in_progress: 'bg-yellow-100 text-yellow-800',
              }
              return (
                <div key={s.status} className={`px-4 py-3 rounded-lg ${colors[s.status] || 'bg-gray-100'}`}>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs font-medium">{s.status.replace('_', ' ')}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
