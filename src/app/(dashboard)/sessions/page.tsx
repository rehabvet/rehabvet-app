'use client'

import { useState, useEffect } from 'react'
import { Plus, Stethoscope } from 'lucide-react'
import Modal from '@/components/Modal'

const MODALITIES = ['Physiotherapy', 'Hydrotherapy', 'Acupuncture', 'HBOT', 'Chiropractic', 'TCM', 'Laser Therapy', 'Electrotherapy', 'Assessment', 'Consultation']

const defaultForm = {
  patient_id: '', treatment_plan_id: '', date: new Date().toISOString().split('T')[0],
  modality: 'Consultation', duration_minutes: '45',
  // SOAP
  subjective: '', objective: '', assessment: '', plan: '',
  pain_score: '', mobility_score: '', progress_notes: '',
  // Clinical Exam
  heart_rate: '', resp_rate: '', temperature: '', weight_session: '',
  dental_score: '', body_score: '',
  flea_treatment: false, wormed: false, bloods: false,
  history: '', clinical_examination: '', diagnosis: '', treatment_notes: '', comments: '',
}

type FormTab = 'soap' | 'clinical'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formTab, setFormTab] = useState<FormTab>('clinical')
  const [form, setForm] = useState({ ...defaultForm })

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
      setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] })
      setFormTab('clinical')
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
        heart_rate: form.heart_rate ? parseFloat(form.heart_rate) : null,
        resp_rate: form.resp_rate ? parseFloat(form.resp_rate) : null,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        weight_session: form.weight_session ? parseFloat(form.weight_session) : null,
        dental_score: form.dental_score ? parseInt(form.dental_score) : null,
        body_score: form.body_score ? parseFloat(form.body_score) : null,
        treatment_plan_id: form.treatment_plan_id || null,
      })
    })
    setShowAdd(false)
    fetchSessions()
  }

  function yn(val: boolean | null | undefined) {
    if (val === null || val === undefined) return '—'
    return val ? 'Yes' : 'No'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Records</h1>
          <p className="text-gray-500 text-sm">Log consultation and rehabilitation sessions</p>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">{s.patient_name}</span>
                  <span className="badge-purple">{s.modality}</span>
                  {s.duration_minutes && <span className="text-xs text-gray-400">{s.duration_minutes}min</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{s.date}</span>
                  <span>by {s.therapist_name}</span>
                </div>
              </div>

              {/* Clinical vitals row */}
              {(s.heart_rate || s.resp_rate || s.temperature || s.weight_session || s.dental_score != null || s.body_score != null) && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                  {s.heart_rate && <div><span className="text-gray-400">Heart:</span> {s.heart_rate}</div>}
                  {s.resp_rate && <div><span className="text-gray-400">Resp:</span> {s.resp_rate}</div>}
                  {s.temperature && <div><span className="text-gray-400">Temp:</span> {s.temperature}°C</div>}
                  {s.weight_session && <div><span className="text-gray-400">Wt:</span> {s.weight_session}kg</div>}
                  {s.dental_score != null && <div><span className="text-gray-400">Dental:</span> {s.dental_score}/4</div>}
                  {s.body_score != null && <div><span className="text-gray-400">Body:</span> {s.body_score}/9</div>}
                  <div><span className="text-gray-400">Flea'd:</span> {yn(s.flea_treatment)}</div>
                  <div><span className="text-gray-400">Wormed:</span> {yn(s.wormed)}</div>
                  <div><span className="text-gray-400">Bloods:</span> {yn(s.bloods)}</div>
                </div>
              )}

              {/* Clinical fields */}
              <div className="space-y-2 text-sm text-gray-600">
                {s.history && <p><span className="font-medium text-gray-500">History: </span>{s.history}</p>}
                {s.clinical_examination && <p><span className="font-medium text-gray-500">Clinical Exam: </span>{s.clinical_examination}</p>}
                {s.diagnosis && <p><span className="font-medium text-gray-500">Diagnosis: </span>{s.diagnosis}</p>}
                {s.treatment_notes && <p><span className="font-medium text-gray-500">Treatment: </span>{s.treatment_notes}</p>}
                {s.comments && <p><span className="font-medium text-gray-500">Comments: </span>{s.comments}</p>}
                {/* SOAP */}
                {s.subjective && <p><span className="font-medium text-gray-500">S: </span>{s.subjective}</p>}
                {s.objective && <p><span className="font-medium text-gray-500">O: </span>{s.objective}</p>}
                {s.assessment && <p><span className="font-medium text-gray-500">A: </span>{s.assessment}</p>}
                {s.plan && <p><span className="font-medium text-gray-500">P: </span>{s.plan}</p>}
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
          {/* Patient + plan */}
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
                <option value="">None</option>
                {plans.filter(p => !form.patient_id || p.patient_id === form.patient_id).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.modality} onChange={e => setForm({...form, modality: e.target.value})}>
                {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">Duration (min)</label><input type="number" className="input" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} /></div>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-gray-200">
            <button type="button" onClick={() => setFormTab('clinical')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${formTab === 'clinical' ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Stethoscope className="w-4 h-4" /> Clinical Exam
            </button>
            <button type="button" onClick={() => setFormTab('soap')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${formTab === 'soap' ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              SOAP Notes
            </button>
          </div>

          {formTab === 'clinical' && (
            <div className="space-y-4">
              {/* Vitals row */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vitals</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Heart Rate</label><input type="number" className="input" placeholder="bpm" value={form.heart_rate} onChange={e => setForm({...form, heart_rate: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Resp Rate</label><input type="number" className="input" placeholder="brpm" value={form.resp_rate} onChange={e => setForm({...form, resp_rate: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Temp (°C)</label><input type="number" step="0.1" className="input" placeholder="38.5" value={form.temperature} onChange={e => setForm({...form, temperature: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Weight (kg)</label><input type="number" step="0.1" className="input" placeholder="kg" value={form.weight_session} onChange={e => setForm({...form, weight_session: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Dental (0-4)</label><input type="number" min="0" max="4" className="input" value={form.dental_score} onChange={e => setForm({...form, dental_score: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Body (0-9)</label><input type="number" min="0" max="9" step="0.5" className="input" value={form.body_score} onChange={e => setForm({...form, body_score: e.target.value})} /></div>
                </div>
                <div className="flex gap-6 mt-3">
                  {([['flea_treatment', "Flea'd"], ['wormed', 'Wormed'], ['bloods', 'Bloods']] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.checked})} className="accent-brand-pink" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="label">History</label><textarea className="input" rows={3} value={form.history} onChange={e => setForm({...form, history: e.target.value})} placeholder="Patient history and owner observations..." /></div>
              <div><label className="label">Clinical Examination</label><textarea className="input" rows={3} value={form.clinical_examination} onChange={e => setForm({...form, clinical_examination: e.target.value})} placeholder="BAR, HR, RR, Temp, gait analysis, palpation..." /></div>
              <div><label className="label">Diagnosis</label><textarea className="input" rows={2} value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder="Clinical diagnosis..." /></div>
              <div><label className="label">Treatment</label><textarea className="input" rows={3} value={form.treatment_notes} onChange={e => setForm({...form, treatment_notes: e.target.value})} placeholder="Treatment performed, protocols used..." /></div>
              <div><label className="label">Comments</label><textarea className="input" rows={2} value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} /></div>
            </div>
          )}

          {formTab === 'soap' && (
            <div className="space-y-3">
              <div><label className="label">Subjective (owner report)</label><textarea className="input" rows={2} value={form.subjective} onChange={e => setForm({...form, subjective: e.target.value})} placeholder="Owner's observations..." /></div>
              <div><label className="label">Objective (clinical findings)</label><textarea className="input" rows={2} value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} placeholder="ROM, gait, palpation..." /></div>
              <div><label className="label">Assessment</label><textarea className="input" rows={2} value={form.assessment} onChange={e => setForm({...form, assessment: e.target.value})} placeholder="Progress evaluation..." /></div>
              <div><label className="label">Plan</label><textarea className="input" rows={2} value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} placeholder="Next steps..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Pain Score (0-10)</label><input type="number" min="0" max="10" className="input" value={form.pain_score} onChange={e => setForm({...form, pain_score: e.target.value})} /></div>
                <div><label className="label">Mobility Score (0-10)</label><input type="number" min="0" max="10" className="input" value={form.mobility_score} onChange={e => setForm({...form, mobility_score: e.target.value})} /></div>
              </div>
              <div><label className="label">Progress Notes</label><textarea className="input" rows={2} value={form.progress_notes} onChange={e => setForm({...form, progress_notes: e.target.value})} /></div>
            </div>
          )}

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
