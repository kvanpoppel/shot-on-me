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
    try {
      if (editingPromo) {
        await axios.put(`${getApiUrl()}/venues/${venueId}/promotions/${editingPromo._id}`, formData, { headers: { Authorization: `Bearer ${token}` } })
        showSuccess('Deal updated!')
      } else {
        await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, formData, { headers: { Authorization: `Bearer ${token}` } })
        showSuccess('Deal published!')
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

        {/* ─ HEADER ─ */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-lg font-bold text-white">{greeting}</p>
            <p className="text-[11px] text-primary-400/50">{venueName} · {followerCount} followers</p>
          </div>
          {atLimit ? (
            <button onClick={() => router.push('/dashboard/settings')} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-3.5 py-2 text-xs font-bold text-black min-h-[40px]">
              <Crown className="w-3.5 h-3.5" /> Upgrade
            </button>
          ) : (
            <button onClick={() => { setEditingPromo(null); setShowWizard(true) }} className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-3.5 py-2 text-xs font-bold text-black min-h-[40px]">
              <Plus className="w-3.5 h-3.5" /> New Deal
            </button>
          )}
        </div>

        {/* ─ SECTION 1: WHAT'S LIVE (collapsible) ─ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setDealsOpen(o => !o)} className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary-400/40">Right Now</p>
              {live.length > 0 && <span className="text-[10px] font-bold text-emerald-400">{live.length} live</span>}
              <ChevronDown className={`w-3 h-3 text-primary-400/30 transition-transform ${dealsOpen ? '' : '-rotate-90'}`} />
            </button>
            <button onClick={() => router.push('/dashboard/promotions')} className="text-[10px] text-primary-400/40 hover:text-primary-400 flex items-center gap-0.5">
              All deals <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {dealsOpen && (<>
          {loadingData ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-black/40 animate-pulse" />)}</div>
          ) : live.length === 0 ? (
            /* Empty state — Quick Launch IS the content */
            <div className="rounded-xl border border-primary-500/15 bg-[#1a1510]/60 p-5">
              <p className="text-sm text-primary-400/70 text-center mb-4">No deals running — go live in one tap</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'happy-hour', emoji: '🍻', label: 'Happy Hour' },
                  { key: 'flash-deal', emoji: '⚡', label: 'Flash Deal' },
                  { key: 'vip', emoji: '👑', label: 'VIP Night' },
                ].map(d => (
                  <button key={d.key} onClick={() => quickLaunch(d.key)} disabled={atLimit}
                    className="rounded-xl border border-primary-500/15 bg-[#1a1510]/60 py-3 text-center hover:border-primary-500/30 hover:bg-[#1a1510]/80 transition-all disabled:opacity-30 min-h-[56px]">
                    <p className="text-lg">{d.emoji}</p><p className="text-[9px] font-bold text-primary-400/60 mt-0.5">{d.label}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Live deals */
            <div className="space-y-2">
              {live.map(p => {
                const end = p.isFlashDeal && p.flashDealEndsAt ? p.flashDealEndsAt : p.endTime
                const left = timeLeft(end)
                const urgent = new Date(end).getTime() - Date.now() < 3600000
                return (
                  <div key={p._id} className="rounded-xl border border-primary-500/15 bg-black/40 px-4 py-3 flex items-center gap-3">
                    <span className="text-base flex-shrink-0">{TYPE_EMOJI[p.type] || '🎉'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                      {p.offer && <p className="text-[11px] text-primary-500/80 truncate">{p.offer}</p>}
                    </div>
                    <span className={`text-[11px] font-semibold flex-shrink-0 ${urgent ? 'text-rose-400' : 'text-primary-400/50'}`}>
                      {urgent && <AlertCircle className="w-3 h-3 inline mr-0.5" />}{left}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingPromo(p); setShowWizard(true) }} className="text-[9px] text-primary-400/40 hover:text-primary-400 px-1.5 py-1 rounded border border-primary-500/15">
                        <Pencil className="w-3 h-3 inline" />
                      </button>
                      {confirmEndId === p._id ? (
                        <>
                          <button onClick={() => setConfirmEndId(null)} className="text-[9px] text-primary-400/50 px-1.5 py-1 rounded border border-primary-500/20">No</button>
                          <button onClick={() => endDeal(p._id)} disabled={endingId === p._id} className="text-[9px] font-bold text-white bg-rose-500 px-1.5 py-1 rounded">{endingId === p._id ? '...' : 'End'}</button>
                        </>
                      ) : (
                        <button onClick={() => endDeal(p._id)} className="text-[9px] text-rose-400/40 hover:text-rose-400 px-1.5 py-1 rounded border border-rose-500/10">End</button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Quick launch row when deals are running */}
              {!atLimit && (
                <div className="flex gap-2 pt-1">
                  {[
                    { key: 'happy-hour', emoji: '🍻' },
                    { key: 'flash-deal', emoji: '⚡' },
                    { key: 'vip', emoji: '👑' },
                  ].map(d => (
                    <button key={d.key} onClick={() => quickLaunch(d.key)}
                      className="flex-1 rounded-lg border border-primary-500/10 bg-black/30 py-2 text-center text-sm hover:bg-black/50 transition-all">
                      {d.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mt-3 px-1">
              <p className="text-[9px] uppercase tracking-widest text-primary-400/30 mb-1.5">Upcoming</p>
              {upcoming.map(p => (
                <div key={p._id} className="flex items-center justify-between py-1">
                  <span className="text-xs text-primary-400/50 truncate">{TYPE_EMOJI[p.type] || '🎉'} {p.title}</span>
                  <span className="text-[10px] text-primary-400/30 flex-shrink-0 ml-2">{new Date(p.startTime).toLocaleDateString([], { weekday: 'short' })} {new Date(p.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
          </>)}
        </div>

        {/* ─ SECTION 2: AI SUGGESTION OR UPGRADE HINT ─ */}
        {hasAI && visibleAI.length > 0 ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-400/40 mb-2">AI Recommends</p>
            {visibleAI.map((s, idx) => {
              const realIdx = aiSuggestions.indexOf(s)
              return (
                <div key={realIdx} className="rounded-xl border border-primary-500/15 bg-primary-500/[0.04] p-4 flex items-start gap-3 mb-2">
                  <span className="text-lg mt-0.5">{TYPE_EMOJI[s.type] || '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2">{s.description}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => approveAI(realIdx)} disabled={approvingAI === realIdx || atLimit}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 text-black text-[11px] font-bold disabled:opacity-40 min-h-[32px]">
                      {approvingAI === realIdx ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ThumbsUp className="w-3 h-3" /> Go Live</>}
                    </button>
                    <button onClick={() => setDismissedAI(prev => new Set(prev).add(realIdx))} className="p-1.5 rounded-lg text-primary-400/30 hover:text-primary-400/60">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : !hasAI && !loadingData ? (
          <div className="rounded-xl border border-primary-500/10 bg-black/30 p-4 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-primary-500/25 flex-shrink-0" />
            <p className="text-[11px] text-primary-400/50 flex-1">AI deal suggestions available on Growth plan</p>
            <button onClick={() => router.push('/dashboard/settings')} className="text-[10px] font-bold text-primary-500/60 hover:text-primary-500 flex-shrink-0">Upgrade</button>
          </div>
        ) : null}

        {/* ─ SECTION 3: YESTERDAY + NOTIFY ─ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-primary-500/15 bg-black/40 p-4">
            <p className="text-[10px] text-primary-400/40 mb-1">Yesterday</p>
            <p className="text-lg font-bold text-white">${stats.yesterdayRevenue}</p>
            <p className="text-[10px] text-primary-400/30">{stats.yesterdayRedemptions} redeemed</p>
          </div>
          <div className="rounded-xl border border-primary-500/15 bg-black/40 p-4">
            <p className="text-[10px] text-primary-400/40 mb-1">All Time</p>
            <p className="text-lg font-bold text-white">${stats.totalRevenue}</p>
            <button onClick={() => router.push('/dashboard/money')} className="text-[10px] text-primary-400/40 hover:text-primary-400 mt-1 flex items-center gap-0.5">
              See details <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Sales Tracker */}
        <div className="rounded-xl border border-primary-500/15 bg-[#1a1510]/50 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <span className="text-sm">📊</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Sales Tracker</p>
                  <p className="text-[10px] text-primary-400/40">Log your register total at close</p>
                </div>
              </div>
              <button onClick={() => router.push('/dashboard/money')} className="text-[10px] text-primary-400/40 hover:text-primary-400 flex items-center gap-0.5">
                Details <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <form className="flex items-center gap-2" onSubmit={async (e) => {
              e.preventDefault()
              const input = (e.target as HTMLFormElement).elements.namedItem('sales') as HTMLInputElement
              const val = parseFloat(input.value)
              if (!val || val <= 0 || !token) return
              try {
                await axios.post(`${getApiUrl()}/daily-sales`, { totalSales: val }, { headers: { Authorization: `Bearer ${token}` } })
                input.value = ''
                showSuccess('Sales logged!')
              } catch { showError('Failed to log') }
            }}>
              <div className="flex-1 flex items-center bg-black/40 border border-primary-500/15 rounded-lg px-3">
                <span className="text-sm text-primary-400/40">$</span>
                <input name="sales" type="number" step="0.01" min="0" placeholder="Today's total sales"
                  className="flex-1 bg-transparent py-2.5 px-1.5 text-sm text-white placeholder-primary-400/20 focus:outline-none" />
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-lg bg-primary-500 text-black text-xs font-bold hover:bg-primary-400 transition-all whitespace-nowrap">Log Sales</button>
            </form>
          </div>
          <div className="px-4 py-2.5 border-t border-primary-500/10 bg-black/20 flex items-center justify-between">
            <p className="text-[10px] text-primary-400/30">10 seconds at close. See your full picture over time.</p>
            <p className="text-[10px] text-primary-400/40">${stats.totalRevenue} redeemed via app this month</p>
          </div>
        </div>

        {/* Notify */}
        <div className="rounded-xl border border-primary-500/15 bg-black/40 overflow-hidden">
          <button onClick={() => { setNotifyOpen(o => !o); if (sent) { setSent(false); setNotifyTitle(''); setNotifyMsg('') } }}
            className="w-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-3.5 h-3.5 text-primary-500/60" />
              <p className="text-xs font-semibold text-white/60">Notify {followerCount} followers</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-primary-400/30 transition-transform ${notifyOpen ? 'rotate-180' : ''}`} />
          </button>
          {notifyOpen && (
            <div className="px-4 pb-4 border-t border-primary-500/10 pt-3">
              {sent ? (
                <div className="text-center py-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-white">Sent!</p>
                  <button onClick={() => { setSent(false); setNotifyTitle(''); setNotifyMsg('') }} className="text-[10px] text-primary-400/50 mt-1">Send another</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="e.g. Happy Hour is LIVE! 🍻" maxLength={60}
                    className="w-full rounded-lg border border-primary-500/15 bg-black/40 px-3 py-2 text-sm text-white placeholder-primary-400/30 focus:border-primary-500/30 focus:outline-none" />
                  <button onClick={sendNotify} disabled={sending || !notifyTitle.trim()}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2 text-xs font-bold text-black disabled:opacity-30 min-h-[40px]">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Send</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
