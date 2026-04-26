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
  Sparkles, Users, TrendingUp, Crown, Send, Clock,
  Megaphone, Lock, Eye, ShoppingCart, Zap, Flame,
  AlertCircle, Plus, ChevronRight, CheckCircle2
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
}

interface BusyTimesData {
  busiestSlots?: { day: string; hour: number; label?: string }[]
  suggestions?: string[]
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
  happy_hour: 'Happy Hour', flash_deal: 'Flash Deal', weekend_special: 'Weekend',
  vip_exclusive: 'VIP', happy_hour_special: 'Happy Hour', discount: 'Discount', free_item: 'Free Item',
}
const TYPE_COLOR: Record<string, string> = {
  happy_hour: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  flash_deal: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  weekend_special: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  vip_exclusive: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  happy_hour_special: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  discount: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  free_item: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
}

const QUICK_DEALS = [
  { key: 'happy-hour', label: 'Happy Hour',  emoji: '🍻', color: 'from-amber-500 to-orange-500' },
  { key: 'flash-deal', label: 'Flash Deal',  emoji: '⚡', color: 'from-rose-500 to-pink-500' },
  { key: 'weekend',    label: 'Weekend',     emoji: '🎉', color: 'from-violet-500 to-fuchsia-500' },
  { key: 'vip',        label: 'VIP',         emoji: '👑', color: 'from-cyan-500 to-sky-500' },
]

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
  const [busyTimes, setBusyTimes] = useState<BusyTimesData | null>(null)
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null)
  const [endingPromo, setEndingPromo] = useState<string | null>(null)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
  useEffect(() => { if (token && user) fetchStats() }, [token, user])
  useEffect(() => { if (venueId && token) { fetchPromotions(); fetchBusyTimes() } }, [venueId, token])

  useEffect(() => {
    if (!socket || !venueId) return
    const refresh = (d: any) => { if (d.venueId === venueId) { fetchPromotions(); fetchStats() } }
    socket.on('promotion-updated', refresh)
    socket.on('new-promotion', refresh)
    socket.on('promotion-deleted', refresh)
    return () => { socket.off('promotion-updated', refresh); socket.off('new-promotion', refresh); socket.off('promotion-deleted', refresh) }
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

  const fetchBusyTimes = async () => {
    if (!venueId || !token) return
    try {
      const res = await axios.get(`${getApiUrl()}/busy-times/${venueId}`, { headers: { Authorization: `Bearer ${token}` } })
      setBusyTimes(res.data || null)
    } catch { setBusyTimes(null) }
  }

  const handleEndPromo = async (id: string) => {
    if (confirmEnd !== id) { setConfirmEnd(id); return }
    setConfirmEnd(null); setEndingPromo(id)
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/promotions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchPromotions(); fetchStats()
    } catch (e: any) { showError(e.response?.data?.error || 'Failed to end deal') }
    finally { setEndingPromo(null) }
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" /></div>
  if (!user) return null

  const isFreeTier = tier === 'free'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const activeDeals = promotions.filter(isRunningNow)
  const upcomingDeals = promotions.filter(p => !!p.isActive && new Date(p.startTime).getTime() > Date.now()).slice(0, 2)

  return (
    <DashboardLayout>
      <div className="pb-10 space-y-4">

        {/* ── Top bar: greeting + plan status + new deal ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{greeting}</h1>
            <p className="text-xs text-primary-400/40 mt-0.5">{venueName} · live on Shot On Me</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Plan pill */}
            {isFreeTier ? (
              <button onClick={() => router.push('/dashboard/settings')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary-500/40 bg-primary-500/10 px-3 py-1.5 text-[11px] font-bold text-primary-400 hover:bg-primary-500/20 transition-all">
                <Crown className="w-3 h-3" /> Free · Upgrade
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-[11px] font-bold text-emerald-400 capitalize">
                <CheckCircle2 className="w-3 h-3" /> {tier} Plan
              </span>
            )}
            <button onClick={() => router.push('/dashboard/promotions?action=new')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/20">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Deal</span>
              <span className="sm:hidden">Deal</span>
            </button>
          </div>
        </div>

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

          {/* ════ LEFT COLUMN (3/5) ════ */}
          <div className="lg:col-span-3 space-y-4">

            {/* LIVE DEALS — hero */}
            <div className="rounded-2xl border border-primary-500/20 bg-black/50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    {activeDeals.length > 0 && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
                  </div>
                  <p className="font-bold text-white">Live Deals</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeDeals.length > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/5 text-primary-400/40 border-white/10'
                  }`}>
                    {activeDeals.length} running
                  </span>
                </div>
                <button onClick={() => router.push('/dashboard/promotions')}
                  className="flex items-center gap-1 text-xs text-primary-400/40 hover:text-primary-400 transition-colors">
                  Manage all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              {loadingPromos ? (
                <div className="p-5 space-y-3">
                  {[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-white/3 animate-pulse" />)}
                </div>
              ) : activeDeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-500/8 border border-primary-500/15 flex items-center justify-center mb-4">
                    <Flame className="w-7 h-7 text-primary-500/30" />
                  </div>
                  <p className="text-base font-bold text-white mb-1">Nothing running right now</p>
                  <p className="text-sm text-primary-400/40 mb-5">Use Quick Launch to get a deal live in seconds.</p>
                  <div className="flex gap-2">
                    {QUICK_DEALS.slice(0,2).map(d => (
                      <button key={d.key} onClick={() => router.push(`/dashboard/promotions?action=${d.key}`)}
                        className={`rounded-xl bg-gradient-to-br ${d.color} px-4 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-all`}>
                        {d.emoji} {d.label}
                      </button>
                    ))}
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
                    const isConfirm = confirmEnd === promo._id
                    const isEndingNow = endingPromo === promo._id

                    return (
                      <div key={promo._id} className="p-5">
                        {/* Row 1: label + time + actions */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>
                                {TYPE_LABEL[promo.type] || promo.type}
                              </span>
                              <span className={`flex items-center gap-1 text-[11px] font-semibold ${isEnding ? 'text-rose-400' : 'text-primary-400/50'}`}>
                                {isEnding && <AlertCircle className="w-3 h-3" />}
                                <Clock className="w-2.5 h-2.5" />
                                {timeLeft}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-white truncate">{promo.title}</p>
                          </div>
                          {/* End deal control */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isConfirm ? (
                              <>
                                <button onClick={() => setConfirmEnd(null)}
                                  className="text-[11px] text-primary-400/50 hover:text-primary-400 px-2.5 py-1.5 rounded-lg border border-white/10 transition-all">
                                  Cancel
                                </button>
                                <button onClick={() => handleEndPromo(promo._id)} disabled={isEndingNow}
                                  className="text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-400 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-all">
                                  {isEndingNow ? '…' : 'End Now'}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleEndPromo(promo._id)}
                                className="text-[11px] font-semibold text-rose-400 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/15 px-2.5 py-1.5 rounded-lg transition-all">
                                End
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Row 2: real-time stats */}
                        <div className="flex items-center gap-5 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-primary-500/50" />
                            <span className="text-sm font-bold text-primary-400">{s.views}</span>
                            <span className="text-xs text-primary-400/40">views</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5 text-emerald-500/60" />
                            <span className="text-sm font-bold text-emerald-400">{s.redemptions}</span>
                            <span className="text-xs text-primary-400/40">redeemed</span>
                          </div>
                          {s.revenue > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500/60" />
                              <span className="text-sm font-bold text-amber-400">${s.revenue.toFixed(0)}</span>
                              <span className="text-xs text-primary-400/40">revenue</span>
                            </div>
                          )}
                        </div>

                        {/* Row 3: time progress bar */}
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${isEnding ? 'bg-rose-400' : 'bg-primary-500'}`}
                            style={{ width: `${pct}%` }} />
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

              {/* Upcoming strip */}
              {upcomingDeals.length > 0 && (
                <div className="border-t border-white/5 px-5 py-3">
                  <p className="text-[9px] uppercase tracking-widest text-primary-400/30 mb-2">Up next</p>
                  {upcomingDeals.map(p => (
                    <div key={p._id} className="flex items-center justify-between py-1">
                      <p className="text-xs text-primary-400/50 truncate">{p.title}</p>
                      <p className="text-[10px] text-primary-400/30 ml-3 flex-shrink-0">
                        {new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI RECOMMENDATIONS */}
            <div className="rounded-2xl border border-primary-500/20 bg-black/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <p className="font-bold text-white">AI Recommendations</p>
                </div>
                {!isFreeTier && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">Live</span>
                )}
              </div>

              {isFreeTier ? (
                <div className="relative rounded-xl overflow-hidden min-h-[160px]">
                  {/* Blurred preview */}
                  <div className="blur-sm pointer-events-none select-none space-y-3">
                    {[
                      'Thursday 9pm is your busiest slot — schedule a Happy Hour push now',
                      'Flash deal at 10pm Friday could increase redemptions by 40%',
                      'Your top 12 regulars haven\'t seen a VIP offer in 3 weeks',
                    ].map((t, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-black/30 rounded-xl border border-primary-500/10">
                        <TrendingUp className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-primary-400/60">{t}</p>
                      </div>
                    ))}
                  </div>
                  {/* Lock overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[3px] rounded-xl gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary-500" />
                    </div>
                    <div className="text-center px-6">
                      <p className="text-sm font-bold text-white">AI is watching your venue</p>
                      <p className="text-xs text-primary-400/50 mt-1">Upgrade to get personalized recommendations that fill seats every night.</p>
                    </div>
                    <button onClick={() => router.push('/dashboard/settings')}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-5 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-all shadow-lg shadow-primary-500/20">
                      <Crown className="w-3.5 h-3.5" /> Unlock for $79/mo
                    </button>
                  </div>
                </div>
              ) : (
                <AIAnalyticsSummary />
              )}
            </div>
          </div>

          {/* ════ RIGHT COLUMN (2/5) ════ */}
          <div className="lg:col-span-2 space-y-4">

            {/* KPI CARDS — 2×2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Active Deals',  value: loadingStats ? '—' : `${stats.activePromos}`,     sub: 'live now',         color: 'text-primary-400',  bg: 'bg-primary-500/8',  icon: Sparkles },
                { label: 'Shots Sent',    value: loadingStats ? '—' : `${stats.totalRedemptions}`, sub: 'all time',         color: 'text-emerald-400', bg: 'bg-emerald-500/8', icon: TrendingUp },
                { label: 'Revenue',       value: loadingStats ? '—' : stats.totalRevenue,           sub: 'last 30 days',     color: 'text-amber-400',   bg: 'bg-amber-500/8',   icon: Zap },
                { label: 'Followers',     value: loadingStats ? '—' : `${followerCount}`,           sub: 'following you',    color: 'text-cyan-400',    bg: 'bg-cyan-500/8',    icon: Users },
              ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-white/5 bg-black/50 p-4">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2.5`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-primary-400/40 mt-0.5 font-medium">{label}</p>
                  <p className="text-[9px] text-primary-400/25">{sub}</p>
                </div>
              ))}
            </div>

            {/* QUICK LAUNCH */}
            <div className="rounded-2xl border border-primary-500/15 bg-black/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-white text-sm">Quick Launch</p>
                <p className="text-[10px] text-primary-400/30">AI writes it instantly</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_DEALS.map(({ key, label, emoji, color }) => (
                  <button key={key}
                    onClick={() => router.push(`/dashboard/promotions?action=${key}`)}
                    className={`rounded-xl bg-gradient-to-br ${color} p-3.5 text-left text-black hover:opacity-90 active:scale-95 transition-all`}>
                    <p className="text-xl mb-1.5">{emoji}</p>
                    <p className="text-xs font-bold leading-tight">{label}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => router.push('/dashboard/promotions?action=new')}
                className="mt-2 w-full rounded-xl border border-primary-500/20 py-2.5 text-xs font-bold text-primary-400 hover:bg-primary-500/8 hover:border-primary-500/40 transition-all flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Custom Deal
              </button>
            </div>

            {/* NOTIFY GUESTS */}
            <div className="rounded-2xl border border-primary-500/15 bg-black/50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Notify Guests</p>
                  <p className="text-[10px] text-primary-400/35">
                    {followerCount > 0 ? `${followerCount} followers` : 'All followers'} · instant push
                  </p>
                </div>
              </div>

              {notifySent ? (
                <div className="flex flex-col items-center py-4 gap-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <p className="text-sm font-bold text-white">Notification sent!</p>
                  <p className="text-xs text-primary-400/40">Guests will see it in the app.</p>
                  <button onClick={() => { setNotifySent(false); setNotifyTitle(''); setNotifyMessage('') }}
                    className="mt-1 text-xs text-primary-400/50 hover:text-primary-400 transition-colors">
                    Send another
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="text" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                    placeholder="e.g. Happy Hour starts NOW 🍻" maxLength={60}
                    className="w-full rounded-xl border border-primary-500/15 bg-black/60 px-3.5 py-2.5 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/40 focus:outline-none transition-colors" />
                  <textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)}
                    placeholder="Optional message..." maxLength={160} rows={2}
                    className="w-full rounded-xl border border-primary-500/15 bg-black/60 px-3.5 py-2.5 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/40 focus:outline-none transition-colors resize-none" />
                  <button onClick={sendNotification} disabled={sendingNotify || !notifyTitle.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-black hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    {sendingNotify
                      ? <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Sending…</>
                      : <><Send className="w-3.5 h-3.5" />Send to Guests</>}
                  </button>
                </div>
              )}
            </div>

            {/* BUSY TIMES */}
            {(busyTimes?.busiestSlots?.length || busyTimes?.suggestions?.length) ? (
              <div className="rounded-2xl border border-primary-500/15 bg-black/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary-500" />
                  <p className="text-sm font-bold text-white">Your Busy Times</p>
                </div>
                <div className="space-y-2">
                  {busyTimes.busiestSlots?.slice(0, 4).map((slot, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-amber-400' : 'bg-primary-500/30'}`} />
                      <p className="text-xs text-primary-400/60">{slot.label || `${slot.day} at ${slot.hour}:00`}</p>
                      {i === 0 && <span className="ml-auto text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Busiest</span>}
                    </div>
                  ))}
                  {busyTimes.suggestions?.slice(0, 1).map((s: any, i) => (
                    <div key={i} className="mt-1 rounded-xl bg-cyan-500/5 border border-cyan-500/15 px-3 py-2.5">
                      <p className="text-[11px] text-cyan-300/80 leading-relaxed">{typeof s === 'string' ? s : s.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
          {/* ════ END RIGHT COLUMN ════ */}

        </div>
      </div>
    </DashboardLayout>
  )
}
