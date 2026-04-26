'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useToast } from '../components/ToastContainer'
import DashboardLayout from '../components/DashboardLayout'
import AIAnalyticsSummary from '../components/AIAnalyticsSummary'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import {
  Sparkles, Users, TrendingUp, Crown, ArrowRight,
  Zap, X, CheckCircle2, Bell, Send, Clock, Megaphone, Lock
} from 'lucide-react'

interface BusySlot { day: string; hour: number; level: 'low' | 'medium' | 'high' }
interface BusyTimesData {
  slots?: BusySlot[]
  busiestSlots?: { day: string; hour: number; label?: string }[]
  suggestions?: string[]
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { venueId, venueName, tier, followerCount } = useVenue()
  const { showError } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({ totalRevenue: '0.00', totalRedemptions: 0, activePromos: 0, pendingPayouts: '0.00' })
  const [loadingStats, setLoadingStats] = useState(true)
  const [busyTimes, setBusyTimes] = useState<BusyTimesData | null>(null)
  const [loadingBusy, setLoadingBusy] = useState(false)

  // Notify guests — inline, no modal
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)
  const [notifySent, setNotifySent] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) fetchStats()
  }, [token, user])

  useEffect(() => {
    if (venueId && token) fetchBusyTimes(venueId)
  }, [venueId, token])

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
    } catch { /* keep defaults */ } finally { setLoadingStats(false) }
  }

  const fetchBusyTimes = async (vid: string) => {
    if (!token) return
    setLoadingBusy(true)
    try {
      const res = await axios.get(`${getApiUrl()}/busy-times/${vid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBusyTimes(res.data || null)
    } catch { setBusyTimes(null) } finally { setLoadingBusy(false) }
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
    } finally { setSendingNotify(false) }
  }

  const resetNotify = () => {
    setNotifySent(false)
    setNotifyTitle('')
    setNotifyMessage('')
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

  const DEAL_TYPES = [
    { key: 'happy-hour' as const, label: 'Happy Hour',     emoji: '🍻', desc: 'Boost weekday traffic', color: 'from-amber-500 to-orange-500' },
    { key: 'flash-deal' as const, label: 'Flash Deal',     emoji: '⚡', desc: 'Create urgency now',    color: 'from-rose-500 to-pink-500' },
    { key: 'weekend'    as const, label: 'Weekend Special',emoji: '🎉', desc: 'Pack your Fri–Sun',     color: 'from-violet-500 to-fuchsia-500' },
    { key: 'vip'        as const, label: 'VIP Exclusive',  emoji: '👑', desc: 'Reward your regulars',  color: 'from-cyan-500 to-sky-500' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-8">

        {/* ── 1. Plan banner — always visible at top ── */}
        {isFreeTier ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-primary-500/40 bg-gradient-to-r from-primary-500/12 to-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Crown className="w-5 h-5 text-primary-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary-400">Free Plan</p>
                <p className="text-[11px] text-primary-400/50 truncate">Upgrade to unlock AI promotions, analytics & automation</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-4 py-2 text-xs font-bold text-black hover:opacity-90 transition-all shadow-lg shadow-primary-500/20"
            >
              <Crown className="w-3.5 h-3.5" />
              Upgrade — $79/mo
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300 capitalize">{tier} Plan — Active</p>
                <p className="text-[11px] text-emerald-400/50">AI promotions, analytics & automation are all unlocked</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="flex-shrink-0 text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
            >
              Manage plan
            </button>
          </div>
        )}

        {/* ── 2. Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">{greeting}</h1>
            <p className="text-xs text-primary-400/50 mt-0.5">{venueName} is live on Shot On Me.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/promotions')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">New Deal</span>
            <span className="sm:hidden">Deal</span>
          </button>
        </div>

        {/* ── 3. KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active Deals', value: loadingStats ? '—' : `${stats.activePromos}`,     icon: Sparkles,   color: 'text-primary-500', bg: 'bg-primary-500/8',  detail: 'running now' },
            { label: 'Shots Sent',   value: loadingStats ? '—' : `${stats.totalRedemptions}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/8', detail: 'all time' },
            { label: 'Revenue',      value: loadingStats ? '—' : stats.totalRevenue,           icon: Zap,        color: 'text-amber-400',   bg: 'bg-amber-500/8',   detail: 'last 30 days' },
            { label: 'Followers',    value: loadingStats ? '—' : `${followerCount}`,           icon: Users,      color: 'text-cyan-400',    bg: 'bg-cyan-500/8',    detail: 'following you' },
          ].map(({ label, value, icon: Icon, color, bg, detail }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-primary-400/50 font-medium">{label}</p>
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-primary-400/30 mt-0.5">{detail}</p>
            </div>
          ))}
        </div>

        {/* ── 4. Quick Launch ── */}
        <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">Quick Launch</p>
              <p className="text-[11px] text-primary-400/40 mt-0.5">AI writes the copy — one tap and it's live.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/promotions')}
              className="text-xs text-primary-400/50 hover:text-primary-400 flex items-center gap-1 transition-colors"
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
                <p className="text-lg mb-1">{emoji}</p>
                <p className="text-xs font-bold leading-tight">{label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. AI Recommendations (plan-gated) + Busy Times ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* AI Recommendations — 3/5 width */}
          <div className="md:col-span-3 rounded-xl border border-primary-500/20 bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <p className="text-sm font-bold text-white">AI Recommendations</p>
              {!isFreeTier && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Live</span>
              )}
            </div>

            {isFreeTier ? (
              /* Free tier — locked teaser */
              <div className="relative rounded-xl overflow-hidden">
                {/* Blurred fake content */}
                <div className="blur-sm pointer-events-none select-none space-y-3 p-1">
                  {['Schedule a happy hour push for Thursday 9pm — your busiest slot', 'Flash deal at 10pm Friday could lift redemptions by 40%', 'VIP offer to your top 12 regulars is overdue by 3 weeks'].map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg border border-primary-500/10">
                      <TrendingUp className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-primary-400/70">{t}</p>
                    </div>
                  ))}
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary-500/15 border border-primary-500/30 flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5 text-primary-500" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">AI is watching your venue</p>
                  <p className="text-xs text-primary-400/60 text-center mb-4 px-4">Upgrade to see personalized recommendations that fill seats every night.</p>
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-5 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-all"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Unlock AI — $79/mo
                  </button>
                </div>
              </div>
            ) : (
              <AIAnalyticsSummary />
            )}
          </div>

          {/* Busy Times — 2/5 width */}
          <div className="md:col-span-2 rounded-xl border border-primary-500/15 bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary-500" />
              <p className="text-sm font-bold text-white">Busy Times</p>
            </div>
            {loadingBusy ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-3 animate-pulse rounded-full bg-primary-500/10" style={{ width: `${75 - i * 12}%` }} />
                ))}
              </div>
            ) : !busyTimes || (!busyTimes.busiestSlots?.length && !busyTimes.suggestions?.length) ? (
              <p className="text-xs text-primary-400/35 text-center py-6">No data yet — check back after your first busy night.</p>
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

        {/* ── 6. Notify Guests — inline, no modal ── */}
        <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Notify Your Guests</p>
              <p className="text-[11px] text-primary-400/40">Push to all followers instantly — no app needed on your end.</p>
            </div>
          </div>

          {notifySent ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Notification sent!</p>
                <p className="text-xs text-primary-400/50 mt-0.5">Guests will see it in the Shot On Me app.</p>
              </div>
              <button
                onClick={resetNotify}
                className="text-xs text-primary-400/60 hover:text-primary-400 transition-colors mt-1"
              >
                Send another
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-primary-400/60 mb-1.5 uppercase tracking-wide">
                  Subject <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={e => setNotifyTitle(e.target.value)}
                  placeholder="e.g. Happy Hour starts NOW 🍻"
                  maxLength={60}
                  className="w-full rounded-xl border border-primary-500/20 bg-black/60 px-4 py-2.5 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/50 focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-primary-400/25 mt-1 text-right">{notifyTitle.length}/60</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-primary-400/60 mb-1.5 uppercase tracking-wide">
                  Message <span className="text-primary-400/30">(optional)</span>
                </label>
                <textarea
                  value={notifyMessage}
                  onChange={e => setNotifyMessage(e.target.value)}
                  placeholder="Tell guests what's happening tonight..."
                  maxLength={160}
                  rows={2}
                  className="w-full rounded-xl border border-primary-500/20 bg-black/60 px-4 py-2.5 text-sm text-white placeholder-primary-400/25 focus:border-primary-500/50 focus:outline-none transition-colors resize-none"
                />
                <p className="text-[10px] text-primary-400/25 mt-1 text-right">{notifyMessage.length}/160</p>
              </div>
              <button
                onClick={sendNotification}
                disabled={sendingNotify || !notifyTitle.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-bold text-black hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {sendingNotify ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send to All {followerCount > 0 ? `${followerCount} ` : ''}Guests</>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
