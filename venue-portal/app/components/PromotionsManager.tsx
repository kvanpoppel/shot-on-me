'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useSocket } from '../contexts/SocketContext'
import { Plus, Edit, BarChart3, BookmarkPlus, Square, Crown } from 'lucide-react'
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
}

interface PromotionFormData {
  title: string
  description: string
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
  const { venueId } = useVenue()
  const { socket } = useSocket()
  const { showSuccess, showError } = useToast()
  const hasUnlimitedDeals = useFeatureAvailable('growth')

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
        showSuccess(res.data?.notificationsSent ? 'Deal activated — notifications sent!' : 'Deal updated.')
      } else {
        await axios.post(`${getApiUrl()}/venues/${venueId}/promotions`, payload,
          { headers: { Authorization: `Bearer ${token}` } })
        showSuccess('Deal created — notifications sent!')
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
    if (!hasUnlimitedDeals && promotions.filter(p => p.isActive).length >= 1) {
      showError('Free plan allows 1 active deal. Upgrade for unlimited.')
      return
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

  const activeCount = promotions.filter(p => getStatus(p) === 'live' || getStatus(p) === 'expiring').length
  const atFreeLimit = !hasUnlimitedDeals && activeCount >= 1

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
            {promotions.length > 0 && (
              <span className="bg-primary-500/15 text-primary-500 text-xs font-medium px-2 py-0.5 rounded-full">
                {promotions.length}
              </span>
            )}
          </div>
          {atFreeLimit ? (
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
        {promotions.length === 0 ? (
          <div className="bg-black/40 border border-primary-500/15 rounded-xl p-8 text-center">
            <p className="text-primary-400/50 text-sm mb-4">No deals yet. Create your first deal to start driving traffic.</p>
            <button onClick={handleNewPromotion}
              className="bg-primary-500 text-black px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-400 transition-colors">
              Create Your First Deal
            </button>
          </div>
        ) : (
          <div className={`space-y-2 ${compactView ? 'max-h-[340px] overflow-y-auto pr-1' : ''}`}>
            {promotions.map((promo) => {
              const status = getStatus(promo)
              const emoji = TYPE_EMOJI[promo.type] || '🎯'

              return (
                <div key={promo._id}
                  className="bg-black/40 border border-primary-500/15 rounded-xl p-4 hover:border-primary-500/30 transition-colors">
                  {/* Top row: emoji + title + status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{emoji}</span>
                      <h3 className="text-sm font-semibold text-white truncate">{promo.title}</h3>
                    </div>
                    {statusPill(status)}
                  </div>

                  {/* Description */}
                  {promo.description && (
                    <p className="text-xs text-primary-400/50 mb-3 line-clamp-1">{promo.description}</p>
                  )}

                  {/* Time range */}
                  <p className="text-xs text-primary-400/40 mb-3">
                    {new Date(promo.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' '}
                    {new Date(promo.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {' — '}
                    {new Date(promo.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>

                  {/* Action row */}
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
                      <Square className="w-3 h-3" /> End Deal
                    </button>
                    <button onClick={() => { setSavingToLibraryId(promo._id); setModal('save-to-library') }}
                      className="flex items-center gap-1 text-xs text-primary-400/50 hover:text-primary-500 px-2 py-1 rounded transition-colors">
                      <BookmarkPlus className="w-3 h-3" /> Save
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
