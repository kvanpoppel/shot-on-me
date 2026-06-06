'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { LogOut, MapPin, Mail, Building2, Phone, ExternalLink, Crown, Check, Loader2, ArrowUpRight, Lock, AlertTriangle, KeyRound, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Users, User, Key, Copy, X, QrCode, Download } from 'lucide-react'

interface StaffMember {
  _id: string
  user: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  role: 'owner' | 'manager' | 'staff'
  addedAt: string
}

interface Plan {
  tier: string
  name: string
  price: string
  priceSub: string
  features: { label: string; included: boolean }[]
}

const PLANS: Plan[] = [
  {
    tier: 'free', name: 'Starter', price: '$0', priceSub: '12-week trial',
    features: [
      { label: '2 active deals', included: true },
      { label: 'Bank payouts', included: true },
      { label: 'Staff access', included: true },
      { label: 'AI deal suggestions', included: false },
      { label: 'Full analytics', included: false },
    ],
  },
  {
    tier: 'basic', name: 'Pro', price: '$29', priceSub: '/mo',
    features: [
      { label: 'Unlimited deals', included: true },
      { label: 'AI-powered deal suggestions', included: true },
      { label: 'Full analytics', included: true },
      { label: 'Recurring deals', included: true },
    ],
  },
  {
    tier: 'premium', name: 'Business', price: '$99', priceSub: '/mo',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Featured placement', included: true },
      { label: 'Priority support', included: true },
    ],
  },
]

const TIER_ORDER = ['free', 'basic', 'premium']
const ACCENT = '#C8F135'

