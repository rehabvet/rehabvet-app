'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.webp" alt="RehabVet" className="h-12" />
          </div>
          <p className="text-gray-400 text-sm mt-1">Proven steps to pain free mobility</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-xl font-semibold text-center text-gray-800">Sign In</h2>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@rehabvet.com" required />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Password</label>
              <Link href="/forgot-password" className="text-xs text-brand-pink hover:underline">Forgot password?</Link>
            </div>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Demo hints removed */}
        </form>
      </div>
    </div>
  )
}
