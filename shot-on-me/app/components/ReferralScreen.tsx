'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { getInviteLink, getInviteMessage, shareInvite } from '../utils/invite'
import { Share2, Users, Sparkles } from 'lucide-react'

interface Referral {
  id: string
  referred: {
    _id: string
    name: string
    email: string
    profilePicture?: string
  }
  status: string
  completedActions: {
    signedUp: boolean
    firstPayment: boolean
    firstCheckIn: boolean
  }
  rewards: {
    referrerReward: number
    referredReward: number
  }
  createdAt: string
}

export default function ReferralScreen() {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completed: 0,
    pending: 0,
    totalEarned: 0
  })
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (token) fetchReferralData()
  }, [token])

  const fetchReferralData = async () => {
    try {
      setLoading(true)
      const historyResponse = await axios.get(`${API_URL}/referrals/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const list = historyResponse.data.referrals || []
      setReferrals(list)
      setStats({
        totalReferrals: list.length,
        completed: list.filter((r: Referral) => r.status === 'completed').length,
        pending: list.filter((r: Referral) => r.status === 'pending').length,
        totalEarned: list.reduce((sum: number, r: Referral) => sum + (r.rewards?.referrerReward || 0), 0)
      })
    } catch (error) {
      console.error('Failed to fetch referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  const shareInviteLink = async () => {
    const userId = user?.id || (user as any)?._id
    if (!userId) return
    setSharing(true)
    try {
      const link = await getInviteLink(userId)
      const message = getInviteMessage(user?.firstName || user?.name || '')
      const result = await shareInvite(link, message)
      if (result.success && result.method === 'clipboard') {
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
        toast.textContent = 'Invite link copied!'
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 3000)
      }
    } finally {
      setSharing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-14 pt-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-primary-500/10 p-4">
        <h1 className="text-2xl font-bold text-primary-500 mb-4">Refer Friends</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-black/40 border border-primary-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary-500">{stats.totalReferrals}</p>
            <p className="text-xs text-primary-400">Total</p>
          </div>
          <div className="bg-black/40 border border-primary-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
            <p className="text-xs text-primary-400">Completed</p>
          </div>
          <div className="bg-black/40 border border-primary-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.totalEarned}</p>
            <p className="text-xs text-primary-400">Points Earned</p>
          </div>
        </div>

        {/* Share invite link – no visible code; backend ties referral to user ID */}
        <div className="bg-gradient-to-r from-primary-500/20 to-primary-400/20 border border-primary-500/30 rounded-lg p-4">
          <p className="text-sm text-primary-400 mb-2">Invite friends</p>
          <button
            onClick={shareInviteLink}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2 p-3 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-all font-semibold disabled:opacity-50"
          >
            <Share2 className="w-5 h-5" />
            {sharing ? 'Sharing…' : 'Share invite link'}
          </button>
          <p className="text-xs text-primary-400/70 mt-2 text-center">
            When friends join via your link, you both earn rewards!
          </p>
        </div>
      </div>

      {/* Referral History */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">Referral History</h2>
        {referrals.length === 0 ? (
          <div className="text-center py-12 text-primary-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No referrals yet</p>
            <p className="text-sm mt-2">Share your invite link to start earning!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map(referral => (
              <div
                key={referral.id}
                className="p-4 bg-black/40 border border-primary-500/10 rounded-lg"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden">
                    {referral.referred.profilePicture ? (
                      <img
                        src={referral.referred.profilePicture}
                        alt={referral.referred.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-500 font-semibold">
                        {referral.referred.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{referral.referred.name}</p>
                    <p className="text-sm text-primary-400">{referral.referred.email}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs ${
                    referral.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                    referral.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {referral.status}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary-400">Progress:</span>
                    <div className="flex items-center gap-4">
                      <span className={referral.completedActions.signedUp ? 'text-green-500' : 'text-gray-500'}>
                        Signed Up
                      </span>
                      <span className={referral.completedActions.firstPayment ? 'text-green-500' : 'text-gray-500'}>
                        First Payment
                      </span>
                      <span className={referral.completedActions.firstCheckIn ? 'text-green-500' : 'text-gray-500'}>
                        First Check-in
                      </span>
                    </div>
                  </div>

                  {referral.rewards.referrerReward > 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-500">
                      <Sparkles className="w-4 h-4" />
                      <span>Earned: {referral.rewards.referrerReward} points</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

