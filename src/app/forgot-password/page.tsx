'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
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
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-800">Check your email</h2>
              <p className="text-gray-500 text-sm">
                If <strong>{email}</strong> is registered, a password reset link has been sent. Check your inbox — the link expires in 1 hour.
              </p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-brand-pink hover:underline mt-2">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold text-center text-gray-800">Forgot Password</h2>
                <p className="text-sm text-gray-500 text-center mt-1">Enter your email and we'll send you a reset link</p>
              </div>

              {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email" required
                      className="input pl-9"
                      placeholder="you@rehabvet.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
