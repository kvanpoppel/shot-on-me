'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Eye, EyeOff, CheckCircle, X } from 'lucide-react'

function ResetPasswordForm() {
  const API_URL = useApiUrl()
  const searchParams = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = searchParams.get('token')
    if (t) setToken(t)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { token, newPassword: password })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#1A1A2E' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#C8F135' }} />
        <div className="absolute bottom-20 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#FF5F57' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            🧋
          </div>
          <span className="text-xl font-black tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <span style={{ color: '#C8F135' }}>Re</span><span style={{ color: '#FF5F57' }}>vig</span>
          </span>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(200,241,53,0.15)' }}>
              <CheckCircle className="w-8 h-8" style={{ color: '#C8F135' }} />
            </div>
            <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Password reset!</h2>
            <p className="text-white/50 text-sm mb-8">Your password has been updated. You can now sign in with your new password.</p>
            <a
              href="/"
              className="inline-block revig-btn-primary px-8 py-3 text-sm"
            >
              Back to Revig
            </a>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Set new password</h2>
            <p className="text-white/50 text-sm mb-8">Choose a strong password for your Revig account.</p>

            {!token && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
                <X className="w-4 h-4 flex-shrink-0" />
                <span>Invalid or missing reset token. Please request a new reset link.</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
                <X className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    disabled={!token}
                    className="w-full px-4 py-3.5 rounded-xl text-sm font-medium border border-white/10 focus:border-lime-revig transition-colors pr-12 disabled:opacity-40"
                    style={{ background: '#252540' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  disabled={!token}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-medium border border-white/10 focus:border-lime-revig transition-colors disabled:opacity-40"
                  style={{ background: '#252540' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !token}
                className="revig-btn-primary w-full py-4 text-base mt-2 disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1A2E' }}>
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: '#C8F135' }} />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
