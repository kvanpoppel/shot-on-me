'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../components/ToastContainer'
import { useFeatureAvailable } from '../components/FeatureGate'
import DashboardLayout from '../components/DashboardLayout'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import {
  Plus, Clock, ChevronRight, CheckCircle2, Loader2,
  DollarSign, Send, Crown, Users, Sparkles, AlertCircle,
  Megaphone, ChevronDown, TrendingUp, Calendar, Zap, Eye,
  ThumbsUp, X,
} from 'lucide-react'

/* ─── Types ─── */
interface Promotion {
  _id: string; title: string; offer?: string; description?: string; type: string
  isActive?: boolean; startTime: string; endTime: string
  isFlashDeal?: boolean; flashDealEndsAt?: string
  analytics?: { views?: number; redemptions?: number; revenue?: number }
}

interface AISuggestion {
  title: string; description: string; type: string
  confidence?: number; reasoning?: string
  startTime?: string; endTime?: string
}

/* ─── Helpers ─── */
function timeLeft(end: string) {
  const diff = new Date(end).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
  return h > 24 ? `${Math.floor(h / 24)}d` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

function isLive(p: Promotion) {
  const now = Date.now()
  const end = p.isFlashDeal && p.flashDealEndsAt ? new Date(p.flashDealEndsAt).getTime() : new Date(p.endTime).getTime()
  return !!p.isActive && now >= new Date(p.startTime).getTime() && now < end
}

function isUpcoming(p: Promotion) {
  return !!p.isActive && new Date(p.startTime).getTime() > Date.now()
}

const TYPE_EMOJI: Record<string, string> = {
  'happy-hour': '🍻', 'flash-deal': '⚡', 'special': '🎉',
  'exclusive': '👑', 'event': '🎪', 'weekend': '🎉',
}

/* ─── Component ─── */
export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { venueId, venueName, tier, followerCount } = useVenue()
  const { socket } = useSocket()
  const { showError, showSuccess, showInfo } = useToast()
  const router = useRouter()
  const hasAI = useFeatureAvailable('growth')

  const [stats, setStats] = useState({ totalRevenue: 0, totalRedemptions: 0, yesterdayRevenue: 0, yesterdayRedemptions: 0 })
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingAI, setLoadingAI] = useState(false)
  const [launchingDeal, setLaunchingDeal] = useState<string | null>(null)
  const [approvingAI, setApprovingAI] = useState<number | null>(null)
  const [dismissedAI, setDismissedAI] = useState<Set<number>>(new Set())
  const [endingId, setEndingId] = useState<string | null>(null)
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null)

  // Notify
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Tick
  const [, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(t) }, [])

  useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])

  /* ─── Fetch everything ─── */
  const fetchData = useCallback(async () => {
    if (!venueId || !token) return
    setLoadingData(true)
    try {
      const [statsRes, venueRes] = await Promise.allSettled([
        axios.get(`${getApiUrl()}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${getApiUrl()}/venues/${venueId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data
        setStats({
          totalRevenue: d.totalRevenue || 0,
          totalRedemptions: d.totalRedemptions || 0,
          yesterdayRevenue: d.yesterdayRevenue || 0,
          yesterdayRedemptions: d.yesterdayRedemptions || 0,
        })
      }
      if (venueRes.status === 'fulfilled') {
        setPromotions(venueRes.value.data.venue?.promotions || [])
      }
    } catch {} finally { setLoadingData(false) }
  }, [venueId, token])

  const fetchAISuggestions = useCallback(async () => {
    if (!venueId || !token || !hasAI) return
    setLoadingAI(true)
    try {
      const res = await axios.get(`${getApiUrl()}/ai-automation/suggestions?venueId=${venueId}`, { headers: { Authorization: `Bearer ${token}` } })
      setAiSuggestions((res.data.suggestions || []).slice(0, 3))
    } catch {} finally { setLoadingAI(false) }
  }, [venueId, token, hasAI])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchAISuggestions() }, [fetchAISuggestions])

  /* ─── Socket ─── */
  useEffect(() => {
    if (!socket || !venueId) return
    const refresh = () => fetchData()
    const onFizz = (d: any) => { if (d.venueId === venueId) { showSuccess(`$${d.amount} Fizz received!`); fetchData() } }
    const onCheckin = (d: any) => { if (d.venueId === venueId) { showInfo('New check-in!'); fetchData() } }
    const onPaid = (d: any) => { if (d.venueId === venueId) { showSuccess('Payment received!'); fetchData() } }
    socket.on('promotion-updated', refresh); socket.on('new-promotion', refresh); socket.on('promotion-deleted', refresh)
    socket.on('fizz-received', onFizz); socket.on('venue-checkin', onCheckin); socket.on('venue-paid', onPaid)
    return () => {
      socket.off('promotion-updated', refresh); socket.off('new-promotion', refresh); socket.off('promotion-deleted', refresh)
      socket.off('fizz-received', onFizz); socket.off('venue-checkin', onCheckin); socket.off('venue-paid', onPaid)
    }
  }, [socket, venueId])

  /* ─── Actions ─── */
  const handleQuickLaunch = async (type: string) => {
    if (!venueId || !token || launchingDeal) return
    setLaunchingDeal(type)
    const now = new Date()
    const presets: Record<string, any> = {
      'happy-hour': { title: 'Happy Hour', description: 'Discounted drinks!', type: 'happy-hour', startTime: now.toISOString(), endTime: new Date(now.getTime() + 3 * 3600000).toISOString() },
      'flash-deal': { title: 'Flash Deal', description: 'Limited time only!', type: 'flash-deal', isFlashDeal: true, startTime: now.toISOString(), endTime: new Date(now.getTime() + 3600000).toISOString(), flashDealEndsAt: new Date(now.getTime() + 3600000).toISOString() },
      'vip': { title: 'VIP Exclusive', description: 'VIP guests only tonight!', type: 'exclusive', startTime: now.toISOString(), endTime: new Date(now.getTime() + 4 * 3600000).toISOString() },
    }
    const data = { ...(presets[type] || presets['happy-hour']), targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false } }
    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, data, { headers: { Authorization: `Bearer ${token}` } })
      showSuccess(`${data.title} is live!`)
      setNotifyTitle(`${data.title} is LIVE at ${venueName}! 🎉`)
      setNotifyOpen(true)
      fetchData()
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed to launch') }
    finally { setLaunchingDeal(null) }
  }

  const handleApproveAI = async (idx: number) => {
    if (!venueId || !token) return
    setApprovingAI(idx)
    const s = aiSuggestions[idx]
    const now = new Date()
    const data = {
      title: s.title, description: s.description, type: s.type || 'special',
      startTime: s.startTime || now.toISOString(),
      endTime: s.endTime || new Date(now.getTime() + 3 * 3600000).toISOString(),
      targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false },
    }
    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, data, { headers: { Authorization: `Bearer ${token}` } })
      showSuccess(`"${s.title}" is live!`)
      setDismissedAI(prev => new Set(prev).add(idx))
      fetchData()
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed') }
    finally { setApprovingAI(null) }
  }

  const handleEnd = async (id: string) => {
    if (confirmEndId !== id) { setConfirmEndId(id); return }
    setConfirmEndId(null); setEndingId(id)
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/promotions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchData()
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed') }
    finally { setEndingId(null) }
  }

  const sendNotify = async () => {
    if (!token || !venueId || !notifyTitle.trim()) return
    setSending(true)
    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/notify`, { title: notifyTitle.trim(), message: notifyMsg.trim() }, { headers: { Authorization: `Bearer ${token}` } })
      setSent(true)
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed') }
    finally { setSending(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" /></div>
  if (!user) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const activeDeals = promotions.filter(isLive)
  const upcomingDeals = promotions.filter(isUpcoming).slice(0, 3)
  const isFreeTier = tier === 'free'
  const isGrowthTier = tier === 'basic' || tier === 'growth'
  const isPerformancePlus = tier === 'premium' || tier === 'performance' || tier === 'enterprise'
  const atLimit = isPerformancePlus ? false : isGrowthTier ? activeDeals.length >= 4 : activeDeals.length >= 2
  const visibleAI = aiSuggestions.filter((_, i) => !dismissedAI.has(i))

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-10 space-y-4 max-w-2xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{greeting}</h1>
            <p className="text-xs text-primary-400/40">{venueName}</p>
          </div>
          {atLimit ? (
            <button onClick={() => router.push('/dashboard/settings')} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-4 py-2.5 text-sm font-bold text-black min-h-[44px]">
              <Crown className="w-4 h-4" /> Upgrade
            </button>
          ) : (
            <button onClick={() => router.push('/dashboard/promotions?action=new')} className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-bold text-black min-h-[44px]">
              <Plus className="w-4 h-4" /> New Deal
            </button>
          )}
        </div>

        {/* ── Yesterday's Recap + Today's Stats ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-black/50 p-3">
            <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Yesterday</p>
            <p className="text-lg font-bold text-primary-400">{loadingData ? '—' : `$${stats.yesterdayRevenue}`}</p>
            <p className="text-[10px] text-white/20">{loadingData ? '' : `${stats.yesterdayRedemptions} redeemed`}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/50 p-3">
            <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> All Time</p>
            <p className="text-lg font-bold text-emerald-400">{loadingData ? '—' : `$${stats.totalRevenue}`}</p>
            <p className="text-[10px] text-white/20">{loadingData ? '' : `${stats.totalRedemptions} redeemed`}</p>
          </div>
        </div>

        {/* ── Quick stats row ── */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl border border-white/5 bg-black/50 p-2.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-primary-400">{loadingData ? '—' : activeDeals.length}</p>
              <p className="text-[9px] text-white/25">Live Now</p>
            </div>
          </div>
          <div className="flex-1 rounded-xl border border-white/5 bg-black/50 p-2.5 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-cyan-400">{loadingData ? '—' : followerCount}</p>
              <p className="text-[9px] text-white/25">Followers</p>
            </div>
          </div>
          <div className="flex-1 rounded-xl border border-white/5 bg-black/50 p-2.5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-violet-400">{loadingData ? '—' : upcomingDeals.length}</p>
              <p className="text-[9px] text-white/25">Upcoming</p>
            </div>
          </div>
        </div>

        {/* ── AI Suggestions (Growth+ only) ── */}
        {hasAI && visibleAI.length > 0 && (
          <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-primary-500/10 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <p className="text-xs font-bold text-primary-400">AI Recommended for Today</p>
            </div>
            <div className="divide-y divide-primary-500/10">
              {visibleAI.map((s, idx) => {
                const realIdx = aiSuggestions.indexOf(s)
                const isApproving = approvingAI === realIdx
                return (
                  <div key={realIdx} className="px-4 py-3 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_EMOJI[s.type] || '🎯'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{s.title}</p>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{s.description}</p>
                      {s.reasoning && <p className="text-[10px] text-primary-400/50 mt-1 italic">{s.reasoning}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleApproveAI(realIdx)}
                        disabled={isApproving || atLimit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 text-black text-xs font-bold hover:bg-primary-400 disabled:opacity-40 min-h-[32px]"
                      >
                        {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ThumbsUp className="w-3 h-3" /> Go Live</>}
                      </button>
                      <button
                        onClick={() => setDismissedAI(prev => new Set(prev).add(realIdx))}
                        className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── AI locked hint for free tier ── */}
        {!hasAI && !loadingData && (
          <div className="rounded-xl border border-primary-500/10 bg-black/50 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary-500/30 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-white/50">AI deal recommendations</p>
              <p className="text-[10px] text-white/25 mt-0.5">Upgrade to Growth to get smart suggestions based on your venue data.</p>
            </div>
            <button onClick={() => router.push('/dashboard/settings')} className="text-[10px] font-bold text-primary-500 border border-primary-500/30 px-2.5 py-1.5 rounded-lg hover:bg-primary-500/10 flex-shrink-0">
              Upgrade
            </button>
          </div>
        )}

        {/* ── Quick Launch ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'happy-hour', label: 'Happy Hour', emoji: '🍻' },
            { key: 'flash-deal', label: 'Flash Deal', emoji: '⚡' },
            { key: 'vip', label: 'VIP Night', emoji: '👑' },
          ].map(d => (
            <button key={d.key} onClick={() => handleQuickLaunch(d.key)} disabled={!!launchingDeal || atLimit}
              className={`rounded-xl border border-primary-500/15 bg-black/50 p-3 text-center hover:border-primary-500/30 transition-all disabled:opacity-30 min-h-[60px] ${launchingDeal === d.key ? 'border-primary-500/40' : ''}`}>
              {launchingDeal === d.key ? <Loader2 className="w-5 h-5 animate-spin text-primary-500 mx-auto" /> : (
                <><p className="text-xl mb-0.5">{d.emoji}</p><p className="text-[10px] font-bold text-primary-400/60">{d.label}</p></>
              )}
            </button>
          ))}
        </div>

        {/* ── Live Deals ── */}
        <div className="rounded-xl border border-primary-500/15 bg-black/50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              {activeDeals.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              <p className="text-sm font-bold text-white">Live Deals</p>
              {activeDeals.length > 0 && <span className="text-[10px] text-emerald-400/60 font-semibold">{activeDeals.length} running</span>}
            </div>
            <button onClick={() => router.push('/dashboard/promotions')} className="text-xs text-primary-400/40 hover:text-primary-400 flex items-center gap-1">
              All deals <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loadingData ? (
            <div className="p-4 space-y-3">{[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-white/3 animate-pulse" />)}</div>
          ) : activeDeals.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-white/40">No deals running</p>
              <p className="text-xs text-white/20 mt-1">Tap Quick Launch above or create a custom deal</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {activeDeals.map(p => {
                const end = p.isFlashDeal && p.flashDealEndsAt ? p.flashDealEndsAt : p.endTime
                const remaining = timeLeft(end)
                const urgent = new Date(end).getTime() - Date.now() < 3600000
                return (
                  <div key={p._id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">{TYPE_EMOJI[p.type] || '🎉'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{p.title}</p>
                        {p.offer && <p className="text-[11px] text-primary-500 truncate">{p.offer}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold ${urgent ? 'text-rose-400' : 'text-white/30'}`}>
                        {urgent && <AlertCircle className="w-3 h-3 inline mr-0.5" />}{remaining}
                      </span>
                      {confirmEndId === p._id ? (
                        <div className="flex gap-1">
                          <button onClick={() => setConfirmEndId(null)} className="text-[10px] text-white/40 px-2 py-1 rounded border border-white/10">No</button>
                          <button onClick={() => handleEnd(p._id)} disabled={endingId === p._id} className="text-[10px] font-bold text-white bg-rose-500 px-2 py-1 rounded disabled:opacity-50">
                            {endingId === p._id ? '...' : 'End'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleEnd(p._id)} className="text-[10px] text-rose-400/50 hover:text-rose-400 px-2 py-1 rounded border border-rose-500/15">End</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Upcoming Deals ── */}
        {upcomingDeals.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-black/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Upcoming</p>
            {upcomingDeals.map(p => (
              <div key={p._id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{TYPE_EMOJI[p.type] || '🎉'}</span>
                  <p className="text-xs text-white/50 truncate">{p.title}</p>
                </div>
                <p className="text-[10px] text-white/25 flex-shrink-0 ml-2">
                  {new Date(p.startTime).toLocaleDateString([], { weekday: 'short' })} {new Date(p.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Notify Guests ── */}
        <div className="rounded-xl border border-primary-500/15 bg-black/50 overflow-hidden">
          <button onClick={() => { setNotifyOpen(o => !o); if (sent) { setSent(false); setNotifyTitle(''); setNotifyMsg('') } }}
            className="w-full flex items-center justify-between px-4 py-3 min-h-[48px]">
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 text-primary-500" />
              <p className="text-sm font-bold text-white">Notify Guests</p>
              {followerCount > 0 && <span className="text-[10px] text-primary-400/30">{followerCount} followers</span>}
            </div>
            <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${notifyOpen ? 'rotate-180' : ''}`} />
          </button>
          {notifyOpen && (
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              {sent ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">Sent!</p>
                  <button onClick={() => { setSent(false); setNotifyTitle(''); setNotifyMsg('') }} className="text-xs text-primary-400/40 mt-2">Send another</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="e.g. Happy Hour is LIVE! 🍻" maxLength={60}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-primary-500/40 focus:outline-none" />
                  <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} placeholder="Optional details..." maxLength={160} rows={2}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-primary-500/40 focus:outline-none resize-none" />
                  <button onClick={sendNotify} disabled={sending || !notifyTitle.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-500 py-2.5 text-sm font-bold text-black disabled:opacity-40 min-h-[44px]">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
