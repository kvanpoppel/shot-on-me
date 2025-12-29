'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Sparkles, TrendingUp, Target, Loader2 } from 'lucide-react'
import { getApiUrl } from '../utils/api'

export default function AIAnalyticsSummary() {
  const { token } = useAuth()
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchTopRecommendations()
    }
  }, [token])

  const fetchTopRecommendations = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/ai-analytics/performance?timeRange=30`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const recs = response.data.analysis?.recommendations || []
      setRecommendations(recs.slice(0, 3)) // Show only top 3
    } catch (error) {
      console.error('Failed to fetch AI analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-6">
        <Sparkles className="w-8 h-8 text-primary-500/50 mx-auto mb-2" />
        <p className="text-sm text-primary-400/70">No recommendations yet</p>
        <p className="text-xs text-primary-400/50 mt-1">Start creating promotions to get AI insights</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="flex items-start space-x-3 p-3 bg-black/20 rounded-lg border border-primary-500/10">
          <div className="flex-shrink-0 mt-0.5">
            {rec.priority === 'high' ? (
              <Target className="w-4 h-4 text-red-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-primary-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-500 mb-1">{rec.title}</p>
            <p className="text-xs text-primary-400/70 leading-relaxed">{rec.description}</p>
          </div>
        </div>
      ))}
      <button
        onClick={() => router.push('/dashboard/analytics?tab=ai-analytics')}
        className="w-full mt-4 text-xs text-primary-500/70 hover:text-primary-500 transition-colors text-center"
      >
        View All Insights →
      </button>
    </div>
  )
}

