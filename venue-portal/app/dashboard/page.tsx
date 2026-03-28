'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ToastContainer'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageShell from '../components/DashboardPageShell'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Activity, ArrowRight, Sparkles, BarChart3, Users, Bot, CheckCircle2, Circle, X, TrendingUp, Clock } from 'lucide-react'

interface ImpactSummary {
  headline: string
  upliftRangePercent: string
  expectedReachUsers: number
  confidence: number
  nextActionLabel: string
  nextActionHref: string
}

interface BusySlot {
  day: string
  hour: number
  level: 'low' | 'medium' | 'high'
}

interface BusyTimesData {
  slots?: BusySlot[]
  busiestSlots?: { day: string; hour: number; label?: string }[]
  slowestSlots?: { day: string; hour: number; label?: string }[]
  suggestions?: string[]
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalRevenue: '0.00',
    totalRedemptions: 0,
    pendingPayouts: '0.00',
    activePromos: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [showAIDealModal, setShowAIDealModal] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [publishingDealType, setPublishingDealType] = useState<string | null>(null)
  const [latestImpact, setLatestImpact] = useState<ImpactSummary | null>(null)
  const [onboarding, setOnboarding] = useState({
    venueReady: false,
    payoutsConnected: false,
    firstDealLaunched: false
  })
  const [busyTimes, setBusyTimes] = useState<BusyTimesData | null>(null)
  const [loadingBusy, setLoadingBusy] = useState(false)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      // Silently redirect - no need to log
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) {
      fetchDashboardStats()
    }
  }, [token, user])

  const fetchDashboardStats = async () => {
    if (!token) return
    
    try {
      setLoadingStats(true)
      const apiUrl = getApiUrl()
      const [statsRes, venuesRes, connectRes] = await Promise.all([
        axios.get(`${apiUrl}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${apiUrl}/venues`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${apiUrl}/venues/connect/status`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { connected: false } }))
      ])

      const venues = Array.isArray(venuesRes.data) ? venuesRes.data : venuesRes.data?.venues || []
      const myVenue = venues[0]
      const resolvedVenueId = myVenue?._id || null
      setVenueId(resolvedVenueId)
      if (resolvedVenueId) {
        fetchBusyTimes(resolvedVenueId)
      }

      setStats({
        totalRevenue: `$${statsRes.data.totalRevenue}`,
        totalRedemptions: statsRes.data.totalRedemptions,
        pendingPayouts: `$${statsRes.data.pendingPayouts}`,
        activePromos: statsRes.data.activePromos
      })

      setOnboarding({
        venueReady: Boolean(myVenue?.name && (myVenue?.address || myVenue?.phone || myVenue?.location?.address)),
        payoutsConnected: Boolean(connectRes.data?.connected),
        firstDealLaunched: Number(statsRes.data.activePromos || 0) > 0
      })
    } catch (error: any) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Failed to fetch dashboard stats:', error.message || error)
      }
      // Keep default values on error
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchBusyTimes = async (vid: string) => {
    if (!token) return
    setLoadingBusy(true)
    try {
      const apiUrl = getApiUrl()
      const res = await axios.get(`${apiUrl}/busy-times/${vid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBusyTimes(res.data || null)
    } catch {
      setBusyTimes(null)
    } finally {
      setLoadingBusy(false)
    }
  }

  const handleInstantAIDeal = async (dealType: 'happy-hour' | 'flash-deal' | 'weekend' | 'vip') => {
    if (!token || !venueId || publishingDealType) return

    try {
      setPublishingDealType(dealType)
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/ai-automation/instant-deal`,
        { venueId, dealType },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const source = response.data?.source === 'ai' ? 'AI-optimized' : 'best-practice'
      showSuccess(`${source} ${dealType.replace('-', ' ')} published.`)
      if (response.data?.impact) {
        setLatestImpact(response.data.impact as ImpactSummary)
      }
      setShowAIDealModal(false)
      fetchDashboardStats()
    } catch (error: any) {
      showError(error?.response?.data?.error || 'Failed to publish instant AI deal')
    } finally {
      setPublishingDealType(null)
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const onboardingSteps = [
    { id: 'venue', label: 'Complete venue profile', done: onboarding.venueReady, href: '/dashboard/profile' },
    { id: 'payouts', label: 'Connect payouts', done: onboarding.payoutsConnected, href: '/dashboard/settings' },
    { id: 'deal', label: 'Launch first AI deal', done: onboarding.firstDealLaunched, href: '/dashboard/promotions?action=happy-hour' }
  ]
  const completedSteps = onboardingSteps.filter((step) => step.done).length
  const progressPct = Math.round((completedSteps / onboardingSteps.length) * 100)

  return (
    <DashboardLayout>
      <DashboardPageShell
        icon={<Activity className="w-5 h-5 text-primary-500" />}
        title="Dashboard"
        subtitle="Your fastest path to venue performance, promotions, and daily activity."
        actions={(
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowAIDealModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-primary-400"
              >
                Create AI Deal
                <Bot className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push('/dashboard/redemptions')}
                className="inline-flex items-center gap-2 rounded-lg border border-primary-500/30 bg-black/40 px-4 py-2 text-sm font-semibold text-primary-400 transition hover:border-primary-500/50 hover:text-primary-500"
              >
                View Activity
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        metrics={[
          {
            label: 'Revenue',
            value: loadingStats ? '...' : stats.totalRevenue,
            detail: 'Last 30 days',
            tone: 'success'
          },
          {
            label: 'Active Promotions',
            value: loadingStats ? '...' : `${stats.activePromos}`,
            detail: 'Currently running and scheduled'
          },
          {
            label: 'Guest Activity',
            value: loadingStats ? '...' : `${stats.totalRedemptions}`,
            detail: 'Total payment events'
          }
        ]}
      >
        <div className="rounded-xl border border-primary-500/20 bg-black/35 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-primary-500">Get Started Checklist</p>
            <p className="text-xs text-primary-400/80">{completedSteps}/{onboardingSteps.length} complete</p>
          </div>
          <div className="mb-3 h-2 rounded-full bg-black/60">
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-primary-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {onboardingSteps.map((step) => (
              <button
                key={step.id}
                onClick={() => router.push(step.href)}
                className="flex items-center justify-between rounded-lg border border-primary-500/15 bg-black/30 px-3 py-2 text-left transition hover:border-primary-500/35"
              >
                <span className="text-xs text-primary-400">{step.label}</span>
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 text-primary-500/70" />
                )}
              </button>
            ))}
          </div>
        </div>

        {latestImpact ? (
          <div className="rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-black/45 to-cyan-500/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                  {latestImpact.headline}
                </p>
                <p className="text-xs text-primary-300/85">
                  Estimated revenue uplift: <span className="font-semibold text-emerald-300">{latestImpact.upliftRangePercent}</span>
                  {' '}| Expected reach: <span className="font-semibold text-cyan-300">{latestImpact.expectedReachUsers} users</span>
                  {' '}| Confidence: <span className="font-semibold text-primary-300">{Math.round(latestImpact.confidence * 100)}%</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(latestImpact.nextActionHref)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-300"
                >
                  {latestImpact.nextActionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setLatestImpact(null)}
                  className="rounded-lg border border-primary-500/25 p-2 text-primary-400 hover:text-primary-500"
                  aria-label="Dismiss impact summary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            onClick={() => router.push('/dashboard/promotions')}
            className="rounded-xl border border-primary-500/25 bg-black/35 p-4 text-left transition hover:border-primary-500/45"
          >
            <div className="mb-2 inline-flex rounded-lg border border-primary-500/25 bg-primary-500/10 p-2">
              <Sparkles className="h-4 w-4 text-primary-500" />
            </div>
            <p className="text-sm font-semibold text-primary-500">Promotions Workspace</p>
            <p className="mt-1 text-xs text-primary-400/75">Create, edit, schedule, and AI-optimize all campaigns.</p>
          </button>
          <button
            onClick={() => router.push('/dashboard/analytics')}
            className="rounded-xl border border-primary-500/25 bg-black/35 p-4 text-left transition hover:border-primary-500/45"
          >
            <div className="mb-2 inline-flex rounded-lg border border-primary-500/25 bg-primary-500/10 p-2">
              <BarChart3 className="h-4 w-4 text-primary-500" />
            </div>
            <p className="text-sm font-semibold text-primary-500">Earnings & Insights</p>
            <p className="mt-1 text-xs text-primary-400/75">Track revenue, ROI, AI suggestions, and payout readiness.</p>
          </button>
          <button
            onClick={() => router.push('/dashboard/redemptions')}
            className="rounded-xl border border-primary-500/25 bg-black/35 p-4 text-left transition hover:border-primary-500/45"
          >
            <div className="mb-2 inline-flex rounded-lg border border-primary-500/25 bg-primary-500/10 p-2">
              <Users className="h-4 w-4 text-primary-500" />
            </div>
            <p className="text-sm font-semibold text-primary-500">Guest Activity</p>
            <p className="mt-1 text-xs text-primary-400/75">Monitor followers, check-ins, and payment activity.</p>
          </button>
        </div>

        {/* Busy Times Card */}
        <div className="rounded-xl border border-primary-500/20 bg-black/35 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary-500" />
              <p className="text-sm font-semibold text-primary-500">Busy Times</p>
            </div>
            {!loadingBusy && busyTimes && (
              <p className="text-xs text-primary-400/50">When your venue is most active</p>
            )}
          </div>

          {!venueId || loadingBusy ? (
            <div className="space-y-2">
              <div className="h-3 animate-pulse rounded-full bg-primary-500/10 w-3/4" />
              <div className="flex gap-1 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-6 flex-1 animate-pulse rounded bg-primary-500/10" />
                ))}
              </div>
              <div className="h-3 animate-pulse rounded-full bg-primary-500/10 w-1/2" />
            </div>
          ) : !busyTimes ? (
            <p className="text-sm text-primary-400/50 py-4 text-center">No busy times data available yet.</p>
          ) : (
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {/* Mini heatmap — scrollable row of day columns */}
              {Array.isArray(busyTimes.slots) && busyTimes.slots.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="flex gap-1 min-w-max pb-1">
                    {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day) => {
                      const daySlots = busyTimes.slots!.filter((s) => s.day === day)
                      if (daySlots.length === 0) return null
                      return (
                        <div key={day} className="flex flex-col gap-0.5 items-center">
                          <p className="text-[10px] text-primary-400/50 mb-0.5">{day}</p>
                          {daySlots.slice(0, 3).map((slot, i) => (
                            <div
                              key={i}
                              title={`${slot.day} ${slot.hour}:00 — ${slot.level}`}
                              className={`rounded px-2 py-1 text-[9px] font-medium whitespace-nowrap ${
                                slot.level === 'high'
                                  ? 'bg-emerald-400/25 text-emerald-300'
                                  : slot.level === 'medium'
                                  ? 'bg-amber-400/20 text-amber-300'
                                  : 'bg-primary-500/10 text-primary-400/50'
                              }`}
                            >
                              {slot.hour}:00
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Busiest and slowest slots */}
              <div className="grid grid-cols-2 gap-2">
                {Array.isArray(busyTimes.busiestSlots) && busyTimes.busiestSlots.length > 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                    <p className="text-[11px] font-semibold text-emerald-400 mb-1.5">Top Busy Slots</p>
                    <div className="space-y-1">
                      {busyTimes.busiestSlots.slice(0, 3).map((slot, i) => (
                        <p key={i} className="text-[11px] text-primary-400/70">
                          {slot.label || `${slot.day} ${slot.hour}:00`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(busyTimes.slowestSlots) && busyTimes.slowestSlots.length > 0 && (
                  <div className="rounded-lg border border-primary-500/15 bg-black/30 p-2">
                    <p className="text-[11px] font-semibold text-primary-400/60 mb-1.5">Slowest Slots</p>
                    <div className="space-y-1">
                      {busyTimes.slowestSlots.slice(0, 3).map((slot, i) => (
                        <p key={i} className="text-[11px] text-primary-400/50">
                          {slot.label || `${slot.day} ${slot.hour}:00`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI suggestions */}
              {Array.isArray(busyTimes.suggestions) && busyTimes.suggestions.length > 0 && (
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2.5">
                  <p className="text-[11px] font-semibold text-cyan-400 mb-1.5">AI Suggestions</p>
                  <ul className="space-y-1">
                    {busyTimes.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-primary-400/70">
                        <span className="mt-0.5 flex-shrink-0 text-cyan-400">·</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {showAIDealModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-primary-500/30 bg-black/95 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary-500">Create AI Deal</h3>
                  <p className="text-xs text-primary-400/75">Pick a deal type and we will open it prefilled by AI.</p>
                </div>
                <button
                  onClick={() => setShowAIDealModal(false)}
                  className="rounded-lg border border-primary-500/25 p-2 text-primary-400 hover:text-primary-500"
                  aria-label="Close AI deal modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={() => handleInstantAIDeal('happy-hour')}
                  disabled={!!publishingDealType}
                  className="rounded-lg border border-amber-400/45 bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-3 text-left text-black"
                >
                  <p className="text-sm font-semibold">{publishingDealType === 'happy-hour' ? 'Publishing...' : 'AI Happy Hour'}</p>
                  <p className="text-xs opacity-80">Best for weekday traffic boosts.</p>
                </button>
                <button
                  onClick={() => handleInstantAIDeal('flash-deal')}
                  disabled={!!publishingDealType}
                  className="rounded-lg border border-rose-400/45 bg-gradient-to-r from-rose-400 to-pink-400 px-4 py-3 text-left text-black"
                >
                  <p className="text-sm font-semibold">{publishingDealType === 'flash-deal' ? 'Publishing...' : 'AI Flash Deal'}</p>
                  <p className="text-xs opacity-80">Urgency-based quick conversion.</p>
                </button>
                <button
                  onClick={() => handleInstantAIDeal('weekend')}
                  disabled={!!publishingDealType}
                  className="rounded-lg border border-cyan-400/45 bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-3 text-left text-black"
                >
                  <p className="text-sm font-semibold">{publishingDealType === 'weekend' ? 'Publishing...' : 'AI Weekend Special'}</p>
                  <p className="text-xs opacity-80">Recurring Fri-Sun attraction deal.</p>
                </button>
                <button
                  onClick={() => handleInstantAIDeal('vip')}
                  disabled={!!publishingDealType}
                  className="rounded-lg border border-violet-400/45 bg-gradient-to-r from-violet-400 to-fuchsia-400 px-4 py-3 text-left text-black"
                >
                  <p className="text-sm font-semibold">{publishingDealType === 'vip' ? 'Publishing...' : 'AI VIP Exclusive'}</p>
                  <p className="text-xs opacity-80">Retention-focused premium offer.</p>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </DashboardPageShell>
    </DashboardLayout>
  )
}

