'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { Plus, Edit, Trash2, Sparkles, FileText } from 'lucide-react'
import { getApiUrl } from '../../utils/api'
import PromotionTemplates, { PromotionTemplate as TemplateType } from './PromotionTemplates'
import PromotionWizard from './PromotionWizard'
import QuickActions from './QuickActions'

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

export default function PromotionManagerEnhanced() {
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
        targeting: formData.targeting
      }

      if (editingPromo) {
        await axios.put(
          `${getApiUrl()}/venues/${venueId}/promotions/${editingPromo._id}`,
          promotionData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        alert('Promotion updated successfully!')
      } else {
        await axios.post(
          `${getApiUrl()}/venues/${venueId}/promotions`,
          promotionData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        alert('Promotion created successfully!')
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

        {/* Quick Actions */}
        <div className="mb-3">
          <QuickActions
            onStartHappyHour={() => handleQuickAction('happy-hour')}
            onFlashDeal={() => handleQuickAction('flash-deal')}
            onWeekendSpecial={() => handleQuickAction('weekend')}
            onVipExclusive={() => handleQuickAction('vip')}
          />
        </div>

        {/* Promotions List */}
        {promotions.length === 0 ? (
          <div className="text-center py-4 text-primary-400/80 text-sm">
            <p className="mb-2 font-light">No promotions yet. Create your first promotion!</p>
            <button
              onClick={() => setShowTemplates(true)}
              className="mt-2 bg-primary-500 text-black px-4 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-sm"
            >
              + Create Promotion
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {promotions.map((promo) => (
              <div 
                key={promo._id} 
                onClick={() => handleEdit(promo)}
                className="bg-black/40 border border-primary-500/15 rounded p-2 hover:border-primary-500/25 hover:bg-black/50 transition-all backdrop-blur-sm cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-primary-500 text-xs truncate tracking-tight">{promo.title}</h3>
                    {promo.description && (
                      <p className="text-xs text-primary-400/80 mt-0.5 line-clamp-1 font-light">{promo.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1.5 text-xs text-primary-400/70">
                      <span className="capitalize bg-primary-500/10 border border-primary-500/20 text-primary-500 px-1.5 py-0.5 rounded text-xs font-medium">
                        {promo.type.replace('-', ' ')}
                      </span>
                      <span className="truncate text-xs font-light">{new Date(promo.startTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(promo)
                      }}
                      className="p-1 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded transition-colors"
                      title="Edit promotion"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(promo._id)
                      }}
                      className="p-1 text-primary-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete promotion"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
    </>
  )
}

