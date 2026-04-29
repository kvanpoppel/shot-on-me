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
  Plus, Clock, Eye, Zap, ChevronRight, CheckCircle2,
  Loader2, DollarSign, Send, Crown, Users, Sparkles,
  AlertCircle, Megaphone, ChevronDown,
} from 'lucide-react'

interface Promotion {
  _id: string; title: string; offer?: string; type: string
  isActive?: boolean; startTime: string; endTime: string
  isFlashDeal?: boolean; flashDealEndsAt?: string
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

const TYPE_EMOJI: Record<string, string> = {
  'happy-hour': '🍻', 'flash-deal': '⚡', 'special': '🎉',
  'exclusive': '👑', 'event': '🎪', 'weekend': '🎉',
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { venueId, venueName, tier, followerCount } = useVenue()
  const { socket } = useSocket()
  const { showError, showSuccess, showInfo } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({ totalRevenue: 0, totalRedemptions: 0 })
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [launchingDeal, setLaunchingDeal] = useState<string | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null)

  // Notify
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Tick for countdowns
  const [, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(t) }, [])

  useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])

  const fetchData = useCallback(async () => {
    if (!venueId || !token) return
    setLoadingData(true)
    try {
      const [statsRes, venueRes] = await Promise.allSettled([
        axios.get(`${getApiUrl()}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${getApiUrl()}/venues/${venueId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.status === 'fulfilled') {
        setStats({ totalRevenue: statsRes.value.data.totalRevenue || 0, totalRedemptions: statsRes.value.data.totalRedemptions || 0 })
      }
      if (venueRes.status === 'fulfilled') {
        setPromotions(venueRes.value.data.venue?.promotions || [])
      }
    } catch {} finally { setLoadingData(false) }
  }, [venueId, token])

  useEffect(() => { fetchData() }, [fetchData])

  // Socket
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

  const handleQuickLaunch = async (type: string) => {
    if (!venueId || !token || launchingDeal) return
    setLaunchingDeal(type)
    const now = new Date()
    const defaults: Record<string, any> = {
      'happy-hour': { title: 'Happy Hour', description: 'Discounted drinks!', type: 'happy-hour', startTime: now.toISOString(), endTime: new Date(now.getTime() + 3 * 3600000).toISOString() },
      'flash-deal': { title: 'Flash Deal', description: 'Limited time only!', type: 'flash-deal', isFlashDeal: true, startTime: now.toISOString(), endTime: new Date(now.getTime() + 3600000).toISOString(), flashDealEndsAt: new Date(now.getTime() + 3600000).toISOString() },
      'vip': { title: 'VIP Exclusive', description: 'VIP guests only tonight!', type: 'exclusive', startTime: now.toISOString(), endTime: new Date(now.getTime() + 4 * 3600000).toISOString() },
    }
    const data = defaults[type] || defaults['happy-hour']
    data.targeting = { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false }

    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, data, { headers: { Authorization: `Bearer ${token}` } })
      showSuccess(`${data.title} is live!`)
      setNotifyTitle(`${data.title} is LIVE at ${venueName}! 🎉`)
      setNotifyOpen(true)
      fetchData()
    } catch (e: any) { showError(e?.response?.data?.error || 'Failed to launch') }
    finally { setLaunchingDeal(null) }
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
  const isFreeTier = tier === 'free'
  const atLimit = isFreeTier && activeDeals.length >= 1

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-10 space-y-4 max-w-2xl mx-auto">

        {/* Greeting + New Deal */}
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

        {/* 3 Stats — simple row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-black/50 p-3 text-center">
            <p className="text-xl font-bold text-primary-400">{loadingData ? '—' : activeDeals.length}</p>
            <p className="text-[10px] text-white/30 mt-0.5">Live Deals</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/50 p-3 text-center">
            <p className="text-xl font-bold text-cyan-400">{loadingData ? '—' : followerCount}</p>
            <p className="text-[10px] text-white/30 mt-0.5">Followers</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/50 p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{loadingData ? '—' : `$${stats.totalRevenue}`}</p>
            <p className="text-[10px] text-white/30 mt-0.5">Revenue</p>
          </div>
        </div>

        {/* Quick Launch — 3 buttons, one row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'happy-hour', label: 'Happy Hour', emoji: '🍻' },
            { key: 'flash-deal', label: 'Flash Deal', emoji: '⚡' },
            { key: 'vip', label: 'VIP Night', emoji: '👑' },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => handleQuickLaunch(d.key)}
              disabled={!!launchingDeal || atLimit}
              className={`rounded-xl border border-primary-500/20 bg-black/50 p-3 text-center hover:border-primary-500/40 hover:bg-black/70 transition-all disabled:opacity-40 min-h-[60px] ${launchingDeal === d.key ? 'border-primary-500/50' : ''}`}
            >
              {launchingDeal === d.key ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary-500 mx-auto" />
              ) : (
                <>
                  <p className="text-xl mb-0.5">{d.emoji}</p>
                  <p className="text-[10px] font-bold text-primary-400/70">{d.label}</p>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Live Deals */}
        <div className="rounded-xl border border-primary-500/15 bg-black/50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              {activeDeals.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              <p className="text-sm font-bold text-white">Live Deals</p>
            </div>
            <button onClick={() => router.push('/dashboard/promotions')} className="text-xs text-primary-400/40 hover:text-primary-400 flex items-center gap-1">
              All deals <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loadingData ? (
            <div className="p-4 space-y-3">{[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-white/3 animate-pulse" />)}</div>
          ) : activeDeals.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-white/40">No deals running right now</p>
              <p className="text-xs text-white/20 mt-1">Tap a Quick Launch button above to go live</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {activeDeals.map(p => {
                const end = p.isFlashDeal && p.flashDealEndsAt ? p.flashDealEndsAt : p.endTime
                const remaining = timeLeft(end)
                const urgent = new Date(end).getTime() - Date.now() < 3600000
                return (
                  <div key={p._id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg flex-shrink-0">{TYPE_EMOJI[p.type] || '🎉'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.title}</p>
                          {p.offer && <p className="text-xs text-primary-500 truncate">{p.offer}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold ${urgent ? 'text-rose-400' : 'text-primary-400/50'}`}>
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
                          <button onClick={() => handleEnd(p._id)} className="text-[10px] text-rose-400/60 hover:text-rose-400 px-2 py-1 rounded border border-rose-500/20">End</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notify Guests */}
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
