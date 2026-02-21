'use client'

import { useState, useEffect } from 'react'
import { Save, Building2, Clock, Calendar, DollarSign, Bell, Sliders } from 'lucide-react'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const DAY_LABELS: Record<string, string> = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' }

type Section = 'clinic' | 'hours' | 'appointments' | 'billing' | 'reminders' | 'system'

const SECTIONS: { key: Section; label: string; icon: any }[] = [
  { key: 'clinic',       label: 'Clinic Profile',     icon: Building2 },
  { key: 'hours',        label: 'Business Hours',      icon: Clock },
  { key: 'appointments', label: 'Appointments',        icon: Calendar },
  { key: 'billing',      label: 'Billing & Payments',  icon: DollarSign },
  { key: 'reminders',    label: 'Reminders',           icon: Bell },
  { key: 'system',       label: 'System',              icon: Sliders },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [active, setActive] = useState<Section>('clinic')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setSettings(d.settings))
  }, [])

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
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
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

        </div>
      </div>
    </div>
  )
}
