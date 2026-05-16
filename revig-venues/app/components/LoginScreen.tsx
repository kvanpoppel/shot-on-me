'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#0F0F1E' }}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
          🧋
        </div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <span style={{ color: '#C8F135' }}>Re</span><span style={{ color: '#FF5F57' }}>vig</span>
          <span className="text-white"> for Venues</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">Sign in to your venue dashboard</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="fv-card p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@venue.com"
              required
              autoComplete="email"
              className="fv-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="fv-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,95,87,0.12)', color: '#FF5F57' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="fv-btn-primary w-full py-4 text-base mt-1"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-white/25 mt-5">
          Not a venue partner yet?{' '}
          <a href="https://revig.shotonme.com/venue-signup" className="underline" style={{ color: '#C8F135' }}>
            Apply to join
          </a>
        </p>
      </div>
    </div>
  )
}
