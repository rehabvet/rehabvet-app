'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const COUNTRY_CODES = [
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+63', country: 'PH', flag: '🇵🇭', name: 'Philippines' },
  { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: '+84', country: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+852', country: 'HK', flag: '🇭🇰', name: 'Hong Kong' },
  { code: '+853', country: 'MO', flag: '🇲🇴', name: 'Macau' },
  { code: '+886', country: 'TW', flag: '🇹🇼', name: 'Taiwan' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: '+47', country: 'NO', flag: '🇳🇴', name: 'Norway' },
  { code: '+45', country: 'DK', flag: '🇩🇰', name: 'Denmark' },
  { code: '+358', country: 'FI', flag: '🇫🇮', name: 'Finland' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
]

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

export default function PhoneInput({ value, onChange, required, placeholder = '9123 4567' }: PhoneInputProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Parse existing value to extract country code
  const parseValue = () => {
    for (const c of COUNTRY_CODES) {
      if (value.startsWith(c.code)) {
        return { countryCode: c.code, number: value.slice(c.code.length).trim() }
      }
    }
    return { countryCode: '+65', number: value.replace(/^\+\d+\s*/, '') }
  }

  const { countryCode, number } = parseValue()
  const selected = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]

  const filtered = search
    ? COUNTRY_CODES.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.includes(search) ||
        c.country.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRY_CODES

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectCountry(code: string) {
    onChange(`${code} ${number}`)
    setOpen(false)
    setSearch('')
  }

  function handleNumberChange(num: string) {
    onChange(`${countryCode} ${num}`)
  }

  return (
    <div ref={ref} className="flex w-full">
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
        >
          <span>{selected.flag}</span>
          <span className="text-gray-700">{selected.code}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-brand-pink"
                placeholder="Search country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c.code)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-brand-pink/10 transition-colors ${
                    c.code === countryCode ? 'bg-brand-pink/10 text-brand-pink font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-gray-400">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <input
        type="tel"
        className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-1 focus:ring-brand-pink focus:border-brand-pink text-sm placeholder:text-gray-400"
        placeholder={placeholder}
        value={number}
        onChange={e => handleNumberChange(e.target.value)}
        required={required}
      />
    </div>
  )
}
