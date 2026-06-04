'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { LogOut, MapPin, Mail, Building2, Phone, ExternalLink, Crown, Check, Loader2, ArrowUpRight, Lock, AlertTriangle, KeyRound, Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'

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
