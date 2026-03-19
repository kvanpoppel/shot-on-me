'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import StatsCard from '../components/StatsCard'
import RevenueChart from '../components/RevenueChart'
import RecentTransactions from '../components/RecentTransactions'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Loader, TrendingUp, Users, Building2, CreditCard, DollarSign, Activity, Sparkles, ArrowRight } from 'lucide-react'

interface AIInsight {
  key: string
  text: string
  actionLabel: string
  actionHref: string
}

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const API_URL = useApiUrl()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchDashboardData()
      // Refresh every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  const fetchDashboardData = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-primary-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  const { overview, financial, transactions } = dashboardData || {}
  const aiInsights: AIInsight[] = []
  const todayRevenue = parseFloat(financial?.todayRevenue || '0')
  const monthRevenue = parseFloat(financial?.monthRevenue || '0')
  const totalVenues = overview?.totalVenues || 0
  const activeVenues = overview?.activeVenues || 0
  const totalUsers = overview?.totalUsers || 0
  const activeUsers = overview?.activeUsers || 0
  const todayTransactions = transactions?.today || 0

  if (monthRevenue > 0 && todayRevenue > 0 && todayRevenue < monthRevenue / 30) {
    aiInsights.push({
      key: 'revenue_alert',
      text: 'Today is pacing below your monthly average. Consider a short flash promotion for top venues.',
      actionLabel: 'Open Analytics',
      actionHref: '/dashboard/analytics?period=7&ai=revenue_alert'
    })
  }
  if (totalVenues > 0 && activeVenues / totalVenues < 0.75) {
    aiInsights.push({
      key: 'inactive_venues',
      text: 'Venue activation is below 75%. Re-engage inactive venues with an onboarding reminder campaign.',
      actionLabel: 'Open Venues',
      actionHref: '/dashboard/venues?ai=inactive_venues'
    })
  }
  if (totalUsers > 0 && activeUsers / totalUsers < 0.35) {
    aiInsights.push({
      key: 'inactive_users',
      text: 'User activity is low. Push friend-based venue suggestions to increase session starts.',
      actionLabel: 'Open Users',
      actionHref: '/dashboard/users?ai=inactive_users'
    })
  }
  if (todayTransactions > 0 && todayTransactions < 20) {
    aiInsights.push({
      key: 'low_volume_today',
      text: 'Transaction volume is light today. Highlight time-limited offers in high-traffic areas.',
      actionLabel: 'Open Transactions',
      actionHref: '/dashboard/transactions?ai=low_volume_today'
    })
  }
  if (aiInsights.length === 0) {
    aiInsights.push({
      key: 'healthy_experiment',
      text: 'Performance looks healthy. Test one A/B variant on featured promotions to improve conversion.',
      actionLabel: 'Open Analytics',
      actionHref: '/dashboard/analytics'
    })
  }

  const insightLabelMap: Record<string, string> = {
    revenue_alert: 'Revenue Alert',
    inactive_venues: 'Inactive Venues',
    inactive_users: 'Inactive Users',
    low_volume_today: 'Low Volume Today',
    healthy_experiment: 'Healthy Experiment'
  }

  const topAppliedInsights = Object.entries(dashboardData?.aiInsights?.insightCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const trackInsightApply = async (insight: AIInsight) => {
    if (!token) return
    try {
      const url = new URL(insight.actionHref, 'http://localhost')
      await axios.post(
        `${API_URL}/owner/ai-insights/track`,
        {
          insightKey: insight.key,
          aiIntent: url.searchParams.get('ai') || '',
          actionHref: insight.actionHref
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch (error) {
      console.error('Failed to track AI insight apply:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500">Owner Dashboard</h1>
            <p className="text-primary-400/70 mt-1">Platform overview and analytics</p>
          </div>
          <div className="text-right">
            <p className="text-primary-400 text-sm">Last updated</p>
            <p className="text-primary-500 font-semibold">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Revenue"
            value={`$${parseFloat(financial?.totalRevenue || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            trend={financial?.monthRevenue ? `$${parseFloat(financial.monthRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month` : undefined}
            color="text-green-400"
          />
          <StatsCard
            title="Total Commissions"
            value={`$${parseFloat(financial?.totalCommissions || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            trend={financial?.monthCommissions ? `$${parseFloat(financial.monthCommissions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month` : undefined}
            color="text-primary-500"
          />
          <StatsCard
            title="Platform Float"
            value={`$${parseFloat(financial?.platformFloat || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={CreditCard}
            subtitle="Funds in user wallets"
            color="text-blue-400"
          />
          <StatsCard
            title="Today's Revenue"
            value={`$${parseFloat(financial?.todayRevenue || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Activity}
            trend={financial?.todayCommissions ? `$${parseFloat(financial.todayCommissions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} commissions` : undefined}
            color="text-yellow-400"
          />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={overview?.totalUsers?.toLocaleString() || '0'}
            icon={Users}
            subtitle={`${overview?.activeUsers || 0} active`}
            color="text-purple-400"
            href="/dashboard/users"
          />
          <StatsCard
            title="Total Venues"
            value={overview?.totalVenues?.toLocaleString() || '0'}
            icon={Building2}
            subtitle={`${overview?.activeVenues || 0} active`}
            color="text-orange-400"
            href="/dashboard/venues"
          />
          <StatsCard
            title="Virtual Cards"
            value={overview?.totalCards?.toLocaleString() || '0'}
            icon={CreditCard}
            subtitle={`${overview?.activeCards || 0} active`}
            color="text-cyan-400"
            href="/dashboard/virtual-cards"
          />
          <StatsCard
            title="Transactions"
            value={transactions?.total?.toLocaleString() || '0'}
            icon={Activity}
            subtitle={`${transactions?.today || 0} today`}
            color="text-pink-400"
            href="/dashboard/transactions"
          />
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart />
          <RecentTransactions />
        </div>

        {/* AI Insights */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <h3 className="text-xl font-bold text-primary-500">AI Insights</h3>
            <span className="text-xs text-primary-400/70 bg-primary-500/10 px-2 py-0.5 rounded-full">Beta</span>
            <span className="text-xs text-primary-400/70">
              Applied this week: {dashboardData?.aiInsights?.appliedThisWeek || 0}
            </span>
          </div>
          <div className="space-y-2">
            {aiInsights.slice(0, 3).map((insight, idx) => (
              <div key={idx} className="bg-primary-500/5 border border-primary-500/15 rounded-lg p-3">
                <p className="text-sm text-primary-400 mb-2">{insight.text}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-primary-400/70">
                    Applied {dashboardData?.aiInsights?.insightCounts?.[insight.key] || 0} time{(dashboardData?.aiInsights?.insightCounts?.[insight.key] || 0) !== 1 ? 's' : ''}
                  </span>
                <button
                  onClick={async () => {
                    await trackInsightApply(insight)
                    router.push(insight.actionHref)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-500 hover:text-primary-400 transition-colors"
                >
                  {insight.actionLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight Leaderboard */}
        <div className="bg-black border-2 border-primary-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary-500">Top AI Insights (30d)</h3>
            <span className="text-xs text-primary-400/70 bg-primary-500/10 px-2 py-0.5 rounded-full">
              {dashboardData?.aiInsights?.appliedLast30Days || 0} total applies
            </span>
          </div>

          {topAppliedInsights.length === 0 ? (
            <p className="text-sm text-primary-400/70">No AI insights applied yet.</p>
          ) : (
            <div className="space-y-2">
              {topAppliedInsights.map(([key, count], idx) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-primary-500/5 border border-primary-500/15 rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary-500/80 w-5">{idx + 1}.</span>
                    <span className="text-sm text-primary-400">{insightLabelMap[key] || key}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary-500 bg-primary-500/15 border border-primary-500/30 px-1.5 py-0.5 rounded-full">
                    {count} apply{count !== 1 ? 'ies' : 'y'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

