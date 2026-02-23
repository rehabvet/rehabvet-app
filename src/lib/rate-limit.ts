/**
 * In-memory rate limiter for login endpoint.
 * Tracks attempts per IP address.
 * Resets per rolling 15-minute window.
 */

interface AttemptEntry {
  count: number
  firstAttempt: number
}

const attempts = new Map<string, AttemptEntry>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// Clean up old entries every 30 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of attempts.entries()) {
    if (now - entry.firstAttempt > WINDOW_MS) attempts.delete(ip)
  }
}, 30 * 60 * 1000)

export function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetInSeconds: number
} {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetInSeconds: Math.ceil(WINDOW_MS / 1000) }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const resetInSeconds = Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000)
    return { allowed: false, remaining: 0, resetInSeconds }
  }

  entry.count++
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    resetInSeconds: Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000),
  }
}

export function resetRateLimit(ip: string) {
  attempts.delete(ip)
}
