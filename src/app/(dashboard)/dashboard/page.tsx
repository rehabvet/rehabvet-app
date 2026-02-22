'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, TrendingUp, DollarSign, AlertCircle, Phone, User } from 'lucide-react'

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
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(n)
}

const statusColors: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-700 border-blue-200',
  confirmed:   'bg-green-50 text-green-700 border-green-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed:   'bg-gray-100 text-gray-600 border-gray-200',
  cancelled:   'bg-red-50 text-red-600 border-red-200',
  no_show:     'bg-red-50 text-red-600 border-red-200',
}

const modalityColors: Record<string, string> = {
  'Fitness Swim':                  'border-l-cyan-400',
  'Rehabilitation - Hydrotherapy': 'border-l-cyan-500',
  'TCVM Tui-na and acupuncture':   'border-l-purple-500',
  'Hyperbaric Oxygen':             'border-l-orange-400',
  'UWTM':                          'border-l-teal-500',
  'Rehabilitation - Therapy':      'border-l-blue-500',
  'TCM Acupuncture Review':        'border-l-violet-400',
  'Rehabilitation Consultation':   'border-l-green-500',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-64 animate-pulse bg-gray-50" />
          <div className="card h-64 animate-pulse bg-gray-50" />
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const cards = [
    {
      label: "Today's Appointments",
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'text-brand-pink',
      bg: 'bg-pink-50',
      href: '/appointments',
    },
    {
      label: 'Active Treatment Plans',
      value: stats.activePlans,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/treatment-plans',
    },
    {
      label: "Month's Revenue",
      value: formatCurrencyClient(stats.monthRevenue),
      icon: DollarSign,
      color: 'text-brand-gold',
      bg: 'bg-amber-50',
      href: '/billing',
    },
    {
      label: 'Outstanding Balance',
      value: formatCurrencyClient(stats.outstandingBalance),
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-50',
      href: '/billing',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{c.value}</p>
                <p className="text-xs text-gray-500 leading-tight">{c.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Today's Schedule — takes 3 columns */}
        <div className="card lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
              <p className="text-xs text-gray-400">{stats.todaySchedule.length} appointment{stats.todaySchedule.length !== 1 ? 's' : ''} today</p>
            </div>
            <Link href="/appointments" className="text-sm text-brand-pink hover:underline">View all →</Link>
          </div>

          {stats.todaySchedule.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-gray-400 text-sm">No appointments today</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {stats.todaySchedule.map((appt: any) => (
                <div
                  key={appt.id}
                  className={`flex gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors border-l-4 ${modalityColors[appt.modality] || 'border-l-gray-300'}`}
                >
                  {/* Time */}
                  <div className="min-w-[48px] text-center flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{appt.start_time?.slice(0,5)}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{appt.end_time?.slice(0,5)}</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    {/* Patient + Treatment */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{appt.patient_name}</span>
                      <span className="text-[10px] text-gray-400">·</span>
                      <span className="text-xs text-gray-500 font-medium">{appt.modality}</span>
                    </div>
                    {/* Owner + Mobile */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />{appt.client_name}
                      </span>
                      {appt.client_phone && (
                        <a
                          href={`tel:${appt.client_phone.replace(/[\s-]/g, '')}`}
                          className="flex items-center gap-1 text-xs font-mono text-brand-pink hover:underline"
                        >
                          <Phone className="w-3 h-3" />{appt.client_phone}
                        </a>
                      )}
                    </div>
                    {/* Therapist */}
                    {appt.therapist_name && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Provider: <span className="text-gray-600 font-medium">{appt.therapist_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize whitespace-nowrap ${statusColors[appt.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {appt.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions — takes 2 columns */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
            <Link href="/sessions" className="text-sm text-brand-pink hover:underline">View all →</Link>
          </div>

          {stats.recentSessions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-gray-400 text-sm">No recent sessions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentSessions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.patient_name}</p>
                    <p className="text-xs text-gray-500">{s.modality} · {s.duration_minutes}min</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{s.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    {s.pain_score != null && (
                      <p className="text-[11px] text-gray-500">Pain <span className={`font-semibold ${s.pain_score <= 3 ? 'text-green-600' : s.pain_score <= 6 ? 'text-amber-600' : 'text-red-600'}`}>{s.pain_score}/10</span></p>
                    )}
                    {s.mobility_score != null && (
                      <p className="text-[11px] text-gray-500">Mobility <span className="font-semibold text-blue-600">{s.mobility_score}/10</span></p>
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
