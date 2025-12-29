'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/api'
import axios from 'axios'
import { X, Save, Tag } from 'lucide-react'

interface SaveToLibraryModalProps {
  promotion: any
  onClose: () => void
  onSaved: () => void
}

export default function SaveToLibraryModal({ promotion, onClose, onSaved }: SaveToLibraryModalProps) {
  const { token } = useAuth()
  const [name, setName] = useState(promotion.title || '')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this promotion')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const apiUrl = getApiUrl()

      // Get analytics if available
      let performance = {}
      if (promotion.analytics) {
        performance = {
          views: promotion.analytics.views || 0,
          clicks: promotion.analytics.clicks || 0,
          redemptions: promotion.analytics.redemptions || 0,
          revenue: promotion.analytics.revenue || 0,
          conversionRate: promotion.analytics.views > 0
            ? ((promotion.analytics.redemptions || 0) / promotion.analytics.views * 100)
            : 0
        }
      }

      // Prepare promotion data - ensure all fields are present
      const promotionData = {
        title: promotion.title || '',
        description: promotion.description || '',
        type: promotion.type || 'other',
        discount: promotion.discount || 0,
        startTime: promotion.startTime ? (typeof promotion.startTime === 'string' ? promotion.startTime : new Date(promotion.startTime).toISOString()) : '',
        endTime: promotion.endTime ? (typeof promotion.endTime === 'string' ? promotion.endTime : new Date(promotion.endTime).toISOString()) : '',
        schedule: promotion.schedule || [],
        isFlashDeal: promotion.isFlashDeal || false,
        flashDealEndsAt: promotion.flashDealEndsAt ? (typeof promotion.flashDealEndsAt === 'string' ? promotion.flashDealEndsAt : new Date(promotion.flashDealEndsAt).toISOString()) : '',
        pointsReward: promotion.pointsReward || 0,
        targeting: promotion.targeting || {
          followersOnly: false,
          locationBased: false,
          radiusMiles: 5,
          userSegments: ['all'],
          minCheckIns: 0,
          timeBased: false,
          timeWindow: { start: '', end: '' }
        },
        isRecurring: promotion.isRecurring || false,
        recurrencePattern: promotion.recurrencePattern || {
          type: '',
          frequency: 1,
          daysOfWeek: [],
          dayOfMonth: 1,
          endDate: '',
          maxOccurrences: 0
        }
      }

      await axios.post(
        `${apiUrl}/promotion-library`,
        {
          name: name.trim(),
          description: description.trim(),
          promotionData,
          performance,
          tags,
          category: promotion.type || 'other'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Error saving to library:', err)
      console.error('Error response:', err.response?.data)
      console.error('Error request:', {
        name,
        description,
        promotionData,
        tags,
        category: promotion.type
      })
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save promotion'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-primary-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-bold text-primary-500">Save to Library</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Successful Happy Hour"
              className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">
              Tags <span className="text-primary-400/60 text-xs font-normal">(Optional)</span>
            </label>
            <p className="text-xs text-primary-400/70 mb-2">
              Add tags to organize your promotions (e.g., "weekend", "summer", "popular")
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="e.g., weekend, summer, popular..."
                className="flex-1 px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-primary-500/20 border border-primary-500/30 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-all"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-primary-500/10 border border-primary-500/20 text-primary-500 px-2 py-1 rounded text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-black/40 border border-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

