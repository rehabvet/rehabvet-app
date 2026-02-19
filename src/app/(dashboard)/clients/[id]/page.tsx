'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, PawPrint, FileText, Edit2, Save, X } from 'lucide-react'

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    fetch(`/api/clients/${id}`).then(r => r.json()).then(d => {
      setData(d)
      setForm(d.client)
    })
  }, [id])

  async function handleSave() {
    await fetch(`/api/clients/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    setEditing(false)
    const d = await fetch(`/api/clients/${id}`).then(r => r.json())
    setData(d)
    setForm(d.client)
  }

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" /></div>

  const { client, patients, invoices } = data

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink font-bold text-lg">
              {client.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              {editing ? (
                <input className="input text-lg font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              ) : (
                <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
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
              <div><label className="label">Phone</label><input className="input" value={form.phone||''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="label">Email</label><input className="input" value={form.email||''} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="label">Address</label><input className="input" value={form.address||''} onChange={e => setForm({...form, address: e.target.value})} /></div>
            </>
          ) : (
            <>
              {client.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{client.phone}</div>}
              {client.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{client.email}</div>}
              {client.address && <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{client.address}</div>}
            </>
          )}
        </div>
      </div>

      {/* Patients */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><PawPrint className="w-5 h-5 text-brand-gold" /> Pets</h2>
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

      {/* Invoices */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-brand-pink" /> Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-gray-400 text-sm">No invoices</p>
        ) : (
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
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/billing/${inv.id}`)}>
                    <td className="table-cell font-medium">{inv.invoice_number}</td>
                    <td className="table-cell">{inv.date}</td>
                    <td className="table-cell">${inv.total.toFixed(2)}</td>
                    <td className="table-cell">${inv.amount_paid.toFixed(2)}</td>
                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { paid: 'badge-green', partial: 'badge-yellow', sent: 'badge-blue', draft: 'badge-gray', overdue: 'badge-red', cancelled: 'badge-red' }
  return <span className={s[status] || 'badge-gray'}>{status}</span>
}
