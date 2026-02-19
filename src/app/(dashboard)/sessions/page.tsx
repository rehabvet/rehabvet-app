'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import Modal from '@/components/Modal'

const MODALITIES = ['Physiotherapy', 'Hydrotherapy', 'Acupuncture', 'HBOT', 'Chiropractic', 'TCM', 'Laser Therapy', 'Electrotherapy', 'Assessment']

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    patient_id: '', treatment_plan_id: '', date: new Date().toISOString().split('T')[0],
    modality: 'Physiotherapy', duration_minutes: '45',
    subjective: '', objective: '', assessment: '', plan: '',
    pain_score: '', mobility_score: '', progress_notes: ''
  })

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    setLoading(true)
    const data = await fetch('/api/sessions').then(r => r.json())
    setSessions(data.sessions || [])
    setLoading(false)
  }

  function openAdd() {
    Promise.all([
      fetch('/api/patients').then(r => r.json()),
      fetch('/api/treatment-plans?status=active').then(r => r.json()),
    ]).then(([p, tp]) => {
      setPatients(p.patients || [])
      setPlans(tp.plans || [])
      setShowAdd(true)
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        pain_score: form.pain_score ? parseInt(form.pain_score) : null,
        mobility_score: form.mobility_score ? parseInt(form.mobility_score) : null,
        treatment_plan_id: form.treatment_plan_id || null,
      })
    })
    setShowAdd(false)
    fetchSessions()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Records</h1>
          <p className="text-gray-500 text-sm">Log rehabilitation sessions with SOAP notes</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> Log Session</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" /></div>
      ) : sessions.length === 0 ? (
        <div className="card text-center text-gray-400 py-8">No sessions recorded</div>
      ) : (
        <div className="space-y-4">
          {sessions.map(s => (
            <div key={s.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{s.patient_name}</span>
                  <span className="badge-purple">{s.modality}</span>
                  {s.duration_minutes && <span className="text-xs text-gray-400">{s.duration_minutes}min</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{s.date}</span>
                  <span>by {s.therapist_name}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                {s.subjective && <p><span className="font-medium text-gray-500">S:</span> {s.subjective}</p>}
                {s.objective && <p><span className="font-medium text-gray-500">O:</span> {s.objective}</p>}
                {s.assessment && <p><span className="font-medium text-gray-500">A:</span> {s.assessment}</p>}
                {s.plan && <p><span className="font-medium text-gray-500">P:</span> {s.plan}</p>}
              </div>
              {(s.pain_score != null || s.mobility_score != null) && (
                <div className="flex gap-6 mt-3 pt-3 border-t border-gray-100">
                  {s.pain_score != null && <ScoreBar label="Pain" score={s.pain_score} color={s.pain_score <= 3 ? 'bg-green-500' : s.pain_score <= 6 ? 'bg-yellow-500' : 'bg-red-500'} />}
                  {s.mobility_score != null && <ScoreBar label="Mobility" score={s.mobility_score} color="bg-brand-pink" />}
                </div>
              )}
              {s.progress_notes && <p className="mt-2 text-sm text-gray-500 italic">{s.progress_notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Session" size="xl">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Patient *</label>
              <select className="input" value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} required>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.client_name})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Treatment Plan</label>
              <select className="input" value={form.treatment_plan_id} onChange={e => setForm({...form, treatment_plan_id: e.target.value})}>
                <option value="">None (standalone session)</option>
                {plans.filter(p => !form.patient_id || p.patient_id === form.patient_id).map(p => <option key={p.id} value={p.id}>{p.title} ({p.patient_name})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
            <div>
              <label className="label">Modality *</label>
              <select className="input" value={form.modality} onChange={e => setForm({...form, modality: e.target.value})}>
                {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">Duration (min)</label><input type="number" className="input" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} /></div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">SOAP Notes</h3>
            <div className="space-y-3">
              <div><label className="label">Subjective (owner report)</label><textarea className="input" rows={2} value={form.subjective} onChange={e => setForm({...form, subjective: e.target.value})} placeholder="Owner's observations, pet behavior changes..." /></div>
              <div><label className="label">Objective (clinical findings)</label><textarea className="input" rows={2} value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} placeholder="ROM measurements, gait analysis, palpation findings..." /></div>
              <div><label className="label">Assessment</label><textarea className="input" rows={2} value={form.assessment} onChange={e => setForm({...form, assessment: e.target.value})} placeholder="Progress evaluation, clinical interpretation..." /></div>
              <div><label className="label">Plan</label><textarea className="input" rows={2} value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} placeholder="Next steps, adjustments to protocol..." /></div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Scores & Notes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Pain Score (0-10, lower is better)</label><input type="number" min="0" max="10" className="input" value={form.pain_score} onChange={e => setForm({...form, pain_score: e.target.value})} /></div>
              <div><label className="label">Mobility Score (0-10, higher is better)</label><input type="number" min="0" max="10" className="input" value={form.mobility_score} onChange={e => setForm({...form, mobility_score: e.target.value})} /></div>
            </div>
            <div className="mt-3"><label className="label">Progress Notes</label><textarea className="input" rows={2} value={form.progress_notes} onChange={e => setForm({...form, progress_notes: e.target.value})} /></div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Session</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}:</span>
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xs font-medium">{score}/10</span>
    </div>
  )
}
