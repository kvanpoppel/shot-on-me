'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Trophy, Lock, CheckCircle, Sparkles } from 'lucide-react'

interface Badge {
  _id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: string
  pointsReward: number
  criteria: {
    type: string
    value: number
    description: string
  }
  unlocked?: boolean
  unlockedAt?: string
  progress?: number
  currentValue?: number
}

export default function BadgesScreen() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [stats, setStats] = useState({ unlockedCount: 0, totalCount: 0 })

  useEffect(() => {
    if (token) {
      fetchBadges()
    }
  }, [token])

  const fetchBadges = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/gamification/badges`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBadges(response.data.badges || [])
      setStats({
        unlockedCount: response.data.unlockedCount || 0,
        totalCount: response.data.totalCount || 0
      })
    } catch (error) {
      console.error('Failed to fetch badges:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', 'payment', 'social', 'venue', 'streak', 'milestone']
  const filteredBadges = selectedCategory === 'all' || !selectedCategory
    ? badges
    : badges.filter(b => b.category === selectedCategory)

  const rarityColors: Record<string, string> = {
    common: 'border-gray-500/30 bg-gray-500/10',
    uncommon: 'border-green-500/30 bg-green-500/10',
    rare: 'border-blue-500/30 bg-blue-500/10',
    epic: 'border-purple-500/30 bg-purple-500/10',
    legendary: 'border-yellow-500/30 bg-yellow-500/10'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-primary-500/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-primary-500">Badges & Achievements</h1>
            <p className="text-xs text-primary-400/70 mt-1">Showcase your social accomplishments</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-primary-400">
              {stats.unlockedCount}/{stats.totalCount}
            </span>
          </div>
        </div>
        
        {/* Info Banner */}
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-2.5 mb-4">
          <div className="flex items-start gap-2">
            <Trophy className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-primary-400 font-medium">
                <span className="text-primary-500 font-semibold">Social Achievements</span> - Badges showcase your social networking accomplishments and milestones. 
                Display your achievements to friends and build your social presence. 
                For <span className="text-yellow-500 font-semibold">engagement rewards</span> that enhance venue interaction, check out <span className="text-yellow-500 font-semibold">Rewards</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/40 rounded-full h-2 mb-4">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all"
            style={{ width: `${(stats.unlockedCount / stats.totalCount) * 100}%` }}
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category === 'all' ? null : category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                (selectedCategory === null && category === 'all') || selectedCategory === category
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 text-primary-400 border border-primary-500/20'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {filteredBadges.map(badge => (
          <div
            key={badge._id}
            className={`relative p-4 rounded-lg border-2 ${
              badge.unlocked
                ? 'border-primary-500/50 bg-primary-500/10'
                : `${rarityColors[badge.rarity]} opacity-60`
            }`}
          >
            {/* Unlocked Badge */}
            {badge.unlocked && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            )}

            {/* Lock Icon for Unlocked */}
            {!badge.unlocked && (
              <div className="absolute top-2 right-2">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
            )}

            {/* Badge Icon */}
            <div className="text-4xl mb-2 text-center">{badge.icon}</div>

            {/* Badge Name */}
            <h3 className="font-semibold text-center mb-1 text-sm">{badge.name}</h3>

            {/* Badge Description */}
            <p className="text-xs text-primary-400/70 text-center mb-2">{badge.description}</p>

            {/* Progress Bar for Unlocked Badges */}
            {!badge.unlocked && badge.progress !== undefined && (
              <div className="mt-2">
                <div className="w-full bg-black/40 rounded-full h-1.5">
                  <div
                    className="bg-primary-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${badge.progress}%` }}
                  />
                </div>
                <p className="text-xs text-primary-400/70 text-center mt-1">
                  {badge.currentValue || 0}/{badge.criteria.value}
                </p>
              </div>
            )}

            {/* Points Reward - Note: This is a bonus, not the main reward */}
            {badge.pointsReward > 0 && (
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-yellow-500/80">
                <Sparkles className="w-3 h-3" />
                <span>Bonus: +{badge.pointsReward} reward points</span>
              </div>
            )}

            {/* Rarity Badge */}
            <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-xs ${
              badge.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-500' :
              badge.rarity === 'epic' ? 'bg-purple-500/20 text-purple-500' :
              badge.rarity === 'rare' ? 'bg-blue-500/20 text-blue-500' :
              badge.rarity === 'uncommon' ? 'bg-green-500/20 text-green-500' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {badge.rarity}
            </div>
          </div>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-12 text-primary-400">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No badges in this category</p>
        </div>
      )}
    </div>
  )
}

