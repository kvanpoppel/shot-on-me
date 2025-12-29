'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Gift, Sparkles, CheckCircle, Clock, MapPin } from 'lucide-react'

interface Reward {
  _id: string
  name: string
  description: string
  type: string
  pointsCost: number
  value: number
  category: string
  venue?: {
    _id: string
    name: string
  }
  image?: string
  available: boolean
  canAfford: boolean
  userRedemptions: number
}

interface RewardRedemption {
  id: string
  reward: Reward
  code?: string
  status: string
  expiresAt?: string
  usedAt?: string
  usedAtVenue?: {
    _id: string
    name: string
  }
}

export default function RewardsScreen() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [myRewards, setMyRewards] = useState<RewardRedemption[]>([])
  const [userPoints, setUserPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-rewards'>('catalog')
  const [redeeming, setRedeeming] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchRewards()
      fetchMyRewards()
    }
  }, [token])

  const fetchRewards = async () => {
    try {
      const response = await axios.get(`${API_URL}/rewards`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRewards(response.data.rewards || [])
      setUserPoints(response.data.userPoints || 0)
    } catch (error) {
      console.error('Failed to fetch rewards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyRewards = async () => {
    try {
      const response = await axios.get(`${API_URL}/rewards/my-rewards`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMyRewards(response.data.redemptions || [])
    } catch (error) {
      console.error('Failed to fetch my rewards:', error)
    }
  }

  const handleRedeem = async (rewardId: string) => {
    try {
      setRedeeming(rewardId)
      await axios.post(
        `${API_URL}/rewards/redeem`,
        { rewardId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await fetchRewards()
      await fetchMyRewards()
      alert('Reward redeemed successfully!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to redeem reward')
    } finally {
      setRedeeming(null)
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
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-primary-500/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-primary-500">Rewards</h1>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span className="text-lg font-semibold text-yellow-500">{userPoints}</span>
            <span className="text-sm text-primary-400">pts</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'catalog'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 text-primary-400 border border-primary-500/20'
            }`}
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveTab('my-rewards')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'my-rewards'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 text-primary-400 border border-primary-500/20'
            }`}
          >
            My Rewards
          </button>
        </div>
      </div>

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="p-4 space-y-4">
          {rewards.length === 0 ? (
            <div className="text-center py-12 text-primary-400">
              <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No rewards available yet</p>
            </div>
          ) : (
            rewards.map(reward => (
              <div
                key={reward._id}
                className={`p-4 rounded-lg border ${
                  reward.available && reward.canAfford
                    ? 'bg-black/40 border-primary-500/30'
                    : 'bg-black/20 border-primary-500/10 opacity-60'
                }`}
              >
                {reward.image && (
                  <img
                    src={reward.image}
                    alt={reward.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{reward.name}</h3>
                    <p className="text-sm text-primary-400 mt-1">{reward.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-semibold">{reward.pointsCost}</span>
                    </div>
                    {reward.value > 0 && (
                      <p className="text-xs text-primary-400 mt-1">
                        Value: ${reward.value.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {reward.venue && (
                  <div className="flex items-center gap-1 text-sm text-primary-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>{reward.venue.name}</span>
                  </div>
                )}

                <button
                  onClick={() => handleRedeem(reward._id)}
                  disabled={!reward.available || !reward.canAfford || redeeming === reward._id}
                  className={`w-full py-2 rounded-lg font-medium transition-all ${
                    reward.available && reward.canAfford && redeeming !== reward._id
                      ? 'bg-primary-500 text-black hover:bg-primary-400'
                      : 'bg-black/40 text-primary-400/50 cursor-not-allowed'
                  }`}
                >
                  {redeeming === reward._id
                    ? 'Redeeming...'
                    : !reward.canAfford
                    ? `Need ${reward.pointsCost - userPoints} more pts`
                    : 'Redeem'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Rewards Tab */}
      {activeTab === 'my-rewards' && (
        <div className="p-4 space-y-3">
          {myRewards.length === 0 ? (
            <div className="text-center py-12 text-primary-400">
              <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No rewards redeemed yet</p>
              <p className="text-sm mt-2">Redeem rewards from the catalog!</p>
            </div>
          ) : (
            myRewards.map(redemption => (
              <div
                key={redemption.id}
                className="p-4 bg-black/40 border border-primary-500/10 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{redemption.reward.name}</h3>
                    <p className="text-sm text-primary-400 mt-1">
                      {redemption.reward.description}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    redemption.status === 'active' ? 'bg-green-500/20 text-green-500' :
                    redemption.status === 'used' ? 'bg-blue-500/20 text-blue-500' :
                    redemption.status === 'expired' ? 'bg-red-500/20 text-red-500' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {redemption.status}
                  </div>
                </div>

                {redemption.code && (
                  <div className="mt-3 p-2 bg-black/60 rounded border border-primary-500/20">
                    <p className="text-xs text-primary-400 mb-1">Redemption Code</p>
                    <p className="font-mono text-lg font-bold text-primary-500">
                      {redemption.code}
                    </p>
                  </div>
                )}

                {redemption.expiresAt && redemption.status === 'active' && (
                  <div className="flex items-center gap-1 text-xs text-primary-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      Expires: {new Date(redemption.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {redemption.usedAtVenue && (
                  <div className="flex items-center gap-1 text-xs text-primary-400 mt-2">
                    <MapPin className="w-3 h-3" />
                    <span>Used at {redemption.usedAtVenue.name}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

