'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Eye, Send, Save, Type, AlignLeft, MousePointer, Image, Minus, MoveVertical, Users } from 'lucide-react'
import { renderBlocks, type Block } from '@/lib/blocks'

const PINK = '#EC6496'

function blockLabel(type: string) {
  return { heading: 'Heading', text: 'Text', button: 'Button', image: 'Image', divider: 'Divider', spacer: 'Spacer' }[type] || type
}
function blockIcon(type: string) {
  return { heading: Type, text: AlignLeft, button: MousePointer, image: Image, divider: Minus, spacer: MoveVertical }[type] || Type
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  if (block.type === 'heading') return (
    <div className="flex gap-2">
      <input
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        value={block.text}
        placeholder="Heading text…"
        onChange={e => onChange({ ...block, text: e.target.value })}
      />
      <select
        className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
        value={block.level || 1}
        onChange={e => onChange({ ...block, level: parseInt(e.target.value) as 1 | 2 })}
      >
        <option value={1}>H1</option>
        <option value={2}>H2</option>
      </select>
    </div>
  )

  if (block.type === 'text') return (
    <textarea
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
      rows={4}
      value={block.content}
      placeholder="Your paragraph text… (Enter for new line)"
      onChange={e => onChange({ ...block, content: e.target.value })}
    />
  )

  if (block.type === 'button') return (
    <div className="space-y-2">
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        value={block.text}
        placeholder="Button label"
        onChange={e => onChange({ ...block, text: e.target.value })}
      />
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        value={block.url}
        placeholder="https://…"
        onChange={e => onChange({ ...block, url: e.target.value })}
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Colour:</label>
        <input
          type="color"
          className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
          value={block.color || PINK}
          onChange={e => onChange({ ...block, color: e.target.value })}
        />
        <button onClick={() => onChange({ ...block, color: PINK })} className="text-xs text-gray-400 hover:text-gray-600">Reset to pink</button>
      </div>
    </div>
  )

  if (block.type === 'image') return (
    <div className="space-y-2">
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        value={block.url}
        placeholder="Image URL (https://…)"
        onChange={e => onChange({ ...block, url: e.target.value })}
      />
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        value={block.alt || ''}
        placeholder="Alt text (optional)"
        onChange={e => onChange({ ...block, alt: e.target.value })}
      />
    </div>
  )

  if (block.type === 'spacer') return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500">Height (px):</label>
      <input
        type="number"
        className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        value={block.height || 24}
        onChange={e => onChange({ ...block, height: parseInt(e.target.value) || 24 })}
      />
    </div>
  )

  if (block.type === 'divider') return (
    <p className="text-xs text-gray-400 italic">Horizontal divider line</p>
  )

  return null
}

function newBlock(type: string): Block {
  if (type === 'heading') return { type: 'heading', text: 'Your Heading', level: 1 }
  if (type === 'text')    return { type: 'text', content: 'Your paragraph text here.' }
  if (type === 'button')  return { type: 'button', text: 'Book Now', url: 'https://app.rehabvet.com/appointment', color: PINK }
  if (type === 'image')   return { type: 'image', url: '', alt: '' }
  if (type === 'divider') return { type: 'divider' }
  if (type === 'spacer')  return { type: 'spacer', height: 32 }
  return { type: 'text', content: '' }
}

