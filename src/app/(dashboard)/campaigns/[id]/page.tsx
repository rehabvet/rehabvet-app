'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Edit2, Users, BarChart2, Mail, MousePointer, CheckCircle, XCircle, Clock } from 'lucide-react'

const PINK = '#EC6496'

interface Campaign {
  id: string
  name: string
  subject: string
  preheader: string
  status: string
  total_recipients: number
  sent_count: number
  opened_count: number
  clicked_count: number
  sent_at: string | null
  created_at: string
}

interface Recipient {
  id: string
  name: string
  email: string
  status: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    draft:     { cls: 'bg-gray-100 text-gray-600',   label: 'Draft' },
    sending:   { cls: 'bg-yellow-100 text-yellow-700', label: 'Sending…' },
    sent:      { cls: 'bg-green-100 text-green-700',  label: 'Sent' },
    cancelled: { cls: 'bg-red-100 text-red-700',      label: 'Cancelled' },
  }
  const s = map[status] || map.draft
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

function RecipientStatus({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string }> = {
    pending:   { icon: Clock,        cls: 'text-gray-400' },
    sent:      { icon: Mail,         cls: 'text-blue-400' },
    delivered: { icon: CheckCircle,  cls: 'text-blue-500' },
    opened:    { icon: Mail,         cls: 'text-green-500' },
    clicked:   { icon: MousePointer, cls: 'text-purple-500' },
    failed:    { icon: XCircle,      cls: 'text-red-400' },
  }
  const s = map[status] || map.pending
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.cls} capitalize`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  )
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testEmail, setTestEmail]         = useState('')
  const [testSending, setTestSending]     = useState(false)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function load() {
    setLoading(true)
    try {
      const [cRes, rRes, aRes] = await Promise.all([
        fetch(`/api/campaigns/${id}`),
        fetch(`/api/campaigns/${id}/recipients?page=${page}`),
        fetch('/api/campaigns/audience-count'),
      ])
      const [cData, rData, aData] = await Promise.all([cRes.json(), rRes.json(), aRes.json()])
      setCampaign(cData.campaign)
      setRecipients(rData.recipients || [])
      setTotal(rData.total || 0)
      setRecipientCount(aData.count)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id, page])

  // Poll if sending
  useEffect(() => {
    if (campaign?.status !== 'sending') return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [campaign?.status])

  async function sendTest() {
    setTestSending(true)
    try {
      const res = await fetch(`/api/campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const data = await res.json()
      if (res.ok) { showToast(`✅ Test sent to ${testEmail}`); setShowTestModal(false) }
      else showToast(data.error || 'Test send failed')
    } finally {
      setTestSending(false)
    }
  }

  async function sendNow() {
    setSending(true)
    setShowConfirm(false)
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) { showToast(`✅ Sent to ${data.sent} recipients!`); load() }
      else showToast(data.error || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  if (loading && !campaign) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  }
  if (!campaign) {
    return <div className="p-6 text-gray-500">Campaign not found</div>
  }

  const openRate  = campaign.sent_count ? Math.round((campaign.opened_count / campaign.sent_count) * 100) : 0
  const clickRate = campaign.sent_count ? Math.round((campaign.clicked_count / campaign.sent_count) * 100) : 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push('/campaigns')} className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-sm text-gray-500">{campaign.subject}</p>
            {campaign.sent_at && (
              <p className="text-xs text-gray-400 mt-0.5">Sent {fmt(campaign.sent_at)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Send className="w-4 h-4 opacity-50" /> Send Test
          </button>
          {campaign.status === 'draft' && (
            <>
              <Link
                href={`/campaigns/new?edit=${id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </Link>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ background: PINK }}
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : 'Send Campaign'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Recipients', value: campaign.total_recipients || recipientCount || '—', icon: Users, color: '#3b82f6' },
          { label: 'Sent',       value: campaign.sent_count,    icon: Mail,         color: '#EC6496' },
          { label: 'Open Rate',  value: campaign.status === 'sent' ? `${openRate}%` : '—', icon: BarChart2, color: '#10b981' },
          { label: 'Click Rate', value: campaign.status === 'sent' ? `${clickRate}%` : '—', icon: MousePointer, color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.color + '18' }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recipients table */}
      {campaign.status !== 'draft' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Recipients</h2>
            <span className="text-xs text-gray-400">{total.toLocaleString()} total</span>
          </div>
          {recipients.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No recipients yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recipients.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.email}</td>
                    <td className="px-4 py-3"><RecipientStatus status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmt(r.sent_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmt(r.opened_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {total > 25 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Page {page} of {Math.ceil(total / 25)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-40">Previous</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page * 25 >= total} className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test send modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Send Test Email</h2>
            <p className="text-sm text-gray-500 mb-4">Sends a preview with <code className="bg-gray-100 px-1 rounded text-xs">[TEST]</code> in the subject line.</p>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2"
              placeholder="your@email.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendTest()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowTestModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">Cancel</button>
              <button
                onClick={sendTest}
                disabled={testSending || !testEmail}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: PINK }}
              >
                {testSending ? 'Sending…' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#EC649618' }}>
                <Send className="w-7 h-7" style={{ color: PINK }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Send Campaign?</h2>
              <p className="text-sm text-gray-500 mt-1">
                This will send <strong>"{campaign.subject}"</strong> to{' '}
                <strong>{recipientCount !== null ? recipientCount.toLocaleString() : '…'} clients</strong> immediately.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700">Cancel</button>
              <button onClick={sendNow} className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: PINK }}>Yes, Send Now</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl z-50">{toast}</div>
      )}
    </div>
  )
}
