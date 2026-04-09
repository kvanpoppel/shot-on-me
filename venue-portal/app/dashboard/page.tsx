'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastContainer'
import DashboardLayout from '../components/DashboardLayout'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import {
  Sparkles, Users, TrendingUp, Crown, ArrowRight,
  Zap, X, Clock, CheckCircle2
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
  const { showSuccess, showError } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({
    totalRevenue: '0.00',
    totalRedemptions: 0,
    activePromos: 0,
    pendingPayouts: '0.00'
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [currentTier, setCurrentTier] = useState<string>('free')
  const [busyTimes, setBusyTimes] = useState<BusyTimesData | null>(null)
  const [loadingBusy, setLoadingBusy] = useState(false)
  const [publishingDealType, setPublishingDealType] = useState<string | null>(null)
  const [showDealSuccess, setShowDealSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) fetchData()
  }, [token, user])

  const fetchData = async () => {
    if (!token) return
    setLoadingStats(true)
    try {
      const apiUrl = getApiUrl()
      const [statsRes, venuesRes] = await Promise.all([
        axios.get(`${apiUrl}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiUrl}/venues`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const venues = Array.isArray(venuesRes.data) ? venuesRes.data : venuesRes.data?.venues || []
      const myVenue = venues[0]
      if (myVenue?._id) {
        setVenueId(myVenue._id)
        fetchBusyTimes(myVenue._id)
      }
      setCurrentTier(myVenue?.subscriptionTier || 'free')

      setStats({
        totalRevenue: `$${statsRes.data.totalRevenue || '0.00'}`,
        totalRedemptions: statsRes.data.totalRedemptions || 0,
        activePromos: statsRes.data.activePromos || 0,
        pendingPayouts: `$${statsRes.data.pendingPayouts || '0.00'}`
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

  const launchDeal = async (dealType: 'happy-hour' | 'flash-deal' | 'weekend' | 'vip') => {
    if (!token || !venueId || publishingDealType) return
    setPublishingDealType(dealType)
    try {
      await axios.post(
        `${getApiUrl()}/ai-automation/instant-deal`,
        { venueId, dealType },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowDealSuccess(dealType)
      fetchData()
    } catch (error: any) {
      showError(error?.response?.data?.error || 'Failed to launch deal')
    } finally {
      setPublishingDealType(null)
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

  const isFreeTier = currentTier === 'free'

  const DEAL_TYPES = [
    { key: 'happy-hour' as const, label: 'Happy Hour', emoji: '🍻', desc: 'Boost weekday traffic', color: 'from-amber-500 to-orange-500' },
    { key: 'flash-deal' as const, label: 'Flash Deal', emoji: '⚡', desc: 'Create urgency now', color: 'from-rose-500 to-pink-500' },
    { key: 'weekend' as const, label: 'Weekend Special', emoji: '🎉', desc: 'Pack your Fri–Sun', color: 'from-violet-500 to-fuchsia-500' },
    { key: 'vip' as const, label: 'VIP Exclusive', emoji: '👑', desc: 'Reward your regulars', color: 'from-cyan-500 to-sky-500' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back 👋</h1>
            <p className="text-primary-400/60 text-sm mt-0.5">Your venue is live on Shot On Me. Let's drive some action.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/promotions')}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">New Promotion</span>
            <span className="sm:hidden">Promote</span>
          </button>
        </div>

        {/* Deal success banner */}
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

        {/* Community Pulse — 4 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active Deals', value: loadingStats ? '—' : `${stats.activePromos}`, icon: Sparkles, color: 'text-primary-500', detail: 'running now' },
            { label: 'Shots Sent', value: loadingStats ? '—' : `${stats.totalRedemptions}`, icon: TrendingUp, color: 'text-emerald-400', detail: 'via Shot On Me' },
            { label: 'Revenue', value: loadingStats ? '—' : stats.totalRevenue, icon: Zap, color: 'text-amber-400', detail: 'last 30 days' },
            { label: 'Community', value: loadingStats ? '—' : `${stats.totalRedemptions > 0 ? '●' : '—'}`, icon: Users, color: 'text-cyan-400', detail: 'activity tracked' },
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

        {/* Launch a Deal — inline quick actions */}
        <div className="rounded-xl border border-primary-500/20 bg-black/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Launch a Deal Instantly</p>
              <p className="text-xs text-primary-400/50 mt-0.5">AI builds it for you — one tap and it's live in the app.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/promotions')}
              className="text-xs text-primary-400/60 hover:text-primary-400 flex items-center gap-1 transition-colors"
            >
              All promotions <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DEAL_TYPES.map(({ key, label, emoji, desc, color }) => (
              <button
                key={key}
                onClick={() => launchDeal(key)}
                disabled={!!publishingDealType}
                className={`rounded-xl bg-gradient-to-br ${color} p-3 text-left text-black hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <p className="text-xl mb-1">{emoji}</p>
                <p className="text-xs font-bold leading-tight">{publishingDealType === key ? 'Publishing...' : label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom row: Busy Times + Upgrade nudge */}
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

          {/* Upgrade Nudge */}
          {isFreeTier ? (
            <div className="rounded-xl border border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-black/60 to-amber-500/5 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-primary-500" />
                  <p className="text-sm font-semibold text-primary-500">Go viral with Growth</p>
                </div>
                <p className="text-xs text-primary-400/60 leading-relaxed mb-4">
                  Unlock AI-powered promotions, advanced analytics, and social sharing to fill your venue every night.
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
                onClick={() => router.push('/dashboard/profile')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-4 py-3 text-black font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20"
              >
                <Crown className="w-4 h-4" />
                Upgrade — $79/mo
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col justify-center items-center text-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300 capitalize">{currentTier} Plan Active</p>
              <p className="text-xs text-primary-400/50">AI automation and advanced features are unlocked.</p>
              <button
                onClick={() => router.push('/dashboard/analytics')}
                className="mt-2 text-xs text-primary-400/60 hover:text-primary-400 flex items-center gap-1 transition-colors"
              >
                View full analytics <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
