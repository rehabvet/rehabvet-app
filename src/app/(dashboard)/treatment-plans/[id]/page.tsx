'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, TrendingUp } from 'lucide-react'

export default function TreatmentPlanDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/treatment-plans/${id}`).then(r => r.json()).then(setData)
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
  }, [id])

  async function approve() {
    await fetch(`/api/treatment-plans/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' })
    })
    const d = await fetch(`/api/treatment-plans/${id}`).then(r => r.json())
    setData(d)
  }

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  const { plan, sessions } = data

  const modalities = plan.modalities ? JSON.parse(plan.modalities) : []
  const progress = plan.total_sessions ? Math.round(plan.completed_sessions / plan.total_sessions * 100) : 0

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
              <PlanStatusBadge status={plan.status} />
            </div>
            <p className="text-gray-500">
              Patient: <Link href={`/patients/${plan.patient_id}`} className="text-brand-pink hover:underline">{plan.patient_name}</Link>
              {' · '}{plan.client_name}
            </p>
          </div>
          {plan.status === 'pending_approval' && user?.role === 'vet' && (
            <button onClick={approve} className="btn-primary"><CheckCircle className="w-4 h-4 mr-2" /> Approve Plan</button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Diagnosis</h3>
            <p className="text-sm text-gray-700">{plan.diagnosis || 'Not specified'}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Goals</h3>
            <p className="text-sm text-gray-700">{plan.goals || 'Not specified'}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Modalities</h3>
          <div className="flex flex-wrap gap-2">
            {modalities.map((m: string) => <span key={m} className="badge-purple">{m}</span>)}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Frequency</p>
            <p className="text-sm font-medium">{plan.frequency || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Progress</p>
            <p className="text-sm font-medium">{plan.completed_sessions} / {plan.total_sessions || '∞'} sessions</p>
            {plan.total_sessions && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="h-2 rounded-full bg-brand-pink" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Created by</p>
            <p className="text-sm font-medium">{plan.created_by_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Approved by</p>
            <p className="text-sm font-medium">{plan.approved_by_name || '—'}</p>
          </div>
        </div>
      </div>

      {/* Session History */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-pink" /> Session History
        </h2>
        {sessions.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No sessions recorded yet</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((s: any, i: number) => (
              <div key={s.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">#{sessions.length - i}</span>
                    <span className="text-sm font-medium">{s.date}</span>
                    <span className="badge-purple">{s.modality}</span>
                    {s.duration_minutes && <span className="text-xs text-gray-400">{s.duration_minutes}min</span>}
                  </div>
                  <span className="text-xs text-gray-500">{s.therapist_name}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {s.subjective && <div><span className="font-medium text-gray-500">S:</span> {s.subjective}</div>}
                  {s.objective && <div><span className="font-medium text-gray-500">O:</span> {s.objective}</div>}
                  {s.assessment && <div><span className="font-medium text-gray-500">A:</span> {s.assessment}</div>}
                  {s.plan && <div><span className="font-medium text-gray-500">P:</span> {s.plan}</div>}
                </div>
                {(s.pain_score != null || s.mobility_score != null) && (
                  <div className="flex gap-6 mt-2 pt-2 border-t border-gray-100">
                    {s.pain_score != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Pain:</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${s.pain_score <= 3 ? 'bg-green-500' : s.pain_score <= 6 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.pain_score * 10}%` }} />
                        </div>
                        <span className="text-xs font-medium">{s.pain_score}/10</span>
                      </div>
                    )}
                    {s.mobility_score != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Mobility:</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full bg-brand-pink" style={{ width: `${s.mobility_score * 10}%` }} />
                        </div>
                        <span className="text-xs font-medium">{s.mobility_score}/10</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PlanStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { active: 'badge-green', draft: 'badge-gray', pending_approval: 'badge-yellow', completed: 'badge-blue', discontinued: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status.replace('_', ' ')}</span>
}