export default function SettingsTab() {
  const { user, venue, token, logout } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showPlans, setShowPlans] = useState(false)

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  // Delete account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [showDeletePw, setShowDeletePw] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Staff management state
  const [showStaff, setShowStaff] = useState(false)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [staffCode, setStaffCode] = useState<string | null>(null)
  const [staffLoading, setStaffLoading] = useState(false)
  const [newStaffCode, setNewStaffCode] = useState('')
  const [editingStaffCode, setEditingStaffCode] = useState(false)
  const [savingStaffCode, setSavingStaffCode] = useState(false)
  const [staffCopied, setStaffCopied] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [staffError, setStaffError] = useState('')

  // QR code state
  const [showQR, setShowQR] = useState(false)

  const venueId = venue?.id || venue?._id
  const venueSlug = venue?.slug

  const fetchStaff = useCallback(async () => {
    if (!venueId || !token) return
    setStaffLoading(true)
    setStaffError('')
    try {
      const res = await axios.get(`${getApiUrl()}/venues/${venueId}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStaff(res.data.staff || [])
      setStaffCode(res.data.staffCode || null)
    } catch {
      setStaffError('Failed to load staff')
    } finally {
      setStaffLoading(false)
    }
  }, [venueId, token])

  useEffect(() => {
    if (showStaff && venueId && token) fetchStaff()
  }, [showStaff, venueId, token, fetchStaff])

  const handleSetStaffCode = async () => {
    if (!venueId || !token || !newStaffCode.trim()) return
    setSavingStaffCode(true)
    setStaffError('')
    try {
      const res = await axios.put(
        `${getApiUrl()}/venues/${venueId}/staff-code`,
        { code: newStaffCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setStaffCode(res.data.code)
      setEditingStaffCode(false)
      setNewStaffCode('')
    } catch (err: any) {
      setStaffError(err.response?.data?.error || 'Failed to set code')
    } finally {
      setSavingStaffCode(false)
    }
  }

  const handleRemoveStaffCode = async () => {
    if (!venueId || !token) return
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/staff-code`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStaffCode(null)
    } catch (err: any) {
      setStaffError(err.response?.data?.error || 'Failed to remove code')
    }
  }

  const handleCopyStaffCode = () => {
    if (!staffCode) return
    navigator.clipboard.writeText(staffCode)
    setStaffCopied(true)
    setTimeout(() => setStaffCopied(false), 2000)
  }

  const handleRemoveStaff = async (staffId: string) => {
    if (!venueId || !token) return
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConfirmRemoveId(null)
      fetchStaff()
    } catch (err: any) {
      setStaffError(err.response?.data?.error || 'Failed to remove staff')
    }
  }

  const venuePublicUrl = venueSlug
    ? `https://revig-venues.shotonme.com/v/${venueSlug}`
    : venueId
      ? `https://revig-venues.shotonme.com?venue=${venueId}`
      : ''
  const qrUrl = venuePublicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(venuePublicUrl)}&color=C8F135&bgcolor=0F0F1E`
    : ''

  const handleQRDownload = async () => {
    if (!qrUrl) return
    try {
      const res = await fetch(qrUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'revig-venue-qr.png'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(qrUrl, '_blank')
    }
  }

  const handleChangePassword = async () => {
    setPwError('')
    setPwSuccess('')
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters'); return }
    setPwLoading(true)
    try {
      await axios.put(`${getApiUrl()}/users/me/change-password`, {
        currentPassword: currentPw,
        newPassword: newPw,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setPwSuccess('Password updated successfully')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => { setPwSuccess(''); setShowChangePw(false) }, 2000)
    } catch (err: any) {
      setPwError(err.response?.data?.message || err.response?.data?.error || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    if (!deletePw) { setDeleteError('Enter your password to confirm'); return }
    setDeleteLoading(true)
    try {
      await axios.delete(`${getApiUrl()}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePw },
      })
      logout()
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const currentTier = 'free' // Revig venues default — would come from venue data if available
  const currentIdx = TIER_ORDER.indexOf(currentTier)

  const handleUpgrade = async (tier: string) => {
    if (!token) return
    setLoading(tier)
    setError('')
    try {
      const res = await axios.post(`${getApiUrl()}/subscriptions/checkout`, { tier }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      window.location.href = res.data.url
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout')
      setLoading(null)
    }
  }

  const rows = [
    { icon: <Building2 className="w-4 h-4" />, label: 'Venue Name', value: venue?.name },
    { icon: <MapPin className="w-4 h-4" />,    label: 'City',        value: venue?.city },
    { icon: <Mail className="w-4 h-4" />,      label: 'Email',       value: user?.email },
    { icon: <Phone className="w-4 h-4" />,     label: 'Account',     value: `${user?.firstName} ${user?.lastName}` },
  ].filter(r => r.value)

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-5" style={{ background: '#0F0F1E' }}>
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Settings</h1>
        <p className="text-xs text-white/40 mt-0.5">Venue account & subscription</p>
      </div>

      {/* Venue info */}
      <div className="fv-card overflow-hidden mb-5">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center gap-3 px-4 py-3.5"
            style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white/30" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {row.icon}
            </div>
            <div>
              <p className="text-xs text-white/35">{row.label}</p>
              <p className="text-sm font-medium text-white">{row.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription */}
      <div className="mb-5">
        <button
          onClick={() => setShowPlans(!showPlans)}
          className="w-full fv-card px-4 py-3.5 flex items-center gap-3"
        >
          <Crown className="w-4 h-4" style={{ color: ACCENT }} />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Subscription</p>
            <p className="text-xs text-white/35 mt-0.5">
              Current: <span style={{ color: ACCENT }}>{PLANS.find(p => p.tier === currentTier)?.name || 'Starter'}</span>
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-white/25" />
        </button>

        {showPlans && (
          <div className="mt-3 space-y-3">
            {error && (
              <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(255,95,87,0.06)', border: '1px solid rgba(255,95,87,0.2)' }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FF5F57' }} />
                <p className="text-xs" style={{ color: '#FF5F57' }}>{error}</p>
              </div>
            )}

            {PLANS.map(plan => {
              const isCurrent = currentTier === plan.tier
              const planIdx = TIER_ORDER.indexOf(plan.tier)
              const isUpgrade = planIdx > currentIdx
              const isLoading = loading === plan.tier

              return (
                <div key={plan.tier} className="rounded-xl p-4" style={{
                  background: isCurrent ? 'rgba(200,241,53,0.06)' : 'rgba(28,28,50,1)',
                  border: isCurrent ? `1px solid rgba(200,241,53,0.3)` : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-white">{plan.name}</p>
                      {isCurrent && <span className="text-[9px] font-bold uppercase" style={{ color: ACCENT }}>Current</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-white">{plan.price}</span>
                      <span className="text-xs text-white/40">{plan.priceSub}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-3">
                    {plan.features.map(f => (
                      <li key={f.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: f.included ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>
                        <Check className="w-3 h-3 flex-shrink-0" style={{ color: f.included ? ACCENT : 'rgba(255,255,255,0.15)' }} />
                        {f.label}
                      </li>
                    ))}
                  </ul>

                  {!isCurrent && (
                    <button
                      onClick={() => isUpgrade ? handleUpgrade(plan.tier) : undefined}
                      disabled={isLoading || !isUpgrade}
                      className="w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30 min-h-[36px] flex items-center justify-center gap-1.5"
                      style={{
                        background: isUpgrade ? ACCENT : 'transparent',
                        color: isUpgrade ? '#0F0F1E' : 'rgba(255,255,255,0.3)',
                        border: isUpgrade ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                        isUpgrade ? <><ArrowUpRight className="w-3 h-3" /> Upgrade</> :
                        <><Lock className="w-3 h-3" /> Downgrade</>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Links */}
      <div className="fv-card overflow-hidden mb-5">
        {[
          { label: 'Help & Support', href: 'mailto:support@shotonme.com' },
        ].map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
            style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}
          >
            <span className="flex-1 text-sm font-medium text-white">{link.label}</span>
            <ExternalLink className="w-4 h-4 text-white/25" />
          </a>
        ))}
      </div>

      {/* Change Password */}
      <div className="mb-5">
        <button
          onClick={() => { setShowChangePw(!showChangePw); setPwError(''); setPwSuccess('') }}
          className="w-full fv-card px-4 py-3.5 flex items-center gap-3"
        >
          <KeyRound className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="flex-1 text-left text-sm font-semibold text-white">Change Password</span>
          {showChangePw ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
        </button>

        {showChangePw && (
          <div className="mt-2 rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(28,28,50,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {pwError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(255,95,87,0.08)', color: '#FF5F57' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(200,241,53,0.08)', color: '#C8F135' }}>
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                {pwSuccess}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
                  {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
                  {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30 flex items-center justify-center gap-1.5"
              style={{ background: ACCENT, color: '#0F0F1E' }}
            >
              {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update Password'}
            </button>
          </div>
        )}
      </div>

      {/* Delete Account */}
      <div className="mb-5">
        <button
          onClick={() => { setShowDeleteAccount(!showDeleteAccount); setDeleteError('') }}
          className="w-full fv-card px-4 py-3.5 flex items-center gap-3"
        >
          <Trash2 className="w-4 h-4" style={{ color: '#FF5F57' }} />
          <span className="flex-1 text-left text-sm font-semibold" style={{ color: '#FF5F57' }}>Delete Account</span>
          {showDeleteAccount ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
        </button>

        {showDeleteAccount && (
          <div className="mt-2 rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,95,87,0.04)', border: '1px solid rgba(255,95,87,0.15)' }}>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(255,95,87,0.08)', color: '#FF5F57' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">This action cannot be undone.</p>
                <p className="text-white/40">Your venue account, all data, and any pending payouts will be permanently deleted. Enter your password to confirm.</p>
              </div>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(255,95,87,0.08)', color: '#FF5F57' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showDeletePw ? 'text' : 'password'}
                  value={deletePw}
                  onChange={e => setDeletePw(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,95,87,0.15)' }}
                />
                <button type="button" onClick={() => setShowDeletePw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
                  {showDeletePw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading || !deletePw}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30 flex items-center justify-center gap-1.5"
              style={{ background: '#FF5F57', color: '#fff' }}
            >
              {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3 h-3" /> Permanently Delete Account</>}
            </button>
          </div>
        )}
      </div>

      {/* Staff & Team */}
      <div className="mb-5">
        <button
          onClick={() => setShowStaff(!showStaff)}
          className="w-full fv-card px-4 py-3.5 flex items-center gap-3"
        >
          <Users className="w-4 h-4" style={{ color: ACCENT }} />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Staff & Team</p>
            <p className="text-xs text-white/35 mt-0.5">Manage team access</p>
          </div>
          {showStaff ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
        </button>

        {showStaff && (
          <div className="mt-2 rounded-xl p-4 flex flex-col gap-4" style={{ background: 'rgba(28,28,50,1)', border: '1px solid rgba(255,255,255,0.05)' }}>

            {staffError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(255,95,87,0.08)', color: '#FF5F57' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {staffError}
              </div>
            )}

            {/* Access Code */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4" style={{ color: ACCENT }} />
                <p className="text-xs font-bold text-white">Staff Access Code</p>
              </div>
              <p className="text-[11px] text-white/35 mb-3">
                Share this code with your staff. They log in with their Revig account and enter this code to join your venue.
              </p>

              {staffCode && !editingStaffCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,241,53,0.15)' }}>
                    <span className="text-sm font-mono font-bold tracking-wider" style={{ color: ACCENT }}>{staffCode}</span>
                  </div>
                  <button
                    onClick={handleCopyStaffCode}
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ border: '1px solid rgba(200,241,53,0.15)', background: staffCopied ? 'rgba(200,241,53,0.1)' : 'transparent' }}
                  >
                    {staffCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" style={{ color: ACCENT }} />}
                  </button>
                  <button
                    onClick={() => { setEditingStaffCode(true); setNewStaffCode(staffCode || '') }}
                    className="px-2.5 py-2 text-[10px] font-bold rounded-xl transition-colors text-white/50 hover:text-white/70"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Change
                  </button>
                  <button
                    onClick={handleRemoveStaffCode}
                    className="px-2.5 py-2 text-[10px] font-bold rounded-xl transition-colors"
                    style={{ color: '#FF5F57', border: '1px solid rgba(255,95,87,0.2)' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStaffCode}
                    onChange={e => setNewStaffCode(e.target.value)}
                    placeholder="e.g. MYBAR-STAFF-2026"
                    maxLength={32}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <button
                    onClick={handleSetStaffCode}
                    disabled={savingStaffCode || newStaffCode.trim().length < 4}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                    style={{ background: ACCENT, color: '#0F0F1E' }}
                  >
                    {savingStaffCode ? '...' : 'Save'}
                  </button>
                  {editingStaffCode && (
                    <button
                      onClick={() => { setEditingStaffCode(false); setNewStaffCode('') }}
                      className="p-2 text-white/30 hover:text-white/50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            {/* Staff List */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" style={{ color: ACCENT }} />
                <p className="text-xs font-bold text-white">Team ({staff.length})</p>
              </div>

              {staffLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                </div>
              ) : staff.length === 0 ? (
                <p className="text-[11px] text-white/30">No team members yet. Set an access code above and share it with your staff.</p>
              ) : (
                <div className="space-y-1.5">
                  {staff.map(member => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        {member.role === 'owner' ? (
                          <Crown className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                        ) : (
                          <User className="w-4 h-4 flex-shrink-0 text-white/30" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-[10px] text-white/35">{member.user.email}</p>
                        </div>
                        <span
                          className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
                          style={{ color: 'rgba(200,241,53,0.6)', background: 'rgba(200,241,53,0.08)' }}
                        >
                          {member.role}
                        </span>
                      </div>

                      {member.role !== 'owner' && (
                        <>
                          {confirmRemoveId === member._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRemoveStaff(member._id)}
                                className="px-2 py-1 text-[10px] rounded font-bold"
                                style={{ background: '#FF5F57', color: '#fff' }}
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="px-2 py-1 text-[10px] rounded text-white/40"
                                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveId(member._id)}
                              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 transition-colors"
                              style={{ background: 'transparent' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table QR Code */}
      <div className="mb-5">
        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full fv-card px-4 py-3.5 flex items-center gap-3"
        >
          <QrCode className="w-4 h-4" style={{ color: ACCENT }} />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Table QR Code</p>
            <p className="text-xs text-white/35 mt-0.5">Guests scan to find your venue</p>
          </div>
          {showQR ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
        </button>

        {showQR && (
          <div className="mt-2 rounded-xl p-4 flex flex-col items-center gap-4" style={{ background: 'rgba(28,28,50,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[11px] text-white/35 text-center">
              Place this QR code on your tables, menus, or bar top. Guests scan to connect with your venue on Revig.
            </p>

            {qrUrl ? (
              <>
                <div className="p-3 rounded-xl" style={{ background: '#0F0F1E', border: '1px solid rgba(200,241,53,0.2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="Venue QR Code" width={200} height={200} className="rounded-lg" />
                </div>
                <p className="text-[10px] text-white/20 break-all text-center px-2">{venuePublicUrl}</p>
                <button
                  onClick={handleQRDownload}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: ACCENT, color: '#0F0F1E' }}
                >
                  <Download className="w-3.5 h-3.5" /> Download QR Code
                </button>
              </>
            ) : (
              <p className="text-[11px] text-white/30 text-center">Venue data not available. Please refresh the page.</p>
            )}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
        style={{ background: 'rgba(255,95,87,0.12)', color: '#FF5F57', border: '1px solid rgba(255,95,87,0.25)' }}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      <p className="text-center text-xs text-white/20 mt-6">
        Revig for Venues · Shot On Me LLC
      </p>
    </div>
  )
}
