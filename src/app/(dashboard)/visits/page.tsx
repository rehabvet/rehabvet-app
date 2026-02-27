'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ClipboardList, PawPrint, User, Calendar } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function VisitsPage() {
  const router = useRouter()
  const [visits, setVisits] = useState<any[]>([])
  const [total,  setTotal]  = useState(0)
  const [page,   setPage]   = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 25

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { load() }, [page, search])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/visits?${params}`)
    const data = await res.json()
    setVisits(data.visits || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-pink" /> Visit Records
          </h1>
          <p className="text-gray-500 text-sm">{total > 0 ? `${total} visits recorded` : 'Clinical notes per appointment'}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search by patient or client name…" className="input pl-10"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : visits.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No visits recorded yet</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visits.map(v => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`/visits/${v.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <PawPrint className="w-3.5 h-3.5 text-brand-pink flex-shrink-0" />
                      {v.patient_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {v.client_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {v.staff_name ? (
                      <span className="badge-gray">{v.staff_name}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell max-w-[260px] truncate">
                    {v.clinical_examination?.slice(0, 80) || v.history?.slice(0, 80) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={p => setPage(p)} />
      </div>
    </div>
  )
}
