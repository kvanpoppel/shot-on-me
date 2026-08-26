'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

export default function SetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-500">Shot On Me</h1>
          <p className="text-primary-400/60 mt-2">Venue Portal</p>
        </div>

        <div className="bg-black border border-primary-500/20 rounded-xl p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <h2 className="text-xl font-bold text-primary-500">Password Set!</h2>
              <p className="text-primary-400 text-sm">
                Your password has been set. Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-primary-500 mb-2">Set Your Password</h2>
              <p className="text-primary-400/70 text-sm mb-6">
                Welcome to Shot On Me! Create a password to access your venue dashboard.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-500 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={!token}
                    className="w-full px-4 py-3 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-500 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={!token}
                    className="w-full px-4 py-3 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                    placeholder="Confirm your password"
                  />
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Setting Password...' : 'Set Password & Sign In'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
