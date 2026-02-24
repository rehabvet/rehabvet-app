'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, UserCheck, UserX, Users, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
function useDebounce<T>(value: T, delay: number): [T] {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return [debounced]
}

const PINK = '#EC6496'

interface Contact {
  id: string
  name: string
  email: string
  phone: string | null
  subscribed: boolean
  unsubscribed_at: string | null
  created_at: string
}
interface Summary { total: number; subscribed: number; unsubscribed: number }

type Filter = 'all' | 'subscribed' | 'unsubscribed'

export default function MailingListPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, subscribed: 0, unsubscribed: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 300)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actioning, setActioning] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        filter,
        page: String(page),
      })
      const res = await fetch(`/api/campaigns/mailing-list?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
      setTotal(data.total || 0)
      setSummary(data.summary || { total: 0, subscribed: 0, unsubscribed: 0 })
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [debouncedSearch, filter, page]) // eslint-disable-line
  useEffect(() => { setPage(1) }, [debouncedSearch, filter])

  async function toggle(email: string, currentlySubscribed: boolean) {
    setActioning(email)
    try {
      const action = currentlySubscribed ? 'unsubscribe' : 'resubscribe'
      const res = await fetch('/api/campaigns/mailing-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email }),
      })
      if (res.ok) {
        showToast(currentlySubscribed ? `${email} unsubscribed` : `${email} re-subscribed ✓`)
        load()
      }
    } finally {
      setActioning(null)
    }
  }

  async function bulkAction(action: 'unsubscribe' | 'resubscribe') {
    if (!selected.size) return
    const emails = contacts.filter(c => selected.has(c.id)).map(c => c.email)
    const res = await fetch('/api/campaigns/mailing-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, emails }),
    })
    if (res.ok) {
      const data = await res.json()
      showToast(`${action === 'unsubscribe' ? 'Unsubscribed' : 'Re-subscribed'} ${data.count} contacts`)
      load()
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === contacts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(contacts.map(c => c.id)))
    }
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/campaigns')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mailing List</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage who receives your email campaigns</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total with Email', value: summary.total, icon: Users,     color: '#3b82f6', filter: 'all' as Filter },
          { label: 'Subscribed',       value: summary.subscribed,   icon: UserCheck, color: '#10b981', filter: 'subscribed' as Filter },
          { label: 'Unsubscribed',     value: summary.unsubscribed, icon: UserX,     color: '#ef4444', filter: 'unsubscribed' as Filter },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.filter)}
            className={`bg-white rounded-xl p-4 shadow-sm border text-left transition-all ${filter === s.filter ? 'border-2 ring-2 ring-offset-1' : 'border-gray-100 hover:border-gray-200'}`}
            style={filter === s.filter ? { borderColor: s.color, '--tw-ring-color': s.color + '30' } as any : {}}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.color + '18' }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search + filter tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['all', 'subscribed', 'unsubscribed'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filter === f ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
                style={filter === f ? { background: PINK } : {}}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': PINK + '40' } as any}
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">{selected.size} selected</span>
              <button
                onClick={() => bulkAction('unsubscribe')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
              >
                <UserX className="w-3.5 h-3.5" /> Unsubscribe
              </button>
              <button
                onClick={() => bulkAction('resubscribe')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-600 hover:bg-green-100"
              >
                <UserCheck className="w-3.5 h-3.5" /> Re-subscribe
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <Users className="w-8 h-8 text-gray-200" />
            <p className="text-sm">No contacts found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === contacts.length && contacts.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${selected.has(c.id) ? 'bg-pink-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {c.subscribed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                        <UserCheck className="w-3 h-3" /> Subscribed
                      </span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
                          <UserX className="w-3 h-3" /> Unsubscribed
                        </span>
                        {c.unsubscribed_at && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(c.unsubscribed_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggle(c.email, c.subscribed)}
                      disabled={actioning === c.email}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                        c.subscribed
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-700 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {actioning === c.email ? '…' : c.subscribed ? 'Unsubscribe' : 'Re-subscribe'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
