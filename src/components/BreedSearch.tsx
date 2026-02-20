'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { DOG_BREEDS, CAT_BREEDS } from '@/lib/breeds'

export default function BreedSearch({
  species,
  value,
  onChange,
  placeholder = 'Search breed...',
}: {
  species: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const breeds = species === 'Cat' ? CAT_BREEDS : DOG_BREEDS

  const filtered = useMemo(() => {
    if (!query) return breeds.slice(0, 50)
    return breeds.filter(b => b.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
  }, [query, breeds])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className="input pr-8"
          placeholder={placeholder}
          value={open ? query : value}
          onChange={e => {
            setQuery(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setQuery(value)
          }}
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {query && !breeds.some(b => b.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors text-green-600 font-medium border-b border-gray-100"
              onClick={() => {
                onChange(query)
                setOpen(false)
              }}
            >
              + Add "{query}"
            </button>
          )}

          {filtered.length === 0 && !query ? (
            <div className="px-3 py-2 text-sm text-gray-400">Type to search breeds</div>
          ) : (
            filtered.map(b => (
              <button
                key={b}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-pink/10 transition-colors ${
                  b === value ? 'bg-brand-pink/10 text-brand-pink font-medium' : 'text-gray-700'
                }`}
                onClick={() => {
                  onChange(b)
                  setOpen(false)
                  setQuery(b)
                }}
              >
                {b}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
