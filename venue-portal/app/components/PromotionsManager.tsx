'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { Plus, Edit, Trash2, Sparkles, FileText, BarChart3, BookOpen, Save, Bell, Zap } from 'lucide-react'
import { getApiUrl } from '../utils/api'
import PromotionTemplates, { PromotionTemplate as TemplateType } from './promotions/PromotionTemplates'
import PromotionWizard from './promotions/PromotionWizard'
import QuickActions from './promotions/QuickActions'
import PromotionAnalytics from './promotions/PromotionAnalytics'
import PromotionLibrary from './promotions/PromotionLibrary'
import SaveToLibraryModal from './promotions/SaveToLibraryModal'
import SmartPromotionGenerator from './SmartPromotionGenerator'

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
}

export interface PromotionsManagerRef {
  handleQuickAction: (action: string) => void
  handleNewPromotion: () => void
  handleShowTemplates: () => void
}

const PromotionsManager = forwardRef<PromotionsManagerRef, PromotionsManagerProps>(
  ({ hideQuickActions = false }: PromotionsManagerProps, ref) => {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [quickActionData, setQuickActionData] = useState<Partial<PromotionFormData> | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewingAnalytics, setViewingAnalytics] = useState<{ promotionId: string; title: string } | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [savingToLibrary, setSavingToLibrary] = useState<string | null>(null)

  useEffect(() => {
    fetchVenue()
  }, [user, token])

  // Listen for real-time promotion updates
  useEffect(() => {
    if (!socket || !venueId) return

    const handlePromotionUpdate = (data: { venueId: string; promotion: any }) => {
      if (data.venueId === venueId) {
        fetchPromotions()
      }
    }

    const handleNewPromotion = (data: { venueId: string; promotion: any }) => {
      if (data.venueId === venueId) {
        fetchPromotions()
      }
    }

    const handlePromotionDeleted = (data: { venueId: string; promotionId: string }) => {
      if (data.venueId === venueId) {
        fetchPromotions()
      }
    }

    socket.on('promotion-updated', handlePromotionUpdate)
    socket.on('new-promotion', handleNewPromotion)
    socket.on('promotion-deleted', handlePromotionDeleted)

    return () => {
      socket.off('promotion-updated', handlePromotionUpdate)
      socket.off('new-promotion', handleNewPromotion)
      socket.off('promotion-deleted', handlePromotionDeleted)
    }
  }, [socket, venueId])

  const fetchVenue = async () => {
    if (!token || !user) return
    try {
      const apiUrl = getApiUrl()
      const venuesResponse = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      let venues: any[] = []
      if (Array.isArray(venuesResponse.data)) {
        venues = venuesResponse.data
      } else if (venuesResponse.data?.venues) {
        venues = venuesResponse.data.venues
      }
      
      let myVenue = null
      if (venues.length > 0 && venues[0].venue) {
        myVenue = venues[0].venue
      } else {
        myVenue = venues.find((v: any) => {
          const venueOwnerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
          const userId = user.id?.toString() || (user as any)._id?.toString()
          const isOwner = venueOwnerId === userId
          const isStaff = v.staff?.some((s: any) => {
            const staffUserId = s.user?._id?.toString() || s.user?.toString() || s.user
            return staffUserId === userId
          })
          return isOwner || isStaff
        })
      }
      
      if (myVenue) {
        const venueIdToUse = myVenue._id?.toString() || myVenue.id?.toString() || myVenue._id || myVenue.id
        setVenueId(venueIdToUse)
        fetchPromotions(venueIdToUse)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch venue:', error)
      setLoading(false)
    }
  }

  const fetchPromotions = async (vid?: string) => {
    if (!vid && !venueId) return
    const vId = vid || venueId
    if (!vId) return
    
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues/${vId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPromotions(response.data.venue?.promotions || [])
    } catch (error) {
      console.error('Failed to fetch promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePromotion = async (formData: PromotionFormData) => {
    if (!venueId || !token) {
      alert('No venue found. Please create a venue first.')
      return
    }

    setSaving(true)
    try {
      const promotionData = {
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
          maxOccurrences: formData.recurrencePattern.maxOccurrences || 12
        } : undefined
      }

      if (editingPromo) {
        const response = await axios.put(
          `${getApiUrl()}/venues/${venueId}/promotions/${editingPromo._id}`,
          promotionData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const message = response.data?.notificationsSent 
          ? '✅ Promotion activated! Push notifications sent to users instantly!'
          : 'Promotion updated successfully!'
        alert(message)
      } else {
        await axios.post(
          `${getApiUrl()}/venues/${venueId}/promotions`,
          promotionData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        alert('✅ Promotion created! Push notifications sent to users instantly!')
      }

      setShowWizard(false)
      setShowTemplates(false)
      setEditingPromo(null)
      setSelectedTemplate(null)
      setQuickActionData(null)
      fetchPromotions()
    } catch (error: any) {
      console.error('❌ Failed to save promotion:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save promotion'
      alert(`Error: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTemplateSelect = (template: TemplateType | null) => {
    if (template) {
      setSelectedTemplate(template)
      setShowTemplates(false)
      setShowWizard(true)
    } else {
      // Create from scratch
      setSelectedTemplate(null)
      setShowTemplates(false)
      setShowWizard(true)
    }
  }

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo)
    setSelectedTemplate(null)
    setQuickActionData(null)
    setShowWizard(true)
  }

  const handleDelete = async (promoId: string) => {
    if (!venueId || !token) return
    if (!confirm('Are you sure you want to delete this promotion?')) return

    try {
      await axios.delete(
        `${getApiUrl()}/venues/${venueId}/promotions/${promoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Promotion deleted successfully!')
      fetchPromotions()
    } catch (error: any) {
      console.error('Failed to delete promotion:', error)
      alert(error.response?.data?.error || 'Failed to delete promotion')
    }
  }

  // Quick action handlers
  const getQuickActionData = (action: string): Partial<PromotionFormData> => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    switch (action) {
      case 'happy-hour':
        const happyHourStart = new Date(now)
        happyHourStart.setHours(16, 0, 0, 0) // 4 PM
        const happyHourEnd = new Date(now)
        happyHourEnd.setHours(19, 0, 0, 0) // 7 PM
        
        return {
          title: 'Happy Hour',
          description: 'Join us for discounted drinks and appetizers!',
          type: 'happy-hour',
          startTime: happyHourStart.toISOString().slice(0, 16),
          endTime: happyHourEnd.toISOString().slice(0, 16),
          isFlashDeal: false,
          pointsReward: 10,
          targeting: {
            followersOnly: false,
            locationBased: false,
            radiusMiles: 5,
            userSegments: ['all'],
            minCheckIns: 0,
            timeBased: true,
            timeWindow: { start: '16:00', end: '19:00' }
          }
        }

      case 'flash-deal':
        const flashStart = new Date(now)
        const flashEnd = new Date(now)
        flashEnd.setHours(flashEnd.getHours() + 1) // 1 hour from now
        
        return {
          title: 'Flash Deal',
          description: 'Limited time offer - act fast!',
          type: 'flash-deal',
          startTime: flashStart.toISOString().slice(0, 16),
          endTime: flashEnd.toISOString().slice(0, 16),
          isFlashDeal: true,
          flashDealEndsAt: flashEnd.toISOString().slice(0, 16),
          pointsReward: 25,
          targeting: {
            followersOnly: true,
            locationBased: true,
            radiusMiles: 5,
            userSegments: ['all'],
            minCheckIns: 0,
            timeBased: false,
            timeWindow: { start: '', end: '' }
          }
        }

      case 'weekend':
        const friday = new Date(now)
        friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7) // Next Friday
        friday.setHours(0, 0, 0, 0)
        const sunday = new Date(friday)
        sunday.setDate(sunday.getDate() + 2)
        sunday.setHours(23, 59, 59)
        
        return {
          title: 'Weekend Special',
          description: 'Special deals all weekend long!',
          type: 'special',
          startTime: friday.toISOString().slice(0, 16),
          endTime: sunday.toISOString().slice(0, 16),
          isFlashDeal: false,
          pointsReward: 15,
          targeting: {
            followersOnly: false,
            locationBased: false,
            radiusMiles: 5,
            userSegments: ['all'],
            minCheckIns: 0,
            timeBased: false,
            timeWindow: { start: '', end: '' }
          }
        }

      case 'vip':
        return {
          title: 'VIP Exclusive Offer',
          description: 'Special deal just for our VIP members!',
          type: 'exclusive',
          startTime: now.toISOString().slice(0, 16),
          endTime: tomorrow.toISOString().slice(0, 16),
          isFlashDeal: false,
          pointsReward: 50,
          targeting: {
            followersOnly: true,
            locationBased: false,
            radiusMiles: 5,
            userSegments: ['vip'],
            minCheckIns: 10,
            timeBased: false,
            timeWindow: { start: '', end: '' }
          }
        }

      default:
        return {}
    }
  }

  const handleQuickAction = (action: string) => {
    const quickData = getQuickActionData(action)
    setQuickActionData(quickData)
    setSelectedTemplate(null)
    setEditingPromo(null)
    setShowWizard(true)
  }

  const handleNewPromotion = () => {
    setSelectedTemplate(null)
    setEditingPromo(null)
    setQuickActionData(null)
    setShowWizard(true)
  }

  const handleShowTemplates = () => {
    setShowTemplates(true)
  }

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleQuickAction,
    handleNewPromotion,
    handleShowTemplates
  }))

  if (loading) {
    return (
      <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
        <div className="text-center py-4 text-primary-400/70 text-sm font-light">Loading promotions...</div>
      </div>
    )
  }

  if (!venueId) {
    return (
      <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
        <div className="text-center py-4 text-primary-400/80 text-sm">
          <p className="mb-2 font-light">No venue found. Please create a venue first.</p>
          <button
            onClick={() => window.location.href = '/dashboard/settings'}
            className="bg-primary-500 text-black px-4 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-sm"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
              <Sparkles className="w-4 h-4 text-primary-500" />
            </div>
            <h2 className="text-base font-semibold text-primary-500 tracking-tight">Promotions</h2>
            {promotions.length > 0 && (
              <span className="text-xs text-primary-400/70">({promotions.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center space-x-1 bg-primary-500/20 border border-primary-500/30 text-primary-500 px-2.5 py-1.5 rounded hover:bg-primary-500/30 transition-all font-medium text-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Template</span>
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="flex items-center space-x-1 bg-primary-500/20 border border-primary-500/30 text-primary-500 px-2.5 py-1.5 rounded hover:bg-primary-500/30 transition-all font-medium text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>
            <button
              onClick={() => {
                setSelectedTemplate(null)
                setEditingPromo(null)
                setQuickActionData(null)
                setShowWizard(true)
              }}
              className="flex items-center space-x-1 bg-primary-500 text-black px-2.5 py-1.5 rounded hover:bg-primary-600 transition-all font-medium text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Promotions List - Show First, Most Important */}
        {promotions.length === 0 ? (
          <div className="text-center py-8 text-primary-400/80">
            <p className="mb-3 font-light text-base">No promotions yet. Create your first promotion!</p>
            <button
              onClick={() => setShowTemplates(true)}
              className="mt-2 bg-primary-500 text-black px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-600 transition-all"
            >
              + Create Promotion
            </button>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {promotions.map((promo) => {
              const isActive = promo.isActive
              const now = new Date()
              const startTime = new Date(promo.startTime)
              const endTime = new Date(promo.endTime)
              const isCurrentlyActive = isActive && now >= startTime && now <= endTime
              
              return (
                <div 
                  key={promo._id} 
                  onClick={() => handleEdit(promo)}
                  className={`bg-gradient-to-br ${isCurrentlyActive ? 'from-primary-500/20 via-primary-500/10 to-black/40' : 'from-black/50 to-black/40'} border-2 ${isCurrentlyActive ? 'border-primary-500/40' : 'border-primary-500/20'} rounded-xl p-4 hover:border-primary-500/50 hover:from-primary-500/25 hover:via-primary-500/15 hover:to-black/50 transition-all backdrop-blur-sm cursor-pointer group shadow-lg`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-primary-500 text-base tracking-tight">{promo.title}</h3>
                        {isCurrentlyActive && (
                          <span className="bg-primary-500/30 border border-primary-500/50 text-primary-500 px-2 py-0.5 rounded-lg text-xs font-bold animate-pulse">
                            LIVE
                          </span>
                        )}
                        {promo.isFlashDeal && (
                          <span className="bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded-lg text-xs font-bold">
                            FLASH
                          </span>
                        )}
                      </div>
                      {promo.description && (
                        <p className="text-sm text-primary-400/90 mt-1 mb-2 line-clamp-2 font-light">{promo.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-2 text-xs text-primary-400/80">
                        <span className="capitalize bg-primary-500/15 border border-primary-500/30 text-primary-500 px-2.5 py-1 rounded-lg font-medium">
                          {promo.type.replace('-', ' ')}
                        </span>
                        <span className="text-primary-400/70 font-light">
                          {new Date(promo.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {promo.startTime && promo.endTime && (
                          <span className="text-primary-400/70 font-light">
                            {new Date(promo.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(promo.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-3 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setViewingAnalytics({ promotionId: promo._id, title: promo.title })
                        }}
                        className="p-2 text-primary-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="View analytics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(promo)
                        }}
                        className="p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
                        title="Edit promotion"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(promo._id)
                        }}
                        className="p-2 text-primary-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete promotion"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Push Notification Banner - Key Feature Highlight */}
        <div className="mb-3 bg-gradient-to-r from-primary-500/20 to-cyan-500/20 border border-primary-500/40 rounded-lg p-3">
          <div className="flex items-start gap-2.5">
            <div className="bg-primary-500/30 rounded-lg p-1.5 flex-shrink-0">
              <Bell className="w-4 h-4 text-primary-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-primary-500">Real-Time Push Notifications</h3>
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <p className="text-xs text-primary-400/90 font-light leading-relaxed">
                When you create or activate a promotion, users instantly receive push notifications on their mobile devices. This drives immediate engagement and spending at your venue. Target followers, nearby users, or specific segments to maximize impact.
              </p>
            </div>
          </div>
        </div>

        {/* AI Smart Generator */}
        <div className="mb-3">
          <SmartPromotionGenerator onGenerated={fetchPromotions} />
        </div>

        {/* Quick Actions - Only show if not hidden */}
        {!hideQuickActions && (
          <div className="mb-3">
            <QuickActions
              onStartHappyHour={() => handleQuickAction('happy-hour')}
              onFlashDeal={() => handleQuickAction('flash-deal')}
              onWeekendSpecial={() => handleQuickAction('weekend')}
              onVipExclusive={() => handleQuickAction('vip')}
            />
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <PromotionTemplates
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Wizard Modal */}
      {showWizard && (
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
              timeWindow: editingPromo.targeting?.timeWindow || { start: '', end: '' }
            }
          } : undefined)}
          onSave={handleSavePromotion}
          onCancel={() => {
            setShowWizard(false)
            setEditingPromo(null)
            setSelectedTemplate(null)
            setQuickActionData(null)
          }}
          isEditing={!!editingPromo}
        />
      )}

      {/* Analytics Modal */}
      {viewingAnalytics && venueId && (
        <PromotionAnalytics
          venueId={venueId}
          promotionId={viewingAnalytics.promotionId}
          promotionTitle={viewingAnalytics.title}
          onClose={() => setViewingAnalytics(null)}
        />
      )}

      {/* Library Modal */}
      {showLibrary && (
        <PromotionLibrary
          onSelectPromotion={(promotionData) => {
            setQuickActionData(promotionData)
            setShowLibrary(false)
            setShowWizard(true)
          }}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* Save to Library Modal */}
      {savingToLibrary && promotions.find(p => p._id === savingToLibrary) && (
        <SaveToLibraryModal
          promotion={promotions.find(p => p._id === savingToLibrary)!}
          onClose={() => setSavingToLibrary(null)}
          onSaved={() => {
            setSavingToLibrary(null)
          }}
        />
      )}
    </>
  )
})

PromotionsManager.displayName = 'PromotionsManager'

export default PromotionsManager
