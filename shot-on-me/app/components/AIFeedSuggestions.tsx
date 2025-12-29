'use client'

import { useState, useEffect, memo } from 'react'
import { Sparkles, MapPin, Users, Clock, X } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'

interface Suggestion {
  type: 'checkin' | 'prompt'
  text: string
  venueId?: string
  priority: number
}

interface AIFeedSuggestionsProps {
  nearbyVenues?: any[]
  recentFriendActivity?: any[]
  onSuggestionClick?: (suggestion: Suggestion) => void
}

const AIFeedSuggestions = memo(({ nearbyVenues, recentFriendActivity, onSuggestionClick }: AIFeedSuggestionsProps) => {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!token) return

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (nearbyVenues && nearbyVenues.length > 0) {
          params.append('nearbyVenues', JSON.stringify(nearbyVenues.slice(0, 5)))
        }
        if (recentFriendActivity && recentFriendActivity.length > 0) {
          params.append('recentFriendActivity', JSON.stringify(recentFriendActivity.slice(0, 3)))
        }

        const response = await axios.get(`${API_URL}/feed-ai/suggestions?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        setSuggestions(response.data.suggestions || [])
      } catch (error) {
        console.error('Failed to fetch AI suggestions:', error)
        // Fallback to local suggestions if API fails
        setSuggestions(generateLocalSuggestions())
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [token, nearbyVenues, recentFriendActivity])

  const generateLocalSuggestions = (): Suggestion[] => {
    const localSuggestions: Suggestion[] = []
    const hour = new Date().getHours()

    if (hour >= 17 && hour < 22) {
      localSuggestions.push({
        type: 'prompt',
        text: 'Share your evening plans! 🍻',
        priority: 5
      })
    }

    if (nearbyVenues && nearbyVenues.length > 0) {
      localSuggestions.push({
        type: 'checkin',
        text: `Check in at ${nearbyVenues[0].name}?`,
        venueId: nearbyVenues[0]._id,
        priority: 8
      })
    }

    return localSuggestions
  }

  const handleDismiss = (index: number) => {
    setDismissed(prev => new Set([...prev, index]))
  }

  const visibleSuggestions = suggestions.filter((_, index) => !dismissed.has(index))

  if (loading || visibleSuggestions.length === 0) return null

  return (
    <div className="p-4 border-b border-primary-500/10 bg-gradient-to-r from-primary-500/5 to-transparent">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-primary-500">AI Suggestions</h3>
        </div>
      </div>
      <div className="space-y-2">
        {visibleSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/20 rounded-lg hover:border-primary-500/40 transition-all group"
          >
            <div className="flex items-center space-x-3 flex-1">
              {suggestion.type === 'checkin' ? (
                <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-primary-500 flex-shrink-0" />
              )}
              <p className="text-sm text-primary-400 flex-1">{suggestion.text}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-3 py-1.5 bg-primary-500 text-black rounded-lg text-xs font-semibold hover:bg-primary-400 transition-all"
              >
                Use
              </button>
              <button
                onClick={() => handleDismiss(index)}
                className="p-1 text-primary-400 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

AIFeedSuggestions.displayName = 'AIFeedSuggestions'

export default AIFeedSuggestions

