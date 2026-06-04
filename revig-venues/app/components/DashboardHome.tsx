'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { Gift, TrendingUp, Clock, DollarSign, MapPin, RefreshCw, Sparkles, ThumbsUp, X, Loader2, CheckCircle2, Circle, Settings, Megaphone, Share2, Copy } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Stats {
  totalRevenue: number
  totalRedemptions: number
  activePromos: number
  pendingPayouts: number
}

interface Checkin {
  _id: string
  user?: { firstName?: string; lastName?: string }
  amount?: number
  createdAt?: string
  note?: string
}

interface AISuggestion {
  type: string
  title: string
  description: string
  suggestedPromotion: any
  confidence: number
}

const DEAL_EMOJI: Record<string, string> = {
  'slow-day-boost': '📈', 'peak-optimization': '🍻', 'replicate-success': '🔁',
  'revenue-trend': '⚡', 'seasonal': '🎄', 'retention': '💌', 'strong-day-note': '💪'
}

export default function DashboardHome() {
  const { venue, token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [dismissedAI, setDismissedAI] = useState<Set<number>>(new Set())
  const [approvingAI, setApprovingAI] = useState<number | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Load onboarding dismissed state from localStorage
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`revig_onboarding_dismissed_${venue?.id}`)
      if (dismissed === 'true') setOnboardingDismissed(true)
    } catch {}
  }, [venue?.id])

  const dismissOnboarding = () => {
    setOnboardingDismissed(true)
    try {
      localStorage.setItem(`revig_onboarding_dismissed_${venue?.id}`, 'true')
    } catch {}
  }

  const copyVenueLink = () => {
    const link = `https://revig.shotonme.com/venue/${venue?.id}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {})
  }

  // Show onboarding when venue is new (no revenue, no active promos)
  const showOnboarding = !onboardingDismissed && stats && stats.totalRevenue === 0 && stats.activePromos === 0

  const fetchAll = useCallback(async (silent = false) => {
    if (!token || !venue?.id) return
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const [statsRes, checkinsRes, aiRes] = await Promise.allSettled([
        axios.get(`${getApiUrl()}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${getApiUrl()}/checkins?venueId=${venue.id}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${getApiUrl()}/ai-automation/suggestions?venueId=${venue.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data
        setStats({
          totalRevenue:     d.totalRevenue     ?? d.stats?.totalRevenue     ?? 0,
          totalRedemptions: d.totalRedemptions ?? d.stats?.totalRedemptions ?? 0,
          activePromos:     d.activePromos     ?? d.stats?.activePromos     ?? 0,
          pendingPayouts:   d.pendingPayouts   ?? d.stats?.pendingPayouts   ?? 0,
        })
      }
      if (checkinsRes.status === 'fulfilled') {
        setRecent((checkinsRes.value.data.checkins || checkinsRes.value.data || []).slice(0, 5))
      }
      if (aiRes.status === 'fulfilled') {
        setAiSuggestions((aiRes.value.data.suggestions || []).slice(0, 2))
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, venue?.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const balance = venue?.wallet?.balance ?? 0
  const [autoLog, setAutoLog] = useState<{ action: string; detail: string; createdAt: string; promotionTitle?: string }[]>([])

  useEffect(() => {
    if (!token || !venue?.id) return
    axios.get(`${getApiUrl()}/automation-log?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setAutoLog(res.data.logs || []))
      .catch(() => {})
  }, [token, venue?.id])

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-5" style={{ background: '#0F0F1E' }}>
      {/* ═══ 1. THE NUMBER ═══ */}
      <div className="rounded-3xl p-6 mt-6 mb-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #252540, #2A2A48)' }}>
        <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: '#C8F135', transform: 'translate(20%,-20%)' }} />
        <div className="flex items-start justify-between mb-1">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">{venue?.name || 'Your Venue'}</p>
          <div className="flex items-center gap-1.5">
            {stats && stats.activePromos > 0 ? (
              <>
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#C8F135', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span><span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#C8F135' }}></span></span>
                <span className="text-[10px] font-semibold" style={{ color: '#C8F135' }}>{stats.activePromos} live</span>
              </>
            ) : (
              <button onClick={() => fetchAll(true)} disabled={refreshing}>
                <RefreshCw className={`w-3.5 h-3.5 text-white/30 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
        <p className="text-4xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
          ${stats ? stats.totalRevenue.toFixed(2) : balance.toFixed(2)}
        </p>
        <p className="text-[11px] text-white/35 mt-1">
          total via Revig
          {stats && stats.totalRedemptions > 0 && <> · {stats.totalRedemptions} redemptions</>}
        </p>
      </div>

      {/* ═══ ONBOARDING CHECKLIST ═══ */}
      {showOnboarding && (
        <div className="mb-5 rounded-xl p-4 relative" style={{ background: 'rgba(200,241,53,0.04)', border: '1px solid rgba(200,241,53,0.12)' }}>
          <button
            onClick={dismissOnboarding}
            className="absolute top-3 right-3 p-1 rounded-lg text-white/20 hover:text-white/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(200,241,53,0.6)' }}>
            Getting Started
          </p>

          <div className="flex flex-col gap-2.5">
            {/* Step 1: Complete profile */}
            <div className="flex items-start gap-3">
              <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(200,241,53,0.4)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Complete your profile</p>
                <p className="text-[11px] text-white/35 mt-0.5">Add your venue details in Settings</p>
              </div>
              <a
                href="#settings"
                onClick={(e) => {
                  e.preventDefault()
                  // Navigate to settings tab — dispatch event the parent shell listens for
                  window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'settings' }))
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0"
                style={{ background: 'rgba(200,241,53,0.1)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.2)' }}
              >
                <Settings className="w-3 h-3 inline mr-1" />
                Settings
              </a>
            </div>

            {/* Step 2: Create first deal */}
            <div className="flex items-start gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
              <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(200,241,53,0.4)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Create your first deal</p>
                <p className="text-[11px] text-white/35 mt-0.5">Set up a promotion to attract customers</p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'promos' }))}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0"
                style={{ background: 'rgba(200,241,53,0.1)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.2)' }}
              >
                <Megaphone className="w-3 h-3 inline mr-1" />
                Deals
              </button>
            </div>

            {/* Step 3: Share venue page */}
            <div className="flex items-start gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
              <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(200,241,53,0.4)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Share your venue page</p>
                <p className="text-[11px] text-white/35 mt-0.5">Copy your link and share with customers</p>
              </div>
              <button
                onClick={copyVenueLink}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition-all"
                style={{
                  background: linkCopied ? 'rgba(200,241,53,0.2)' : 'rgba(200,241,53,0.1)',
                  color: '#C8F135',
                  border: '1px solid rgba(200,241,53,0.2)',
                }}
              >
                {linkCopied ? (
                  <><CheckCircle2 className="w-3 h-3 inline mr-1" /> Copied!</>
                ) : (
                  <><Copy className="w-3 h-3 inline mr-1" /> Copy Link</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 2. WHAT THE AI DID ═══ */}
      {autoLog.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(200,241,53,0.35)' }}>AI Activity</p>
          <div className="space-y-1.5">
            {autoLog.map((log, i) => {
              const d = new Date(log.createdAt)
              const timeStr = d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const icon = log.action === 'auto_flash_deal' ? '⚡' : log.action === 'auto_deal_posted' ? '🤖' : '📋'
              return (
                <div key={i} className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-xs mt-0.5">{icon}</span>
                  <p className="flex-1 text-[11px] text-white/55 leading-snug">{log.detail}</p>
                  <span className="text-[9px] text-white/20 flex-shrink-0">{timeStr}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.filter((_, i) => !dismissedAI.has(i)).length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(200,241,53,0.5)' }}>
            <Sparkles className="w-3 h-3 inline mr-1" />AI Recommends
          </p>
          <div className="space-y-2">
            {aiSuggestions.map((s, idx) => {
              if (dismissedAI.has(idx)) return null
              return (
                <div key={idx} className="rounded-xl p-3.5 flex items-start gap-3" style={{
                    background: s.type === 'slow-right-now' ? 'rgba(255,95,87,0.06)' : 'rgba(200,241,53,0.04)',
                    border: s.type === 'slow-right-now' ? '1px solid rgba(255,95,87,0.25)' : '1px solid rgba(200,241,53,0.12)',
                  }}>
                  <span className="text-lg mt-0.5">{DEAL_EMOJI[s.type] || '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    {s.type === 'slow-right-now' && (
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#FF5F57' }}>Slow right now</p>
                    )}
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2">{s.description}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {s.suggestedPromotion && (
                      <button
                        onClick={async () => {
                          setApprovingAI(idx)
                          try {
                            await axios.post(`${getApiUrl()}/ai-automation/suggestions/apply`, {
                              venueId: venue?.id, suggestionIndex: idx, suggestion: s
                            }, { headers: { Authorization: `Bearer ${token}` } })
                            setDismissedAI(prev => new Set(prev).add(idx))
                          } catch {} finally { setApprovingAI(null) }
                        }}
                        disabled={approvingAI === idx}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 min-h-[32px]"
                        style={{
                          background: s.type === 'slow-right-now' ? '#FF5F57' : '#C8F135',
                          color: s.type === 'slow-right-now' ? '#fff' : '#0F0F1E'
                        }}
                      >
                        {approvingAI === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ThumbsUp className="w-3 h-3" /> Go Live</>}
                      </button>
                    )}
                    <button onClick={() => setDismissedAI(prev => new Set(prev).add(idx))} className="p-1.5 rounded-lg text-white/20 hover:text-white/40">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent redemptions */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">Recent Redemptions</h2>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="rounded-2xl h-14 animate-pulse" style={{ background: '#1C1C32' }} />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="fv-card py-10 text-center">
            <p className="text-2xl mb-2">🧋</p>
            <p className="text-white/40 text-sm">No redemptions yet</p>
            <p className="text-white/25 text-xs mt-1">Gifts redeemed at your venue will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map(c => {
              const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'A customer'
              const ago = c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''
              return (
                <div key={c._id} className="fv-card px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(200,241,53,0.12)', color: '#C8F135' }}>
                    {(c.user?.firstName?.[0] || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                    {ago && <p className="text-xs text-white/30">{ago}</p>}
                  </div>
                  {c.amount != null && (
                    <p className="font-black text-base flex-shrink-0" style={{ color: '#C8F135' }}>
                      +${c.amount.toFixed(2)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="fv-card p-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 flex-shrink-0" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-xs text-white/35 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
