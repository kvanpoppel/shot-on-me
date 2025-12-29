'use client'

import { useState } from 'react'
import { Sparkles, Zap, CheckCircle, Loader2, TrendingUp, Clock, Calendar, Target, BarChart3, X, RefreshCw, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './ToastContainer'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

interface GeneratedPromotion {
  title: string
  description: string
  discount: number
  type: string
  startTime: string
  endTime: string
  daysOfWeek: string[]
  confidence: number
  reasoning: string
  priority?: string
  category?: string
}

export default function SmartPromotionGenerator({ onGenerated }: { onGenerated?: () => void }) {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<GeneratedPromotion | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)

  const generatePromotion = async () => {
    if (!token) {
      showError('Please log in to generate promotions')
      return
    }

    try {
      setGenerating(true)
      
      // Get venue ID
      let currentVenueId = venueId
      if (!currentVenueId) {
        const apiUrl = getApiUrl()
        const venuesRes = await axios.get(`${apiUrl}/venues`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const vid = Array.isArray(venuesRes.data) 
          ? venuesRes.data[0]?._id 
          : venuesRes.data?.venues?.[0]?._id
        if (!vid) {
          showError('No venue found. Please set up your venue first.')
          setGenerating(false)
          return
        }
        setVenueId(vid)
        currentVenueId = vid
      }

      // Get AI suggestions
      const apiUrl = getApiUrl()
      const suggestionsRes = await axios.get(`${apiUrl}/ai-automation/suggestions?venueId=${currentVenueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const suggestions = suggestionsRes.data.suggestions || []
      if (suggestions.length === 0) {
        showError('No suggestions available. Try again later.')
        return
      }

      // Use top suggestion
      const topSuggestion = suggestions[0]
      const promo = topSuggestion.suggestedPromotion

      setGenerated({
        title: promo.title,
        description: promo.description,
        discount: promo.discount,
        type: promo.type,
        startTime: promo.startTime || '17:00',
        endTime: promo.endTime || '22:00',
        daysOfWeek: promo.daysOfWeek || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        confidence: topSuggestion.confidence,
        reasoning: topSuggestion.description
      })
    } catch (error: any) {
      showError(error.message || 'Failed to generate promotion')
    } finally {
      setGenerating(false)
    }
  }

  const createPromotion = async () => {
    if (!generated || !venueId || !token) return

    try {
      setGenerating(true)
      const apiUrl = getApiUrl()
      
      await axios.post(
        `${apiUrl}/ai-automation/auto-post`,
        {
          venueId,
          suggestion: {
            suggestedPromotion: generated,
            autoPost: true,
            confidence: generated.confidence
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      showSuccess('Promotion created and posted automatically!')
      setGenerated(null)
      if (onGenerated) {
        onGenerated()
      }
      router.refresh()
    } catch (error: any) {
      showError(error.message || 'Failed to create promotion')
    } finally {
      setGenerating(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (confidence >= 0.70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    return 'text-primary-400 bg-primary-500/10 border-primary-500/30'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.85) return 'High Confidence'
    if (confidence >= 0.70) return 'Good Confidence'
    return 'Moderate Confidence'
  }

  const formatDays = (days: string[]) => {
    if (days.length === 7) return 'Daily'
    const dayMap: { [key: string]: string } = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    }
    return days.map(d => dayMap[d] || d).slice(0, 3).join(', ') + (days.length > 3 ? ` +${days.length - 3}` : '')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'happy-hour':
        return '🍺'
      case 'special':
        return '⭐'
      case 'event':
        return '🎉'
      case 'flash-deal':
        return '⚡'
      default:
        return '🎯'
    }
  }

  return (
    <div className="bg-gradient-to-br from-black/50 via-black/40 to-black/50 border border-primary-500/20 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="p-2.5 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl border border-primary-500/30 shadow-lg">
              <Sparkles className="w-5 h-5 text-primary-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-base font-bold text-primary-400 tracking-tight">AI Promotion Generator</h3>
            <p className="text-xs text-primary-500/70 font-light">Intelligent promotion creation powered by AI</p>
          </div>
        </div>
      </div>

      {!generated ? (
        <div className="space-y-4">
          {/* Generation Button */}
          <button
            onClick={generatePromotion}
            disabled={generating}
            className="group w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-black rounded-xl font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:hover:scale-100"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Analyzing Patterns & Generating...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Generate Smart Promotion</span>
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-black/30 border border-primary-500/10 rounded-lg p-2 text-center">
              <TrendingUp className="w-3 h-3 text-primary-500 mx-auto mb-1" />
              <p className="text-[10px] text-primary-400/70 font-light">Data-Driven</p>
            </div>
            <div className="bg-black/30 border border-primary-500/10 rounded-lg p-2 text-center">
              <Target className="w-3 h-3 text-primary-500 mx-auto mb-1" />
              <p className="text-[10px] text-primary-400/70 font-light">Optimized</p>
            </div>
            <div className="bg-black/30 border border-primary-500/10 rounded-lg p-2 text-center">
              <BarChart3 className="w-3 h-3 text-primary-500 mx-auto mb-1" />
              <p className="text-[10px] text-primary-400/70 font-light">Smart</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 animate-slide-up">
          {/* Confidence Badge */}
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${getConfidenceColor(generated.confidence)}`}>
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span className="text-xs font-semibold">{getConfidenceLabel(generated.confidence)}</span>
            </div>
            <span className="text-xs font-bold">{(generated.confidence * 100).toFixed(0)}%</span>
          </div>

          {/* Promotion Preview Card */}
          <div className="relative bg-gradient-to-br from-black/60 via-black/50 to-black/60 border-2 border-primary-500/30 rounded-xl p-5 shadow-2xl overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-600/5 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 space-y-4">
              {/* Title Section */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="text-2xl">{getTypeIcon(generated.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-primary-400 mb-1 truncate">{generated.title}</h4>
                    <p className="text-xs text-primary-500/80 leading-relaxed line-clamp-2">{generated.description}</p>
                  </div>
                </div>
              </div>

              {/* Discount Badge */}
              <div className="flex items-center justify-center">
                <div className="bg-gradient-to-r from-primary-500/20 to-primary-600/20 border-2 border-primary-500/40 rounded-full px-6 py-3">
                  <span className="text-3xl font-black text-primary-400">{generated.discount}%</span>
                  <span className="text-sm font-semibold text-primary-500/70 ml-1">OFF</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-black/40 border border-primary-500/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[10px] text-primary-400/70 uppercase tracking-wider font-medium">Time</span>
                  </div>
                  <p className="text-sm font-semibold text-primary-400">
                    {generated.startTime} - {generated.endTime}
                  </p>
                </div>

                <div className="bg-black/40 border border-primary-500/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[10px] text-primary-400/70 uppercase tracking-wider font-medium">Schedule</span>
                  </div>
                  <p className="text-sm font-semibold text-primary-400">{formatDays(generated.daysOfWeek)}</p>
                </div>
              </div>

              {/* Type Badge */}
              <div className="flex items-center justify-center pt-2">
                <span className="px-3 py-1.5 bg-primary-500/10 border border-primary-500/30 rounded-full text-xs font-semibold text-primary-500 capitalize">
                  {generated.type.replace('-', ' ')}
                </span>
              </div>

              {/* AI Reasoning */}
              <div className="pt-3 border-t border-primary-500/20">
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-primary-500 mb-1">AI Analysis</p>
                    <p className="text-xs text-primary-400/70 leading-relaxed">{generated.reasoning}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={createPromotion}
              disabled={generating}
              className="group flex-1 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-black rounded-xl font-semibold hover:from-primary-400 hover:to-primary-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Creating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">Create & Post</span>
                </>
              )}
            </button>
            <button
              onClick={() => setGenerated(null)}
              className="px-4 py-3 border-2 border-primary-500/30 text-primary-500 rounded-xl hover:bg-primary-500/10 hover:border-primary-500/50 transition-all duration-300 flex items-center justify-center group"
              title="Generate a different promotion"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            </button>
            <button
              onClick={() => setGenerated(null)}
              className="px-4 py-3 border-2 border-primary-500/20 text-primary-500/70 rounded-xl hover:bg-primary-500/5 hover:border-primary-500/30 transition-all duration-300 flex items-center justify-center"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

