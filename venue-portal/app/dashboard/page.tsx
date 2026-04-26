'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useToast } from '../components/ToastContainer'
import DashboardLayout from '../components/DashboardLayout'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import {
  Sparkles, Users, TrendingUp, Crown, ArrowRight,
  Zap, X, CheckCircle2, Bell, Send, Clock, Megaphone
} from 'lucide-react'

interface BusySlot {
  day: string
  hour: number
  level: 'low' | 'medium' | 'high'
}

interface BusyTimesData {
  slots?: BusySlot[]
  busiestSlots?: { day: string; hour: number; label?: string }[]
  suggestions?: string[]
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { venueId, venueName, tier, followerCount } = useVenue()
  const { showSuccess, showError } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({
    totalRevenue: '0.00',
    totalRedemptions: 0,
    activePromos: 0,
    pendingPayouts: '0.00'
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [busyTimes, setBusyTimes] = useState<BusyTimesData | null>(null)
  const [loadingBusy, setLoadingBusy] = useState(false)
  const [showDealSuccess, setShowDealSuccess] = useState<string | null>(null)

  // Notify modal
  const [showNotify, setShowNotify] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  const notifyTitleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) fetchStats()
  }, [token, user])

  useEffect(() => {
    if (venueId && token) fetchBusyTimes(venueId)
  }, [venueId, token])

  useEffect(() => {
    if (showNotify) {
      setTimeout(() => notifyTitleRef.current?.focus(), 80)
    } else {
      setNotifyTitle('')
      setNotifyMessage('')
      setNotifySent(false)
    }
  }, [showNotify])

  const fetchStats = async () => {
    if (!token) return
    setLoadingStats(true)
    try {
      const res = await axios.get(`${getApiUrl()}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats({
        totalRevenue: `$${res.data.totalRevenue || '0.00'}`,
        totalRedemptions: res.data.totalRedemptions || 0,
        activePromos: res.data.activePromos || 0,
        pendingPayouts: `$${res.data.pendingPayouts || '0.00'}`
      })
    } catch {
      // keep defaults
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchBusyTimes = async (vid: string) => {
    if (!token) return
    setLoadingBusy(true)
    try {
      const res = await axios.get(`${getApiUrl()}/busy-times/${vid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBusyTimes(res.data || null)
    } catch {
      setBusyTimes(null)
    } finally {
      setLoadingBusy(false)
    }
  }

  const launchDeal = (dealType: 'happy-hour' | 'flash-deal' | 'weekend' | 'vip') => {
    router.push(`/dashboard/promotions?action=${dealType}`)
  }

  const sendNotification = async () => {
    if (!token || !venueId || !notifyTitle.trim()) return
    setSendingNotify(true)
    try {
      await axios.post(
        `${getApiUrl()}/venues/${venueId}/notify`,
        { title: notifyTitle.trim(), message: notifyMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNotifySent(true)
    } catch (error: any) {
      showError(error?.response?.data?.error || 'Failed to send notification')
    } finally {
      setSendingNotify(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }
  if (!user) return null

  const isFreeTier = tier === 'free'

  const DEAL_TYPES = [
    { key: 'happy-hour' as const, label: 'Happy Hour',      emoji: '🍻', desc: 'Boost weekday traffic',  color: 'from-amber-500 to-orange-500' },
    { key: 'flash-deal' as const, label: 'Flash Deal',       emoji: '⚡', desc: 'Create urgency now',     color: 'from-rose-500 to-pink-500' },
    { key: 'weekend'    as const, label: 'Weekend Special',  emoji: '🎉', desc: 'Pack your Fri–Sun',      color: 'from-violet-500 to-fuchsia-500' },
    { key: 'vip'        as const, label: 'VIP Exclusive',    emoji: '👑', desc: 'Reward your regulars',   color: 'from-cyan-500 to-sky-500' },
  ]

  const hourNow = new Date().getHours()
  const greeting = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{greeting} 👋</h1>
            <p className="text-primary-400/60 text-sm mt-0.5 capitalize">{venueName} is live on Shot On Me.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowNotify(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-500/30 bg-black/40 px-4 py-2.5 text-sm font-bold text-primary-400 hover:border-primary-500/60 hover:text-primary-300 transition-all"
            >
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Notify Guests</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/promotions')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/25"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">New Deal</span>
              <span className="sm:hidden">Deal</span>
            </button>
          </div>
        </div>

        {/* ── Deal success banner ── */}
        {showDealSuccess && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-300 font-medium">
                {showDealSuccess.replace('-', ' ')} deal is now live — guests can see it in the app.
              </p>
            </div>
            <button onClick={() => setShowDealSuccess(null)} className="text-emerald-400/50 hover:text-emerald-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active Deals',  value: loadingStats ? '—' : `${stats.activePromos}`,    icon: Sparkles,   color: 'text-primary-500', detail: 'running now' },
            { label: 'Shots Sent',    value: loadingStats ? '—' : `${stats.totalRedemptions}`, icon: TrendingUp, color: 'text-emerald-400', detail: 'all time' },
            { label: 'Revenue',       value: loadingStats ? '—' : stats.totalRevenue,          icon: Zap,        color: 'text-amber-400',   detail: 'last 30 days' },
            { label: 'Followers',     value: loadingStats ? '—' : `${followerCount}`,          icon: Users,      color: 'text-cyan-400',    detail: 'guests following you' },
          ].map(({ label, value, icon: Icon, color, detail }) => (
            <div key={label} className="rounded-xl border border-primary-500/15 bg-black/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-primary-400/60 font-medium">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-primary-400/40 mt-0.5">{detail}</p>
            </div>
          ))}
        </div>

        {/* ── Quick Launch ── */}
        <div className="rounded-xl border border-primary-500/20 bg-black/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Launch a Deal Instantly</p>
              <p className="text-xs text-primary-400/50 mt-0.5">AI writes it for you — one tap and it's live.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/promotions')}
              className="text-xs text-primary-400/60 hover:text-primary-400 flex items-center gap-1 transition-colors"
            >
              All deals <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DEAL_TYPES.map(({ key, label, emoji, desc, color }) => (
              <button
                key={key}
                onClick={() => launchDeal(key)}
                className={`rounded-xl bg-gradient-to-br ${color} p-3 text-left text-black hover:opacity-90 transition-all active:scale-95`}
              >
                <p className="text-xl mb-1">{emoji}</p>
                <p className="text-xs font-bold leading-tight">{label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Bottom row: Busy Times + Upgrade ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Busy Times */}
          <div className="rounded-xl border border-primary-500/15 bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary-500" />
              <p className="text-sm font-semibold text-primary-500">Busy Times</p>
            </div>
            {loadingBusy ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 animate-pulse rounded-full bg-primary-500/10" style={{ width: `${70 - i * 15}%` }} />
                ))}
              </div>
            ) : !busyTimes || (!busyTimes.busiestSlots?.length && !busyTimes.suggestions?.length) ? (
              <p className="text-xs text-primary-400/40 text-center py-4">No data yet — check back after your first busy night.</p>
            ) : (
              <div className="space-y-2">
                {busyTimes.busiestSlots?.slice(0, 3).map((slot, i) => (
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

          {/* Upgrade / Plan status */}
          {isFreeTier ? (
            <div className="rounded-xl border border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-black/60 to-amber-500/5 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-primary-500" />
                  <p className="text-sm font-semibold text-primary-500">Go viral with Growth</p>
                </div>
                <p className="text-xs text-primary-400/60 leading-relaxed mb-4">
                  Unlock AI promotions, advanced analytics, and social sharing to fill your venue every night.
                </p>
                <ul className="space-y-1.5 mb-4">
                  {['AI promotion generation', 'Social media auto-share', 'Guest analytics & insights', 'Unlimited active deals'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-primary-400/70">
                      <span className="w-1 h-1 rounded-full bg-primary-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-4 py-3 text-black font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20"
              >
                <Crown className="w-4 h-4" />
                Upgrade — $79/mo
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col justify-center items-center text-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300 capitalize">{tier} Plan Active</p>
              <p className="text-xs text-primary-400/50">AI automation and advanced features are unlocked.</p>
              <button
                onClick={() => router.push('/dashboard/money')}
                className="mt-2 text-xs text-primary-400/60 hover:text-primary-400 flex items-center gap-1 transition-colors"
              >
                View analytics <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Notify Guests Modal ── */}
      {showNotify && (
        <>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setShowNotify(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-primary-500/25 bg-black/95 shadow-2xl shadow-primary-500/10 overflow-hidden">

              {notifySent ? (
                <div className="flex flex-col items-center justify-center text-center px-8 py-12 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">Notification Sent!</p>
                    <p className="text-sm text-primary-400/60 mt-1">Your guests will see it in the Shot On Me app.</p>
                  </div>
                  <button
                    onClick={() => setShowNotify(false)}
                    className="mt-2 w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-black hover:bg-primary-400 transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-primary-500/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Notify Your Guests</p>
                        <p className="text-[11px] text-primary-400/50">Push to all your followers instantly</p>
                      </div>
                    </div>
                    <button onClick={() => setShowNotify(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-primary-400/50 hover:text-primary-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-5 py-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-primary-400/70 mb-1.5 uppercase tracking-wide">
                        Subject <span className="text-rose-400">*</span>
                      </label>
                      <input
                        ref={notifyTitleRef}
                        type="text"
                        value={notifyTitle}
                        onChange={e => setNotifyTitle(e.target.value)}
                        placeholder="e.g. Happy Hour starts NOW 🍻"
                        maxLength={60}
                        className="w-full rounded-xl border border-primary-500/25 bg-black/60 px-4 py-3 text-sm text-white placeholder-primary-400/30 focus:border-primary-500/60 focus:outline-none focus:ring-1 focus:ring-primary-500/30 transition-colors"
                      />
                      <p className="text-[10px] text-primary-400/30 mt-1 text-right">{notifyTitle.length}/60</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-primary-400/70 mb-1.5 uppercase tracking-wide">
                        Message <span className="text-primary-400/40">(optional)</span>
                      </label>
                      <textarea
                        value={notifyMessage}
                        onChange={e => setNotifyMessage(e.target.value)}
                        placeholder="Tell guests what's happening tonight..."
                        maxLength={160}
                        rows={3}
                        className="w-full rounded-xl border border-primary-500/25 bg-black/60 px-4 py-3 text-sm text-white placeholder-primary-400/30 focus:border-primary-500/60 focus:outline-none focus:ring-1 focus:ring-primary-500/30 transition-colors resize-none"
                      />
                      <p className="text-[10px] text-primary-400/30 mt-1 text-right">{notifyMessage.length}/160</p>
                    </div>

                    <button
                      onClick={sendNotification}
                      disabled={sendingNotify || !notifyTitle.trim()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 text-sm font-bold text-black hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20"
                    >
                      {sendingNotify ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send to All Guests
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-primary-400/35 text-center">
                      Guests who follow your venue will receive a push notification.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
