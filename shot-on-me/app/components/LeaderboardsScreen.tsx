'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Trophy, Medal, Award, TrendingUp, Users, Zap } from 'lucide-react'

interface LeaderboardEntry {
  _id?: string
  name: string
  profilePicture?: string
  totalSent?: number
  totalCheckIns?: number
  friendsCount?: number
  points?: number
  checkInStreak?: {
    longest: number
  }
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  userRank: number | null
  type: string
}

export default function LeaderboardsScreen() {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [leaderboardType, setLeaderboardType] = useState<string>('generous')
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const leaderboardTypes = [
    { id: 'generous', label: 'Most Generous', icon: Medal, description: 'Most money sent' },
    { id: 'active', label: 'Most Active', icon: TrendingUp, description: 'Most check-ins' },
    { id: 'social', label: 'Most Social', icon: Users, description: 'Most friends' },
    { id: 'points', label: 'Top Points', icon: Trophy, description: 'Most points earned' },
    { id: 'streak', label: 'Longest Streak', icon: Zap, description: 'Best check-in streak' }
  ]

  useEffect(() => {
    if (token) {
      fetchLeaderboard()
    }
  }, [token, leaderboardType])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await axios.get(
        `${API_URL}/gamification/leaderboards?type=${leaderboardType}&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getValue = (entry: LeaderboardEntry) => {
    switch (leaderboardType) {
      case 'generous':
        return `$${entry.totalSent?.toFixed(2) || '0.00'}`
      case 'active':
        return `${entry.totalCheckIns || 0} check-ins`
      case 'social':
        return `${entry.friendsCount || 0} friends`
      case 'points':
        return `${entry.points || 0} pts`
      case 'streak':
        return `${entry.checkInStreak?.longest || 0} days`
      default:
        return ''
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
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
        <h1 className="text-2xl font-bold text-primary-500 mb-4">Leaderboards</h1>

        {/* Type Selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {leaderboardTypes.map(type => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setLeaderboardType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  leaderboardType === type.id
                    ? 'bg-primary-500 text-black'
                    : 'bg-black/40 text-primary-400 border border-primary-500/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* User Rank */}
      {data?.userRank && (
        <div className="p-4 bg-primary-500/10 border-b border-primary-500/20">
          <div className="flex items-center justify-between">
            <span className="text-primary-400">Your Rank</span>
            <span className="text-2xl font-bold text-primary-500">
              #{data.userRank}
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="p-4 space-y-3">
        {data?.leaderboard.map((entry, index) => {
          const rank = index + 1
          const userName = user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : undefined)
          const isCurrentUser = entry._id === user?.id || entry.name === userName

          return (
            <div
              key={entry._id || index}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                isCurrentUser
                  ? 'bg-primary-500/20 border-primary-500/50'
                  : 'bg-black/40 border-primary-500/10'
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-12 text-center">
                <span className="text-2xl">{getRankIcon(rank)}</span>
              </div>

              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden">
                  {entry.profilePicture ? (
                    <img
                      src={entry.profilePicture}
                      alt={entry.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-500 font-semibold">
                      {entry.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Name and Value */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isCurrentUser ? 'text-primary-500' : 'text-white'}`}>
                  {entry.name}
                  {isCurrentUser && ' (You)'}
                </p>
                <p className="text-sm text-primary-400">{getValue(entry)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {data?.leaderboard.length === 0 && (
        <div className="text-center py-12 text-primary-400">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No data available yet</p>
        </div>
      )}
    </div>
  )
}

