'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, Share2, Users, Sparkles, Check, Clock, Gift } from 'lucide-react'
import { getInviteLink, getInviteMessage, shareInvite } from '../utils/invite'

interface Referral {
  id: string
  referred: { _id: string; name: string; email: string; firstName?: string; lastName?: string; profilePicture?: string }
  status: string
  completedActions: { signedUp: boolean; firstPayment: boolean; firstCheckIn: boolean }
  rewards: { referrerReward: number; referredReward: number }
  createdAt: string
}

interface ReferralScreenProps {
  onClose: () => void
}

export default function ReferralScreen({ onClose }: ReferralScreenProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState({ totalReferrals: 0, completed: 0, pending: 0, totalEarned: 0 })
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800) }

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/referrals/history`, { headers: { Authorization: `Bearer ${token}` } })
      const list: Referral[] = res.data.referrals || []
      setReferrals(list)
      setStats({
        totalReferrals: list.length,
        completed: list.filter(r => r.status === 'completed').length,
        pending: list.filter(r => r.status === 'pending').length,
        totalEarned: list.reduce((s, r) => s + (r.rewards?.referrerReward || 0), 0),
      })
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleShare = async () => {
    const userId = user?.id || (user as any)?._id
    if (!userId) return
    setSharing(true)
    try {
      const link = await getInviteLink(userId)
      const msg = getInviteMessage(`${user?.firstName || ''} ${user?.lastName || ''}`.trim())
      const result = await shareInvite(link, msg)
      if (result.method === 'clipboard') showToast('Invite link copied!')
      else if (result.method === 'alert') showToast(result.message || 'Share your link!')
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl text-sm font-semibold shadow-2xl" style={{ background: '#C8F135', color: '#1A1A2E' }}>
          {toast}
        </div>
      )}

      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0F0F1E' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1A1A2E' }}>
          <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Invite Friends</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-10">
          {/* Share card */}
          <div className="rounded-3xl p-5 relative overflow-hidden mb-5" style={{ background: 'linear-gradient(135deg,#1C1C32,#23233A)', border: '1px solid rgba(200,241,53,0.15)' }}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: '#C8F135', transform: 'translate(30%,-30%)' }} />
            <div className="relative z-10">
              <p className="text-sm font-semibold text-white/50 mb-1">Invite a friend to Fizz</p>
              <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                You both <span style={{ color: '#C8F135' }}>earn rewards!</span>
              </h3>
              <p className="text-xs text-white/35 mb-4">When your friend sends their first Fizz, you both get bonus points.</p>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="fizz-btn-primary w-full py-3.5 gap-2 text-sm"
              >
                <Share2 className="w-4 h-4" />
                {sharing ? 'Sharing...' : 'Share invite link'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.totalReferrals, color: '#C8F135' },
              { label: 'Completed', value: stats.completed, color: '#00D4FF' },
              { label: 'Pts Earned', value: stats.totalEarned, color: '#FF9A57' },
            ].map(s => (
              <div key={s.label} className="fizz-card p-3 text-center">
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Referral list */}
          <h3 className="font-bold text-white text-base mb-3">Referral History</h3>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#1C1C32' }} />)}
            </div>
          ) : referrals.length === 0 ? (
            <div className="fizz-card py-12 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">No referrals yet</p>
              <p className="text-white/25 text-xs mt-1">Share your link above to start!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {referrals.map(r => {
                const name = r.referred.name || `${r.referred.firstName || ''} ${r.referred.lastName || ''}`.trim()
                return (
                  <div key={r.id} className="fizz-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}>
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm">{name}</p>
                        <p className="text-xs text-white/35">{r.referred.email}</p>
                      </div>
                      <span
                        className="text-xs px-2.5 py-1 rounded-xl font-semibold"
                        style={{
                          background: r.status === 'completed' ? 'rgba(200,241,53,0.15)' : 'rgba(255,154,87,0.15)',
                          color: r.status === 'completed' ? '#C8F135' : '#FF9A57',
                        }}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {[
                        { key: 'signedUp', label: 'Signed Up' },
                        { key: 'firstPayment', label: 'First Fizz' },
                        { key: 'firstCheckIn', label: 'Check-in' },
                      ].map(step => {
                        const done = r.completedActions[step.key as keyof typeof r.completedActions]
                        return (
                          <div key={step.key} className="flex items-center gap-1 text-xs" style={{ color: done ? '#C8F135' : 'rgba(255,255,255,0.25)' }}>
                            <Check className="w-3 h-3" />
                            <span>{step.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    {r.rewards.referrerReward > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: '#FF9A57' }}>
                        <Sparkles className="w-3 h-3" />
                        Earned {r.rewards.referrerReward} points
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