function CampaignComposer() {
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('edit')

  const [name, setName]         = useState('')
  const [subject, setSubject]   = useState('')
  const [preheader, setPreheader] = useState('')
  const [blocks, setBlocks]     = useState<Block[]>([
    { type: 'heading', text: 'Hello from RehabVet! 🐾', level: 1 },
    { type: 'text', content: 'We have some exciting news to share with you…' },
  ])
  const [saving, setSaving]   = useState(false)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Load for edit
  useEffect(() => {
    if (!editId) return
    fetch(`/api/campaigns/${editId}`).then(r => r.json()).then(data => {
      if (data.campaign) {
        const c = data.campaign
        setName(c.name); setSubject(c.subject); setPreheader(c.preheader || '')
        try { setBlocks(JSON.parse(c.body_blocks)) } catch {}
      }
    })
  }, [editId])

  // Load recipient count
  useEffect(() => {
    fetch('/api/campaigns/audience-count').then(r => r.json()).then(d => setRecipientCount(d.count)).catch(() => {})
  }, [])

  // Rendered HTML
  const bodyHtml = renderBlocks(blocks)

  function addBlock(type: string) {
    setBlocks(prev => [...prev, newBlock(type)])
  }
  function updateBlock(i: number, b: Block) {
    setBlocks(prev => prev.map((x, idx) => idx === i ? b : x))
  }
  function removeBlock(i: number) {
    setBlocks(prev => prev.filter((_, idx) => idx !== i))
  }
  function moveBlock(i: number, dir: -1 | 1) {
    setBlocks(prev => {
      const arr = [...prev]
      const j = i + dir
      if (j < 0 || j >= arr.length) return arr
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  async function saveDraft() {
    if (!name || !subject) { showToast('Campaign name and subject are required'); return }
    setSaving(true)
    try {
      const payload = { name, subject, preheader, body_blocks: JSON.stringify(blocks), body_html: bodyHtml }
      const url  = editId ? `/api/campaigns/${editId}` : '/api/campaigns'
      const method = editId ? 'PUT' : 'POST'
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (res.ok) {
        showToast('Draft saved ✓')
        if (!editId) router.replace(`/campaigns/new?edit=${data.campaign.id}`)
      } else {
        showToast(data.error || 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  async function sendCampaign() {
    if (!editId) { showToast('Save draft first'); return }
    setSending(true)
    setShowSendConfirm(false)
    try {
      const res  = await fetch(`/api/campaigns/${editId}/send`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showToast(`✅ Sent to ${data.sent} recipients!`)
        setTimeout(() => router.push(`/campaigns/${editId}`), 1500)
      } else {
        showToast(data.error || 'Send failed')
        setSending(false)
      }
    } catch {
      showToast('Network error')
      setSending(false)
    }
  }

  const previewHtml = `
    <style>body{margin:0;font-family:-apple-system,sans-serif;background:#f4f4f7;}</style>
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border-top:4px solid #EC6496;">
      <div style="padding:24px 40px;text-align:center;background:#fff;border-bottom:3px solid #EC6496;">
        <img src="https://rehabvet.com/wp-content/uploads/2025/02/logo.webp" style="height:40px;" alt="RehabVet"/>
      </div>
      <div style="padding:32px 40px;">${bodyHtml}</div>
      <div style="padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;background:#fff;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">🐾 RehabVet · 513 Serangoon Road · Singapore</p>
        <p style="font-size:11px;color:#d1d5db;margin:6px 0 0;"><a href="#" style="color:#d1d5db;">Unsubscribe</a></p>
      </div>
    </div>
  `

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/campaigns')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{editId ? 'Edit Campaign' : 'New Campaign'}</h1>
            {name && <p className="text-xs text-gray-400">{name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showPreview ? 'bg-gray-100 text-gray-700 border-gray-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={saveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => { if (!editId) { saveDraft(); showToast('Save first, then send'); return } setShowSendConfirm(true) }}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            style={{ background: PINK }}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send Now'}
          </button>
        </div>
      </div>

      <div className={`flex flex-1 overflow-hidden ${showPreview ? 'flex-row' : 'flex-col'}`}>
        {/* Editor panel */}
        <div className={`overflow-y-auto ${showPreview ? 'w-1/2 border-r border-gray-100' : 'w-full'} bg-gray-50`}>
          <div className="max-w-2xl mx-auto p-6 space-y-4">

            {/* Meta fields */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Campaign Settings</h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Campaign Name (internal)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. February Newsletter"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject Line</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="What recipients see in their inbox"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Preheader <span className="text-gray-400 font-normal">(preview text after subject)</span></label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={preheader} onChange={e => setPreheader(e.target.value)}
                  placeholder="Short teaser text…"
                />
              </div>
            </div>

            {/* Block list */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Email Content</h2>
                <span className="text-xs text-gray-400">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {blocks.map((block, i) => {
                  const Icon = blockIcon(block.type)
                  return (
                    <div key={i} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#EC649618' }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: PINK }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{blockLabel(block.type)}</span>
                        <div className="ml-auto flex items-center gap-0.5">
                          <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                          <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeBlock(i)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <BlockEditor block={block} onChange={b => updateBlock(i, b)} />
                    </div>
                  )
                })}
              </div>

              {/* Add block */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 mb-2">Add block</p>
                <div className="flex flex-wrap gap-2">
                  {['heading', 'text', 'button', 'image', 'divider', 'spacer'].map(type => {
                    const Icon = blockIcon(type)
                    return (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {blockLabel(type)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Audience */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Audience: All clients with email</p>
                <p className="text-xs text-gray-400">
                  {recipientCount !== null ? `~${recipientCount.toLocaleString()} eligible recipients (excluding unsubscribes)` : 'Loading count…'}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="w-1/2 bg-gray-100 overflow-y-auto">
            <div className="p-4">
              <p className="text-xs text-gray-400 text-center mb-3 font-medium uppercase tracking-wide">Email Preview</p>
              <div
                className="bg-white rounded-xl shadow overflow-hidden mx-auto"
                style={{ maxWidth: 560 }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Send confirmation modal */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#EC649618' }}>
                <Send className="w-7 h-7" style={{ color: PINK }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Send Campaign?</h2>
              <p className="text-sm text-gray-500 mt-1">
                This will send <strong>"{subject}"</strong> to{' '}
                <strong>{recipientCount !== null ? recipientCount.toLocaleString() : '…'} clients</strong> immediately. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendCampaign}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold"
                style={{ background: PINK }}
              >
                Yes, Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>}>
      <CampaignComposer />
    </Suspense>
  )
}
