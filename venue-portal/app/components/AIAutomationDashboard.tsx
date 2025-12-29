'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Sparkles, Zap, TrendingUp, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from './ToastContainer'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import AutoModeToggle from './AutoModeToggle'

interface Suggestion {
  type: string
  priority: string
  title: string
  description: string
  suggestedPromotion: any
  autoPost: boolean
  confidence: number
}

export default function AIAutomationDashboard() {
  const { token, user } = useAuth()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchVenueId()
    }
  }, [token])

  useEffect(() => {
    if (venueId && token) {
      loadSuggestions()
    }
  }, [venueId, token])

  const fetchVenueId = async () => {
    if (!token) return
    
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      let venues: any[] = []
      if (Array.isArray(response.data)) {
        venues = response.data
      } else if (response.data?.venues) {
        venues = response.data.venues
      }
      
      // Find venue owned by current user
      const userId = user?.id?.toString() || (user as any)?._id?.toString()
      
      const myVenue = userId ? venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        return ownerId === userId
      }) : null
      
      const venueToUse = myVenue || venues[0] // Fallback to first venue if no match
      const venueIdToSet = venueToUse?._id?.toString() || venueToUse?.id?.toString() || venueToUse?._id || venueToUse?.id
      
      if (venueIdToSet) {
        setVenueId(venueIdToSet)
      } else {
        console.warn('No venue found for user')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching venue:', error)
      setLoading(false)
    }
  }

  const loadSuggestions = async () => {
    if (!venueId || !token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/ai-automation/suggestions?venueId=${venueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuggestions(response.data.suggestions || [])
    } catch (error: any) {
      console.error('Error loading suggestions:', error)
      // Don't show error if it's a 404 (endpoint might not exist yet)
      if (error.response?.status !== 404) {
        // Only log non-404 errors
      }
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleAutoPost = async (suggestion: Suggestion) => {
    if (!venueId || !token) return

    try {
      setProcessing(true)
      const apiUrl = getApiUrl()
      await axios.post(
        `${apiUrl}/ai-automation/auto-post`,
        { venueId, suggestion },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess(`Promotion "${suggestion.title}" created and posted automatically!`)
      loadSuggestions() // Reload to update list
    } catch (error: any) {
      showError(error.message || 'Failed to create promotion')
    } finally {
      setProcessing(false)
    }
  }

  const handleProcessAll = async () => {
    if (!venueId || !token) return

    try {
      setProcessing(true)
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/ai-automation/process-all`,
        { venueId, threshold: 0.85 },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const { autoPosted, pending } = response.data
      let message = `✅ ${autoPosted.length} promotions auto-created!`
      if (pending.length > 0) {
        message += ` ${pending.length} suggestions pending review.`
      }
      showSuccess(message)
      loadSuggestions()
    } catch (error: any) {
      showError(error.message || 'Failed to process suggestions')
    } finally {
      setProcessing(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 border-red-500/30 bg-red-500/5'
      case 'medium':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5'
      default:
        return 'text-primary-400 border-primary-500/30 bg-primary-500/5'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4" />
      case 'medium':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <Sparkles className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Auto Mode Toggle */}
      <AutoModeToggle />

      {/* Quick Actions */}
      {suggestions.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-500">AI Suggestions</h3>
          <button
            onClick={handleProcessAll}
            disabled={processing}
            className="px-3 py-1.5 bg-primary-500 text-black text-xs font-medium rounded hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {processing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                <span>Auto-Create All</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Suggestions List */}
      {suggestions.length === 0 ? (
        <div className="text-center py-6 bg-black/20 rounded-lg border border-primary-500/10">
          <Sparkles className="w-8 h-8 text-primary-500/50 mx-auto mb-2" />
          <p className="text-sm text-primary-400/70">No suggestions at the moment</p>
          <p className="text-xs text-primary-400/50 mt-1">I'm analyzing your data. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.slice(0, 3).map((suggestion, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getPriorityIcon(suggestion.priority)}
                  <div>
                    <h4 className="text-sm font-semibold">{suggestion.title}</h4>
                    <p className="text-xs opacity-80 mt-0.5">{suggestion.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 bg-black/20 rounded">
                    {(suggestion.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {suggestion.suggestedPromotion && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-xs mb-2 opacity-70">Suggested Promotion:</p>
                  <div className="text-xs space-y-1 opacity-80">
                    <p><strong>Title:</strong> {suggestion.suggestedPromotion.title}</p>
                    <p><strong>Discount:</strong> {suggestion.suggestedPromotion.discount}%</p>
                    <p><strong>Type:</strong> {suggestion.suggestedPromotion.type}</p>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center space-x-2">
                {suggestion.autoPost && (
                  <button
                    onClick={() => handleAutoPost(suggestion)}
                    disabled={processing}
                    className="flex-1 px-3 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 text-xs font-medium rounded transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Creating...' : 'Create & Post Now'}
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard/promotions')}
                  className="px-3 py-2 border border-primary-500/30 hover:border-primary-500/50 text-primary-500 text-xs rounded transition-colors"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
          
          {suggestions.length > 3 && (
            <button
              onClick={() => router.push('/dashboard/analytics?tab=ai-analytics')}
              className="w-full text-xs text-primary-500/70 hover:text-primary-500 transition-colors text-center py-2"
            >
              View All {suggestions.length} Suggestions →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
