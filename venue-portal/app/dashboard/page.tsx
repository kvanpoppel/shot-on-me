'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import PromotionsManager from '../components/PromotionsManager'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Sparkles, TrendingUp, Users, Settings } from 'lucide-react'

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
      <div className="space-y-6 w-full max-w-full">
        {/* Simplified Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500 mb-1">Promotions</h1>
            <p className="text-sm text-primary-400/70">Create and manage promotions that drive customers to your venue</p>
          </div>
        </div>

        {/* Key Metrics - Simplified to 2 most important */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-gradient-to-br from-black/60 to-black/40 border border-primary-500/30 rounded-xl p-5 hover:border-primary-500/50 hover:from-black/70 hover:to-black/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-primary-500/80 uppercase tracking-wider font-medium">Revenue</span>
              <TrendingUp className="w-5 h-5 text-primary-500/60" />
            </div>
            <p className="text-3xl font-bold text-primary-500 group-hover:text-primary-400 transition-colors">
              {loadingStats ? '...' : stats.totalRevenue}
            </p>
            <p className="text-xs text-primary-400/60 mt-1">Last 30 days</p>
          </div>

          <div 
            onClick={() => router.push('/dashboard/promotions')}
            className="bg-gradient-to-br from-black/60 to-black/40 border border-primary-500/30 rounded-xl p-5 hover:border-primary-500/50 hover:from-black/70 hover:to-black/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-primary-500/80 uppercase tracking-wider font-medium">Total Promotions</span>
              <Sparkles className="w-5 h-5 text-primary-500/60" />
            </div>
            <p className="text-3xl font-bold text-primary-500 group-hover:text-primary-400 transition-colors">
              {loadingStats ? '...' : stats.activePromos}
            </p>
            <p className="text-xs text-primary-400/60 mt-1">All promotions</p>
          </div>
        </div>

        {/* Hero Section - Promotions Manager (Primary Focus) */}
        <div className="mb-6">
          <PromotionsManager 
            ref={promotionsManagerRef}
            hideQuickActions={false}
          />
        </div>

        {/* Quick Links - Minimal, Clean */}
        <div className="border-t border-primary-500/10 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary-500">Quick Links</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => router.push('/dashboard/analytics')}
              className="flex flex-col items-center justify-center p-4 bg-black/40 border border-primary-500/20 rounded-lg hover:border-primary-500/40 hover:bg-black/60 transition-all group"
            >
              <TrendingUp className="w-5 h-5 text-primary-500/70 group-hover:text-primary-500 mb-2" />
              <span className="text-sm text-primary-400/80 group-hover:text-primary-400 font-medium">Analytics</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/redemptions')}
              className="flex flex-col items-center justify-center p-4 bg-black/40 border border-primary-500/20 rounded-lg hover:border-primary-500/40 hover:bg-black/60 transition-all group"
            >
              <Users className="w-5 h-5 text-primary-500/70 group-hover:text-primary-500 mb-2" />
              <span className="text-sm text-primary-400/80 group-hover:text-primary-400 font-medium">Redemptions</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="flex flex-col items-center justify-center p-4 bg-black/40 border border-primary-500/20 rounded-lg hover:border-primary-500/40 hover:bg-black/60 transition-all group"
            >
              <Settings className="w-5 h-5 text-primary-500/70 group-hover:text-primary-500 mb-2" />
              <span className="text-sm text-primary-400/80 group-hover:text-primary-400 font-medium">Settings</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/automation')}
              className="flex flex-col items-center justify-center p-4 bg-black/40 border border-primary-500/20 rounded-lg hover:border-primary-500/40 hover:bg-black/60 transition-all group"
            >
              <Sparkles className="w-5 h-5 text-primary-500/70 group-hover:text-primary-500 mb-2" />
              <span className="text-sm text-primary-400/80 group-hover:text-primary-400 font-medium">AI Tools</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

