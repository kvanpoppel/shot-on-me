'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useSocket } from '../contexts/SocketContext'
import { Plus, Edit, BarChart3, BookmarkPlus, Square, Crown, RotateCcw } from 'lucide-react'
import { getApiUrl } from '../utils/api'
import { useToast } from './ToastContainer'
import PromotionTemplates, { PromotionTemplate as TemplateType } from './promotions/PromotionTemplates'
import PromotionWizard from './promotions/PromotionWizard'
import QuickActions from './promotions/QuickActions'
import PromotionAnalytics from './promotions/PromotionAnalytics'
import PromotionLibrary from './promotions/PromotionLibrary'
import SaveToLibraryModal from './promotions/SaveToLibraryModal'
import { useFeatureAvailable } from './FeatureGate'

interface Promotion {
  _id: string
  title: string
  description?: string
  offer?: string
  type: string
  startTime: string
  endTime: string
  isActive?: boolean
  isFlashDeal?: boolean
  flashDealEndsAt?: string | Date
  pointsReward?: number
  targeting?: {
    followersOnly?: boolean
    locationBased?: boolean
    radiusMiles?: number
    userSegments?: string[]
    minCheckIns?: number
    timeBased?: boolean
    timeWindow?: { start: string; end: string }
  }
  analytics?: {
    views?: number
    clicks?: number
    redemptions?: number
  }
}

interface PromotionFormData {
  title: string
  description: string
  offer: string
  type: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  isFlashDeal: boolean
  flashDealEndsAt: string
  pointsReward: number
  isRecurring: boolean
  recurrencePattern: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom'
    frequency: number
    daysOfWeek: number[]
    dayOfMonth?: number
    endDate: string
    maxOccurrences?: number
  }
  targeting: {
    followersOnly: boolean
    locationBased: boolean
    radiusMiles: number
    userSegments: string[]
    minCheckIns: number
    timeBased: boolean
    timeWindow: { start: string; end: string }
  }
}

interface PromotionsManagerProps {
  hideQuickActions?: boolean
  compactView?: boolean
}

export interface PromotionsManagerRef {
  handleQuickAction: (action: string) => void
  handleInstantQuickAction: (action: string) => void
  handleNewPromotion: () => void
  handleShowTemplates: () => void
}

// --- Helpers ---

const formatLocalDateTime = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

const TYPE_EMOJI: Record<string, string> = {
  'happy-hour': '🍻',
  'flash-deal': '⚡',
  'special': '🎉',
  'exclusive': '👑',
  'event': '🎶',
}

const defaultTargeting = {
  followersOnly: false,
  locationBased: false,
  radiusMiles: 5,
  userSegments: ['all'] as string[],
  minCheckIns: 0,
  timeBased: false,
  timeWindow: { start: '', end: '' },
}

function getQuickActionData(action: string): Partial<PromotionFormData> {
  const now = new Date()

  if (action === 'happy-hour') {
    const start = new Date(now); start.setHours(16, 0, 0, 0)
    const end = new Date(now); end.setHours(19, 0, 0, 0)
    // If the window has already passed today, schedule for tomorrow
    if (now >= end) {
      start.setDate(start.getDate() + 1)
      end.setDate(end.getDate() + 1)
    }
    return {
      title: 'Happy Hour', description: 'Discounted drinks and appetizers!',
      type: 'happy-hour', startTime: formatLocalDateTime(start), endTime: formatLocalDateTime(end),
      isFlashDeal: false, pointsReward: 10,
      targeting: { ...defaultTargeting, timeBased: true, timeWindow: { start: '16:00', end: '19:00' } },
    }
  }
  if (action === 'flash-deal') {
    const start = new Date(now)
    const end = new Date(now); end.setHours(end.getHours() + 1)
    return {
      title: 'Flash Deal', description: 'Limited time offer — act fast!',
      type: 'flash-deal', startTime: formatLocalDateTime(start), endTime: formatLocalDateTime(end),
      isFlashDeal: true, flashDealEndsAt: formatLocalDateTime(end), pointsReward: 25,
      targeting: { ...defaultTargeting, followersOnly: true, locationBased: true },
    }
  }
  if (action === 'weekend') {
    const friday = new Date(now)
    friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7 || 7))
    friday.setHours(0, 0, 0, 0)
    const sunday = new Date(friday); sunday.setDate(sunday.getDate() + 2); sunday.setHours(23, 59, 0, 0)
    return {
      title: 'Weekend Special', description: 'Deals all weekend long!',
      type: 'special', startTime: formatLocalDateTime(friday), endTime: formatLocalDateTime(sunday),
      isFlashDeal: false, pointsReward: 15, targeting: { ...defaultTargeting },
    }
  }
  if (action === 'vip') {
    const start = new Date(now); start.setHours(20, 0, 0, 0)
    const end = new Date(now); end.setDate(end.getDate() + 1); end.setHours(2, 0, 0, 0)
    // If the window has already passed today (past 2 AM next day), push both forward
    if (now >= end) {
      start.setDate(start.getDate() + 1)
      end.setDate(end.getDate() + 1)
    }
    return {
      title: 'VIP Exclusive', description: 'Special deal for our VIP members!',
      type: 'exclusive', startTime: formatLocalDateTime(start), endTime: formatLocalDateTime(end),
      isFlashDeal: false, pointsReward: 50,
      targeting: { ...defaultTargeting, followersOnly: true, userSegments: ['vip'], minCheckIns: 10 },
    }
  }
  return {}
}

