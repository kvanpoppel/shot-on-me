'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Calculator, TrendingUp, DollarSign, Users, Loader2 } from 'lucide-react'

export default function ROICalculator() {
  const { token } = useAuth()
  const [prediction, setPrediction] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [daysAhead, setDaysAhead] = useState(7)

  const fetchPrediction = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(
        `${apiUrl}/predictive-analytics/revenue?daysAhead=${daysAhead}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPrediction(response.data.prediction || null)
    } catch (error: any) {
      console.error('Failed to fetch prediction:', error)
      setPrediction(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchPrediction()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, daysAhead])

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-400'
      case 'decreasing':
        return 'text-red-400'
      default:
        return 'text-primary-400'
    }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return '📈'
    if (trend === 'decreasing') return '📉'
    return '➡️'
  }

  return (
    <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-primary-500" />
        <div>
          <h2 className="text-2xl font-bold text-primary-500">Revenue Forecast & ROI</h2>
          <p className="text-primary-400 text-sm">Predict future revenue and calculate ROI</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-primary-400 text-sm mb-2">Forecast Period</label>
        <select
          value={daysAhead}
          onChange={(e) => setDaysAhead(parseInt(e.target.value))}
          className="w-full bg-black border border-primary-500/30 text-primary-400 rounded-lg px-3 py-2"
        >
          <option value={7}>Next 7 Days</option>
          <option value={14}>Next 14 Days</option>
          <option value={30}>Next 30 Days</option>
          <option value={90}>Next 90 Days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mr-3" />
          <p className="text-primary-400">Calculating forecast...</p>
        </div>
      ) : prediction ? (
        <div className="space-y-4">
          {/* Main Prediction Card */}
          <div className="bg-black/40 border-2 border-primary-500/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-primary-400 text-sm mb-1">Predicted Revenue</p>
                <p className="text-4xl font-bold text-primary-500">
                  ${(prediction.predictedRevenue || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-primary-400 text-sm mb-1">Confidence</p>
                <p className="text-2xl font-bold text-primary-500">{prediction.confidence}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-2xl">{getTrendIcon(prediction.trend)}</span>
              <span className={`font-semibold capitalize ${getTrendColor(prediction.trend)}`}>
                {prediction.trend} Trend
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-primary-500" />
                <p className="text-primary-400 text-xs">Daily Average</p>
              </div>
              <p className="text-xl font-bold text-primary-500">
                ${(prediction.dailyAverage || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <p className="text-primary-400 text-xs">Per Day Forecast</p>
              </div>
              <p className="text-xl font-bold text-primary-500">
                ${((prediction.predictedRevenue || 0) / daysAhead).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {prediction.recommendations && prediction.recommendations.length > 0 && (
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
              <h3 className="text-primary-500 font-semibold mb-3">AI Recommendations</h3>
              <div className="space-y-2">
                {prediction.recommendations.map((rec: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      rec.priority === 'high' ? 'bg-primary-500' : 'bg-primary-400'
                    }`}></div>
                    <div>
                      <p className="text-primary-500 font-semibold text-sm">{rec.title}</p>
                      <p className="text-primary-400 text-xs">{rec.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day of Week Multipliers */}
          {prediction.dayOfWeekMultipliers && (
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
              <h3 className="text-primary-500 font-semibold mb-3">Day Performance Multipliers</h3>
              <div className="grid grid-cols-7 gap-2 text-xs">
                {Object.entries(prediction.dayOfWeekMultipliers).map(([day, multiplier]: [string, any]) => {
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  const mult = parseFloat(multiplier)
                  return (
                    <div key={day} className="text-center">
                      <p className="text-primary-400 mb-1">{dayNames[parseInt(day)]}</p>
                      <p className={`font-bold ${
                        mult > 1.2 ? 'text-green-400' : mult < 0.8 ? 'text-red-400' : 'text-primary-500'
                      }`}>
                        {mult.toFixed(2)}x
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-primary-400">Unable to generate forecast. Check back later.</p>
        </div>
      )}
    </div>
  )
}

