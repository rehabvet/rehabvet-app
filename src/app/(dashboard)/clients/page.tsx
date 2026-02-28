'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Phone, Mail, MapPin } from 'lucide-react'
import Pagination from '@/components/Pagination'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { fetchClients(page) }, [search, page])

  async function fetchClients(p = 1) {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', String(p))
    params.set('limit', String(PAGE_SIZE))
    const res = await fetch(`/api/clients?${params}`)
    const data = await res.json()
    setClients(data.clients || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">{total > 0 ? `${total} clients total` : 'Manage pet owner profiles'}</p>
        </div>
        <Link href="/clients/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search clients..." className="input pl-10"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
        ) : clients.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No clients found</p>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(c => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {/* Name + avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink font-semibold text-xs flex-shrink-0">
                        {c.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.client_number && <p className="text-xs text-gray-400">#{String(c.client_number)}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Mobile */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {c.phone ? (
                      <a href={`tel:${c.phone.replace(/[\s-]/g, '')}`} className="flex items-center gap-1.5 font-mono text-brand-pink hover:underline text-xs">
                        <Phone className="w-3 h-3 flex-shrink-0" />{c.phone}
                      </a>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-brand-pink hover:underline text-xs">
                        <Mail className="w-3 h-3 flex-shrink-0" />{c.email}
                      </a>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Address */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.address ? (
                      <span className="flex items-start gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />{c.address}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Pets count */}
                  <td className="px-4 py-3">
                    <span className="badge-pink">{c.patient_count} pet{c.patient_count !== 1 ? 's' : ''}</span>
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
