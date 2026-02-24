'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function UnsubscribeContent() {
  const params = useSearchParams()
  const email = params.get('email') || ''
  const token = params.get('token') || ''
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Verify token matches email
  const expectedToken = typeof window !== 'undefined'
    ? btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    : ''
  const valid = token === expectedToken || token === btoa(email)

  async function handleUnsubscribe() {
    setStatus('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('done')
        setMessage('You\'ve been unsubscribed successfully.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: '32px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
        <img src="https://rehabvet.com/wp-content/uploads/2025/02/logo.webp" alt="RehabVet" style={{ height: 40, margin: '0 auto 24px', display: 'block' }} />

        {status === 'done' ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Unsubscribed</h1>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6 }}>
              {email} has been removed from our mailing list. You won't receive marketing emails from us anymore.
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
              You can still reach us at <a href="mailto:hello@rehabvet.com" style={{ color: '#EC6496' }}>hello@rehabvet.com</a> or <a href="tel:62916881" style={{ color: '#EC6496' }}>6291 6881</a>.
            </p>
          </>
        ) : status === 'error' ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ fontSize: 15, color: '#6b7280' }}>{message}</p>
          </>
        ) : !email ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Invalid link</h1>
            <p style={{ fontSize: 15, color: '#6b7280' }}>This unsubscribe link is invalid or has expired.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Unsubscribe from RehabVet emails</h1>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
              Remove <strong>{email}</strong> from RehabVet marketing emails. You'll still receive appointment confirmations and important clinic updates.
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={status === 'loading'}
              style={{ background: '#EC6496', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}
            >
              {status === 'loading' ? 'Processing…' : 'Confirm Unsubscribe'}
            </button>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
              Changed your mind? Just ignore this page — nothing has changed yet.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <UnsubscribeContent />
    </Suspense>
  )
}
