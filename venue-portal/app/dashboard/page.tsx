'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../components/ToastContainer'
import DashboardLayout from '../components/DashboardLayout'
import AIAnalyticsSummary from '../components/AIAnalyticsSummary'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import {
  Sparkles, Users, TrendingUp, Crown, ArrowRight,
  Zap, X, CheckCircle2, Bell, Send, Clock, Megaphone, Lock,
  Eye, ShoppingCart, Flame, AlertCircle, Plus, ChevronRight
} from 'lucide-react'

interface Promotion {
  _id: string
  title: string
  type: string
  isActive?: boolean
  startTime: string
  endTime: string
  isFlashDeal?: boolean
  flashDealEndsAt?: string
}

interface PromoStats {
  views: number
  redemptions: number
  revenue: number
  clicks: number
}

interface BusyTimesData {
  busiestSlots?: { day: string; hour: number; label?: string }[]
  suggestions?: string[]
}

function timeRemaining(end: string): string {
  const diff = new Date(end).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function isRunningNow(promo: Promotion): boolean {
  const now = Date.now()
  const start = new Date(promo.startTime).getTime()
  const end = promo.isFlashDeal && promo.flashDealEndsAt
    ? new Date(promo.flashDealEndsAt).getTime()
    : new Date(promo.endTime).getTime()
  return !!promo.isActive && now >= start && now < end
}

const TYPE_LABELS: Record<string, string> = {
  happy_hour: 'Happy Hour',
  flash_deal: 'Flash Deal',
  weekend_special: 'Weekend',
  vip_exclusive: 'VIP',
  happy_hour_special: 'Happy Hour',
  discount: 'Discount',
  free_item: 'Free Item',
}

const TYPE_COLORS: Record<string, string> = {
  happy_hour: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  flash_deal: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  weekend_special: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  vip_exclusive: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  happy_hour_special: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  discount: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  free_item: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { venueId, venueName, tier, followerCount } = useVenue()
  const { socket } = useSocket()
  const { showError } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({ totalRevenue: '0.00', totalRedemptions: 0, activePromos: 0, pendingPayouts: '0.00' })
  const [loadingStats, setLoadingStats] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promoStats, setPromoStats] = useState<Record<string, PromoStats>>({})
  const [loadingPromos, setLoadingPromos] = useState(true)
  const [busyTimes, setBusyTimes] = useState<BusyTimesData | null>(null)
  const [endingPromo, setEndingPromo] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null)

  // Notify guests
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)
  const [notifySent, setNotifySent] = useState(false)

  // Tick every minute so time-remaining updates
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) { fetchStats(); }
  }, [token, user])

  useEffect(() => {
    if (venueId && token) { fetchPromotions(); fetchBusyTimes(); }
  }, [venueId, token])

  // Real-time: refresh promotions on socket events
  useEffect(() => {
    if (!socket || !venueId) return
    const refresh = (data: any) => { if (data.venueId === venueId) fetchPromotions() }
    socket.on('promotion-updated', refresh)
    socket.on('new-promotion', refresh)
    socket.on('promotion-deleted', refresh)
    return () => {
      socket.off('promotion-updated', refresh)
      socket.off('new-promotion', refresh)
      socket.off('promotion-deleted', refresh)
    }
  }, [socket, venueId])

  const fetchStats = async () => {
    if (!token) return
    setLoadingStats(true)
    try {
      const res = await axios.get(`${getApiUrl()}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } })
      setStats({
        totalRevenue: `$${res.data.totalRevenue || '0.00'}`,
        totalRedemptions: res.data.totalRedemptions || 0,
        activePromos: res.data.activePromos || 0,
        pendingPayouts: `$${res.data.pendingPayouts || '0.00'}`
      })
    } catch { } finally { setLoadingStats(false) }
  }

  const fetchPromotions = useCallback(async () => {
    if (!venueId || !token) return
    setLoadingPromos(true)
    try {
      const res = await axios.get(`${getApiUrl()}/venues/${venueId}`, { headers: { Authorization: `Bearer ${token}` } })
      const all: Promotion[] = res.data.venue?.promotions || []
      setPromotions(all)

      // Fetch analytics for active promos in parallel (cap at 5)
      const active = all.filter(isRunningNow).slice(0, 5)
      if (active.length > 0) {
        const results = await Promise.allSettled(
          active.map(p =>
            axios.get(`${getApiUrl()}/venues/${venueId}/promotions/${p._id}/analytics`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          )
        )
        const statsMap: Record<string, PromoStats> = {}
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            const m = r.value.data.analytics || r.value.data.metrics || {}
            statsMap[active[i]._id] = {
              views: m.views || 0,
              redemptions: m.redemptions || 0,
              revenue: m.revenue || 0,
              clicks: m.clicks || 0,
            }
          } else {
            statsMap[active[i]._id] = { views: 0, redemptions: 0, revenue: 0, clicks: 0 }
          }
        })
        setPromoStats(statsMap)
      }
    } catch { } finally { setLoadingPromos(false) }
  }, [venueId, token])

  const fetchBusyTimes = async () => {
    if (!venueId || !token) return
    try {
      const res = await axios.get(`${getApiUrl()}/busy-times/${venueId}`, { headers: { Authorization: `Bearer ${token}` } })
      setBusyTimes(res.data || null)
    } catch { setBusyTimes(null) }
  }

  const handleEndPromo = async (promoId: string) => {
    if (confirmEnd !== promoId) { setConfirmEnd(promoId); return }
    setConfirmEnd(null)
    setEndingPromo(promoId)
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/promotions/${promoId}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchPromotions()
      fetchStats()
    } catch (e: any) {
      showError(e.response?.data?.error || 'Failed to end promotion')
    } finally { setEndingPromo(null) }
  }

  const sendNotification = async () => {
    if (!token || !venueId || !notifyTitle.trim()) return
    setSendingNotify(true)
    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/notify`,
        { title: notifyTitle.trim(), message: notifyMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNotifySent(true)
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to send notification')
    } finally { setSendingNotify(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  )
  if (!user) return null

  const isFreeTier = tier === 'free'
  const hourNow = new Date().getHours()
  const greeting = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening'

  const activeDeals = promotions.filter(isRunningNow)
  const upcomingDeals = promotions.filter(p => {
    const now = Date.now()
    return !!p.isActive && new Date(p.startTime).getTime() > now
  }).slice(0, 2)

  const DEAL_TYPES = [
    { key: 'happy-hour' as const, label: 'Happy Hour',      emoji: '🍻', desc: 'Boost weekday traffic',  color: 'from-amber-500 to-orange-500' },
    { key: 'flash-deal' as const, label: 'Flash Deal',      emoji: '⚡', desc: 'Create urgency now',     color: 'from-rose-500 to-pink-500' },
    { key: 'weekend'    as const, label: 'Weekend Special', emoji: '🎉', desc: 'Pack your Fri–Sun',      color: 'from-violet-500 to-fuchsia-500' },
    { key: 'vip'        as const, label: 'VIP Exclusive',   emoji: '👑', desc: 'Reward your regulars',   color: 'from-cyan-500 to-sky-500' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-10">

        {/* ── 1. Plan Banner ── */}
        {isFreeTier ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-500/40 bg-gradient-to-r from-primary-500/10 to-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Crown className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-400">Free Plan</p>
                <p className="text-[10px] text-primary-400/50 truncate">Upgrade to unlock AI, analytics &amp; automation — $79/mo</p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/settings')}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-3 py-2 text-xs font-bold text-black hover:opacity-90 transition-all">
              <Crown className="w-3 h-3" /> Upgrade
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-xs font-bold text-emerald-300 capitalize">{tier} Plan · AI &amp; automation unlocked</p>
            </div>
            <button onClick={() => router.push('/dashboard/settings')} className="text-[11px] text-emerald-400/50 hover:text-emerald-400 transition-colors">Manage</button>
          </div>
        )}

        {/* ── 2. Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{greeting}</h1>
            <p className="text-[11px] text-primary-400/40 mt-0.5">{venueName} · live on Shot On Me</p>
          </div>
          <button onClick={() => router.push('/dashboard/promotions?action=new')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/20">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Deal</span>
            <span className="sm:hidden">Deal</span>
          </button>
        </div>

        {/* ── 3. KPIs ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Active Deals', value: loadingStats ? '—' : `${stats.activePromos}`,     color: 'text-primary-400', icon: Sparkles },
            { label: 'Shots Sent',   value: loadingStats ? '—' : `${stats.totalRedemptions}`, color: 'text-emerald-400', icon: TrendingUp },
            { label: 'Revenue',      value: loadingStats ? '—' : stats.totalRevenue,           color: 'text-amber-400',   icon: Zap },
            { label: 'Followers',    value: loadingStats ? '—' : `${followerCount}`,           color: 'text-cyan-400',    icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-black/40 p-3 text-center">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[9px] text-primary-400/40 mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* ── 4. ACTIVE DEALS — hero section ── */}
        <div className="rounded-xl border border-primary-500/25 bg-black/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-bold text-white">Live Deals</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/20">
                {activeDeals.length} running
              </span>
            </div>
            <button onClick={() => router.push('/dashboard/promotions')}
              className="inline-flex items-center gap-1 text-xs text-primary-400/50 hover:text-primary-400 transition-colors">
              All deals <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loadingPromos ? (
            <div className="p-6 space-y-3">
              {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse" />)}
            </div>
          ) : activeDeals.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/15 flex items-center justify-center mx-auto mb-3">
                <Flame className="w-6 h-6 text-primary-500/40" />
              </div>
              <p className="text-sm font-semibold text-primary-400/60">No deals running right now</p>
              <p className="text-xs text-primary-400/30 mt-1 mb-4">Launch one to start driving traffic tonight.</p>
              <button onClick={() => router.push('/dashboard/promotions?action=new')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-primary-400 transition-all">
                <Plus className="w-4 h-4" /> Launch a Deal
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {activeDeals.map(promo => {
                const s = promoStats[promo._id] || { views: 0, redemptions: 0, revenue: 0, clicks: 0 }
                const endTime = promo.isFlashDeal && promo.flashDealEndsAt ? promo.flashDealEndsAt : promo.endTime
                const timeLeft = timeRemaining(endTime)
                const isEnding = new Date(endTime).getTime() - Date.now() < 3600000
                const typeLabel = TYPE_LABELS[promo.type] || promo.type
                const typeBadge = TYPE_COLORS[promo.type] || 'bg-primary-500/15 text-primary-400 border-primary-500/20'
                const isConfirming = confirmEnd === promo._id
                const isEnding2 = endingPromo === promo._id

                return (
                  <div key={promo._id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      {/* Left: name + badge + time */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadge}`}>{typeLabel}</span>
                          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${isEnding ? 'text-rose-400' : 'text-primary-400/50'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {timeLeft}
                          </span>
                          {isEnding && <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />}
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{promo.title}</p>

                        {/* Real-time stats */}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-primary-400/40" />
                            <span className="text-xs font-bold text-primary-400">{s.views}</span>
                            <span className="text-[10px] text-primary-400/40">views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3 text-emerald-400/60" />
                            <span className="text-xs font-bold text-emerald-400">{s.redemptions}</span>
                            <span className="text-[10px] text-primary-400/40">redeemed</span>
                          </div>
                          {s.revenue > 0 && (
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400/60" />
                              <span className="text-xs font-bold text-amber-400">${s.revenue.toFixed(0)}</span>
                              <span className="text-[10px] text-primary-400/40">revenue</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => router.push('/dashboard/promotions')}
                          className="rounded-lg border border-primary-500/20 bg-black/40 px-2.5 py-1.5 text-[11px] font-semibold text-primary-400 hover:border-primary-500/40 transition-all"
                        >
                          Details
                        </button>
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setConfirmEnd(null)}
                              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-primary-400/60 hover:text-primary-400 transition-all">
                              Cancel
                            </button>
                            <button onClick={() => handleEndPromo(promo._id)} disabled={isEnding2}
                              className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-400 disabled:opacity-50 transition-all">
                              {isEnding2 ? '...' : 'Confirm End'}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEndPromo(promo._id)}
                            className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/15 transition-all">
                            End
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar: time elapsed */}
                    {(() => {
                      const start = new Date(promo.startTime).getTime()
                      const end = new Date(endTime).getTime()
                      const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
                      return (
                        <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isEnding ? 'bg-rose-400' : 'bg-primary-500'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}

          {/* Upcoming deals */}
          {upcomingDeals.length > 0 && (
            <div className="border-t border-white/5 px-4 py-3">
              <p className="text-[10px] text-primary-400/40 uppercase tracking-wide mb-2">Scheduled Next</p>
              <div className="space-y-1.5">
                {upcomingDeals.map(p => (
                  <div key={p._id} className="flex items-center justify-between">
                    <p className="text-xs text-primary-400/60 truncate">{p.title}</p>
                    <p className="text-[10px] text-primary-400/40 flex-shrink-0 ml-2">
                      starts {new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 5. Quick Launch ── */}
        <div className="rounded-xl border border-primary-500/15 bg-black/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">Quick Launch</p>
            <p className="text-[11px] text-primary-400/35">AI writes it — one tap, instantly live</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DEAL_TYPES.map(({ key, label, emoji, color }) => (
              <button key={key}
                onClick={() => router.push(`/dashboard/promotions?action=${key}`)}
                className={`rounded-xl bg-gradient-to-br ${color} p-3 text-left text-black hover:opacity-90 transition-all active:scale-95`}>
                <p className="text-lg mb-1">{emoji}</p>
                <p className="text-[11px] font-bold leading-tight">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── 6. AI + Busy Times ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* AI Recommendations — 3 cols */}
          <div className="md:col-span-3 rounded-xl border border-primary-500/20 bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <p className="text-sm font-bold text-white">AI Recommendations</p>
              {!isFreeTier && <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Live</span>}
            </div>
            {isFreeTier ? (
              <div className="relative rounded-xl overflow-hidden">
                <div className="blur-sm pointer-events-none select-none space-y-2.5 p-1">
                  {['Schedule a happy hour push for Thursday 9pm — your busiest slot',
                    'Flash deal at 10pm Friday could lift redemptions by 40%',
                    'VIP offer to your top regulars is overdue'].map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg border border-primary-500/10">
                      <TrendingUp className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-primary-400/70">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[2px] rounded-xl">
                  <Lock className="w-5 h-5 text-primary-500 mb-2" />
                  <p className="text-sm font-bold text-white mb-1">Unlock AI Insights</p>
                  <p className="text-xs text-primary-400/50 text-center mb-4 px-6">Personalized deal recommendations based on your real traffic.</p>
                  <button onClick={() => router.push('/dashboard/settings')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-5 py-2 text-xs font-bold text-black hover:opacity-90 transition-all">
                    <Crown className="w-3.5 h-3.5" /> Upgrade — $79/mo
                  </button>
                </div>
              </div>
            ) : (
              <AIAnalyticsSummary />
            )}
          </div>

          {/* Busy Times — 2 cols */}
          <div className="md:col-span-2 rounded-xl border border-primary-500/15 bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary-500" />
              <p className="text-sm font-bold text-white">Busy Times</p>
            </div>
            {!busyTimes || (!busyTimes.busiestSlots?.length && !busyTimes.suggestions?.length) ? (
              <p className="text-xs text-primary-400/30 text-center py-6">No data yet — check back after your first busy night.</p>
            ) : (
              <div className="space-y-2">
                {busyTimes.busiestSlots?.slice(0, 4).map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-amber-400' : 'bg-primary-500/40'}`} />
                    <p className="text-xs text-primary-400/70">{slot.label || `${slot.day} ${slot.hour}:00`}</p>
                  </div>
                ))}
                {busyTimes.suggestions?.slice(0, 2).map((s: any, i) => (
                  <div key={i} className="mt-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15 px-3 py-2">
                    <p className="text-[11px] text-cyan-300/80">{typeof s === 'string' ? s : s.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 7. Notify Guests ── */}
        <div className="rounded-xl border border-primary-500/15 bg-black/40 p-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-4 h-4 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Notify Your Guests</p>
              <p className="text-[10px] text-primary-400/35">Push to all {followerCount > 0 ? `${followerCount} ` : ''}followers instantly</p>
            </div>
          </div>

          {notifySent ? (
            <div className="flex flex-col items-center py-5 gap-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-bold text-white">Sent!</p>
              <p className="text-xs text-primary-400/40">Guests will see it in the app.</p>
              <button onClick={() => { setNotifySent(false); setNotifyTitle(''); setNotifyMessage('') }}
                className="mt-2 text-xs text-primary-400/50 hover:text-primary-400 transition-colors">Send another</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <input type="text" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                placeholder="Subject — e.g. Happy Hour starts NOW 🍻" maxLength={60}
                className="w-full rounded-xl border border-primary-500/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/40 focus:outline-none transition-colors" />
              <textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)}
                placeholder="Optional message to your guests..." maxLength={160} rows={2}
                className="w-full rounded-xl border border-primary-500/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/40 focus:outline-none transition-colors resize-none" />
              <button onClick={sendNotification} disabled={sendingNotify || !notifyTitle.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-bold text-black hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {sendingNotify
                  ? <><div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" /> Sending...</>
                  : <><Send className="w-4 h-4" /> Send to Guests</>}
              </button>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
