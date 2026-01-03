'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/api'
import axios from 'axios'
import { X, TrendingUp, Eye, MousePointerClick, Share2, ShoppingCart, DollarSign, Users, Calendar, Clock, BarChart3, LineChart } from 'lucide-react'
import { LineChart as RechartsLineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PromotionAnalyticsProps {
  venueId: string
  promotionId: string
  promotionTitle: string
  onClose: () => void
}

interface AnalyticsData {
  promotion: {
    id: string
    title: string
    description: string
    type: string
    isActive: boolean
    startTime: string
    endTime: string
    discount: number
  }
  metrics: {
    views: number
    clicks: number
    shares: number
    redemptions: number
    revenue: number
    checkIns: number
    conversionRate: string
    clickThroughRate: string
    averageOrderValue: string
  }
  charts: {
    dailyPerformance: Array<{ _id: string; count: number; revenue: number }>
    hourlyPerformance: Array<{ _id: number; count: number; revenue: number }>
  }
  period: {
    start: string
    end: string
  }
}

export default function PromotionAnalytics({ venueId, promotionId, promotionTitle, onClose }: PromotionAnalyticsProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token && venueId && promotionId) {
      fetchAnalytics()
    }
  }, [token, venueId, promotionId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = getApiUrl()
      console.log('Fetching analytics for:', { venueId, promotionId })
      
      // Fetch analytics from our new endpoint
      const analyticsResponse = await axios.get(
        `${apiUrl}/venues/${venueId}/promotions/${promotionId}/analytics`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      )
      
      const analytics = analyticsResponse.data.analytics || {
        views: 0,
        clicks: 0,
        shares: 0,
        redemptions: 0,
        revenue: 0,
        viewHistory: []
      }
      
      // Fetch promotion details to get full data
      const venueResponse = await axios.get(
        `${apiUrl}/venues/${venueId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      const venue = venueResponse.data.venue
      const promotion = venue.promotions.find((p: any) => p._id === promotionId)
      
      if (!promotion) {
        throw new Error('Promotion not found')
      }
      
      // Calculate metrics
      const conversionRate = analytics.views > 0 
        ? ((analytics.redemptions / analytics.views) * 100).toFixed(2)
        : '0.00'
      const clickThroughRate = analytics.views > 0
        ? ((analytics.clicks / analytics.views) * 100).toFixed(2)
        : '0.00'
      const averageOrderValue = analytics.redemptions > 0
        ? (analytics.revenue / analytics.redemptions).toFixed(2)
        : '0.00'
      
      // Format view history for charts
      const dailyPerformance = analytics.viewHistory.map((h: any) => ({
        _id: h.date,
        count: h.count || 0,
        revenue: 0 // Revenue would come from redemptions data
      }))
      
      const responseData = {
        promotion: {
          id: promotion._id,
          title: promotion.title,
          description: promotion.description || '',
          type: promotion.type,
          isActive: promotion.isActive,
          startTime: promotion.startTime,
          endTime: promotion.endTime,
          discount: promotion.discount || 0
        },
        metrics: {
          views: analytics.views || 0,
          clicks: analytics.clicks || 0,
          shares: analytics.shares || 0,
          redemptions: analytics.redemptions || 0,
          revenue: analytics.revenue || 0,
          checkIns: 0, // Would need separate endpoint
          conversionRate,
          clickThroughRate,
          averageOrderValue
        },
        charts: {
          dailyPerformance,
          hourlyPerformance: [] // Would need separate aggregation
        },
        period: {
          start: promotion.startTime,
          end: promotion.endTime
        }
      }
      
      console.log('Analytics response:', responseData)
      setData(responseData)
    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      console.error('Error response:', err.response?.data)
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load analytics'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-primary-400 mt-4 text-center">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-8 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-primary-500">Error</h2>
            <button
              onClick={onClose}
              className="text-primary-400 hover:text-primary-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-primary-400 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="w-full px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { promotion, metrics, charts } = data

  // Format chart data
  const dailyData = charts.dailyPerformance.map(item => ({
    date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    redemptions: item.count,
    revenue: item.revenue
  }))

  const hourlyData = charts.hourlyPerformance.map(item => ({
    hour: `${item._id}:00`,
    redemptions: item.count,
    revenue: item.revenue
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-primary-500/20 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary-500 mb-1">{promotionTitle}</h2>
            <p className="text-primary-400 text-sm">Performance Analytics</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Eye className="w-5 h-5" />}
              label="Views"
              value={metrics.views.toLocaleString()}
              color="text-blue-400"
            />
            <MetricCard
              icon={<MousePointerClick className="w-5 h-5" />}
              label="Clicks"
              value={metrics.clicks.toLocaleString()}
              color="text-purple-400"
            />
            <MetricCard
              icon={<ShoppingCart className="w-5 h-5" />}
              label="Redemptions"
              value={metrics.redemptions.toLocaleString()}
              color="text-green-400"
            />
            <MetricCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Revenue"
              value={`$${metrics.revenue.toFixed(2)}`}
              color="text-primary-500"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Conversion Rate"
              value={`${metrics.conversionRate}%`}
              color="text-yellow-400"
              small
            />
            <MetricCard
              icon={<MousePointerClick className="w-5 h-5" />}
              label="Click-Through Rate"
              value={`${metrics.clickThroughRate}%`}
              color="text-cyan-400"
              small
            />
            <MetricCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Avg Order Value"
              value={`$${metrics.averageOrderValue}`}
              color="text-orange-400"
              small
            />
            <MetricCard
              icon={<Users className="w-5 h-5" />}
              label="Check-ins"
              value={metrics.checkIns.toLocaleString()}
              color="text-pink-400"
              small
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Performance Chart */}
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <LineChart className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-primary-500">Daily Performance</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsLineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e9" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#0ea5e9" />
                  <YAxis stroke="#0ea5e9" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#000',
                      border: '1px solid #0ea5e9',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="redemptions"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    name="Redemptions"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Revenue ($)"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly Performance Chart */}
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-primary-500">Peak Hours</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e9" opacity={0.1} />
                  <XAxis dataKey="hour" stroke="#0ea5e9" />
                  <YAxis stroke="#0ea5e9" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#000',
                      border: '1px solid #0ea5e9',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="redemptions" fill="#0ea5e9" name="Redemptions" />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Promotion Details */}
          <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-primary-500 mb-4">Promotion Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-primary-400 mb-1">Type</p>
                <p className="text-primary-500 font-medium capitalize">{promotion.type}</p>
              </div>
              <div>
                <p className="text-primary-400 mb-1">Status</p>
                <p className={`font-medium ${promotion.isActive ? 'text-green-400' : 'text-red-400'}`}>
                  {promotion.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-primary-400 mb-1">Start Date</p>
                <p className="text-primary-500 font-medium">
                  {new Date(promotion.startTime).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-primary-400 mb-1">End Date</p>
                <p className="text-primary-500 font-medium">
                  {new Date(promotion.endTime).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: string
  small?: boolean
}

function MetricCard({ icon, label, value, color, small = false }: MetricCardProps) {
  return (
    <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={color}>{icon}</div>
        <p className={`text-primary-400 ${small ? 'text-xs' : 'text-sm'}`}>{label}</p>
      </div>
      <p className={`font-bold ${color} ${small ? 'text-xl' : 'text-2xl'}`}>{value}</p>
    </div>
  )
}

