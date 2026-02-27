'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2, Save, X, Activity, Stethoscope, Calendar, FileText, TrendingUp, ClipboardList } from 'lucide-react'

export default function PatientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState('overview')
  const [visits, setVisits] = useState<any[]>([])
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    fetch(`/api/patients/${id}`).then(r => r.json()).then(setData)
    fetch(`/api/patients/${id}/visits`).then(r => r.json()).then(d => setVisits(d.visits || []))
  }, [id])

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
    { key: 'sessions', label: 'Sessions', icon: FileText },
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
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-gray-500">{patient.species} · {patient.breed || 'Unknown breed'} · Owner: <Link href={`/clients/${patient.client_id}`} className="text-brand-pink hover:underline">{patient.client_name}</Link></p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
              {patient.weight && <span>Weight: {patient.weight}kg</span>}
              {patient.sex && <span>Sex: {patient.sex.replace('_', ' ')}</span>}
              {patient.microchip && <span>Microchip: {patient.microchip}</span>}
            </div>
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
                    {plan.modalities && JSON.parse(plan.modalities).map((m: string) => (
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
