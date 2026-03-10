'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, PawPrint, CalendarClock, Edit2, Save, X, ClipboardList, Receipt, Plus } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'
import AddressInput from '@/components/AddressInput'
import BreedSearch from '@/components/BreedSearch'
import Modal from '@/components/Modal'

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Guinea Pig', 'Reptile', 'Other']
const blankPatient = () => ({ name: '', species: 'Dog', breed: '', gender: '', neutered: '', date_of_birth: '', weight: '', microchip: '', is_reactive: '', vet_friendly: '', notes: '' })

const PAGE_SIZE = 20

type Tab = 'visits' | 'billing' | 'appointments'

function splitAddress(full?: string) {
  const out = { block: '', street: '', unit: '', building: '', postalCode: '' }
  if (!full) return out

  // Extract postal code from anywhere in the string
  const postalMatch = full.match(/(\d{6})\s*$/i)
  if (postalMatch) out.postalCode = postalMatch[1]

  if (full.includes(',')) {
    // Comma-separated structured format: "Block, Street, Building, Singapore XXXXXX"
    const parts = full.split(',').map(p => p.trim()).filter(Boolean)
    const unit = parts.find(p => /^#/.test(p))
    if (unit) out.unit = unit.replace(/^#/, '')
    const normal = parts.filter(p => !/^#/.test(p) && !/(?:Singapore\s+)?\d{6}$/i.test(p))
    out.block = normal[0] || ''
    out.street = normal[1] || ''
    out.building = normal[2] || ''
  } else {
    // Raw OneMap format: "BLK STREET BUILDING SINGAPORE XXXXXX"
    // Strip "SINGAPORE XXXXXX" suffix and parse what's left
    let remainder = full.replace(/\s*SINGAPORE\s+\d{6}\s*$/i, '').trim()
    // Unit number (#XX-XX)
    const unitMatch = remainder.match(/(#[\d\w-]+)/)
    if (unitMatch) { out.unit = unitMatch[1].replace('#', ''); remainder = remainder.replace(unitMatch[0], '').trim() }
    // First token(s) are the block number (e.g. "857", "274D", "NO.")
    const blockMatch = remainder.match(/^([A-Z0-9]+[A-Z]?)\s+(.+)$/i)
    if (blockMatch) {
      out.block = blockMatch[1]
      out.street = blockMatch[2]
    } else {
      out.block = remainder
    }
  }
  return out
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [visits, setVisits] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('visits')
  const [visitPage, setVisitPage] = useState(1)
  const [billingPage, setBillingPage] = useState(1)
  const [apptPage, setApptPage] = useState(1)
  // New visit modal
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [newVisit, setNewVisit] = useState({ patient_id: '', staff_id: '', visit_date: new Date().toISOString().split('T')[0] })
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [newPatient, setNewPatient] = useState(blankPatient())
  const [savingPatient, setSavingPatient] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const [creatingVisit, setCreatingVisit] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${id}`).then(r => r.json()).then(d => {
      setData(d); setForm(d.client)
    })
    fetch(`/api/visits?client_id=${id}&limit=1000`).then(r => r.json()).then(d => {
      setVisits(d.visits || [])
    }).catch(() => {})
  }, [id])

  function openVisitModal() {
    setNewVisit({ patient_id: '', staff_id: '', visit_date: new Date().toISOString().split('T')[0] })
    setShowVisitModal(true)
    fetch('/api/staff').then(r => r.json()).then(d => setStaffList(d.staff || []))
  }

  async function addPatient() {
    if (!newPatient.name.trim()) return
    setSavingPatient(true)
    await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: id,
        name: newPatient.name.trim(),
        species: newPatient.species,
        breed: newPatient.breed.trim() || null,
        gender: newPatient.gender || null,
        neutered: newPatient.neutered === 'yes' ? true : newPatient.neutered === 'no' ? false : null,
        date_of_birth: newPatient.date_of_birth || null,
        weight: newPatient.weight ? parseFloat(newPatient.weight) : null,
        microchip: newPatient.microchip.trim() || null,
        is_reactive: newPatient.is_reactive === 'yes' ? true : newPatient.is_reactive === 'no' ? false : null,
        vet_friendly: newPatient.vet_friendly === 'yes' ? true : newPatient.vet_friendly === 'no' ? false : null,
        notes: newPatient.notes.trim() || null,
      }),
    })
    setSavingPatient(false)
    setShowAddPatient(false)
    setNewPatient(blankPatient())
    // Refresh data
    const res = await fetch(`/api/clients/${id}`)
    const d = await res.json()
    setData(d)
  }

  async function createVisit() {
    if (!newVisit.patient_id || !newVisit.visit_date) return
    setCreatingVisit(true)
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, patient_id: newVisit.patient_id, staff_id: newVisit.staff_id || null, visit_date: newVisit.visit_date }),
    })
    const d = await res.json()
    setCreatingVisit(false)
    setShowVisitModal(false)
    if (d.visit?.id) router.push(`/visits/${d.visit.id}`)
  }

  async function handleSave() {
    await fetch(`/api/clients/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    setEditing(false)
    const d = await fetch(`/api/clients/${id}`).then(r => r.json())
    setData(d); setForm(d.client)
  }

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  const { client, invoices, appointments } = data
  const patients = data.patients || []
  const addr = splitAddress(client.address)

  return (
    <>
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Client header card */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink font-bold text-lg">
              {client.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              {editing ? (
                <div className="flex gap-2">
                  <input className="input font-bold" placeholder="First name" value={form.first_name||''} onChange={e => setForm({...form, first_name: e.target.value})} />
                  <input className="input font-bold" placeholder="Last name" value={form.last_name||''} onChange={e => setForm({...form, last_name: e.target.value})} />
                </div>
              ) : (
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
                  {client.client_number && (
                    <p className="text-xs text-gray-400 mt-0.5">Client # {String(client.client_number)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary"><X className="w-4 h-4" /></button>
              <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4 mr-1" /> Save</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary"><Edit2 className="w-4 h-4 mr-1" /> Edit</button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {editing ? (
            <>
              <div><label className="label">Phone</label><PhoneInput value={form.phone||''} onChange={v => setForm({...form, phone: v})} /></div>
              <div><label className="label">Email</label><input className="input" autoComplete="off" value={form.email||''} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="sm:col-span-3">
                <label className="label">Address</label>
                <AddressInput value={form.address||''} onChange={v => setForm({...form, address: v})} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{client.phone || '—'}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{client.email || '—'}</div>
              <div className="sm:col-span-3 rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"><MapPin className="w-4 h-4 text-gray-400" />Address</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div><span className="text-gray-400">Block:</span> {addr.block || '—'}</div>
                  <div><span className="text-gray-400">Street:</span> {addr.street || '—'}</div>
                  <div><span className="text-gray-400">Unit:</span> {addr.unit || '—'}</div>
                  <div><span className="text-gray-400">Building:</span> {addr.building || '—'}</div>
                  <div className="sm:col-span-2"><span className="text-gray-400">Postal Code:</span> {addr.postalCode || '—'}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pets */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><PawPrint className="w-5 h-5 text-brand-gold" /> Pets</h2>
          <button onClick={() => setShowAddPatient(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-pink border border-brand-pink/30 rounded-lg hover:bg-pink-50 transition-colors">
            <Plus className="w-4 h-4" /> Add Pet
          </button>
        </div>
        {patients.length === 0 ? (
          <p className="text-gray-400 text-sm">No pets registered</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patients.map((p: any) => (
              <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-pink/50 hover:bg-pink-50/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-lg">
                  {p.species === 'Dog' ? '🐕' : p.species === 'Cat' ? '🐈' : '🐾'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.species} · {p.breed || 'Unknown breed'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      <Modal open={showAddPatient} onClose={() => { setShowAddPatient(false); setNewPatient(blankPatient()) }} title="Add New Pet">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Pet Name *</label>
              <input className="input text-sm" placeholder="e.g. Buddy" value={newPatient.name}
                onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Species *</label>
              <select className="input text-sm" value={newPatient.species}
                onChange={e => setNewPatient(p => ({ ...p, species: e.target.value, breed: '' }))}>
                {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label text-xs">Breed</label>
            <BreedSearch species={newPatient.species} value={newPatient.breed}
              onChange={v => setNewPatient(p => ({ ...p, breed: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Gender</label>
              <select className="input text-sm" value={newPatient.gender}
                onChange={e => setNewPatient(p => ({ ...p, gender: e.target.value }))}>
                <option value="">— Unknown —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Neutered / Spayed</label>
              <select className="input text-sm" value={newPatient.neutered}
                onChange={e => setNewPatient(p => ({ ...p, neutered: e.target.value }))}>
                <option value="">— Unknown —</option>
                <option value="yes">Yes — Neutered / Spayed</option>
                <option value="no">No — Intact</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Date of Birth</label>
              <input type="date" className="input text-sm" value={newPatient.date_of_birth}
                onChange={e => setNewPatient(p => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Weight (kg)</label>
              <input type="number" step="0.1" min="0" className="input text-sm" placeholder="e.g. 12.5"
                value={newPatient.weight}
                onChange={e => setNewPatient(p => ({ ...p, weight: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Microchip No.</label>
              <input className="input text-sm font-mono" placeholder="Microchip number" value={newPatient.microchip}
                onChange={e => setNewPatient(p => ({ ...p, microchip: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Reactive to Dogs</label>
              <select className="input text-sm" value={newPatient.is_reactive}
                onChange={e => setNewPatient(p => ({ ...p, is_reactive: e.target.value }))}>
                <option value="">— Unknown —</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Vet Friendly</label>
              <select className="input text-sm" value={newPatient.vet_friendly}
                onChange={e => setNewPatient(p => ({ ...p, vet_friendly: e.target.value }))}>
                <option value="">— Unknown —</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label text-xs">Notes</label>
            <textarea className="input text-sm" rows={2} placeholder="Pre-existing conditions, surgeries, medications..."
              value={newPatient.notes}
              onChange={e => setNewPatient(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowAddPatient(false); setNewPatient(blankPatient()) }}
              className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={addPatient} disabled={savingPatient || !newPatient.name.trim()}
              className="flex-1 btn-primary text-sm">
              {savingPatient ? 'Saving…' : 'Add Pet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Tabbed: Visit Records / Billing / Appointments */}
      <div className="card p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200">
          {([
            { key: 'visits',       label: 'Visit Records',  icon: <ClipboardList className="w-4 h-4" />, count: visits.length },
            { key: 'billing',      label: 'Billing',        icon: <Receipt className="w-4 h-4" />,       count: invoices?.length ?? 0 },
            { key: 'appointments', label: 'Appointments',   icon: <CalendarClock className="w-4 h-4" />, count: appointments?.length ?? 0 },
          ] as { key: Tab; label: string; icon: React.ReactNode; count: number }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-pink text-brand-pink'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.key ? 'bg-brand-pink/10 text-brand-pink' : 'bg-gray-100 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Visit Records tab */}
          {tab === 'visits' && (
            <>
            <div className="flex justify-end mb-3">
              <button onClick={openVisitModal} className="btn-primary flex items-center gap-1.5 text-sm"><Plus className="w-3.5 h-3.5" />New Visit</button>
            </div>
            {visits.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">No visit records yet</p>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200">
                    <th className="table-header">Visit #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Pet</th>
                    <th className="table-header">Therapist</th>
                    <th className="table-header"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {visits.slice((visitPage-1)*PAGE_SIZE, visitPage*PAGE_SIZE).map((v: any) => (
                      <tr key={v.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/visits/${v.id}`)}>
                        <td className="table-cell font-medium text-brand-pink">{v.visit_number || '—'}</td>
                        <td className="table-cell">{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td className="table-cell">{v.patient_name || '—'}</td>
                        <td className="table-cell">{v.staff_name || '—'}</td>
                        <td className="table-cell text-right"><span className="text-xs text-brand-pink">View</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={visitPage} total={visits.length} onChange={setVisitPage} />
              </>
            )}
            </>
          )}

          {/* Billing tab */}
          {tab === 'billing' && (
            !invoices?.length ? (
              <p className="text-gray-400 text-sm py-2">No invoices</p>
            ) : (
              <>
              {/* Billing summary */}
              {(() => {
                const totalBilled = invoices.reduce((s: number, inv: any) => s + Number(inv.total || 0), 0)
                const totalPaid   = invoices.reduce((s: number, inv: any) => s + Number(inv.amount_paid || 0), 0)
                const totalOwing  = totalBilled - totalPaid
                return (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-xs text-gray-500 mb-0.5">Total Billed</p>
                      <p className="text-lg font-bold text-gray-800">S${totalBilled.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-xs text-gray-500 mb-0.5">Total Paid</p>
                      <p className="text-lg font-bold text-green-700">S${totalPaid.toFixed(2)}</p>
                    </div>
                    <div className={`rounded-xl px-4 py-3 text-center ${totalOwing > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <p className="text-xs text-gray-500 mb-0.5">Outstanding</p>
                      <p className={`text-lg font-bold ${totalOwing > 0 ? 'text-red-600' : 'text-gray-400'}`}>S${totalOwing.toFixed(2)}</p>
                    </div>
                  </div>
                )
              })()}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200">
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Paid</th>
                    <th className="table-header">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.slice((billingPage-1)*PAGE_SIZE, billingPage*PAGE_SIZE).map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/billing/${inv.id}`)}>
                        <td className="table-cell font-medium">{inv.invoice_number || inv.bill_number || '—'}</td>
                        <td className="table-cell">{inv.date}</td>
                        <td className="table-cell">S${Number(inv.total || 0).toFixed(2)}</td>
                        <td className="table-cell">S${Number(inv.amount_paid || 0).toFixed(2)}</td>
                        <td className="table-cell"><InvoiceStatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={billingPage} total={invoices.length} onChange={setBillingPage} />
              </>
            )
          )}

          {/* Appointments tab */}
          {tab === 'appointments' && (
            !appointments?.length ? (
              <p className="text-gray-400 text-sm py-2">No appointments found</p>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200">
                    <th className="table-header">Date</th>
                    <th className="table-header">Time</th>
                    <th className="table-header">Pet</th>
                    <th className="table-header">Provider</th>
                    <th className="table-header">Treatment</th>
                    <th className="table-header">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments.slice((apptPage-1)*PAGE_SIZE, apptPage*PAGE_SIZE).map((a: any) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="table-cell">{a.date}</td>
                        <td className="table-cell">{a.start_time} - {a.end_time}</td>
                        <td className="table-cell">{a.patient?.name || '—'}</td>
                        <td className="table-cell">{a.therapist?.name || 'Unassigned'}</td>
                        <td className="table-cell"><span className="badge-purple">{a.modality}</span></td>
                        <td className="table-cell"><ApptStatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={apptPage} total={appointments.length} onChange={setApptPage} />
              </>
            )
          )}
        </div>
      </div>
    </div>

    {showVisitModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">New Visit Record</h2>
            <button onClick={() => setShowVisitModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Patient *</label>
            <select className="input w-full mt-1.5" value={newVisit.patient_id} onChange={e => setNewVisit({ ...newVisit, patient_id: e.target.value })}>
              <option value="">— Select patient —</option>
              {(data?.patients || []).map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.species}{p.breed ? ` · ${p.breed}` : ''})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Visit Date *</label>
            <input type="date" className="input w-full mt-1.5" value={newVisit.visit_date} onChange={e => setNewVisit({ ...newVisit, visit_date: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Staff</label>
            <select className="input w-full mt-1.5" value={newVisit.staff_id} onChange={e => setNewVisit({ ...newVisit, staff_id: e.target.value })}>
              <option value="">— Select staff —</option>
              {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowVisitModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={createVisit} disabled={creatingVisit || !newVisit.patient_id || !newVisit.visit_date} className="btn-primary flex-1">
              {creatingVisit ? 'Creating…' : 'Create Visit'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>{(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}</span>
      <div className="flex gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">Prev</button>
        <button disabled={page === pages} onClick={() => onChange(page + 1)} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">Next</button>
      </div>
    </div>
  )
}

function ApptStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { scheduled: 'badge-blue', confirmed: 'badge-green', in_progress: 'badge-yellow', completed: 'badge-gray', cancelled: 'badge-red', no_show: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{String(status || '').replace('_', ' ')}</span>
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { paid: 'badge-green', partial: 'badge-yellow', sent: 'badge-blue', draft: 'badge-gray', overdue: 'badge-red', cancelled: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status}</span>
}
