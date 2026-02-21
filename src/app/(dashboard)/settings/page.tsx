'use client'

import { useState, useEffect } from 'react'
import { Save, Building2, Clock, Calendar, DollarSign, Bell, Sliders, Stethoscope, Check } from 'lucide-react'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const DAY_LABELS: Record<string, string> = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' }

type Section = 'clinic' | 'hours' | 'appointments' | 'billing' | 'reminders' | 'system' | 'service_pricing'

const SECTIONS: { key: Section; label: string; icon: any }[] = [
  { key: 'clinic',          label: 'Clinic Profile',     icon: Building2 },
  { key: 'hours',           label: 'Business Hours',     icon: Clock },
  { key: 'appointments',    label: 'Appointments',       icon: Calendar },
  { key: 'billing',         label: 'Billing & Payments', icon: DollarSign },
  { key: 'reminders',       label: 'Reminders',          icon: Bell },
  { key: 'system',          label: 'System',             icon: Sliders },
  { key: 'service_pricing', label: 'Service Pricing',    icon: Stethoscope },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [active, setActive] = useState<Section>('clinic')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Service Pricing state
  const [services, setServices] = useState<any[]>([])
  const [pricingEdits, setPricingEdits] = useState<Record<string, { price: string; sessions_in_package: string }>>({})
  const [savingPricing, setSavingPricing] = useState<string | null>(null)
  const [savedPricing, setSavedPricing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setSettings(d.settings))
  }, [])

  useEffect(() => {
    if (active === 'service_pricing' && services.length === 0) {
      fetch('/api/treatment-types').then(r => r.json()).then(d => {
        const all = d.types || []
        setServices(all)
        const edits: Record<string, { price: string; sessions_in_package: string }> = {}
        all.forEach((s: any) => {
          edits[s.id] = {
            price: s.price != null ? String(s.price) : '',
            sessions_in_package: s.sessions_in_package != null ? String(s.sessions_in_package) : '',
          }
        })
        setPricingEdits(edits)
      })
    }
  }, [active])

  async function savePricing(id: string) {
    setSavingPricing(id)
    const svc = services.find(s => s.id === id)
    const { price, sessions_in_package } = pricingEdits[id] || {}
    await fetch(`/api/treatment-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: svc.name,
        category: svc.category,
        description: svc.description,
        duration: svc.duration,
        color: svc.color,
        price: price !== '' ? parseFloat(price) : null,
        sessions_in_package: sessions_in_package !== '' ? parseInt(sessions_in_package) : null,
      }),
    })
    setSavingPricing(null)
    setSavedPricing(id)
    setTimeout(() => setSavedPricing(null), 2000)
  }

  function set(section: string, key: string, val: any) {
    setSettings((s: any) => ({ ...s, [section]: { ...s[section], [key]: val } }))
    setSaved(false)
  }

  function setHours(day: string, key: string, val: any) {
    setSettings((s: any) => ({ ...s, hours: { ...s.hours, [day]: { ...s.hours[day], [key]: val } } }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!settings) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your clinic configuration</p>
        </div>
        {active !== 'service_pricing' && (
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(s => (
              <button key={s.key} onClick={() => setActive(s.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${active === s.key ? 'bg-brand-pink/10 text-brand-pink' : 'text-gray-600 hover:bg-gray-100'}`}>
                <s.icon className="w-4 h-4 flex-shrink-0" />
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content panel */}
        <div className="flex-1 card space-y-6">

          {/* Clinic Profile */}
          {active === 'clinic' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-brand-pink" /> Clinic Profile</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="label">Clinic Name</label><input className="input" value={settings.clinic.name} onChange={e => set('clinic','name',e.target.value)} /></div>
                <div className="sm:col-span-2"><label className="label">Tagline</label><input className="input" value={settings.clinic.tagline} onChange={e => set('clinic','tagline',e.target.value)} placeholder="Proven steps to pain free mobility" /></div>
                <div><label className="label">Phone</label><input className="input" value={settings.clinic.phone} onChange={e => set('clinic','phone',e.target.value)} placeholder="+65 xxxx xxxx" /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={settings.clinic.email} onChange={e => set('clinic','email',e.target.value)} /></div>
                <div><label className="label">Website</label><input className="input" value={settings.clinic.website} onChange={e => set('clinic','website',e.target.value)} placeholder="https://rehabvet.com" /></div>
                <div><label className="label">Business Registration No.</label><input className="input" value={settings.clinic.registration} onChange={e => set('clinic','registration',e.target.value)} /></div>
                <div className="sm:col-span-2"><label className="label">Address</label><textarea className="input" rows={2} value={settings.clinic.address} onChange={e => set('clinic','address',e.target.value)} /></div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="gst_reg" checked={settings.clinic.gst_registered} onChange={e => set('clinic','gst_registered',e.target.checked)} className="accent-brand-pink" />
                  <label htmlFor="gst_reg" className="text-sm text-gray-700 cursor-pointer">GST Registered</label>
                </div>
                {settings.clinic.gst_registered && (
                  <div><label className="label">GST Registration No.</label><input className="input" value={settings.clinic.gst_number} onChange={e => set('clinic','gst_number',e.target.value)} /></div>
                )}
              </div>
            </>
          )}

          {/* Business Hours */}
          {active === 'hours' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-5 h-5 text-brand-pink" /> Business Hours</h2>
              <div className="space-y-3">
                {DAYS.map(day => {
                  const h = settings.hours[day]
                  return (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-28 flex-shrink-0 flex items-center gap-2">
                        <input type="checkbox" id={day} checked={!h.closed} onChange={e => setHours(day,'closed',!e.target.checked)} className="accent-brand-pink" />
                        <label htmlFor={day} className="text-sm font-medium text-gray-700 cursor-pointer capitalize">{DAY_LABELS[day]}</label>
                      </div>
                      {h.closed ? (
                        <span className="text-sm text-gray-400 italic">Closed</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input type="time" className="input w-32" value={h.open} onChange={e => setHours(day,'open',e.target.value)} />
                          <span className="text-gray-400 text-sm">to</span>
                          <input type="time" className="input w-32" value={h.close} onChange={e => setHours(day,'close',e.target.value)} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Appointments */}
          {active === 'appointments' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-brand-pink" /> Appointment Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Duration (minutes)</label>
                  <input type="number" className="input" min="5" step="5" value={settings.appointments.default_duration} onChange={e => set('appointments','default_duration',parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="label">Buffer Between Appointments (minutes)</label>
                  <input type="number" className="input" min="0" step="5" value={settings.appointments.buffer_minutes} onChange={e => set('appointments','buffer_minutes',parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="label">Max Bookings Per Day</label>
                  <input type="number" className="input" min="1" value={settings.appointments.max_per_day} onChange={e => set('appointments','max_per_day',parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="label">Online Booking Window (days ahead)</label>
                  <input type="number" className="input" min="1" value={settings.appointments.booking_window_days} onChange={e => set('appointments','booking_window_days',parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="label">Minimum Notice for New Bookings (hours)</label>
                  <input type="number" className="input" min="0" value={settings.appointments.min_notice_hours} onChange={e => set('appointments','min_notice_hours',parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="label">Cancellation Notice Required (hours)</label>
                  <input type="number" className="input" min="0" value={settings.appointments.cancellation_hours} onChange={e => set('appointments','cancellation_hours',parseInt(e.target.value))} />
                </div>
              </div>
            </>
          )}

          {/* Billing */}
          {active === 'billing' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><DollarSign className="w-5 h-5 text-brand-pink" /> Billing & Payments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Currency</label>
                  <select className="input" value={settings.billing.currency} onChange={e => set('billing','currency',e.target.value)}>
                    <option value="SGD">SGD — Singapore Dollar</option>
                    <option value="MYR">MYR — Malaysian Ringgit</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="AUD">AUD — Australian Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="label">Currency Symbol</label>
                  <input className="input" value={settings.billing.currency_symbol} onChange={e => set('billing','currency_symbol',e.target.value)} placeholder="S$" />
                </div>
                <div>
                  <label className="label">Invoice Prefix</label>
                  <input className="input" value={settings.billing.invoice_prefix} onChange={e => set('billing','invoice_prefix',e.target.value)} placeholder="INV" />
                </div>
                <div>
                  <label className="label">GST Rate (%)</label>
                  <input type="number" className="input" min="0" max="100" step="0.5" value={settings.billing.gst_rate} onChange={e => set('billing','gst_rate',parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">Default Payment Terms (days)</label>
                  <input type="number" className="input" min="0" value={settings.billing.payment_terms_days} onChange={e => set('billing','payment_terms_days',parseInt(e.target.value))} />
                </div>
              </div>
              <hr className="border-gray-100" />
              <h3 className="text-sm font-semibold text-gray-700">Payment Details (for invoices)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Bank Name</label>
                  <input className="input" value={settings.billing.bank_name} onChange={e => set('billing','bank_name',e.target.value)} placeholder="DBS Bank" />
                </div>
                <div>
                  <label className="label">Bank Account Number</label>
                  <input className="input" value={settings.billing.bank_account} onChange={e => set('billing','bank_account',e.target.value)} />
                </div>
                <div>
                  <label className="label">PayNow (UEN or Phone)</label>
                  <input className="input" value={settings.billing.paynow_number} onChange={e => set('billing','paynow_number',e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Reminders */}
          {active === 'reminders' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-brand-pink" /> Appointment Reminders</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="send_reminders" checked={settings.reminders.send_reminders} onChange={e => set('reminders','send_reminders',e.target.checked)} className="accent-brand-pink" />
                  <label htmlFor="send_reminders" className="text-sm text-gray-700 cursor-pointer font-medium">Enable appointment reminders</label>
                </div>
                {settings.reminders.send_reminders && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="label">First Reminder (hours before)</label>
                      <input type="number" className="input" min="1" value={settings.reminders.reminder_hours_before} onChange={e => set('reminders','reminder_hours_before',parseInt(e.target.value))} />
                    </div>
                    <div>
                      <label className="label">Second Reminder (hours before)</label>
                      <input type="number" className="input" min="1" value={settings.reminders.second_reminder_hours} onChange={e => set('reminders','second_reminder_hours',parseInt(e.target.value))} />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="label">Send reminders via</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={settings.reminders.reminder_via_email} onChange={e => set('reminders','reminder_via_email',e.target.checked)} className="accent-brand-pink" />
                          Email
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={settings.reminders.reminder_via_sms} onChange={e => set('reminders','reminder_via_sms',e.target.checked)} className="accent-brand-pink" />
                          SMS
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* System */}
          {active === 'system' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Sliders className="w-5 h-5 text-brand-pink" /> System Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Timezone</label>
                  <select className="input" value={settings.system.timezone} onChange={e => set('system','timezone',e.target.value)}>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +8)</option>
                    <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (MYT +8)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New York (EST/EDT)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date Format</label>
                  <select className="input" value={settings.system.date_format} onChange={e => set('system','date_format',e.target.value)}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="label">Time Format</label>
                  <select className="input" value={settings.system.time_format} onChange={e => set('system','time_format',e.target.value)}>
                    <option value="24h">24-hour (14:00)</option>
                    <option value="12h">12-hour (2:00 PM)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={settings.system.language} onChange={e => set('system','language',e.target.value)}>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Service Pricing */}
          {active === 'service_pricing' && (
            <>
              <h2 className="text-base font-semibold text-gray-900">Service Pricing</h2>
              <p className="text-sm text-gray-500 -mt-4">Set the price and package configuration for each service.</p>

              {services.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-pink" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group by category */}
                  {Array.from(new Set(services.map(s => s.category))).sort().map(cat => (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat}</h3>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-4"></th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Service</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-32">Duration</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-36">Price per Session</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-28">Sessions / Pack</th>
                              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-32">Pack Total</th>
                              <th className="w-20"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {services.filter(s => s.category === cat).map(s => {
                              const ed = pricingEdits[s.id] || { price: '', sessions_in_package: '' }
                              const priceNum = parseFloat(ed.price) || 0
                              const sessions = parseInt(ed.sessions_in_package) || 0
                              const packTotal = priceNum > 0 && sessions > 0 ? priceNum * sessions : null
                              const isSaving = savingPricing === s.id
                              const isSaved  = savedPricing === s.id
                              return (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                                  <td className="px-4 py-3 text-gray-500 text-xs">
                                    {s.duration > 0 ? `${s.duration} min` : '—'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">S$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="input pl-8 py-1.5 text-sm w-full"
                                        value={ed.price}
                                        onChange={e => setPricingEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], price: e.target.value } }))}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="—"
                                      className="input py-1.5 text-sm w-full"
                                      value={ed.sessions_in_package}
                                      onChange={e => setPricingEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], sessions_in_package: e.target.value } }))}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                                    {packTotal != null ? `S$${packTotal.toFixed(2)}` : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => savePricing(s.id)}
                                      disabled={isSaving}
                                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isSaved ? 'bg-green-100 text-green-700' : 'bg-brand-pink/10 text-brand-pink hover:bg-brand-pink hover:text-white'}`}
                                    >
                                      {isSaving ? '…' : isSaved ? <span className="flex items-center gap-1"><Check className="w-3 h-3"/>Saved</span> : 'Save'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
