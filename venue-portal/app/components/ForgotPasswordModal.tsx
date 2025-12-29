'use client'

import { useState } from 'react'
import { X, Mail } from 'lucide-react'
import axios from 'axios'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim()
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`
    }
    return url
  }
  return 'http://localhost:5000/api'
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  if (!isOpen) {
    return null
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const apiUrl = getApiUrl()
      const response = await axios.post(`${apiUrl}/auth/forgot-password`, { email })
      setMessage(response.data.message)
      
      // In development, show token for testing
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const response = await axios.post(`${apiUrl}/auth/reset-password`, {
        token: resetToken,
        newPassword
      })
      setMessage(response.data.message)
      setTimeout(() => {
        onClose()
        setResetToken('')
        setNewPassword('')
        setConfirmPassword('')
        setEmail('')
        setMessage('')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-black border-2 border-primary-500 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary-500">Reset Password</h2>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!resetToken ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="flex items-center gap-2 text-primary-400 text-sm mb-4">
              <Mail className="w-4 h-4" />
              <p>Enter your email to receive a password reset link.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="your@email.com"
              />
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-900 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-lg text-sm">
                {message}
                {process.env.NODE_ENV === 'development' && resetToken && (
                  <div className="mt-2 pt-2 border-t border-emerald-700">
                    <p className="text-xs">Dev Token: {resetToken}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-black border border-primary-500 text-primary-500 py-3 rounded-lg font-semibold hover:bg-primary-500/10"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-primary-400 text-sm mb-4">
              <p>Enter your new password.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Minimum 6 characters"
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
                minLength={6}
                className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-900 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetToken('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="flex-1 bg-black border border-primary-500 text-primary-500 py-3 rounded-lg font-semibold hover:bg-primary-500/10"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

