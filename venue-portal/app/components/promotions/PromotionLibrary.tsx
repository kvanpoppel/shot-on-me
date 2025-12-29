'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/api'
import axios from 'axios'
import { X, BookOpen, Search, Filter, Star, Calendar, TrendingUp, Trash2, Edit, Copy } from 'lucide-react'

interface PromotionLibraryProps {
  onSelectPromotion: (promotionData: any) => void
  onClose: () => void
}

interface SavedPromotion {
  _id: string
  name: string
  description: string
  promotionData: any
  performance?: {
    views?: number
    clicks?: number
    redemptions?: number
    revenue?: number
    conversionRate?: number
  }
  category: string
  tags: string[]
  usageCount: number
  lastUsed?: string
  createdAt: string
}

export default function PromotionLibrary({ onSelectPromotion, onClose }: PromotionLibraryProps) {
  const { token } = useAuth()
  const [savedPromotions, setSavedPromotions] = useState<SavedPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchLibrary()
    }
  }, [token, selectedCategory, searchQuery])

  const fetchLibrary = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = getApiUrl()
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await axios.get(
        `${apiUrl}/promotion-library?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setSavedPromotions(response.data.promotions || [])
    } catch (err: any) {
      console.error('Error fetching library:', err)
      setError(err.response?.data?.message || 'Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved promotion?')) return

    try {
      const apiUrl = getApiUrl()
      await axios.delete(`${apiUrl}/promotion-library/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchLibrary()
    } catch (err: any) {
      console.error('Error deleting:', err)
      alert('Failed to delete promotion')
    }
  }

  const handleUse = async (promotion: SavedPromotion) => {
    try {
      // Track usage
      const apiUrl = getApiUrl()
      await axios.post(
        `${apiUrl}/promotion-library/${promotion._id}/use`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Convert saved promotion data to wizard format
      const promotionData = {
        title: promotion.promotionData.title,
        description: promotion.promotionData.description || '',
        type: promotion.promotionData.type || 'other',
        startTime: promotion.promotionData.startTime || '',
        endTime: promotion.promotionData.endTime || '',
        daysOfWeek: [],
        isFlashDeal: promotion.promotionData.isFlashDeal || false,
        flashDealEndsAt: promotion.promotionData.flashDealEndsAt || '',
        pointsReward: promotion.promotionData.pointsReward || 0,
        isRecurring: promotion.promotionData.isRecurring || false,
        recurrencePattern: promotion.promotionData.recurrencePattern || {
          type: '',
          frequency: 1,
          daysOfWeek: [],
          dayOfMonth: 1,
          endDate: '',
          maxOccurrences: 0
        },
        targeting: promotion.promotionData.targeting || {
          followersOnly: false,
          locationBased: false,
          radiusMiles: 5,
          userSegments: ['all'],
          minCheckIns: 0,
          timeBased: false,
          timeWindow: { start: '', end: '' }
        }
      }

      onSelectPromotion(promotionData)
      onClose()
    } catch (err: any) {
      console.error('Error using promotion:', err)
      alert('Failed to load promotion')
    }
  }

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'happy-hour', label: 'Happy Hour' },
    { value: 'special', label: 'Special' },
    { value: 'event', label: 'Event' },
    { value: 'flash-deal', label: 'Flash Deal' },
    { value: 'exclusive', label: 'Exclusive' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-primary-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary-500" />
            <div>
              <h2 className="text-2xl font-bold text-primary-500">Promotion Library</h2>
              <p className="text-primary-400 text-sm">Saved promotions you can reuse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-primary-500/20 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
            <input
              type="text"
              placeholder="Search by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-400/50 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-primary-400" />
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-primary-500 text-black'
                    : 'bg-black/40 border border-primary-500/20 text-primary-400 hover:bg-primary-500/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-primary-400 mt-4">Loading library...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchLibrary}
                className="px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : savedPromotions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-primary-400/30 mx-auto mb-4" />
              <p className="text-primary-400 text-lg mb-2">No saved promotions yet</p>
              <p className="text-primary-400/70 text-sm">Save successful promotions to reuse them later</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPromotions.map((promotion) => (
                <div
                  key={promotion._id}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary-500 mb-1">{promotion.name}</h3>
                      {promotion.description && (
                        <p className="text-sm text-primary-400/80 line-clamp-2">{promotion.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUse(promotion)}
                        className="p-1.5 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded transition-colors"
                        title="Use this promotion"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promotion._id)}
                        className="p-1.5 text-primary-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-primary-400/70 flex-wrap">
                      <span className="capitalize bg-primary-500/10 border border-primary-500/20 text-primary-500 px-2 py-0.5 rounded">
                        {promotion.category.replace('-', ' ')}
                      </span>
                      {promotion.tags && promotion.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {promotion.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {promotion.performance?.redemptions !== undefined && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {promotion.performance.redemptions} redemptions
                        </span>
                      )}
                    </div>

                    {promotion.performance?.revenue !== undefined && promotion.performance.revenue > 0 && (
                      <div className="text-xs text-green-400 font-medium">
                        ${promotion.performance.revenue.toFixed(2)} revenue
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-primary-400/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Used {promotion.usageCount} times
                      </span>
                      {promotion.lastUsed && (
                        <span>Last used {new Date(promotion.lastUsed).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

