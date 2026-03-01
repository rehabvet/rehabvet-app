'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, Check } from 'lucide-react'

interface AddressData {
  postalCode: string
  block: string
  street: string
  building: string
  unit: string
}

interface AddressInputProps {
  value: string
  onChange: (value: string) => void
}

function parseAddress(full: string): AddressData {
  const data: AddressData = { postalCode: '', block: '', street: '', building: '', unit: '' }
  if (!full) return data

  const parts = full.split(',').map(p => p.trim()).filter(Boolean)

  // Postal code: handles "Singapore 123456" or just "123456"
  const postalPart = parts.find(p => /(?:Singapore\s+)?\d{6}$/i.test(p))
  if (postalPart) {
    const m = postalPart.match(/(\d{6})$/)
    if (m) data.postalCode = m[1]
  }

  // Unit: #01-23
  const unitPart = parts.find(p => /^#/.test(p))
  if (unitPart) data.unit = unitPart.replace(/^#/, '')

  // First non-special part as block, second as street, third as building
  const normalParts = parts.filter(p => !/^#/.test(p) && !/(?:Singapore\s+)?\d{6}$/i.test(p))
  if (normalParts[0]) data.block = normalParts[0]
  if (normalParts[1]) data.street = normalParts[1]
  if (normalParts[2]) data.building = normalParts[2]

  return data
}

function buildAddress(data: AddressData): string {
  const parts = []
  if (data.block) parts.push(data.block)
  if (data.street) parts.push(data.street)
  if (data.unit) parts.push(`#${data.unit}`)
  if (data.building) parts.push(data.building)
  if (data.postalCode) parts.push(`Singapore ${data.postalCode}`)
  return parts.join(', ')
}

export default function AddressInput({ value, onChange }: AddressInputProps) {
  const [loading, setLoading] = useState(false)
  const [found, setFound] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<AddressData>(() => parseAddress(value || ''))
  // Track whether the last onChange call came from inside this component.
  // If so, skip re-syncing from the prop -- prevents the typing->reset loop.
  const internalChange = useRef(false)

  // Sync internal state ONLY when value changes from an external source (e.g. parent loads existing record)
  useEffect(() => {
    if (internalChange.current) {
      internalChange.current = false
      return
    }
    const parsed = parseAddress(value || '')
    setData(parsed)
    setFound(Boolean(parsed.postalCode))
    setError('')
  }, [value])

  function updateField(field: keyof AddressData, val: string) {
    const newData = { ...data, [field]: val }
    setData(newData)
    internalChange.current = true
    onChange(buildAddress(newData))
  }

  async function lookupPostalCode(code: string) {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setFound(false)
      return
    }
    
    setLoading(true)
    setError('')
    setFound(false)
    
    try {
      const res = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${code}&returnGeom=Y&getAddrDetails=Y`)
      const result = await res.json()
      
      if (result.found && result.found > 0 && result.results?.length > 0) {
        const r = result.results[0]
        const newData: AddressData = {
          postalCode: code,
          block: r.BLK_NO && r.BLK_NO !== 'NIL' ? r.BLK_NO : '',
          street: r.ROAD_NAME && r.ROAD_NAME !== 'NIL' ? r.ROAD_NAME : '',
          building: r.BUILDING && r.BUILDING !== 'NIL' ? r.BUILDING : '',
          unit: data.unit // preserve existing unit
        }
        setData(newData)
        // Use the full ADDRESS field from OneMap if available, otherwise build it
        const fullAddress = r.ADDRESS && r.ADDRESS !== 'NIL'
          ? r.ADDRESS
          : buildAddress(newData)
        internalChange.current = true
        onChange(fullAddress)
        setFound(true)
      } else {
        setError('Postal code not found')
      }
    } catch (err) {
      setError('Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  function handlePostalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    updateField('postalCode', val)
    setError('')
    setFound(false)
    
    if (val.length === 6) {
      lookupPostalCode(val)
    }
  }

  return (
    <div className="space-y-3">
      {/* Postal Code - Primary Input */}
      <div className="flex gap-3">
        <div className="relative w-36 flex-shrink-0">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input pr-9 font-mono tracking-wider"
            placeholder="e.g. 218154"
            value={data.postalCode}
            onChange={handlePostalChange}
            maxLength={6}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="rv-postal-code"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="w-4 h-4 text-brand-pink animate-spin" />
            ) : found ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <MapPin className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
        <div className="flex-1 text-xs text-gray-400 flex items-center">
          {error && <span className="text-red-500">{error}</span>}
          {!error && !found && <span>Enter 6-digit postal code to auto-fill</span>}
          {found && <span className="text-green-600">Found Address found</span>}
        </div>
      </div>

      {/* Address Fields - Show after postal lookup or allow manual entry */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Block / House No</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. 513"
            value={data.block}
            onChange={e => updateField('block', e.target.value)}
            autoComplete="off"
            name="rv-block"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Unit No <span className="text-gray-400">(optional)</span></label>
          <input
            type="text"
            className="input"
            placeholder="e.g. 01-23"
            value={data.unit}
            onChange={e => updateField('unit', e.target.value)}
            autoComplete="off"
            name="rv-unit"
          />
        </div>
      </div>
      
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Street Name</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Serangoon Road"
          value={data.street}
          onChange={e => updateField('street', e.target.value)}
          autoComplete="off"
          name="rv-street"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Building Name <span className="text-gray-400">(optional)</span></label>
        <input
          type="text"
          className="input"
          placeholder="e.g. The Venue Shoppes"
          value={data.building}
          onChange={e => updateField('building', e.target.value)}
          autoComplete="off"
          name="rv-building"
        />
      </div>
    </div>
  )
}
