'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { Gift, TrendingUp, Clock, DollarSign, MapPin, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Stats {
  totalRevenue: number
  totalRedemptions: number
  activePromos: number
  pendingPayouts: number
}

interface Checkin {
  _id: string
  user?: { firstName?: string; lastName?: string }
  amount?: number
  createdAt?: string
  note?: string
}

export default function DashboardHome() {
  const { venue, token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async (silent = false) => {
    if (!token || !venue?.id) return
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const [statsRes, checkinsRes] = await Promise.allSettled([
        axios.get(`${getApiUrl()}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${getApiUrl()}/checkins?venueId=${venue.id}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data
        setStats({
          totalRevenue:     d.totalRevenue     ?? d.stats?.totalRevenue     ?? 0,
          totalRedemptions: d.totalRedemptions ?? d.stats?.totalRedemptions ?? 0,
          activePromos:     d.activePromos     ?? d.stats?.activePromos     ?? 0,
          pendingPayouts:   d.pendingPayouts   ?? d.stats?.pendingPayouts   ?? 0,
        })
      }
      if (checkinsRes.status === 'fulfilled') {
        setRecent((checkinsRes.value.data.checkins || checkinsRes.value.data || []).slice(0, 5))
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, venue?.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const balance = venue?.wallet?.balance ?? 0

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-5" style={{ background: '#0F0F1E' }}>
      {/* Header */}
      <div className="flex items-center justify-between pt-6 pb-4">
        <div>
          <p className="text-xs text-white/40">Welcome back</p>
          <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {venue?.name || 'Your Venue'}
          </h1>
          {venue?.city && (
            <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {venue.city}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchAll(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 text-white/40 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Balance hero */}
      <div className="rounded-3xl p-5 mb-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #252540, #2A2A48)' }}>
        <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: '#C8F135', transform: 'translate(20%,-20%)' }} />
        <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1">Available Balance</p>
        <p className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
          ${balance.toFixed(2)}
        </p>
        {stats && stats.pendingPayouts > 0 && (
          <p className="text-xs text-white/40">${stats.pendingPayouts.toFixed(2)} pending</p>
        )}
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: '#1C1C32' }} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={<Gift className="w-4 h-4" />} color="#C8F135" label="Total Redemptions" value={stats.totalRedemptions.toString()} />
          <StatCard icon={<DollarSign className="w-4 h-4" />} color="#00D4FF" label="Total Earned" value={`$${stats.totalRevenue.toFixed(2)}`} />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} color="#FF9A57" label="Active Offers" value={stats.activePromos.toString()} />
          <StatCard icon={<Clock className="w-4 h-4" />} color="#FF5F57" label="Pending Payout" value={`$${stats.pendingPayouts.toFixed(2)}`} />
        </div>
      ) : null}

      {/* Recent redemptions */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">Recent Redemptions</h2>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="rounded-2xl h-14 animate-pulse" style={{ background: '#1C1C32' }} />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="fv-card py-10 text-center">
            <p className="text-2xl mb-2">🫧</p>
            <p className="text-white/40 text-sm">No redemptions yet</p>
            <p className="text-white/25 text-xs mt-1">Gifts redeemed at your venue will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map(c => {
              const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'A customer'
              const ago = c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''
              return (
                <div key={c._id} className="fv-card px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(200,241,53,0.12)', color: '#C8F135' }}>
                    {(c.user?.firstName?.[0] || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                    {ago && <p className="text-xs text-white/30">{ago}</p>}
                  </div>
                  {c.amount != null && (
                    <p className="font-black text-base flex-shrink-0" style={{ color: '#C8F135' }}>
                      +${c.amount.toFixed(2)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="fv-card p-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 flex-shrink-0" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-xs text-white/35 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