type ModalState = null | 'wizard' | 'templates' | 'library' | 'analytics' | 'save-to-library'

function getStatus(promo: Promotion): 'live' | 'upcoming' | 'expiring' | 'ended' {
  const now = Date.now()
  const start = new Date(promo.startTime).getTime()
  const end = new Date(promo.endTime).getTime()
  if (!promo.isActive || now > end) return 'ended'
  if (now < start) return 'upcoming'
  const hoursLeft = (end - now) / 3_600_000
  if (hoursLeft <= 24) return 'expiring'
  return 'live'
}

// --- Component ---

const PromotionsManager = forwardRef<PromotionsManagerRef, PromotionsManagerProps>(
  ({ hideQuickActions = false, compactView = false }: PromotionsManagerProps, ref) => {
  const { token } = useAuth()
  const { venueId, tier } = useVenue()
  const { socket } = useSocket()
  const { showSuccess, showError } = useToast()
  const isPerformancePlus = useFeatureAvailable('premium')
  const isGrowthPlus = useFeatureAvailable('growth')

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const [modal, setModal] = useState<ModalState>(null)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [analyticsPromoId, setAnalyticsPromoId] = useState<{ id: string; title: string } | null>(null)
  const [savingToLibraryId, setSavingToLibraryId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null)
  const [quickActionData, setQuickActionData] = useState<Partial<PromotionFormData> | null>(null)

  // --- Data fetching ---

  const fetchPromotions = async (vid?: string) => {
    const id = vid || venueId
    if (!id) return
    try {
      const res = await axios.get(`${getApiUrl()}/venues/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPromotions(res.data.venue?.promotions || [])
    } catch { /* keep current */ } finally { setLoading(false) }
  }

  useEffect(() => {
    if (venueId) fetchPromotions(venueId)
    else setLoading(false)
  }, [venueId])

  // --- Socket ---

  useEffect(() => {
    if (!socket || !venueId) return
    const handler = (data: { venueId: string }) => {
      if (data.venueId === venueId) fetchPromotions()
    }
    socket.on('promotion-updated', handler)
    socket.on('new-promotion', handler)
    socket.on('promotion-deleted', handler)
    return () => {
      socket.off('promotion-updated', handler)
      socket.off('new-promotion', handler)
      socket.off('promotion-deleted', handler)
    }
  }, [socket, venueId])

  // --- Actions ---

  const closeAll = () => {
    setModal(null)
    setEditingPromo(null)
    setSelectedTemplate(null)
    setQuickActionData(null)
    setAnalyticsPromoId(null)
    setSavingToLibraryId(null)
  }

  const handleSavePromotion = async (formData: PromotionFormData) => {
    if (!venueId || !token) { showError('No venue found.'); return }
    setSaving(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        offer: formData.offer || '',
        type: formData.type,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        isFlashDeal: formData.isFlashDeal,
        flashDealEndsAt: formData.flashDealEndsAt ? new Date(formData.flashDealEndsAt).toISOString() : undefined,
        pointsReward: formData.pointsReward || 0,
        targeting: formData.targeting,
        isRecurring: formData.isRecurring || false,
        recurrencePattern: formData.isRecurring ? {
          type: formData.recurrencePattern.type,
          frequency: formData.recurrencePattern.frequency,
          daysOfWeek: formData.recurrencePattern.daysOfWeek || [],
          dayOfMonth: formData.recurrencePattern.dayOfMonth,
          endDate: formData.recurrencePattern.endDate || undefined,
          maxOccurrences: formData.recurrencePattern.maxOccurrences || 12,
        } : undefined,
      }
      if (editingPromo) {
        const res = await axios.put(`${getApiUrl()}/venues/${venueId}/promotions/${editingPromo._id}`, payload,
          { headers: { Authorization: `Bearer ${token}` } })
        const count = res.data?.followersNotified
        showSuccess(count ? `Deal activated — ${count} follower${count === 1 ? '' : 's'} notified!` : 'Deal updated.')
      } else {
        const res = await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, payload,
          { headers: { Authorization: `Bearer ${token}` } })
        const count = res.data?.followersNotified || 0
        showSuccess(count > 0 ? `Deal published! ${count} follower${count === 1 ? '' : 's'} notified` : 'Deal published!')
      }
      closeAll()
      fetchPromotions()
    } catch (err: any) {
      showError(err.response?.data?.error || err.message || 'Failed to save deal')
    } finally { setSaving(false) }
  }

  const handleDelete = async (promoId: string) => {
    if (!venueId || !token) return
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/promotions/${promoId}`,
        { headers: { Authorization: `Bearer ${token}` } })
      showSuccess('Deal ended.')
      fetchPromotions()
    } catch (err: any) { showError(err.response?.data?.error || 'Failed to end deal') }
  }

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo)
    setSelectedTemplate(null)
    setQuickActionData(null)
    setModal('wizard')
  }

  const handleRunAgain = (promo: Promotion) => {
    const now = new Date()
    const start = new Date(now); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1)
    const end = new Date(start); end.setHours(end.getHours() + 3)
    setEditingPromo(null)
    setSelectedTemplate(null)
    setQuickActionData({
      title: promo.title,
      description: promo.description || '',
      offer: promo.offer || '',
      type: promo.type,
      startTime: formatLocalDateTime(start),
      endTime: formatLocalDateTime(end),
      isFlashDeal: promo.isFlashDeal || false,
      pointsReward: promo.pointsReward || 0,
      targeting: {
        followersOnly: promo.targeting?.followersOnly || false,
        locationBased: promo.targeting?.locationBased || false,
        radiusMiles: promo.targeting?.radiusMiles || 5,
        userSegments: promo.targeting?.userSegments || ['all'],
        minCheckIns: promo.targeting?.minCheckIns || 0,
        timeBased: promo.targeting?.timeBased || false,
        timeWindow: promo.targeting?.timeWindow || { start: '', end: '' },
      },
    })
    setModal('wizard')
  }

  const handleQuickAction = (action: string) => {
    const data = getQuickActionData(action)
    setQuickActionData(data)
    setSelectedTemplate(null)
    setEditingPromo(null)
    setModal('wizard')
  }

  const handleInstantQuickAction = async (action: string) => {
    if (publishing || !venueId || !token) return
    setPublishing(true)
    const data = getQuickActionData(action)
    try {
      await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, {
        title: data.title || 'Quick Deal',
        description: data.description || '',
        type: data.type || 'special',
        startTime: data.startTime ? new Date(data.startTime).toISOString() : new Date().toISOString(),
        endTime: data.endTime ? new Date(data.endTime).toISOString() : new Date(Date.now() + 7_200_000).toISOString(),
        isFlashDeal: !!data.isFlashDeal,
        flashDealEndsAt: data.flashDealEndsAt ? new Date(data.flashDealEndsAt).toISOString() : undefined,
        pointsReward: data.pointsReward || 0,
        targeting: data.targeting || defaultTargeting,
        isRecurring: false,
      }, { headers: { Authorization: `Bearer ${token}` } })
      showSuccess('Deal published instantly!')
      fetchPromotions()
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to publish deal')
    } finally { setPublishing(false) }
  }

  const handleNewPromotion = () => {
    const activeCount = promotions.filter(p => p.isActive).length
    if (!isPerformancePlus) {
      if (!isGrowthPlus && activeCount >= 2) {
        showError('Free plan allows 2 active deals. Upgrade to Growth for more.')
        return
      }
      if (isGrowthPlus && activeCount >= 4) {
        showError('Growth plan allows 4 active deals. Upgrade to Performance for unlimited.')
        return
      }
    }
    setSelectedTemplate(null)
    setEditingPromo(null)
    setQuickActionData(null)
    setModal('wizard')
  }

  const handleShowTemplates = () => setModal('templates')

  const handleTemplateSelect = (template: TemplateType | null) => {
    setSelectedTemplate(template || null)
    setModal('wizard')
  }

  // --- Ref ---

  useImperativeHandle(ref, () => ({
    handleQuickAction,
    handleInstantQuickAction,
    handleNewPromotion,
    handleShowTemplates,
  }))

  // --- Render helpers ---

  const activeDealCount = promotions.filter(p => getStatus(p) === 'live' || getStatus(p) === 'expiring').length
  const atLimit = isPerformancePlus ? false : isGrowthPlus ? activeDealCount >= 4 : activeDealCount >= 2

  const statusPill = (status: 'live' | 'upcoming' | 'expiring' | 'ended') => {
    if (status === 'live') return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live
      </span>
    )
    if (status === 'expiring') return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Expiring Soon
      </span>
    )
    if (status === 'upcoming') return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-400" /> Upcoming
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400/40">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-400/40" /> Ended
      </span>
    )
  }

  // --- Loading / No venue ---

  if (loading) return (
    <div className="bg-black/40 border border-primary-500/15 rounded-xl p-6">
      <p className="text-center text-primary-400/50 text-sm">Loading deals...</p>
    </div>
  )

  if (!venueId) return (
    <div className="bg-black/40 border border-primary-500/15 rounded-xl p-6 text-center">
      <p className="text-primary-400/50 text-sm mb-3">No venue found.</p>
      <a href="/dashboard/settings" className="bg-primary-500 text-black px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-400 transition-colors">
        Go to Settings
      </a>
    </div>
  )

  // --- Main render ---

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-white">Your Deals</h2>
            {promotions.filter(p => getStatus(p) !== 'ended').length > 0 && (
              <span className="bg-primary-500/15 text-primary-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {promotions.filter(p => getStatus(p) !== 'ended').length}
              </span>
            )}
          </div>
          {atLimit ? (
            <a href="/dashboard/settings"
              className="flex items-center gap-1.5 bg-primary-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-400 transition-colors">
              <Crown className="w-4 h-4" /> Upgrade
            </a>
          ) : (
            <button onClick={handleNewPromotion}
              className="flex items-center gap-1.5 bg-primary-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-400 transition-colors">
              <Plus className="w-4 h-4" /> New Deal
            </button>
          )}
        </div>

        {/* Quick Launch — instant publish */}
        {!hideQuickActions && (
          <QuickActions
            onStartHappyHour={() => handleInstantQuickAction('happy-hour')}
            onFlashDeal={() => handleInstantQuickAction('flash-deal')}
            onWeekendSpecial={() => handleInstantQuickAction('weekend')}
            onVipExclusive={() => handleInstantQuickAction('vip')}
          />
        )}

        {/* Active Deals */}
        {(() => {
          const active = promotions.filter(p => getStatus(p) !== 'ended')
          const ended = promotions.filter(p => getStatus(p) === 'ended')

          // Smart suggestions based on time/day
          const getSuggestions = () => {
            const now = new Date()
            const hour = now.getHours()
            const day = now.getDay() // 0=Sun
            const suggestions: { key: string; emoji: string; title: string; why: string }[] = []

            if (hour >= 14 && hour < 18) {
              suggestions.push({ key: 'happy-hour', emoji: '🍻', title: 'Happy Hour', why: 'Peak pre-dinner window' })
            }
            if (hour >= 18 && hour < 22) {
              suggestions.push({ key: 'flash-deal', emoji: '⚡', title: 'Flash Deal', why: "People are out — grab them now" })
              suggestions.push({ key: 'vip', emoji: '👑', title: 'VIP Night', why: 'Drive exclusivity tonight' })
            }
            if (hour >= 10 && hour < 14) {
              suggestions.push({ key: 'flash-deal', emoji: '⚡', title: 'Lunch Flash Deal', why: 'Catch the lunch crowd' })
            }
            if (day === 5 || day === 6) {
              suggestions.push({ key: 'weekend', emoji: '🎉', title: 'Weekend Special', why: "It's the weekend — go big" })
            }
            if (day >= 1 && day <= 3 && hour >= 16) {
              suggestions.push({ key: 'happy-hour', emoji: '🍻', title: 'Midweek Happy Hour', why: 'Slow night? Fill seats' })
            }
            // Always have at least 2
            if (suggestions.length < 2) {
              if (!suggestions.find(s => s.key === 'happy-hour')) suggestions.push({ key: 'happy-hour', emoji: '🍻', title: 'Happy Hour', why: 'Always a crowd-pleaser' })
              if (!suggestions.find(s => s.key === 'flash-deal')) suggestions.push({ key: 'flash-deal', emoji: '⚡', title: 'Flash Deal', why: '1-hour urgency drives action' })
            }
            return suggestions.slice(0, 3)
          }

          if (active.length === 0) {
            const suggestions = getSuggestions()
            return (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-primary-400/40 uppercase tracking-wider">Suggested for right now</p>
                  {suggestions.map(s => (
                    <button key={s.key} onClick={() => handleInstantQuickAction(s.key)}
                      disabled={publishing}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary-500/15 bg-[#1a1510]/50 hover:border-primary-500/30 hover:bg-[#1a1510]/80 transition-all text-left disabled:opacity-40">
                      <span className="text-2xl">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{s.title}</p>
                        <p className="text-[10px] text-primary-400/50">{s.why}</p>
                      </div>
                      <span className="text-[10px] font-bold text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg whitespace-nowrap">Go Live</span>
                    </button>
                  ))}
                </div>
                {/* Top performers below suggestions */}
                {ended.length > 0 && (() => {
                  const ranked = [...ended].sort((a, b) => {
                    const scoreA = (a.analytics?.views || 0) + (a.analytics?.clicks || 0) * 3 + (a.analytics?.redemptions || 0) * 10
                    const scoreB = (b.analytics?.views || 0) + (b.analytics?.clicks || 0) * 3 + (b.analytics?.redemptions || 0) * 10
                    return scoreB - scoreA
                  }).slice(0, 5)
                  return (
                    <div className="pt-3 border-t border-primary-500/10">
                      <p className="text-[10px] font-semibold text-primary-400/40 uppercase tracking-wider mb-2">Run again</p>
                      <div className="flex flex-wrap gap-2">
                        {ranked.map((promo) => (
                          <button key={promo._id} onClick={() => handleRunAgain(promo)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary-500/15 bg-[#1a1510]/40 hover:border-primary-500/30 hover:bg-[#1a1510]/70 transition-all text-xs text-white/60 hover:text-white/90">
                            <span className="text-sm">{TYPE_EMOJI[promo.type] || '🎯'}</span>
                            <span className="truncate max-w-[120px]">{promo.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </>
            )
          }

          return (
            <>
              <div className={`space-y-2 ${compactView ? 'max-h-[340px] overflow-y-auto pr-1' : ''}`}>
                {active.map((promo) => {
                  const status = getStatus(promo)
                  const emoji = TYPE_EMOJI[promo.type] || '🎯'
                  return (
                    <div key={promo._id} className="glass-elevated rounded-2xl p-4 hover:border-primary-500/20 transition-all">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl flex-shrink-0">{emoji}</span>
                          <h3 className="text-sm font-bold text-white truncate">{promo.title}</h3>
                        </div>
                        {statusPill(status)}
                      </div>
                      {promo.description && <p className="text-xs text-white/40 mb-2 line-clamp-1">{promo.description}</p>}
                      <p className="text-xs text-white/30 mb-2">
                        {new Date(promo.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(promo.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {' — '}
                        {new Date(promo.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <div className="flex items-center gap-1 border-t border-primary-500/10 pt-2">
                        <button onClick={() => handleEdit(promo)}
                          className="flex items-center gap-1 text-xs text-primary-400/50 hover:text-primary-500 px-2 py-1 rounded transition-colors">
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => { setAnalyticsPromoId({ id: promo._id, title: promo.title }); setModal('analytics') }}
                          className="flex items-center gap-1 text-xs text-primary-400/50 hover:text-primary-500 px-2 py-1 rounded transition-colors">
                          <BarChart3 className="w-3 h-3" /> Stats
                        </button>
                        <button onClick={() => handleDelete(promo._id)}
                          className="flex items-center gap-1 text-xs text-primary-400/50 hover:text-primary-500 px-2 py-1 rounded transition-colors">
                          <Square className="w-3 h-3" /> End
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Top Performers — best past deals by engagement, always visible */}
              {ended.length > 0 && (() => {
                const ranked = [...ended].sort((a, b) => {
                  const scoreA = (a.analytics?.views || 0) + (a.analytics?.clicks || 0) * 3 + (a.analytics?.redemptions || 0) * 10
                  const scoreB = (b.analytics?.views || 0) + (b.analytics?.clicks || 0) * 3 + (b.analytics?.redemptions || 0) * 10
                  return scoreB - scoreA
                }).slice(0, 5)

                return (
                  <div className="pt-3 border-t border-primary-500/10">
                    <p className="text-[10px] font-semibold text-primary-400/40 uppercase tracking-wider mb-2">Run again</p>
                    <div className="flex flex-wrap gap-2">
                      {ranked.map((promo) => {
                        const emoji = TYPE_EMOJI[promo.type] || '🎯'
                        return (
                          <button key={promo._id} onClick={() => handleRunAgain(promo)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary-500/15 bg-[#1a1510]/40 hover:border-primary-500/30 hover:bg-[#1a1510]/70 transition-all text-xs text-white/60 hover:text-white/90">
                            <span className="text-sm">{emoji}</span>
                            <span className="truncate max-w-[120px]">{promo.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              )}
            </>
          )
        })()}
      </div>

      {/* --- Modals --- */}

      {modal === 'templates' && (
        <PromotionTemplates
          onSelectTemplate={handleTemplateSelect}
          onClose={closeAll}
        />
      )}

      {modal === 'wizard' && (
        <PromotionWizard
          template={selectedTemplate}
          initialData={quickActionData || (editingPromo ? {
            title: editingPromo.title,
            description: editingPromo.description || '',
            offer: editingPromo.offer || '',
            type: editingPromo.type,
            startTime: new Date(editingPromo.startTime).toISOString().slice(0, 16),
            endTime: new Date(editingPromo.endTime).toISOString().slice(0, 16),
            daysOfWeek: [],
            isFlashDeal: editingPromo.isFlashDeal || false,
            flashDealEndsAt: editingPromo.flashDealEndsAt ? new Date(editingPromo.flashDealEndsAt).toISOString().slice(0, 16) : '',
            pointsReward: editingPromo.pointsReward || 0,
            targeting: {
              followersOnly: editingPromo.targeting?.followersOnly || false,
              locationBased: editingPromo.targeting?.locationBased || false,
              radiusMiles: editingPromo.targeting?.radiusMiles || 5,
              userSegments: editingPromo.targeting?.userSegments || ['all'],
              minCheckIns: editingPromo.targeting?.minCheckIns || 0,
              timeBased: editingPromo.targeting?.timeBased || false,
              timeWindow: editingPromo.targeting?.timeWindow || { start: '', end: '' },
            },
          } : undefined)}
          onSave={handleSavePromotion}
          onCancel={closeAll}
          isEditing={!!editingPromo}
        />
      )}

      {modal === 'analytics' && analyticsPromoId && venueId && (
        <PromotionAnalytics
          venueId={venueId}
          promotionId={analyticsPromoId.id}
          promotionTitle={analyticsPromoId.title}
          onClose={closeAll}
        />
      )}

      {modal === 'library' && (
        <PromotionLibrary
          onSelectPromotion={(data) => {
            setQuickActionData(data)
            setModal('wizard')
          }}
          onClose={closeAll}
        />
      )}

      {modal === 'save-to-library' && savingToLibraryId && promotions.find(p => p._id === savingToLibraryId) && (
        <SaveToLibraryModal
          promotion={promotions.find(p => p._id === savingToLibraryId)!}
          onClose={closeAll}
          onSaved={closeAll}
        />
      )}
    </>
  )
})

PromotionsManager.displayName = 'PromotionsManager'

export default PromotionsManager
