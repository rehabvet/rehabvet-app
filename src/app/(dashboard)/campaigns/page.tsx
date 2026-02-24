'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Plus, Send, FileText, Trash2, Eye, BarChart2, Users } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  total_recipients: number
  sent_count: number
  opened_count: number
  clicked_count: number
  sent_at: string | null
  created_at: string
  recipient_count: number
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600',
    sending:   'bg-yellow-100 text-yellow-700',
    sent:      'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function openRate(c: Campaign) {
  if (!c.sent_count) return '—'
  return `${Math.round((c.opened_count / c.sent_count) * 100)}%`
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft campaign?')) return
    setDeleting(id)
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  // Summary stats
  const totalSent   = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)
  const totalOpened = campaigns.reduce((s, c) => s + (c.opened_count || 0), 0)
  const sentCampaigns = campaigns.filter(c => c.status === 'sent')
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send newsletters and promotions to your clients</p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm"
          style={{ background: '#EC6496' }}
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Campaigns', value: campaigns.length, icon: Mail, color: '#EC6496' },
          { label: 'Emails Sent', value: totalSent.toLocaleString(), icon: Send, color: '#3b82f6' },
          { label: 'Avg Open Rate', value: `${avgOpenRate}%`, icon: BarChart2, color: '#10b981' },
          { label: 'Draft Campaigns', value: campaigns.filter(c => c.status === 'draft').length, icon: FileText, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.color + '18' }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <Mail className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No campaigns yet</p>
            <p className="text-sm text-gray-400">Create your first campaign to reach your clients</p>
            <Link
              href="/campaigns/new"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ background: '#EC6496' }}
            >
              <Plus className="w-4 h-4" /> New Campaign
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipients</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Opened</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.subject}</p>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {c.status === 'sent' ? c.sent_count.toLocaleString() : (c.recipient_count || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-gray-900">{openRate(c)}</span>
                    {c.opened_count > 0 && (
                      <span className="text-xs text-gray-400 ml-1">({c.opened_count})</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {c.status === 'draft' && (
                        <>
                          <Link
                            href={`/campaigns/new?edit=${c.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deleting === c.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
