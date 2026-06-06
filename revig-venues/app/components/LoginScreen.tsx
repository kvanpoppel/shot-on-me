'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Forgot password state
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      await axios.post(`${getApiUrl()}/auth/forgot-password`, { email: forgotEmail })
      setForgotSuccess(true)
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Failed to send reset link. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const switchToForgot = () => {
    setView('forgot')
    setForgotEmail(email) // pre-fill with login email if entered
    setForgotError('')
    setForgotSuccess(false)
  }

  const switchToLogin = () => {
    setView('login')
    setError('')
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
        <p className="text-sm text-white/40 mt-1">
          {view === 'login' ? 'Sign in to your venue dashboard' : 'Reset your password'}
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {view === 'login' ? (
          <>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: '#C8F135' }}
                  >
                    Forgot Password?
                  </button>
                </div>
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
          </>
        ) : (
          <div className="fv-card p-6 flex flex-col gap-4">
            {forgotSuccess ? (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(200,241,53,0.15)' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#C8F135' }} />
                </div>
                <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Check Your Email
                </h2>
                <p className="text-sm text-white/50">
                  If an account exists for <span className="text-white/70">{forgotEmail}</span>, you'll receive a password reset link shortly.
                </p>
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="fv-btn-primary w-full py-3.5 text-sm mt-2"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors -mt-1 mb-1 self-start"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>

                <p className="text-sm text-white/50">
                  Enter your email and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="owner@venue.com"
                      required
                      autoComplete="email"
                      className="fv-input"
                    />
                  </div>

                  {forgotError && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,95,87,0.12)', color: '#FF5F57' }}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {forgotError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="fv-btn-primary w-full py-4 text-base"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-white/25 mt-5">
          Not a venue partner yet?{' '}
          <a href="https://revig.shotonme.com/venue-signup" className="underline" style={{ color: '#C8F135' }}>
            Apply to join
          </a>
        </p>

        <p className="text-center text-xs text-white/20 mt-4">
          <a href="/terms" className="underline hover:text-white/40 transition-colors">Terms</a>
          {' · '}
          <a href="/privacy" className="underline hover:text-white/40 transition-colors">Privacy</a>
        </p>
        <p className="text-center text-xs text-white/20 mt-1">
          &copy; 2026 Shot On Me LLC
        </p>
      </div>
    </div>
  )
}
