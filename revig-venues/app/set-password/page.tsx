'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset link. Please use the link from your approval email.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${getApiUrl()}/auth/reset-password`, {
        token,
        newPassword
      })
      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#1A1A2E' }}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
          🧋
        </div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <span style={{ color: '#C8F135' }}>Re</span><span style={{ color: '#FF5F57' }}>vig</span>
          <span className="text-white"> for Venues</span>
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="fv-card p-6">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(200,241,53,0.15)' }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: '#C8F135' }} />
              </div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Password Set!
              </h2>
              <p className="text-sm text-white/50">
                Your password has been set successfully. Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Set Your Password
              </h2>
              <p className="text-sm text-white/40 mb-6">
                Welcome to Revig! Create a password to access your venue dashboard.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                      disabled={!token}
                      autoComplete="new-password"
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      minLength={8}
                      disabled={!token}
                      autoComplete="new-password"
                      className="fv-input pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  disabled={loading || !token}
                  className="fv-btn-primary w-full py-4 text-base mt-1"
                >
                  {loading ? 'Setting Password...' : 'Set Password & Sign In'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          &copy; 2026 Shot On Me LLC
        </p>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1A2E' }}>
        <div className="text-white/40 text-sm">Loading...</div>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  )
}
