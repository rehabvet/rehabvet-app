'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2, Save, X, Activity, Stethoscope, Calendar, FileText, TrendingUp, ClipboardList, Download } from 'lucide-react'
import DiagnosisLog from '@/components/DiagnosisLog'

export default function PatientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState('overview')
  const [visits, setVisits] = useState<any[]>([])
  const [imageError, setImageError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [exportModal, setExportModal] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch(`/api/patients/${id}`).then(r => r.json()).then(d => {
      setData(d)
      const p = d?.patient
      if (p) setEditForm({ name: p.name || '', species: p.species || 'Dog', breed: p.breed || '', gender: p.gender || '', date_of_birth: p.date_of_birth || '', weight: p.weight || '', microchip: p.microchip || '', notes: p.notes || '', neutered: p.neutered ?? null })
    })
    fetch(`/api/patients/${id}/visits`).then(r => r.json()).then(d => setVisits(d.visits || []))
  }, [id])

  async function savePatient() {
    setSaving(true)
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Save failed: ${err.error || res.statusText}`)
        setSaving(false)
        return
      }
      const d = await fetch(`/api/patients/${id}`).then(r => r.json())
      setData(d)
      const p = d?.patient
      if (p) setEditForm({ name: p.name || '', species: p.species || 'Dog', breed: p.breed || '', gender: p.gender || '', date_of_birth: p.date_of_birth || '', weight: p.weight || '', microchip: p.microchip || '', notes: p.notes || '', neutered: p.neutered ?? null })
      setEditing(false)
    } catch (e) {
      alert(`Save failed: ${e}`)
    }
    setSaving(false)
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (exportFrom) params.set('from', exportFrom)
      if (exportTo)   params.set('to', exportTo)
      const res = await fetch(`/api/patients/${id}/export-pdf?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RehabVet_MedicalHistory_${data?.patient?.name || 'Patient'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setExportModal(false)
    } catch (e: any) {
      alert(`Export failed: ${e.message}`)
    }
    setExporting(false)
  }

  useEffect(() => {
    setImageError(false)
  }, [data?.patient?.id, data?.patient?.breed, data?.patient?.species])

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  const { patient, treatmentPlans, sessions, appointments } = data
  const speciesEmoji: Record<string, string> = { Dog: '🐕', Cat: '🐈', Rabbit: '🐇', Bird: '🐦', Horse: '🐴' }
  const breedQuery = `${patient.breed || patient.species || 'pet'} ${patient.species || ''}`.trim()
  const breedImageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(breedQuery)}`

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'plans', label: 'Treatment Plans', icon: Stethoscope },

    { key: 'appointments', label: 'Appointments', icon: Calendar },
    { key: 'visits', label: 'Visit Records', icon: ClipboardList },
  ]

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Patient Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-200 bg-brand-gold/10 flex items-center justify-center text-3xl">
            {!imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={breedImageUrl}
                alt={`${patient.breed || patient.species} photo`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <span>{speciesEmoji[patient.species] || '🐾'}</span>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500">Name</label><input className="input w-full mt-1" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500">Species</label><input className="input w-full mt-1" value={editForm.species} onChange={e => setEditForm({...editForm, species: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500">Breed</label><input className="input w-full mt-1" value={editForm.breed} onChange={e => setEditForm({...editForm, breed: e.target.value})} /></div>
                  <div>
                    <label className="text-xs text-gray-500">Gender</label>
                    <select className="input w-full mt-1" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                      <option value="">— Select —</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Neutered / Spayed</label>
                    <select className="input w-full mt-1" value={editForm.neutered === null || editForm.neutered === undefined ? '' : editForm.neutered ? 'yes' : 'no'}
                      onChange={e => setEditForm({...editForm, neutered: e.target.value === '' ? null : e.target.value === 'yes'})}>
                      <option value="">— Unknown —</option>
                      <option value="yes">Yes — Neutered / Spayed</option>
                      <option value="no">No — Intact</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500">Date of Birth</label><input type="date" className="input w-full mt-1" value={editForm.date_of_birth} onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500">Weight (kg)</label><input type="number" step="0.1" min="0" className="input w-full mt-1" value={editForm.weight} onChange={e => setEditForm({...editForm, weight: e.target.value})} /></div>
                  <div><label className="text-xs text-gray-500">Microchip No.</label><input className="input w-full mt-1 font-mono text-sm" value={editForm.microchip} onChange={e => setEditForm({...editForm, microchip: e.target.value})} /></div>
                </div>
                <div><label className="text-xs text-gray-500">Notes</label><textarea className="input w-full mt-1" rows={2} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} /></div>
                <div className="flex gap-2">
                  <button onClick={savePatient} disabled={saving} className="btn-primary flex items-center gap-1"><Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1"><X className="w-3.5 h-3.5" />Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                    <p className="text-gray-500">{patient.species} · {patient.breed || 'Unknown breed'} · Owner: <Link href={`/clients/${patient.client_id}`} className="text-brand-pink hover:underline">{patient.client_name}</Link></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExportModal(true)} className="btn-secondary flex items-center gap-1 text-sm"><Download className="w-3.5 h-3.5" />Export PDF</button>
                    <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1 text-sm"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                  </div>
                </div>
                {/* Critical info cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Weight</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{patient.weight ? `${patient.weight} kg` : <span className="text-gray-300">—</span>}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Gender</p>
                    <p className="font-semibold text-gray-900 mt-0.5 capitalize">{patient.gender ? patient.gender.replace(/_/g, ' ') : <span className="text-gray-300">—</span>}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Neutered</p>
                    <p className={`font-semibold mt-0.5 ${patient.neutered === true ? 'text-green-600' : patient.neutered === false ? 'text-amber-600' : 'text-gray-300'}`}>
                      {patient.neutered === true ? 'Neutered' : patient.neutered === false ? 'Intact' : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Microchip</p>
                    <p className="font-semibold text-gray-900 mt-0.5 text-xs font-mono">{patient.microchip || <span className="text-gray-300 font-sans font-normal">—</span>}</p>
                  </div>
                </div>
                {patient.date_of_birth && <p className="text-sm text-gray-500 mt-2">DOB: {patient.date_of_birth}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-brand-pink text-brand-pink' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card lg:col-span-2">
            <DiagnosisLog patientId={patient.id} />
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Medical History</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{patient.medical_history || 'No medical history recorded'}</p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Allergies</h3>
            <p className="text-sm text-gray-600">{patient.allergies || 'None recorded'}</p>
          </div>
          {sessions.length > 0 && (
            <div className="card lg:col-span-2">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-pink" /> Progress Tracker</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="table-header">Date</th><th className="table-header">Modality</th><th className="table-header">Pain (0-10)</th><th className="table-header">Mobility (0-10)</th><th className="table-header">Notes</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {sessions.slice(0, 10).map((s: any) => (
                      <tr key={s.id}>
                        <td className="table-cell">{s.date}</td>
                        <td className="table-cell"><span className="badge-purple">{s.modality}</span></td>
                        <td className="table-cell">
                          {s.pain_score != null && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${s.pain_score <= 3 ? 'bg-green-500' : s.pain_score <= 6 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.pain_score * 10}%` }} />
                              </div>
                              <span>{s.pain_score}</span>
                            </div>
                          )}
                        </td>
                        <td className="table-cell">
                          {s.mobility_score != null && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full bg-brand-pink" style={{ width: `${s.mobility_score * 10}%` }} />
                              </div>
                              <span>{s.mobility_score}</span>
                            </div>
                          )}
                        </td>
                        <td className="table-cell text-xs truncate max-w-[200px]">{s.progress_notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          {treatmentPlans.length === 0 ? (
            <div className="card text-center text-gray-400 py-8">No treatment plans</div>
          ) : treatmentPlans.map((plan: any) => (
            <Link key={plan.id} href={`/treatment-plans/${plan.id}`} className="card block hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.diagnosis}</p>
                  <div className="flex gap-2 mt-2">
                    {plan.modalities && (() => { try { return JSON.parse(plan.modalities) } catch { return [] } })().map((m: string) => (
                      <span key={m} className="badge-purple">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <PlanStatusBadge status={plan.status} />
                  <p className="text-xs text-gray-400 mt-1">{plan.completed_sessions}/{plan.total_sessions || '∞'} sessions</p>
                  <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full bg-brand-pink" style={{ width: `${plan.total_sessions ? (plan.completed_sessions / plan.total_sessions * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="card p-0 overflow-hidden">
          {sessions.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No session records</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((s: any) => (
                <div key={s.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.date}</span>
                      <span className="badge-purple">{s.modality}</span>
                      {s.duration_minutes && <span className="text-xs text-gray-400">{s.duration_minutes}min</span>}
                    </div>
                    <span className="text-xs text-gray-500">by {s.therapist_name}</span>
                  </div>
                  {s.subjective && <p className="text-sm text-gray-600"><span className="font-medium">S:</span> {s.subjective}</p>}
                  {s.objective && <p className="text-sm text-gray-600"><span className="font-medium">O:</span> {s.objective}</p>}
                  {s.assessment && <p className="text-sm text-gray-600"><span className="font-medium">A:</span> {s.assessment}</p>}
                  {s.plan && <p className="text-sm text-gray-600"><span className="font-medium">P:</span> {s.plan}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'visits' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-brand-pink" /> Visit Records</h3>
            <span className="text-xs text-gray-400">{visits.length} visits</span>
          </div>
          {visits.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No visit records yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Key Findings</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visits.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/visits/${v.id}`)}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-3"><span className="badge-gray">{v.staff_name || '—'}</span></td>
                    <td className="px-4 py-3">{v.weight_kg ? `${v.weight_kg} kg` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-[260px] truncate">{v.clinical_examination?.slice(0, 100) || v.history?.slice(0, 100) || '—'}</td>
                    <td className="px-4 py-3 text-right"><span className="text-brand-pink text-xs font-medium">View →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'appointments' && (
        <div className="card p-0 overflow-hidden">
          {appointments.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No appointments</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {appointments.map((a: any) => (
                <div key={a.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="text-center min-w-[80px]">
                    <p className="text-sm font-medium">{a.date}</p>
                    <p className="text-xs text-gray-400">{a.start_time} - {a.end_time}</p>
                  </div>
                  <div className="flex-1">
                    <span className="badge-purple">{a.modality}</span>
                    <span className="text-xs text-gray-500 ml-2">{a.therapist_name}</span>
                  </div>
                  <ApptStatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    {/* ── Export PDF Modal ── */}
    {exportModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Export Medical History</h2>
            <button onClick={() => setExportModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-gray-500 mb-5">Select a date range or leave blank to export all visits.</p>
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={exportFrom}
                onChange={e => setExportFrom(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={exportTo}
                onChange={e => setExportTo(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setExportModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}

function PlanStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { active: 'badge-green', draft: 'badge-gray', pending_approval: 'badge-yellow', completed: 'badge-blue', discontinued: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status.replace('_', ' ')}</span>
}

function ApptStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { scheduled: 'badge-blue', confirmed: 'badge-green', in_progress: 'badge-yellow', completed: 'badge-gray', cancelled: 'badge-red', no_show: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status.replace('_', ' ')}</span>
}
