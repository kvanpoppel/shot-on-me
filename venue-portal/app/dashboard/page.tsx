'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../components/ToastContainer'
import { useFeatureAvailable } from '../components/FeatureGate'
import DashboardLayout from '../components/DashboardLayout'
import PromotionWizard from '../components/promotions/PromotionWizard'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import {
  Plus, Clock, ChevronRight, Loader2, Send, Crown,
  Sparkles, AlertCircle, Megaphone, ChevronDown,
  ThumbsUp, X, CheckCircle2, Pencil,
} from 'lucide-react'

interface Promotion {
  _id: string; title: string; offer?: string; description?: string; type: string
  isActive?: boolean; startTime: string; endTime: string
  isFlashDeal?: boolean; flashDealEndsAt?: string
  analytics?: { views?: number; clicks?: number; redemptions?: number; revenue?: number }
}

interface AISuggestion {
  title: string; description: string; type: string
  confidence?: number; reasoning?: string
  startTime?: string; endTime?: string
}

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
  'happy-hour': '🍻', 'flash-deal': '⚡', 'special': '🎉', 'exclusive': '👑', 'event': '🎪',
  'slow-right-now': '🔥', 'slow-day-boost': '📈', 'peak-optimization': '🍻',
  'replicate-success': '🔁', 'revenue-trend': '⚡', 'retention': '💌',
  'strong-day-note': '💪', 'seasonal': '🎄', 'weekend-prep': '🎊',
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { venueId, venueName, tier, followerCount, loading: venueLoading, refetch: refetchVenue } = useVenue()
  const { socket } = useSocket()
  const { showError, showSuccess, showInfo } = useToast()
  const router = useRouter()
  const hasAI = useFeatureAvailable('growth')

  const [stats, setStats] = useState({ totalRevenue: 0, yesterdayRevenue: 0, yesterdayRedemptions: 0 })
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [approvingAI, setApprovingAI] = useState<number | null>(null)
  const [dismissedAI, setDismissedAI] = useState<Set<number>>(new Set())
  const [endingId, setEndingId] = useState<string | null>(null)
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [quickLaunchData, setQuickLaunchData] = useState<Record<string, any> | null>(null)
  const [dealsOpen, setDealsOpen] = useState(true)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [, setTick] = useState(0)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(t) }, [])
  useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])

  const handleJoinVenue = async () => {
    if (!joinCode.trim() || !token) return
    setJoining(true)
    setJoinError('')
    try {
      await axios.post(`${getApiUrl()}/venues/join`, { code: joinCode.trim() }, { headers: { Authorization: `Bearer ${token}` } })
      refetchVenue()
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Invalid code')
    } finally {
      setJoining(false)
    }
  }

  const fetchData = useCallback(async () => {
    if (!venueId || !token) return
    setLoadingData(true)
    try {
      const [sRes, vRes] = await Promise.allSettled([
        axios.get(`${getApiUrl()}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${getApiUrl()}/venues/${venueId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (sRes.status === 'fulfilled') {
        const d = sRes.value.data
        setStats({ totalRevenue: d.totalRevenue || 0, yesterdayRevenue: d.yesterdayRevenue || 0, yesterdayRedemptions: d.yesterdayRedemptions || 0 })
      }
      if (vRes.status === 'fulfilled') setPromotions(vRes.value.data.venue?.promotions || [])
    } catch (e: any) {
      console.error('Dashboard fetch:', e?.message)
      showError('Could not load data.')
    } finally { setLoadingData(false) }
  }, [venueId, token])

  const fetchAI = useCallback(async () => {
    if (!venueId || !token || !hasAI) return
    try {
      const res = await axios.get(`${getApiUrl()}/ai-automation/suggestions?venueId=${venueId}`, { headers: { Authorization: `Bearer ${token}` } })
      setAiSuggestions((res.data.suggestions || []).slice(0, 2))
    } catch {}
  }, [venueId, token, hasAI])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchAI() }, [fetchAI])

  useEffect(() => {
    if (!socket || !venueId) return
    const r = () => fetchData()
    const onRevig = (d: any) => { if (d.venueId === venueId) { showSuccess(`$${d.amount} Revig received!`); fetchData() } }
    const onIn = (d: any) => { if (d.venueId === venueId) { showInfo('New check-in!'); fetchData() } }
    const onPay = (d: any) => { if (d.venueId === venueId) { showSuccess('Payment received!'); fetchData() } }
    socket.on('promotion-updated', r); socket.on('new-promotion', r); socket.on('promotion-deleted', r)
    socket.on('revig-received', onRevig); socket.on('venue-checkin', onIn); socket.on('venue-paid', onPay)
    return () => { socket.off('promotion-updated', r); socket.off('new-promotion', r); socket.off('promotion-deleted', r); socket.off('revig-received', onRevig); socket.off('venue-checkin', onIn); socket.off('venue-paid', onPay) }
  }, [socket, venueId])

  const quickLaunch = (type: string) => {
    if (!venueId || !token) return
    const presets: Record<string, any> = {
      'happy-hour': { title: 'Happy Hour', offer: '$5 wells and drafts', description: 'Discounted drinks!', type: 'happy-hour' },
      'flash-deal': { title: 'Flash Deal', offer: '$3 shots for the next hour', description: 'Limited time only!', type: 'flash-deal', isFlashDeal: true },
      'vip': { title: 'VIP Night', offer: 'Bottle service 25% off', description: 'VIP only tonight!', type: 'exclusive' },
    }
    const data = presets[type] || presets['happy-hour']
    setQuickLaunchData(data)
    setEditingPromo(null)
    setShowWizard(true)
  }

  const approveAI = async (idx: number) => {
    if (!venueId || !token) return
    setApprovingAI(idx)
    const s = aiSuggestions[idx]
    const now = new Date()
    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, {
        title: s.title, description: s.description, type: s.type || 'special',
        startTime: s.startTime || now.toISOString(), endTime: s.endTime || new Date(now.getTime() + 3 * 3600000).toISOString(),
        targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false },
      }, { headers: { Authorization: `Bearer ${token}` } })
      showSuccess(`"${s.title}" is live!`)
      setDismissedAI(prev => new Set(prev).add(idx))
      fetchData()
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed') }
    finally { setApprovingAI(null) }
  }

  const endDeal = async (id: string) => {
    if (confirmEndId !== id) { setConfirmEndId(id); return }
    setConfirmEndId(null); setEndingId(id)
    try { await axios.delete(`${getApiUrl()}/venues/${venueId}/promotions/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData() }
    catch (e: any) { showError(e?.response?.data?.error || 'Failed') }
    finally { setEndingId(null) }
  }

  const handleWizardSave = async (formData: any) => {
    if (!venueId || !token) return
    const { imageFile, ...dealData } = formData
    try {
      let promoId: string | null = null
      if (editingPromo) {
        await axios.put(`${getApiUrl()}/venues/${venueId}/promotions/${editingPromo._id}`, dealData, { headers: { Authorization: `Bearer ${token}` } })
        promoId = editingPromo._id
        showSuccess('Deal updated!')
      } else {
        const res = await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, dealData, { headers: { Authorization: `Bearer ${token}` } })
        promoId = res.data.promotion?._id
        showSuccess('Deal published!')
      }

      // Upload image if provided
      if (imageFile && promoId) {
        const fd = new FormData()
        fd.append('image', imageFile)
        await axios.post(`${getApiUrl()}/venues/${venueId}/promotions/${promoId}/image`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        })
      }

      setShowWizard(false)
      setEditingPromo(null)
      setQuickLaunchData(null)
      fetchData()
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed to save deal') }
  }

  const sendNotify = async () => {
    if (!token || !venueId || !notifyTitle.trim()) return
    setSending(true)
    try { await axios.post(`${getApiUrl()}/venues/${venueId}/notify-followers`, { title: notifyTitle.trim(), message: notifyMsg.trim() }, { headers: { Authorization: `Bearer ${token}` } }); setSent(true) }
    catch (e: any) { showError(e?.response?.data?.error || 'Failed') }
    finally { setSending(false) }
  }

  const [autoLog, setAutoLog] = useState<{ action: string; detail: string; createdAt: string; promotionTitle?: string }[]>([])

  const fetchAutoLog = useCallback(async () => {
    if (!venueId || !token) return
    try {
      const res = await axios.get(`${getApiUrl()}/automation-log?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      setAutoLog(res.data.logs || [])
    } catch {}
  }, [venueId, token])

  useEffect(() => { fetchAutoLog() }, [fetchAutoLog])

  if (loading || venueLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" /></div>
  if (!user) return null

  // No venue access — show join screen
  if (!venueId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-sm w-full text-center space-y-4">
            <h2 className="text-lg font-bold text-white">Join a Venue</h2>
            <p className="text-xs text-primary-400/60">Enter the access code given to you by the venue owner.</p>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoinVenue()}
              placeholder="Enter access code"
              className="w-full px-4 py-3 rounded-xl bg-[#1a1510]/60 border border-primary-500/20 text-white text-center text-sm placeholder-primary-400/30 focus:border-primary-500/40 focus:outline-none"
            />
            {joinError && <p className="text-xs text-red-400">{joinError}</p>}
            <button
              onClick={handleJoinVenue}
              disabled={joining || !joinCode.trim()}
              className="w-full py-3 rounded-xl bg-primary-500 text-black font-bold text-sm hover:bg-primary-400 disabled:opacity-30 transition-all"
            >
              {joining ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const live = promotions.filter(isLive)
  const upcoming = promotions.filter(isUpcoming).slice(0, 3)
  const isPaid = tier !== 'free'
  const atLimit = isPaid ? false : live.length >= 2
  const visibleAI = aiSuggestions.filter((_, i) => !dismissedAI.has(i))

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-10 max-w-xl mx-auto space-y-5">

        {/* ═══ 1. THE NUMBER ═══ */}
        <div className="rounded-2xl border border-primary-500/15 bg-gradient-to-br from-[#1a1510]/80 to-black/60 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none bg-primary-500" style={{ transform: 'translate(30%,-30%)' }} />
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs text-primary-400/50 font-semibold uppercase tracking-wider">{venueName}</p>
            <div className="flex items-center gap-1.5">
              {live.length > 0 ? (
                <>
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span></span>
                  <span className="text-[10px] font-semibold text-emerald-400">{live.length} live</span>
                </>
              ) : (
                <span className="text-[10px] text-primary-400/30">{followerCount} followers</span>
              )}
            </div>
          </div>
          <p className="text-4xl font-extrabold text-white tracking-tight">${stats.totalRevenue}</p>
          <p className="text-[11px] text-primary-400/40 mt-1">
            total via Shot On Me
            {stats.yesterdayRevenue > 0 && <> · <span className="text-primary-400/60">${stats.yesterdayRevenue} yesterday</span></>}
          </p>
        </div>

        {/* ═══ 2. WHAT THE AI DID ═══ */}
        {(autoLog.length > 0 || (hasAI && visibleAI.length > 0)) && (
          <div>
            {/* AI activity log — what already happened */}
            {autoLog.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/30 mb-2">AI Activity</p>
                <div className="space-y-1.5">
                  {autoLog.map((log, i) => {
                    const d = new Date(log.createdAt)
                    const timeStr = d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    const icon = log.action === 'auto_flash_deal' ? '⚡' : log.action === 'auto_deal_posted' ? '🤖' : '📋'
                    return (
                      <div key={i} className="rounded-lg border border-primary-500/10 bg-black/30 px-3 py-2 flex items-start gap-2">
                        <span className="text-xs mt-0.5">{icon}</span>
                        <p className="flex-1 text-[11px] text-white/60 leading-snug">{log.detail}</p>
                        <span className="text-[9px] text-primary-400/25 flex-shrink-0">{timeStr}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* AI suggestions — what it wants to do next */}
            {hasAI && visibleAI.length > 0 && visibleAI.map((s, idx) => {
              const realIdx = aiSuggestions.indexOf(s)
              const isUrgent = s.type === 'slow-right-now'
              return (
                <div key={realIdx} className={`rounded-xl border p-3.5 flex items-start gap-3 mb-2 ${
                  isUrgent ? 'border-rose-500/30 bg-rose-500/[0.06]' : 'border-primary-500/15 bg-primary-500/[0.04]'
                }`}>
                  <span className="text-base mt-0.5">{TYPE_EMOJI[s.type] || '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    {isUrgent && <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">Slow right now</p>}
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2">{s.description}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => approveAI(realIdx)} disabled={approvingAI === realIdx || atLimit}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 min-h-[32px] ${isUrgent ? 'bg-rose-500 text-white' : 'bg-primary-500 text-black'}`}>
                      {approvingAI === realIdx ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ThumbsUp className="w-3 h-3" /> Go Live</>}
                    </button>
                    <button onClick={() => setDismissedAI(prev => new Set(prev).add(realIdx))} className="p-1.5 rounded-lg text-primary-400/30 hover:text-primary-400/60">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}

            {!hasAI && !loadingData && (
              <div className="rounded-xl border border-primary-500/10 bg-black/30 p-3.5 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-primary-500/25 flex-shrink-0" />
                <p className="text-[11px] text-primary-400/50 flex-1">AI deal suggestions available on Pro plan</p>
                <button onClick={() => router.push('/dashboard/settings')} className="text-[10px] font-bold text-primary-500/60 hover:text-primary-500 flex-shrink-0">Upgrade</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ 3. LIVE RIGHT NOW ═══ */}
        {loadingData ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-black/40 animate-pulse" />)}</div>
        ) : live.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/30">Live Now</p>
              <button onClick={() => router.push('/dashboard/promotions')} className="text-[10px] text-primary-400/40 hover:text-primary-400 flex items-center gap-0.5">
                All deals <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {live.map(p => {
                const end = p.isFlashDeal && p.flashDealEndsAt ? p.flashDealEndsAt : p.endTime
                const left = timeLeft(end)
                const urgent = new Date(end).getTime() - Date.now() < 3600000
                const rev = p.analytics?.revenue || 0
                const reds = p.analytics?.redemptions || 0
                return (
                  <div key={p._id} className="rounded-xl border border-primary-500/15 bg-black/40 px-4 py-3 flex items-center gap-3">
                    <span className="text-base flex-shrink-0">{TYPE_EMOJI[p.type] || '🎉'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                      {(rev > 0 || reds > 0) && (
                        <p className="text-[10px] text-emerald-400/60 mt-0.5">${rev} revenue · {reds} redemptions</p>
                      )}
                    </div>
                    <span className={`text-[11px] font-semibold flex-shrink-0 ${urgent ? 'text-rose-400' : 'text-primary-400/50'}`}>
                      {left}
                    </span>
                    <button onClick={() => endDeal(p._id)} className="text-[9px] text-primary-400/30 hover:text-rose-400 px-1.5 py-1 rounded border border-primary-500/10 flex-shrink-0">
                      {confirmEndId === p._id ? 'Confirm?' : 'End'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* No deals running — quick launch */
          <div className="rounded-xl border border-primary-500/10 bg-black/30 p-5">
            <p className="text-xs text-primary-400/50 text-center mb-3">No deals running</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'happy-hour', emoji: '🍻', label: 'Happy Hour' },
                { key: 'flash-deal', emoji: '⚡', label: 'Flash Deal' },
                { key: 'vip', emoji: '👑', label: 'VIP Night' },
              ].map(d => (
                <button key={d.key} onClick={() => quickLaunch(d.key)} disabled={atLimit}
                  className="rounded-xl border border-primary-500/15 bg-[#1a1510]/40 py-3 text-center hover:border-primary-500/25 transition-all disabled:opacity-30">
                  <p className="text-lg">{d.emoji}</p><p className="text-[9px] font-bold text-primary-400/50 mt-0.5">{d.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Promotion Wizard — opens inline as modal */}
      {showWizard && (
        <PromotionWizard
          isEditing={!!editingPromo}
          initialData={editingPromo ? {
            title: editingPromo.title,
            offer: editingPromo.offer || '',
            description: editingPromo.description || '',
            type: editingPromo.type,
            startTime: editingPromo.startTime,
            endTime: editingPromo.endTime,
            isFlashDeal: editingPromo.isFlashDeal || false,
            flashDealEndsAt: editingPromo.flashDealEndsAt || '',
          } : quickLaunchData ? quickLaunchData : undefined}
          onSave={handleWizardSave}
          onCancel={() => { setShowWizard(false); setEditingPromo(null); setQuickLaunchData(null) }}
        />
      )}
    </DashboardLayout>
  )
}
