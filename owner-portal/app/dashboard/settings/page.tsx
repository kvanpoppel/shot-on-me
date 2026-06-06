'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { Settings, Lock, Trash2, FileText } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, loading, token, logout } = useAuth()
  const router = useRouter()
  const API_URL = getApiUrl()

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete Account
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleChangePassword = async () => {
    setPasswordMessage(null)
    if (!newPassword || !currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all fields.' })
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }
    setChangingPassword(true)
    try {
      await axios.put(
        `${API_URL}/users/me/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password.' })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteMessage(null)
    if (!deletePassword) {
      setDeleteMessage({ type: 'error', text: 'Please enter your password to confirm deletion.' })
      return
    }
    if (!window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return
    setDeletingAccount(true)
    try {
      await axios.delete(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword }
      })
      logout()
      router.push('/')
    } catch (error: any) {
      setDeleteMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete account.' })
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary-500 flex items-center gap-3">
            <Settings className="w-7 h-7" /> Settings
          </h1>
          <p className="text-primary-400/70 mt-1">Account settings and legal</p>
        </div>

        {/* Change Password */}
        <div className="bg-black border-2 border-primary-500/20 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary-500 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Change Password
          </h2>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-lg text-primary-400 text-sm placeholder:text-primary-400/30 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 outline-none"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-lg text-primary-400 text-sm placeholder:text-primary-400/30 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 outline-none"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-lg text-primary-400 text-sm placeholder:text-primary-400/30 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 outline-none"
          />
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="w-full bg-primary-500 text-black px-4 py-3 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 text-sm transition-all shadow-lg"
          >
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
          {passwordMessage && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${
              passwordMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}>
              {passwordMessage.text}
            </div>
          )}
        </div>

        {/* Legal Links */}
        <div className="bg-black border-2 border-primary-500/20 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary-500 flex items-center gap-2">
            <FileText className="w-5 h-5" /> Legal
          </h2>
          <div className="space-y-2">
            <Link
              href="/terms"
              className="flex items-center justify-between px-4 py-3 bg-black/40 border border-primary-500/10 rounded-lg text-primary-400 hover:bg-primary-500/10 hover:text-primary-500 transition-colors"
            >
              <span className="text-sm font-medium">Terms of Service</span>
              <span className="text-primary-400/40 text-xs">&rarr;</span>
            </Link>
            <Link
              href="/privacy"
              className="flex items-center justify-between px-4 py-3 bg-black/40 border border-primary-500/10 rounded-lg text-primary-400 hover:bg-primary-500/10 hover:text-primary-500 transition-colors"
            >
              <span className="text-sm font-medium">Privacy Policy</span>
              <span className="text-primary-400/40 text-xs">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-black border-2 border-red-500/20 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Delete Account
          </h2>
          <p className="text-xs text-primary-400/50 leading-relaxed">
            This will permanently delete your administrator account and revoke all access to the Owner Portal.
            This action cannot be undone.
          </p>
          <input
            type="password"
            placeholder="Enter your password to confirm"
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-red-500/20 rounded-lg text-primary-400 text-sm placeholder:text-primary-400/30 focus:ring-1 focus:ring-red-500/50 focus:border-red-500/30 outline-none"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-500 disabled:opacity-50 text-sm transition-all"
          >
            {deletingAccount ? 'Deleting...' : 'Delete My Account'}
          </button>
          {deleteMessage && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${
              deleteMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}>
              {deleteMessage.text}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
