'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, Gift, Sparkles, Clock, MapPin, Bell, Zap, Check } from 'lucide-react'

interface Reward {
  _id: string; name: string; description: string; type: string; pointsCost: number
  value: number; category: string; venue?: { _id: string; name: string }; image?: string
  available: boolean; canAfford: boolean; userRedemptions: number
}

interface Redemption {
  id: string; reward: Reward; code?: string; status: string; expiresAt?: string; usedAtVenue?: { name: string }
}

interface RewardsScreenProps {
  onClose: () => void
}

export default function RewardsScreen({ onClose }: RewardsScreenProps) {
  const { token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [myRewards, setMyRewards] = useState<Redemption[]>([])
  const [userPoints, setUserPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'catalog' | 'mine'>('catalog')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const fetchAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [catalogRes, mineRes] = await Promise.allSettled([
        axios.get(`${API_URL}/rewards`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/rewards/my-rewards`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (catalogRes.status === 'fulfilled') {
        setRewards(catalogRes.value.data.rewards || [])
        setUserPoints(catalogRes.value.data.userPoints || 0)
      }
      if (mineRes.status === 'fulfilled') {
        setMyRewards(mineRes.value.data.redemptions || [])
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId)
    try {
      await axios.post(`${API_URL}/rewards/redeem`, { rewardId }, { headers: { Authorization: `Bearer ${token}` } })
      showToast('Reward redeemed!')
      fetchAll()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Could not redeem')
    } finally {
      setRedeeming(null)
    }
  }

  const handleRedeemCash = async () => {
    setRedeeming('cash')
    try {
      const res = await axios.post(`${API_URL}/rewards/redeem-cash`, { pointsToRedeem: 100 }, { headers: { Authorization: `Bearer ${token}` } })
      showToast(`$${res.data.redemption?.cashAmount?.toFixed(2) || '5.00'} added to your Revig wallet!`)
      fetchAll()
      updateUser({})
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Could not redeem')
    } finally {
      setRedeeming(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl text-sm font-semibold shadow-2xl" style={{ background: '#C8F135', color: '#1A1A2E' }}>
          {toast}
        </div>
      )}

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0F0F1E' }}>
        <div className="max-w-2xl mx-auto w-full flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1A1A2E' }}>
          <div>
            <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Rewards</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#C8F135' }} />
              <span className="text-sm font-bold" style={{ color: '#C8F135' }}>{userPoints} pts</span>
              <span className="text-xs text-white/35">· 100 pts = $5</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Cash redemption banner */}
        {userPoints >= 100 && (
          <div className="mx-4 mt-4 p-4 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.25)' }}>
            <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: '#C8F135' }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: '#C8F135' }}>Redeem 100 pts for $5 cash</p>
              <p className="text-xs text-white/40">Added directly to your Revig wallet</p>
            </div>
            <button
              onClick={handleRedeemCash}
              disabled={redeeming === 'cash'}
              className="revig-btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {redeeming === 'cash' ? '...' : 'Redeem'}
            </button>
          </div>
        )}

        {/* Earn points banner */}
        <div className="mx-4 mt-3 p-3 rounded-2xl flex items-start gap-2" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
          <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#00D4FF' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Earn <span className="font-bold text-white">2 pts</span> per Revig sent ·&nbsp;
            <span className="font-bold text-white">1 pt</span> per check-in ·&nbsp;
            <span className="font-bold text-white">1 pt</span> per Tap & Pay
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 mt-4 mb-2 flex-shrink-0">
          {(['catalog', 'mine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
              style={activeTab === t
                ? { background: '#C8F135', color: '#1A1A2E' }
                : { background: '#252540', color: 'rgba(255,255,255,0.5)' }
              }
            >
              {t === 'catalog' ? 'Catalog' : 'My Rewards'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {loading ? (
            <div className="flex flex-col gap-3 pt-4">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#1C1C32' }} />)}
            </div>
          ) : activeTab === 'catalog' ? (
            rewards.length === 0 ? (
              <div className="py-16 text-center">
                <Gift className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/40 text-sm">No rewards available yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-3">
                {rewards.map(r => (
                  <div key={r._id} className="revig-card p-4" style={{ opacity: r.available && r.canAfford ? 1 : 0.55 }}>
                    {r.image && <img src={r.image} alt={r.name} className="w-full h-28 object-cover rounded-xl mb-3" />}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">{r.name}</p>
                        <p className="text-xs text-white/45 mt-0.5">{r.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="flex items-center gap-1" style={{ color: '#C8F135' }}>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="font-bold text-sm">{r.pointsCost}</span>
                        </div>
                        {r.value > 0 && <p className="text-xs text-white/30 mt-0.5">${r.value.toFixed(2)}</p>}
                      </div>
                    </div>
                    {r.venue && (
                      <p className="text-xs text-white/30 flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" /> {r.venue.name}
                      </p>
                    )}
                    <button
                      onClick={() => handleRedeem(r._id)}
                      disabled={!r.available || !r.canAfford || redeeming === r._id}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                      style={r.available && r.canAfford ? { background: '#C8F135', color: '#1A1A2E' } : { background: '#252540', color: 'rgba(255,255,255,0.4)' }}
                    >
                      {redeeming === r._id ? '...' : !r.canAfford ? `Need ${r.pointsCost - userPoints} more pts` : 'Redeem'}
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            myRewards.length === 0 ? (
              <div className="py-16 text-center">
                <Gift className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/40 text-sm">No rewards redeemed yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-3">
                {myRewards.map(redemption => (
                  <div key={redemption.id} className="revig-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">{redemption.reward.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{redemption.reward.description}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-xl font-semibold" style={{
                        background: redemption.status === 'active' ? 'rgba(200,241,53,0.15)' : redemption.status === 'used' ? 'rgba(0,212,255,0.15)' : 'rgba(255,95,87,0.15)',
                        color: redemption.status === 'active' ? '#C8F135' : redemption.status === 'used' ? '#00D4FF' : '#FF5F57',
                      }}>
                        {redemption.status}
                      </span>
                    </div>
                    {redemption.code && (
                      <div className="px-3 py-2 rounded-xl mt-2" style={{ background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.2)' }}>
                        <p className="text-xs text-white/40 mb-0.5">Code</p>
                        <p className="font-mono font-black text-lg" style={{ color: '#C8F135' }}>{redemption.code}</p>
                      </div>
                    )}
                    {redemption.expiresAt && redemption.status === 'active' && (
                      <p className="text-xs text-white/25 flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(redemption.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        </div>
      </div>
    </>
  )
}
