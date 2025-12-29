'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Sparkles, Zap, TrendingUp, Loader2, CheckCircle2, Copy } from 'lucide-react'

interface PromotionSuggestion {
  type: string
  priority: string
  title: string
  description: string
  promotionTemplate: any
  expectedImpact: string
  confidence: number
}

export default function PromotionSuggestions() {
  const { token } = useAuth()
  const [suggestions, setSuggestions] = useState<PromotionSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<PromotionSuggestion | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (token) {
      fetchSuggestions()
    }
  }, [token])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/predictive-analytics/promotion-suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuggestions(response.data.suggestions)
    } catch (error: any) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyTemplate = (template: any) => {
    const templateStr = JSON.stringify(template, null, 2)
    navigator.clipboard.writeText(templateStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
          <p className="text-primary-400">Generating AI Suggestions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary-500" />
          <div>
            <h2 className="text-2xl font-bold text-primary-500">AI Promotion Suggestions</h2>
            <p className="text-primary-400 text-sm">Automated promotion ideas based on your analytics</p>
          </div>
        </div>
        <button
          onClick={fetchSuggestions}
          className="px-4 py-2 bg-primary-500/20 border border-primary-500/50 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-all text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-primary-400">No suggestions available. Check back later!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className={`bg-black/40 border-2 rounded-lg p-5 ${
                suggestion.priority === 'high'
                  ? 'border-primary-500/50'
                  : 'border-primary-500/20'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    suggestion.priority === 'high' ? 'bg-primary-500' : 'bg-primary-400'
                  }`}></div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary-500">{suggestion.title}</h3>
                    <p className="text-primary-400 text-sm">{suggestion.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary-500/20 text-primary-500 px-2 py-1 rounded">
                    {suggestion.confidence}% confidence
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    suggestion.expectedImpact === 'high'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {suggestion.expectedImpact} impact
                  </span>
                </div>
              </div>

              {suggestion.promotionTemplate && (
                <div className="bg-black/60 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-primary-500 font-semibold">Promotion Template</h4>
                    <button
                      onClick={() => copyTemplate(suggestion.promotionTemplate)}
                      className="flex items-center gap-2 px-3 py-1 bg-primary-500/20 border border-primary-500/50 text-primary-500 rounded text-sm hover:bg-primary-500/30 transition-all"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Template
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400 w-24">Type:</span>
                      <span className="text-primary-500 capitalize">{suggestion.promotionTemplate.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400 w-24">Title:</span>
                      <span className="text-primary-500">{suggestion.promotionTemplate.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400 w-24">Discount:</span>
                      <span className="text-primary-500">{suggestion.promotionTemplate.discount}%</span>
                    </div>
                    {suggestion.promotionTemplate.schedule && (
                      <div className="flex items-start gap-2">
                        <span className="text-primary-400 w-24">Schedule:</span>
                        <div className="text-primary-500">
                          {suggestion.promotionTemplate.schedule.map((sched: any, i: number) => (
                            <div key={i} className="text-xs">
                              {sched.days}: {sched.start} - {sched.end}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // Navigate to promotions page with template pre-filled
                      const templateStr = encodeURIComponent(JSON.stringify(suggestion.promotionTemplate))
                      window.location.href = `/dashboard/promotions?template=${templateStr}`
                    }}
                    className="mt-4 w-full bg-primary-500 text-black py-2 rounded-lg font-semibold hover:bg-primary-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Use This Template
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

