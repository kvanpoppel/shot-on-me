'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Share2, Copy, CheckCircle, Users, Gift, Sparkles } from 'lucide-react'

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
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [referralCode, setReferralCode] = useState<string>('')
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completed: 0,
    pending: 0,
    totalEarned: 0
  })
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchReferralData()
    }
  }, [token])

  const fetchReferralData = async () => {
    try {
      setLoading(true)
      const [codeResponse, historyResponse] = await Promise.all([
        axios.get(`${API_URL}/referrals/code`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/referrals/history`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setReferralCode(codeResponse.data.code || '')
      setStats({
        totalReferrals: codeResponse.data.totalReferrals || 0,
        completed: codeResponse.data.completed || 0,
        pending: codeResponse.data.pending || 0,
        totalEarned: codeResponse.data.rewards?.totalEarned || 0
      })
      setReferrals(historyResponse.data.referrals || [])
    } catch (error) {
      console.error('Failed to fetch referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (referralCode) {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareReferral = async () => {
    if (!referralCode) {
      alert('Referral code not available. Please try again.')
      return
    }

    const shareText = `Join me on Shot On Me! Use my referral code: ${referralCode}\n\nSend money to friends, discover venues, and earn rewards!`
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : ''
    const fullShareText = `${shareText}\n\nSign up here: ${shareUrl}`

    // Try Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Shot On Me',
          text: shareText,
          url: shareUrl
        })
        return // Successfully shared
      } catch (error: any) {
        // User cancelled or error occurred - fall through to clipboard
        if (error.name === 'AbortError') {
          return // User cancelled, don't show error
        }
        console.error('Error sharing:', error)
        // Fall through to clipboard fallback
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(fullShareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      
      // Show success message
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
      toast.textContent = 'Referral link copied to clipboard!'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (clipboardError) {
      console.error('Error copying to clipboard:', clipboardError)
      // Last resort: show the text in an alert
      alert(`Share this referral code:\n\n${referralCode}\n\n${shareUrl}`)
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

        {/* Referral Code */}
        <div className="bg-gradient-to-r from-primary-500/20 to-primary-400/20 border border-primary-500/30 rounded-lg p-4">
          <p className="text-sm text-primary-400 mb-2">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/60 rounded-lg p-3 border border-primary-500/20">
              <p className="font-mono text-2xl font-bold text-primary-500 text-center">
                {referralCode}
              </p>
            </div>
            <button
              onClick={copyToClipboard}
              className="p-3 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-all"
            >
              {copied ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={shareReferral}
              className="p-3 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-primary-400/70 mt-2 text-center">
            Share your code and earn rewards when friends join!
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
            <p className="text-sm mt-2">Share your code to start earning!</p>
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

