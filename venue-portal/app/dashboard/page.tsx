'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../components/ToastContainer'
import DashboardLayout from '../components/DashboardLayout'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import {
  Sparkles, Users, TrendingUp, Crown, Send, Clock,
  Megaphone, Eye, Zap, Flame,
  AlertCircle, Plus, ChevronRight, CheckCircle2, Loader2,
  ChevronDown, DollarSign
} from 'lucide-react'

interface Promotion {
  _id: string
  title: string
  offer?: string
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
}

function timeRemaining(end: string) {
  const diff = new Date(end).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m left`
}

function isRunningNow(p: Promotion) {
  const now = Date.now()
  const end = p.isFlashDeal && p.flashDealEndsAt
    ? new Date(p.flashDealEndsAt).getTime()
    : new Date(p.endTime).getTime()
  return !!p.isActive && now >= new Date(p.startTime).getTime() && now < end
}

const TYPE_LABEL: Record<string, string> = {
  'happy-hour': 'Happy Hour', 'flash-deal': 'Flash Deal',
  'special': 'Special', 'exclusive': 'VIP', 'event': 'Event',
  'happy_hour': 'Happy Hour', 'flash_deal': 'Flash Deal',
  'vip_exclusive': 'VIP', 'weekend_special': 'Weekend Special',
}

const TYPE_COLOR: Record<string, string> = {
  'happy-hour': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'happy_hour': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'flash-deal': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'flash_deal': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'special':    'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'exclusive':  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'event':      'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

const QUICK_DEALS = [
  { key: 'happy-hour', label: 'Happy Hour', emoji: '🍻', color: 'from-amber-500 to-orange-500' },
  { key: 'flash-deal', label: 'Flash Deal', emoji: '⚡', color: 'from-rose-500 to-pink-500' },
  { key: 'weekend',    label: 'Weekend',    emoji: '🎉', color: 'from-violet-500 to-fuchsia-500' },
  { key: 'vip',        label: 'VIP',        emoji: '👑', color: 'from-cyan-500 to-sky-500' },
]

function getTimeBanner(hour: number) {
  if (hour >= 15 && hour < 20) return {
    emoji: '🍻',
    heading: hour < 17 ? 'Opening soon — kick off a Happy Hour now.' : 'Happy hour window — guests are here.',
    action: 'happy-hour', label: 'Launch Happy Hour',
    accent: 'border-amber-500/25 bg-amber-500/5',
    btnClass: 'bg-amber-500 hover:bg-amber-400 text-black',
    matchTypes: ['happy-hour', 'happy_hour'],
  }
  if (hour >= 20 && hour < 23) return {
    emoji: '⚡',
    heading: 'Prime time — a flash deal fills seats fast.',
    action: 'flash-deal', label: 'Launch Flash Deal',
    accent: 'border-rose-500/25 bg-rose-500/5',
    btnClass: 'bg-rose-500 hover:bg-rose-400 text-white',
    matchTypes: ['flash-deal', 'flash_deal'],
  }
  if (hour >= 23 || hour < 3) return {
    emoji: '👑',
    heading: 'Late night — VIP exclusives convert best now.',
    action: 'vip', label: 'Launch VIP Deal',
    accent: 'border-cyan-500/25 bg-cyan-500/5',
    btnClass: 'bg-cyan-500 hover:bg-cyan-400 text-black',
    matchTypes: ['exclusive', 'vip_exclusive'],
  }
  return null
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { venueId, venueName, tier, followerCount } = useVenue()
  const { socket } = useSocket()
  const { showError } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({ totalRevenue: '—', totalRedemptions: 0, activePromos: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promoStats, setPromoStats] = useState<Record<string, PromoStats>>({})
  const [loadingPromos, setLoadingPromos] = useState(true)
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null)
  const [endingPromo, setEndingPromo] = useState<string | null>(null)

  // Notify panel state — collapsed by default
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)
  const [notifySent, setNotifySent] = useState(false)

  const [launchingDeal, setLaunchingDeal] = useState<string | null>(null)
  const [launchSuccess, setLaunchSuccess] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
  useEffect(() => { if (token && user) fetchStats() }, [token, user])
  useEffect(() => { if (venueId && token) fetchPromotions() }, [venueId, token])

  useEffect(() => {
    if (!socket || !venueId) return
    const refresh = (d: any) => { if (d.venueId === venueId) { fetchPromotions(); fetchStats() } }
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
      const active = all.filter(isRunningNow).slice(0, 5)
      if (active.length) {
        const results = await Promise.allSettled(
          active.map(p => axios.get(`${getApiUrl()}/venues/${venueId}/promotions/${p._id}/analytics`, { headers: { Authorization: `Bearer ${token}` } }))
        )
        const map: Record<string, PromoStats> = {}
        results.forEach((r, i) => {
          const m = r.status === 'fulfilled' ? (r.value.data.analytics || r.value.data.metrics || {}) : {}
          map[active[i]._id] = { views: m.views || 0, redemptions: m.redemptions || 0, revenue: m.revenue || 0 }
        })
        setPromoStats(map)
      }
    } catch { } finally { setLoadingPromos(false) }
  }, [venueId, token])

  const handleEndPromo = async (id: string) => {
    if (confirmEnd !== id) { setConfirmEnd(id); return }
    setConfirmEnd(null); setEndingPromo(id)
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/promotions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchPromotions(); fetchStats()
    } catch (e: any) { showError(e.response?.data?.error || 'Failed to end deal') }
    finally { setEndingPromo(null) }
  }

  const handleQuickLaunch = async (action: string) => {
    if (!venueId || !token || launchingDeal) return
    setLaunchingDeal(action)
    const now = new Date()
    let promoData: any

    switch (action) {
      case 'happy-hour': {
        const start = new Date(now)
        const end = new Date(now)
        if (now.getHours() < 17) { start.setHours(17, 0, 0, 0); end.setHours(19, 0, 0, 0) }
        else { end.setTime(now.getTime() + 2 * 3600000) }
        promoData = { title: 'Happy Hour', description: 'Join us for discounted drinks!', type: 'happy-hour', startTime: start.toISOString(), endTime: end.toISOString(), pointsReward: 10, targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false } }
        break
      }
      case 'flash-deal': {
        const end = new Date(now.getTime() + 3600000)
        promoData = { title: 'Flash Deal', description: 'One hour only — get here fast!', type: 'flash-deal', startTime: now.toISOString(), endTime: end.toISOString(), isFlashDeal: true, flashDealEndsAt: end.toISOString(), pointsReward: 25, targeting: { followersOnly: true, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false } }
        break
      }
      case 'weekend': {
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
        const friday = new Date(now); friday.setDate(friday.getDate() + daysUntilFriday); friday.setHours(20, 0, 0, 0)
        const sunday = new Date(friday); sunday.setDate(sunday.getDate() + 2); sunday.setHours(23, 59, 59, 0)
        promoData = { title: 'Weekend Special', description: 'All weekend long!', type: 'special', startTime: friday.toISOString(), endTime: sunday.toISOString(), pointsReward: 15, targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false } }
        break
      }
      case 'vip': {
        const end = new Date(now.getTime() + 4 * 3600000)
        promoData = { title: 'VIP Exclusive', description: 'VIP guests only — exclusive offer tonight!', type: 'exclusive', startTime: now.toISOString(), endTime: end.toISOString(), pointsReward: 50, targeting: { followersOnly: true, locationBased: false, radiusMiles: 5, userSegments: ['vip'], minCheckIns: 0, timeBased: false } }
        break
      }
      default: return
    }

    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, promoData, { headers: { Authorization: `Bearer ${token}` } })
      setLaunchSuccess(action)
      await fetchPromotions(); fetchStats()
      const dealLabel = QUICK_DEALS.find(d => d.key === action)?.label || 'Special Deal'
      setNotifyTitle(`${dealLabel} is LIVE at ${venueName || 'our venue'}! 🎉`)
      setNotifyOpen(true)
      setTimeout(() => setLaunchSuccess(null), 5000)
    } catch (e: any) {
      showError(e?.response?.data?.error || 'Failed to launch deal')
    } finally { setLaunchingDeal(null) }
  }

  const sendNotification = async () => {
    if (!token || !venueId || !notifyTitle.trim()) return
    setSendingNotify(true)
    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/notify`,
        { title: notifyTitle.trim(), message: notifyMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } })
      setNotifySent(true)
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed to send') }
    finally { setSendingNotify(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  )
  if (!user) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const activeDeals = promotions.filter(isRunningNow)
  const upcomingDeals = promotions.filter(p => !!p.isActive && new Date(p.startTime).getTime() > Date.now()).slice(0, 2)
  const timeBanner = getTimeBanner(hour)
  const bannerDealRunning = timeBanner && activeDeals.some(d => timeBanner.matchTypes.includes(d.type))
  const showTimeBanner = timeBanner && !bannerDealRunning
  const isFreeTier = tier === 'free'

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-10 space-y-5">

        {/* ── Row 1: Greeting + New Deal ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{greeting}</h1>
            <p className="text-xs text-primary-400/40 mt-0.5">{venueName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isFreeTier && (
              <button onClick={() => router.push('/dashboard/settings')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary-500/40 bg-primary-500/10 px-3 py-2 text-[11px] font-bold text-primary-400 hover:bg-primary-500/20 transition-all min-h-[36px]">
                <Crown className="w-3 h-3" /> Upgrade
              </button>
            )}
            <button onClick={() => router.push('/dashboard/promotions?action=new')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/20 min-h-[44px]">
              <Plus className="w-4 h-4" />
              New Deal
            </button>
          </div>
        </div>

        {/* ── Row 2: 4 KPI stats — always visible, easy to read ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Live Deals',  value: loadingStats ? '—' : `${activeDeals.length}`, icon: Sparkles,   color: 'text-primary-400',  dot: activeDeals.length > 0 ? 'bg-emerald-400' : 'bg-white/10' },
            { label: 'Followers',   value: loadingStats ? '—' : `${followerCount}`,       icon: Users,      color: 'text-cyan-400',     dot: null },
            { label: 'Redeemed',    value: loadingStats ? '—' : `${stats.totalRedemptions}`, icon: TrendingUp, color: 'text-emerald-400', dot: null },
            { label: 'Revenue',     value: loadingStats ? '—' : stats.totalRevenue,       icon: DollarSign, color: 'text-amber-400',    dot: null },
          ].map(({ label, value, icon: Icon, color, dot }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-black/50 p-3 flex flex-col items-center text-center">
              <div className="relative">
                <Icon className={`w-5 h-5 ${color} mb-1.5`} />
                {dot && <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dot}`} />}
              </div>
              <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
              <p className="text-[10px] text-white/30 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Row 3: Time-aware banner (contextual — only shows when relevant) ── */}
        {showTimeBanner && (
          <div className={`rounded-2xl border ${timeBanner!.accent} p-4 flex items-center gap-4`}>
            <span className="text-3xl flex-shrink-0">{timeBanner!.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-snug">{timeBanner!.heading}</p>
              <p className="text-xs text-primary-400/40 mt-0.5">Launches instantly</p>
            </div>
            <button
              onClick={() => handleQuickLaunch(timeBanner!.action)}
              disabled={!!launchingDeal}
              className={`flex-shrink-0 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 min-w-[120px] min-h-[44px] ${timeBanner!.btnClass}`}
            >
              {launchingDeal === timeBanner!.action ? <Loader2 className="w-4 h-4 animate-spin" /> : timeBanner!.label}
            </button>
          </div>
        )}

        {/* ── Row 4: Main two-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

          {/* ── LEFT: Live Deals (primary view) ── */}
          <div className="md:col-span-3 space-y-4">

            {/* LIVE DEALS */}
            <div className="rounded-2xl border border-primary-500/20 bg-black/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    {activeDeals.length > 0 && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
                  </div>
                  <p className="font-bold text-white">Live Deals</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeDeals.length > 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-primary-400/40 border-white/10'}`}>
                    {activeDeals.length} running
                  </span>
                </div>
                <button onClick={() => router.push('/dashboard/promotions')}
                  className="flex items-center gap-1 text-xs text-primary-400/40 hover:text-primary-400 transition-colors min-h-[36px] px-2">
                  Manage all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingPromos ? (
                <div className="p-5 space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-white/3 animate-pulse" />)}
                </div>
              ) : activeDeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-500/8 border border-primary-500/15 flex items-center justify-center mb-4">
                    <Flame className="w-7 h-7 text-primary-500/30" />
                  </div>
                  <p className="text-base font-bold text-white mb-1">Nothing running right now</p>
                  <p className="text-sm text-primary-400/40 mb-5">Use Quick Launch to go live in seconds.</p>
                  <div className="flex gap-2">
                    {QUICK_DEALS.slice(0, 2).map(d => {
                      const isLaunching = launchingDeal === d.key
                      const isSuccess = launchSuccess === d.key
                      return (
                        <button key={d.key}
                          onClick={() => handleQuickLaunch(d.key)}
                          disabled={!!launchingDeal}
                          className={`relative rounded-xl bg-gradient-to-br ${d.color} px-5 py-3 text-xs font-bold text-black hover:opacity-90 transition-all disabled:cursor-not-allowed min-h-[44px] min-w-[110px]`}
                        >
                          {isSuccess ? <CheckCircle2 className="w-4 h-4 mx-auto text-white" />
                            : isLaunching ? <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                            : `${d.emoji} ${d.label}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {activeDeals.map(promo => {
                    const s = promoStats[promo._id] || { views: 0, redemptions: 0, revenue: 0 }
                    const endTime = promo.isFlashDeal && promo.flashDealEndsAt ? promo.flashDealEndsAt : promo.endTime
                    const timeLeft = timeRemaining(endTime)
                    const isEnding = new Date(endTime).getTime() - Date.now() < 3600000
                    const start = new Date(promo.startTime).getTime()
                    const end = new Date(endTime).getTime()
                    const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
                    const badge = TYPE_COLOR[promo.type] || 'bg-primary-500/15 text-primary-400 border-primary-500/20'
                    const label = TYPE_LABEL[promo.type] || promo.type.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    const isConfirm = confirmEnd === promo._id
                    const isEndingNow = endingPromo === promo._id

                    return (
                      <div key={promo._id} className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>{label}</span>
                              <span className={`flex items-center gap-1 text-[11px] font-semibold ${isEnding ? 'text-rose-400' : 'text-primary-400/50'}`}>
                                {isEnding && <AlertCircle className="w-3 h-3" />}
                                <Clock className="w-2.5 h-2.5" />{timeLeft}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-white truncate">{promo.title}</p>
                            {promo.offer && <p className="text-xs text-primary-500 font-semibold mt-0.5">{promo.offer}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isConfirm ? (
                              <>
                                <button onClick={() => setConfirmEnd(null)} className="text-xs text-primary-400/50 hover:text-primary-400 px-3 py-2 rounded-xl border border-white/10 transition-all min-h-[44px]">Cancel</button>
                                <button onClick={() => handleEndPromo(promo._id)} disabled={isEndingNow} className="text-xs font-bold text-white bg-rose-500 hover:bg-rose-400 disabled:opacity-50 px-3 py-2 rounded-xl transition-all min-h-[44px]">
                                  {isEndingNow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'End Now'}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleEndPromo(promo._id)} className="text-xs font-semibold text-rose-400 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/15 px-3 py-2 rounded-xl transition-all min-h-[44px]">End</button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-5 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-primary-500/50" />
                            <span className="text-sm font-bold text-primary-400">{s.views}</span>
                            <span className="text-xs text-primary-400/40">views</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-emerald-500/60" />
                            <span className="text-sm font-bold text-emerald-400">{s.redemptions}</span>
                            <span className="text-xs text-primary-400/40">redeemed</span>
                          </div>
                          {s.revenue > 0 && (
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-amber-500/60" />
                              <span className="text-sm font-bold text-amber-400">${s.revenue.toFixed(0)}</span>
                            </div>
                          )}
                        </div>

                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${isEnding ? 'bg-rose-400' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] text-primary-400/25">Started {new Date(promo.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className={`text-[9px] font-semibold ${isEnding ? 'text-rose-400/70' : 'text-primary-400/25'}`}>Ends {new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {upcomingDeals.length > 0 && (
                <div className="border-t border-white/5 px-5 py-3">
                  <p className="text-[9px] uppercase tracking-widest text-primary-400/30 mb-2">Up next</p>
                  {upcomingDeals.map(p => (
                    <div key={p._id} className="flex items-center justify-between py-1.5">
                      <p className="text-xs text-primary-400/50 truncate">{p.title}</p>
                      <p className="text-[10px] text-primary-400/30 ml-3 flex-shrink-0">{new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          {/* ── END LEFT ── */}

          {/* ── RIGHT: Actions ── */}
          <div className="md:col-span-2 space-y-4">

            {/* QUICK LAUNCH */}
            <div className="rounded-2xl border border-primary-500/15 bg-black/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-white text-sm">Quick Launch</p>
                <p className="text-[10px] text-primary-400/30">live in seconds</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_DEALS.map(({ key, label, emoji, color }) => {
                  const isLaunching = launchingDeal === key
                  const isSuccess = launchSuccess === key
                  return (
                    <button key={key}
                      onClick={() => handleQuickLaunch(key)}
                      disabled={!!launchingDeal}
                      className={`relative rounded-xl bg-gradient-to-br ${color} p-4 text-left text-black hover:opacity-90 active:scale-95 transition-all disabled:cursor-not-allowed overflow-hidden min-h-[80px]`}
                    >
                      {isSuccess && (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500 rounded-xl">
                          <CheckCircle2 className="w-7 h-7 text-white" />
                        </div>
                      )}
                      {isLaunching && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                          <Loader2 className="w-6 h-6 animate-spin text-black" />
                        </div>
                      )}
                      <p className={`text-2xl mb-1.5 ${(isLaunching || isSuccess) ? 'opacity-0' : ''}`}>{emoji}</p>
                      <p className={`text-xs font-bold leading-tight ${(isLaunching || isSuccess) ? 'opacity-0' : ''}`}>{label}</p>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => router.push('/dashboard/promotions?action=new')}
                className="mt-2.5 w-full rounded-xl border border-primary-500/20 py-3 text-xs font-bold text-primary-400 hover:bg-primary-500/8 hover:border-primary-500/40 transition-all flex items-center justify-center gap-1.5 min-h-[44px]">
                <Plus className="w-3.5 h-3.5" /> Custom Deal
              </button>
            </div>

            {/* NOTIFY GUESTS — collapsible */}
            <div className="rounded-2xl border border-primary-500/15 bg-black/50 overflow-hidden">
              <button
                onClick={() => { setNotifyOpen(o => !o); if (notifySent) { setNotifySent(false); setNotifyTitle(''); setNotifyMessage('') } }}
                className="w-full flex items-center justify-between px-4 py-4 min-h-[56px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-4 h-4 text-primary-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Notify Guests</p>
                    <p className="text-[10px] text-primary-400/35">{followerCount > 0 ? `${followerCount} followers` : 'All followers'} · push notification</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-primary-400/40 transition-transform ${notifyOpen ? 'rotate-180' : ''}`} />
              </button>

              {notifyOpen && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4">
                  {notifySent ? (
                    <div className="flex flex-col items-center py-4 gap-2 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm font-bold text-white">Sent!</p>
                      <p className="text-xs text-primary-400/40">Followers will see it in seconds.</p>
                      <button onClick={() => { setNotifySent(false); setNotifyTitle(''); setNotifyMessage('') }}
                        className="mt-1 text-xs text-primary-400/50 hover:text-primary-400 transition-colors px-4 py-2">
                        Send another
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input type="text" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                        placeholder="e.g. Happy Hour starts NOW 🍻" maxLength={60}
                        className="w-full rounded-xl border border-primary-500/15 bg-black/60 px-4 py-3 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/40 focus:outline-none min-h-[44px]" />
                      <textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)}
                        placeholder="Optional details..." maxLength={160} rows={2}
                        className="w-full rounded-xl border border-primary-500/15 bg-black/60 px-4 py-3 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/40 focus:outline-none resize-none" />
                      <button onClick={sendNotification} disabled={sendingNotify || !notifyTitle.trim()}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-bold text-black hover:bg-primary-400 disabled:opacity-40 transition-all min-h-[44px]">
                        {sendingNotify
                          ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Sending…</>
                          : <><Send className="w-4 h-4" />Send to Guests</>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upgrade hint for free tier — small, not a billboard */}
            {isFreeTier && (
              <button onClick={() => router.push('/dashboard/settings')}
                className="w-full rounded-2xl border border-primary-500/20 bg-gradient-to-r from-primary-500/8 to-amber-500/8 p-4 text-left hover:border-primary-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">Unlock AI + Unlimited Deals</p>
                    <p className="text-xs text-primary-400/50 mt-0.5">$79/mo · cancel anytime</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary-400/30 ml-auto flex-shrink-0" />
                </div>
              </button>
            )}

          </div>
          {/* ── END RIGHT ── */}

        </div>
      </div>
    </DashboardLayout>
  )
}
