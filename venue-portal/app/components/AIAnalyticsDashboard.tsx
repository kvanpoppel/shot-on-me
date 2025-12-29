'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { TrendingUp, Users, Clock, Target, Sparkles, AlertCircle, Loader2 } from 'lucide-react'

interface Recommendation {
  priority: string
  category: string
  title: string
  description: string
  action: string
  data?: any
}

interface AIAnalytics {
  dayOfWeekAnalysis: any
  demographicAnalysis: any
  timeframeAnalysis: any
  recommendations: Recommendation[]
  summary: any
}

export default function AIAnalyticsDashboard() {
  const { token } = useAuth()
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'demographics' | 'timeframes'>('overview')

  useEffect(() => {
    if (token) {
      fetchAnalytics()
    }
  }, [token])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/ai-analytics/performance?timeRange=30`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAnalytics(response.data.analysis)
    } catch (err: any) {
      console.error('Failed to fetch AI analytics:', err)
      setError(err.response?.data?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
          <p className="text-primary-400">Loading AI Analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-black border-2 border-red-500/30 rounded-lg shadow-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-red-400 font-semibold">Error Loading Analytics</p>
            <p className="text-red-400/70 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'timeframes', label: 'Timeframes', icon: Clock }
  ]

  return (
    <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary-500 mb-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            AI Analytics Dashboard
          </h2>
          <p className="text-primary-400 text-sm">Intelligent insights for optimal promotional strategies</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-primary-500/20 border border-primary-500/50 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-all text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
          <p className="text-primary-400 text-xs mb-1">Total Promotions</p>
          <p className="text-2xl font-bold text-primary-500">{analytics.summary.totalPromotions}</p>
        </div>
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
          <p className="text-primary-400 text-xs mb-1">Active Promotions</p>
          <p className="text-2xl font-bold text-primary-500">{analytics.summary.activePromotions}</p>
        </div>
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
          <p className="text-primary-400 text-xs mb-1">Total Redemptions</p>
          <p className="text-2xl font-bold text-primary-500">{analytics.summary.totalRedemptions}</p>
        </div>
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
          <p className="text-primary-400 text-xs mb-1">Avg Revenue</p>
          <p className="text-2xl font-bold text-primary-500">${analytics.summary.averageRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-primary-500/20 pb-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-primary-500 mb-3">Best Performing Days</h3>
              <div className="space-y-2">
                {analytics.dayOfWeekAnalysis.bestDays.map((day: string, idx: number) => (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-primary-400 capitalize">{day}</span>
                    <span className="text-primary-500 font-semibold">#{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-primary-500 mb-3">Top Recommendations</h3>
              <div className="space-y-2">
                {analytics.recommendations.slice(0, 3).map((rec: Recommendation, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      rec.priority === 'high' ? 'bg-primary-500' : 'bg-primary-400'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-primary-500 font-semibold text-sm">{rec.title}</p>
                      <p className="text-primary-400 text-xs">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {analytics.recommendations.map((rec: Recommendation, idx: number) => (
              <div
                key={idx}
                className={`bg-black/40 border-2 rounded-lg p-5 ${
                  rec.priority === 'high'
                    ? 'border-primary-500/50'
                    : 'border-primary-500/20'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      rec.priority === 'high' ? 'bg-primary-500' : 'bg-primary-400'
                    }`}></div>
                    <h3 className="text-lg font-semibold text-primary-500">{rec.title}</h3>
                  </div>
                  <span className="text-xs bg-primary-500/20 text-primary-500 px-2 py-1 rounded">
                    {rec.category}
                  </span>
                </div>
                <p className="text-primary-400 text-sm mb-4">{rec.description}</p>
                {rec.data && (
                  <div className="bg-black/60 rounded p-3 text-xs text-primary-400">
                    <pre>{JSON.stringify(rec.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'demographics' && (
          <div className="space-y-4">
            {analytics.demographicAnalysis.topAgeGroup && (
              <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary-500 mb-3">Primary Age Group</h3>
                <p className="text-2xl font-bold text-primary-500">{analytics.demographicAnalysis.topAgeGroup.group}</p>
                <p className="text-primary-400 text-sm">{analytics.demographicAnalysis.topAgeGroup.count} users</p>
              </div>
            )}

            {analytics.demographicAnalysis.recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary-500 mb-2">{rec.type === 'age_targeting' ? 'Age-Based Targeting' : 'Gender-Based Targeting'}</h3>
                <p className="text-primary-400 text-sm mb-3">{rec.message}</p>
                <div className="flex flex-wrap gap-2">
                  {rec.promotionTypes?.map((type: string) => (
                    <span key={type} className="text-xs bg-primary-500/20 text-primary-500 px-2 py-1 rounded">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'timeframes' && (
          <div className="space-y-4">
            {analytics.timeframeAnalysis.timeSlots.map((slot: any) => (
              <div key={slot.slot} className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-primary-500 capitalize">{slot.slot}</h3>
                  <span className="text-primary-400 text-sm">Score: {slot.effectiveness}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-primary-400 text-xs">Redemptions</p>
                    <p className="text-primary-500 font-semibold">{slot.redemptions}</p>
                  </div>
                  <div>
                    <p className="text-primary-400 text-xs">Revenue</p>
                    <p className="text-primary-500 font-semibold">${slot.revenue.toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-primary-500/10 border border-primary-500/30 rounded p-3">
                  <p className="text-primary-400 text-xs">{slot.recommendation.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

