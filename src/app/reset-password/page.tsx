'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'done'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) setStatus('valid')
        else if (d.reason === 'expired') setStatus('expired')
        else setStatus('invalid')
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setStatus('done')
      setTimeout(() => router.push('/login'), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.webp" alt="RehabVet" className="h-12 mx-auto" />
          <p className="text-gray-400 text-sm mt-1">Proven steps to pain free mobility</p>
        </div>

        <div className="card space-y-4">
          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink mx-auto" />
              <p className="text-gray-500 text-sm mt-3">Verifying your link...</p>
            </div>
          )}

          {(status === 'invalid' || status === 'expired') && (
            <div className="text-center space-y-4 py-4">
              <XCircle className="w-14 h-14 text-red-400 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-800">
                {status === 'expired' ? 'Link expired' : 'Invalid link'}
              </h2>
              <p className="text-gray-500 text-sm">
                {status === 'expired'
                  ? 'This reset link has expired. Links are valid for 1 hour.'
                  : 'This reset link is invalid or has already been used.'}
              </p>
              <Link href="/forgot-password" className="btn-primary inline-block">Request a new link</Link>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-800">Password updated!</h2>
              <p className="text-gray-500 text-sm">Your password has been changed. Redirecting to sign in...</p>
            </div>
          )}

          {status === 'valid' && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-center text-gray-800">Set new password</h2>
                <p className="text-sm text-gray-500 text-center mt-1">Choose a strong password of at least 8 characters</p>
              </div>

              {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} required
                      className="input pr-10"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'} required
                      className="input pr-10"
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {password && confirm && password !== confirm && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}

                <button type="submit" disabled={submitting || password !== confirm || password.length < 8} className="btn-primary w-full disabled:opacity-50">
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}
