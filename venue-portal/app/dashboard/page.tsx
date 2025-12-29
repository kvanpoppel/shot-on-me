'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import PromotionsManager from '../components/PromotionsManager'
import ScheduleManager from '../components/ScheduleManager'
import NotificationCenter from '../components/NotificationCenter'
import StatsCard from '../components/StatsCard'
import StripeStatusIndicator from '../components/StripeStatusIndicator'
import FollowerCount from '../components/FollowerCount'
import ActivitySummary from '../components/ActivitySummary'
import AIAnalyticsSummary from '../components/AIAnalyticsSummary'
import AIAutomationDashboard from '../components/AIAutomationDashboard'
import AIAssistant from '../components/AIAssistant'
import CollapsibleSection from '../components/CollapsibleSection'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Loader, Sparkles, TrendingUp, Users, Clock, Settings, Bell } from 'lucide-react'

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalRevenue: '0.00',
    totalRedemptions: 0,
    pendingPayouts: '0.00',
    activePromos: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const promotionsManagerRef = useRef<any>(null)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      // Silently redirect - no need to log
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) {
      fetchDashboardStats()
    }
  }, [token, user])

  const fetchDashboardStats = async () => {
    if (!token) return
    
    try {
      setLoadingStats(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats({
        totalRevenue: `$${response.data.totalRevenue}`,
        totalRedemptions: response.data.totalRedemptions,
        pendingPayouts: `$${response.data.pendingPayouts}`,
        activePromos: response.data.activePromos
      })
    } catch (error: any) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Failed to fetch dashboard stats:', error.message || error)
      }
      // Keep default values on error
    } finally {
      setLoadingStats(false)
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const handleQuickAction = (action: string) => {
    // Trigger the quick action in PromotionsManager
    if (promotionsManagerRef.current?.handleQuickAction) {
      promotionsManagerRef.current.handleQuickAction(action)
    } else {
      // Fallback: navigate to promotions page
      router.push('/dashboard/promotions')
    }
  }

  const handleNewPromotion = () => {
    if (promotionsManagerRef.current?.handleNewPromotion) {
      promotionsManagerRef.current.handleNewPromotion()
    } else {
      router.push('/dashboard/promotions')
    }
  }

  const handleShowTemplates = () => {
    if (promotionsManagerRef.current?.handleShowTemplates) {
      promotionsManagerRef.current.handleShowTemplates()
    } else {
      router.push('/dashboard/promotions')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-5 w-full max-w-full">
        {/* Clean Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary-400 mb-1">Dashboard</h1>
            <p className="text-sm text-primary-500/70">Your venue at a glance</p>
          </div>
          <button
            onClick={handleNewPromotion}
            className="px-5 py-2.5 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-400 transition-all text-sm shadow-lg hover:shadow-xl"
          >
            + New Promotion
          </button>
        </div>

        {/* Key Metrics - Clean & Focused */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
          <div 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-gradient-to-br from-black/50 to-black/40 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 hover:from-black/60 hover:to-black/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-primary-500/70 uppercase tracking-wider font-medium">Revenue</span>
              <span className="text-xl">💰</span>
            </div>
            <p className="text-2xl font-bold text-primary-400 group-hover:text-primary-300 transition-colors">
              {loadingStats ? '...' : stats.totalRevenue}
            </p>
            <p className="text-[10px] text-primary-500/60 mt-1">Last 30 days</p>
          </div>

          <div 
            onClick={() => router.push('/dashboard/redemptions')}
            className="bg-gradient-to-br from-black/50 to-black/40 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 hover:from-black/60 hover:to-black/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-primary-500/70 uppercase tracking-wider font-medium">Redemptions</span>
              <span className="text-xl">🎫</span>
            </div>
            <p className="text-2xl font-bold text-primary-400 group-hover:text-primary-300 transition-colors">
              {loadingStats ? '...' : stats.totalRedemptions}
            </p>
            <p className="text-[10px] text-primary-500/60 mt-1">Last 30 days</p>
          </div>

          <div 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-gradient-to-br from-black/50 to-black/40 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 hover:from-black/60 hover:to-black/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-primary-500/70 uppercase tracking-wider font-medium">Pending</span>
              <span className="text-xl">🏦</span>
            </div>
            <p className="text-2xl font-bold text-primary-400 group-hover:text-primary-300 transition-colors">
              {loadingStats ? '...' : stats.pendingPayouts}
            </p>
            <p className="text-[10px] text-primary-500/60 mt-1">Processing</p>
          </div>

          <div 
            onClick={() => router.push('/dashboard/promotions')}
            className="bg-gradient-to-br from-black/50 to-black/40 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 hover:from-black/60 hover:to-black/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-primary-500/70 uppercase tracking-wider font-medium">Active</span>
              <span className="text-xl">🏷️</span>
            </div>
            <p className="text-2xl font-bold text-primary-400 group-hover:text-primary-300 transition-colors">
              {loadingStats ? '...' : stats.activePromos}
            </p>
            <p className="text-[10px] text-primary-500/60 mt-1">Promotions</p>
          </div>
        </div>

        {/* Main Content - Promotions (Always Visible) */}
        <div className="mb-5">
          <PromotionsManager 
            ref={promotionsManagerRef}
            hideQuickActions={true}
          />
        </div>

        {/* Collapsible Sections - Organized & Clean */}
        <div className="space-y-3">
          {/* AI Automation - Collapsible */}
          <CollapsibleSection
            title="AI Automation"
            subtitle="Let AI handle your promotions automatically"
            defaultOpen={false}
            icon={<Sparkles className="w-4 h-4" />}
            actionButton={
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  router.push('/dashboard/analytics?tab=ai-analytics')
                }}
                className="text-xs text-primary-500/70 hover:text-primary-500 px-2 py-1 rounded hover:bg-primary-500/10 transition-colors"
              >
                Manage →
              </button>
            }
          >
            <div className="pt-2">
              <AIAutomationDashboard />
            </div>
          </CollapsibleSection>

          {/* Quick Tools - Collapsible */}
          <CollapsibleSection
            title="Quick Tools"
            subtitle="Essential venue management tools"
            defaultOpen={false}
            icon={<Settings className="w-4 h-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 pt-2">
              <StripeStatusIndicator />
              <FollowerCount />
              <div className="md:col-span-2">
                <ScheduleManager />
              </div>
            </div>
          </CollapsibleSection>

          {/* Activity & Insights - Collapsible */}
          <CollapsibleSection
            title="Activity & Insights"
            subtitle="Recent activity and AI-powered insights"
            defaultOpen={false}
            icon={<TrendingUp className="w-4 h-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-primary-500">Recent Activity</h4>
                  <button
                    onClick={() => router.push('/dashboard/analytics?tab=activity')}
                    className="text-xs text-primary-500/70 hover:text-primary-500 transition-colors"
                  >
                    View All →
                  </button>
                </div>
                <ActivitySummary />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-primary-500">AI Insights</h4>
                  <button
                    onClick={() => router.push('/dashboard/analytics?tab=ai-analytics')}
                    className="text-xs text-primary-500/70 hover:text-primary-500 transition-colors"
                  >
                    View All →
                  </button>
                </div>
                <AIAnalyticsSummary />
              </div>
            </div>
          </CollapsibleSection>

          {/* Notifications - Collapsible */}
          <CollapsibleSection
            title="Notifications"
            subtitle="Stay updated with venue notifications"
            defaultOpen={false}
            icon={<Bell className="w-4 h-4" />}
          >
            <div className="pt-2">
              <NotificationCenter />
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* AI Assistant - Floating */}
      <AIAssistant />
    </DashboardLayout>
  )
}

