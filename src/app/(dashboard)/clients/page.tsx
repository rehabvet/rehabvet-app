'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Phone, Mail, MapPin, Download, GitMerge, X, ArrowRight } from 'lucide-react'
import Pagination from '@/components/Pagination'
import Modal from '@/components/Modal'

const ADMIN_ROLES = ['admin', 'administrator', 'office_manager']

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeResults, setMergeResults] = useState<any[]>([])
  const [mergeSearching, setMergeSearching] = useState(false)
  const [mergeBase, setMergeBase] = useState<any>(null)
  const [mergeDuplicate, setMergeDuplicate] = useState<any>(null)
  const [merging, setMerging] = useState(false)
  const [mergeStep, setMergeStep] = useState<'pick-base'|'pick-duplicate'|'confirm'>('pick-base')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      const role = data?.user?.role || data?.role
      if (role && ADMIN_ROLES.includes(role)) setIsAdmin(true)
    }).catch(() => {})
  }, [])

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

  async function searchMergeClients(q: string) {
    if (!q.trim()) { setMergeResults([]); return }
    setMergeSearching(true)
    const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=8`)
    const data = await res.json()
    setMergeResults(data.clients || [])
    setMergeSearching(false)
  }

  async function doMerge() {
    if (!mergeBase || !mergeDuplicate) return
    setMerging(true)
    const res = await fetch('/api/clients/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_id: mergeBase.id, merge_id: mergeDuplicate.id }),
    })
    const data = await res.json()
    setMerging(false)
    if (data.ok) {
      setShowMerge(false)
      setMergeBase(null); setMergeDuplicate(null); setMergeStep('pick-base'); setMergeSearch(''); setMergeResults([])
      fetchClients(page)
    } else {
      alert(data.error || 'Merge failed')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/export/clients')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">{total > 0 ? `${total} clients total` : 'Manage pet owner profiles'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50"
              >
                {exporting
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" /> Exporting...</>
                  : <><Download className="w-4 h-4" /> Export CSV</>
                }
              </button>
              <button
                onClick={() => { setShowMerge(true); setMergeStep('pick-base') }}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <GitMerge className="w-4 h-4" /> Merge Clients
              </button>
            </>
          )}
          <Link href="/clients/new" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Link>
        </div>
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

      {/* Merge Clients Modal */}
      <Modal open={showMerge} onClose={() => { setShowMerge(false); setMergeBase(null); setMergeDuplicate(null); setMergeStep('pick-base'); setMergeSearch(''); setMergeResults([]) }} title="Merge Duplicate Clients">
        <div className="space-y-4">
          {/* Progress steps */}
          <div className="flex items-center gap-2 text-xs">
            {(['pick-base','pick-duplicate','confirm'] as const).map((step, i) => {
              const labels = ['1. Pick base record', '2. Pick duplicate', '3. Confirm merge']
              const active = mergeStep === step
              const done = (['pick-base','pick-duplicate','confirm'] as const).indexOf(mergeStep) > i
              return (
                <div key={step} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                  <span className={`px-2 py-0.5 rounded-full font-medium transition-colors ${active ? 'bg-brand-pink text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {labels[i]}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Step 1 & 2: Search and pick */}
          {(mergeStep === 'pick-base' || mergeStep === 'pick-duplicate') && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                {mergeStep === 'pick-base'
                  ? '🏠 Search for the <strong>base record</strong> to keep (the one with the client number).'
                  : '🗑️ Search for the <strong>duplicate</strong> to merge in and delete.'}
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-9 text-sm w-full"
                  placeholder="Search by name, phone, or email..."
                  value={mergeSearch}
                  onChange={e => { setMergeSearch(e.target.value); searchMergeClients(e.target.value) }}
                  autoFocus
                />
                {mergeSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-b-2 border-brand-pink" />}
              </div>
              {mergeResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {mergeResults.map(c => {
                    const isSelected = mergeStep === 'pick-base' ? mergeBase?.id === c.id : mergeDuplicate?.id === c.id
                    const isOtherPick = mergeStep === 'pick-duplicate' && mergeBase?.id === c.id
                    return (
                      <button key={c.id} disabled={isOtherPick}
                        onClick={() => {
                          if (mergeStep === 'pick-base') { setMergeBase(c); setMergeStep('pick-duplicate'); setMergeSearch(''); setMergeResults([]) }
                          else { setMergeDuplicate(c); setMergeStep('confirm') }
                        }}
                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors
                          ${isSelected ? 'bg-pink-50' : ''} ${isOtherPick ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">
                            {c.client_number ? `#${c.client_number} · ` : ''}{c.phone || c.email || 'No contact info'} · {c.patient_count} pet{c.patient_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {isOtherPick && <span className="text-xs text-gray-400 italic">base record</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {mergeStep === 'confirm' && mergeBase && mergeDuplicate && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                ⚠️ This will move all appointments, patients, and records from the duplicate to the base, then permanently delete the duplicate.
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                {/* Duplicate (being deleted) */}
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3">
                  <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">Duplicate → delete</p>
                  <p className="font-semibold text-gray-900 text-sm">{mergeDuplicate.name}</p>
                  {mergeDuplicate.client_number && <p className="text-xs text-gray-500">#{mergeDuplicate.client_number}</p>}
                  {mergeDuplicate.phone && <p className="text-xs text-gray-500">{mergeDuplicate.phone}</p>}
                  {mergeDuplicate.email && <p className="text-xs text-gray-500">{mergeDuplicate.email}</p>}
                  <p className="text-xs text-gray-500 mt-1">{mergeDuplicate.patient_count} pet{mergeDuplicate.patient_count !== 1 ? 's' : ''}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                {/* Base (kept) */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
                  <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">Base → keep</p>
                  <p className="font-semibold text-gray-900 text-sm">{mergeBase.name}</p>
                  {mergeBase.client_number && <p className="text-xs text-gray-500">#{mergeBase.client_number}</p>}
                  {mergeBase.phone && <p className="text-xs text-gray-500">{mergeBase.phone}</p>}
                  {mergeBase.email && <p className="text-xs text-gray-500">{mergeBase.email}</p>}
                  <p className="text-xs text-gray-500 mt-1">{mergeBase.patient_count} pet{mergeBase.patient_count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setMergeStep('pick-base'); setMergeBase(null); setMergeDuplicate(null); setMergeSearch(''); setMergeResults([]) }}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Start Over
                </button>
                <button onClick={doMerge} disabled={merging}
                  className="flex-1 btn-primary text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50">
                  {merging ? 'Merging…' : '⚠️ Confirm Merge & Delete Duplicate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
