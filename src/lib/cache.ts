// Simple in-memory server-side cache with TTL
type CacheEntry<T> = { data: T; expires: number }
const store = new Map<string, CacheEntry<any>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) { store.delete(key); return null }
  return entry.data as T
}

export function cacheSet<T>(key: string, data: T, ttlMs = 30_000) {
  store.set(key, { data, expires: Date.now() + ttlMs })
}

export function cacheDel(pattern: string) {
  Array.from(store.keys()).forEach(key => {
    if (key.startsWith(pattern)) store.delete(key)
  })
}

// Cache-Control header helpers
export const CACHE_STATIC = 'public, s-maxage=300, stale-while-revalidate=600'  // 5 min (staff, treatment-types)
export const CACHE_MEDIUM = 'private, s-maxage=60, stale-while-revalidate=120'   // 1 min (clients, patients)
export const CACHE_SHORT  = 'private, s-maxage=15, stale-while-revalidate=30'    // 15s (appointments)
export const CACHE_NONE   = 'no-store'
