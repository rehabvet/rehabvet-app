'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Users, PawPrint, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  todayAppointments: number
  totalPatients: number
  activeClients: number
  activePlans: number
  monthRevenue: number
  outstandingBalance: number
  todaySchedule: any[]
  recentSessions: any[]
}

function formatCurrencyClient(n: number) {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(n)
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  const cards = [
    { label: "Today's Appointments", value: stats.todayAppointments, icon: Calendar, color: 'text-brand-pink', bg: 'bg-pink-50', href: '/appointments' },
    { label: 'Active Patients', value: stats.totalPatients, icon: PawPrint, color: 'text-brand-gold', bg: 'bg-amber-50', href: '/patients' },
    { label: 'Active Treatment Plans', value: stats.activePlans, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', href: '/treatment-plans' },
    { label: 'Outstanding Balance', value: formatCurrencyClient(stats.outstandingBalance), icon: DollarSign, color: 'text-red-500', bg: 'bg-red-50', href: '/billing' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome to RehabVet Clinic Management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Today&apos;s Schedule</h2>
            <Link href="/appointments" className="text-sm text-brand-pink hover:underline">View all</Link>
          </div>
          {stats.todaySchedule.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No appointments today</p>
          ) : (
            <div className="space-y-3">
              {stats.todaySchedule.map((appt: any) => (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="text-center min-w-[60px]">
                    <p className="text-sm font-semibold text-gray-900">{appt.start_time}</p>
                    <p className="text-xs text-gray-400">{appt.end_time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{appt.patient_name}</p>
                    <p className="text-xs text-gray-500">{appt.client_name} · {appt.modality}</p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Sessions</h2>
            <Link href="/sessions" className="text-sm text-brand-pink hover:underline">View all</Link>
          </div>
          {stats.recentSessions.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No recent sessions</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSessions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="text-center min-w-[70px]">
                    <p className="text-xs font-medium text-gray-500">{s.date}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.patient_name}</p>
                    <p className="text-xs text-gray-500">{s.modality} · {s.duration_minutes}min</p>
                  </div>
                  <div className="text-right">
                    {s.pain_score != null && (
                      <p className="text-xs text-gray-500">Pain: <span className="font-medium">{s.pain_score}/10</span></p>
                    )}
                    {s.mobility_score != null && (
                      <p className="text-xs text-gray-500">Mobility: <span className="font-medium">{s.mobility_score}/10</span></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: 'badge-blue',
    confirmed: 'badge-green',
    in_progress: 'badge-yellow',
    completed: 'badge-gray',
    cancelled: 'badge-red',
    no_show: 'badge-red',
  }
  return <span className={styles[status] || 'badge-gray'}>{status.replace('_', ' ')}</span>
}
