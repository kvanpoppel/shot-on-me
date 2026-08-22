'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles,
  Flame,
  Trophy,
  Star,
  X,
  TrendingUp
} from 'lucide-react'
import SpinnerS from './SpinnerS'

interface CheckInSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  checkInData: {
    pointsEarned: number
    totalPoints: number
    streak?: number
    reward?: string
    venueName?: string
    tier?: string
    checkInCount?: number
  } | null
}

export default function CheckInSuccessModal({ 
  isOpen, 
  onClose, 
  checkInData 
}: CheckInSuccessModalProps) {
  const [showAnimation, setShowAnimation] = useState(false)
  const [pointsVisible, setPointsVisible] = useState(false)
  const [streakVisible, setStreakVisible] = useState(false)

  const shareCheckin = async () => {
    const shareToSocial = (() => { try { return localStorage.getItem('som_share_to_social') === 'true' } catch { return false } })()
    const params = new URLSearchParams({
      venue: checkInData?.venueName || 'tonight',
      name: 'I',
    })
    try {
      const res = await fetch(`/api/og/checkin?${params}`)
      const blob = await res.blob()
      const file = new File([blob], 'shot-on-me-checkin.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Shot On Me', text: `I'm out tonight at ${checkInData?.venueName || 'a great spot'} 🥃 shotonme.com` })
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url; a.download = 'shot-on-me-checkin.png'; a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* cancelled */ }
  }

  useEffect(() => {
    if (isOpen && checkInData) {
      setShowAnimation(true)
      // Animate points after a short delay
      setTimeout(() => setPointsVisible(true), 300)
      // Animate streak if present
      if (checkInData.streak) {
        setTimeout(() => setStreakVisible(true), 600)
      }
    } else {
      // Reset animations when closing
      setShowAnimation(false)
      setPointsVisible(false)
      setStreakVisible(false)
    }
  }, [isOpen, checkInData])

  if (!isOpen || !checkInData) return null

  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'vip':
        return 'text-purple-400'
      case 'platinum':
        return 'text-blue-400'
      case 'gold':
        return 'text-yellow-400'
      case 'silver':
        return 'text-gray-300'
      default:
        return 'text-primary-500'
    }
  }

  const getTierIcon = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'vip':
      case 'platinum':
      case 'gold':
        return <Trophy className="w-6 h-6" />
      default:
        return <Star className="w-6 h-6" />
    }
  }

  return (
    <div className="fixed inset-0 glass-modal z-50 flex items-center justify-center p-4">
      <div
        className={`glass rounded-2xl p-8 max-w-md w-full transform transition-all duration-500 ${
          showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ borderColor: 'rgba(184,148,90,0.25)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-primary-400 hover:text-primary-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon — branded coin drop */}
        <div className="flex justify-center mb-6">
          <SpinnerS size={64} animation="land" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-primary-500 mb-2">
          Check-in Successful! 🎉
        </h2>
        {checkInData.venueName && (
          <p className="text-center text-primary-400 text-sm mb-6">
            {checkInData.venueName}
          </p>
        )}

        {/* Points Earned */}
        <div 
          className={`bg-primary-500/10 border border-primary-500/30 rounded-xl p-6 mb-4 transform transition-all duration-500 ${
            pointsVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <span className="text-primary-400 font-medium">Points Earned</span>
            </div>
            <span className="text-3xl font-bold text-primary-500">
              +{checkInData.pointsEarned}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-primary-500/20">
            <span className="text-primary-400 text-sm">Total Points</span>
            <span className="text-xl font-semibold text-primary-500">
              {checkInData.totalPoints.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Streak */}
        {checkInData.streak && checkInData.streak > 1 && (
          <div 
            className={`bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4 transform transition-all duration-500 ${
              streakVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-orange-400 font-medium">Check-in Streak</span>
              </div>
              <span className="text-2xl font-bold text-orange-500">
                {checkInData.streak} 🔥
              </span>
            </div>
            {checkInData.reward && (
              <p className="text-orange-300 text-sm mt-2 text-center">
                {checkInData.reward}
              </p>
            )}
          </div>
        )}

        {/* Loyalty Tier */}
        {checkInData.tier && checkInData.tier !== 'bronze' && (
          <div className={`bg-black/40 border border-primary-500/20 rounded-xl p-4 mb-4 ${getTierColor(checkInData.tier)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTierIcon(checkInData.tier)}
                <span className="font-medium capitalize">Loyalty Tier</span>
              </div>
              <span className="text-xl font-bold capitalize">
                {checkInData.tier}
              </span>
            </div>
            {checkInData.checkInCount && (
              <div className="mt-2 pt-2 border-t border-primary-500/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary-400">Check-ins at this venue</span>
                  <span className="font-semibold">{checkInData.checkInCount}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 bg-black/40 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary-500 h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${Math.min((checkInData.checkInCount / 20) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-primary-400 mt-1">
                  <span>Bronze</span>
                  <span>Silver</span>
                  <span>Gold</span>
                  <span>Platinum</span>
                  <span>VIP</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Reward Message */}
        {checkInData.reward && !checkInData.streak && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-500" />
              <p className="text-green-400 text-sm font-medium">
                {checkInData.reward}
              </p>
            </div>
          </div>
        )}

        {/* Share + Close */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={shareCheckin}
            className="flex-1 border border-primary-500/30 text-primary-400 py-3 rounded-xl font-semibold hover:bg-primary-500/10 transition-colors text-sm"
          >
            Share 📲
          </button>
          <button
            onClick={onClose}
            className="flex-[2] bg-primary-500 text-black py-3 rounded-xl font-semibold hover:bg-primary-400 transition-colors"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  )
}


