'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, X, Stethoscope } from 'lucide-react'

interface Diagnosis {
  id: string
  text: string
  date: string
  diagnosed_by_name: string | null
  created_at: string
  updated_at: string
}

interface Props {
  patientId: string
  compact?: boolean // smaller version for modal use
}

export default function DiagnosisLog({ patientId, compact = false }: Props) {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editDate, setEditDate] = useState('')

  const load = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/diagnoses`)
      const data = await res.json()
      setDiagnoses(data.diagnoses || [])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!newText.trim()) return
    setSaving(true)
    await fetch(`/api/patients/${patientId}/diagnoses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText.trim(), date: newDate }),
    })
    setNewText(''); setAdding(false); setSaving(false)
    load()
  }

  async function save(id: string) {
    if (!editText.trim()) return
    setSaving(true)
    await fetch(`/api/patients/${patientId}/diagnoses`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis_id: id, text: editText.trim(), date: editDate }),
    })
    setEditId(null); setSaving(false); load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this diagnosis entry?')) return
    await fetch(`/api/patients/${patientId}/diagnoses?diagnosis_id=${id}`, { method: 'DELETE' })
    load()
  }

  function startEdit(d: Diagnosis) {
    setEditId(d.id)
    setEditText(d.text)
    setEditDate(d.date?.slice(0, 10) || '')
  }

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-gray-800 flex items-center gap-2 ${compact ? 'text-sm' : 'text-base'}`}>
          <Stethoscope className={`text-brand-pink ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          Diagnosis History
          {diagnoses.length > 0 && (
            <span className="bg-brand-pink/10 text-brand-pink text-xs font-medium px-2 py-0.5 rounded-full">
              {diagnoses.length}
            </span>
          )}
        </h3>
        {!adding && (
          <button onClick={() => { setAdding(true); setNewText(''); setNewDate(new Date().toISOString().split('T')[0]) }}
            className="flex items-center gap-1 text-xs font-medium text-brand-pink hover:bg-pink-50 px-2 py-1 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="border border-brand-pink/30 rounded-xl p-3 bg-pink-50/40 space-y-2">
          <div className="flex gap-2">
            <input type="date" className="input text-sm py-1.5 w-36 shrink-0" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <textarea
              className="input text-sm flex-1 resize-none"
              rows={3}
              placeholder="Enter diagnosis…"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="btn-secondary text-xs py-1 px-3">Cancel</button>
            <button onClick={add} disabled={saving || !newText.trim()} className="btn-primary text-xs py-1 px-3">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading…</p>
      ) : diagnoses.length === 0 && !adding ? (
        <p className="text-xs text-gray-400 italic py-1">No diagnoses recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {diagnoses.map(d => (
            <div key={d.id} className={`border border-gray-100 rounded-xl bg-white ${compact ? 'p-3' : 'p-4'} group`}>
              {editId === d.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="date" className="input text-sm py-1 w-36 shrink-0" value={editDate} onChange={e => setEditDate(e.target.value)} />
                    <textarea className="input text-sm flex-1 resize-none" rows={3} value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><X className="w-4 h-4" /></button>
                    <button onClick={() => save(d.id)} disabled={saving} className="p-1.5 text-green-600 hover:text-green-700 rounded"><Check className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 whitespace-pre-wrap leading-snug ${compact ? 'text-sm' : 'text-sm'}`}>{d.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {fmt(d.date)}
                      {d.diagnosed_by_name && <> · <span className="text-gray-500">{d.diagnosed_by_name}</span></>}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => startEdit(d)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(d.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
