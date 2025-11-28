'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import PromotionsManager from '../components/PromotionsManager'
import ScheduleManager from '../components/ScheduleManager'
import NotificationCenter from '../components/NotificationCenter'
import StatsCard from '../components/StatsCard'
import StripeStatusIndicator from '../components/StripeStatusIndicator'
import FollowerCount from '../components/FollowerCount'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      console.log('No user found, redirecting to login')
      router.push('/')
    }
  }, [user, loading, router])

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

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Stripe Connection Status */}
        <StripeStatusIndicator />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatsCard
            title="Total Revenue"
            value="$1234.56"
            change=""
            icon="💰"
          />
          <StatsCard
            title="Total Redemptions"
            value="48"
            change=""
            icon="🎫"
          />
          <StatsCard
            title="Pending Payouts"
            value="$210"
            change=""
            icon="🏦"
          />
          <StatsCard
            title="Active Promos"
            value="3"
            change=""
            icon="🏷️"
          />
        </div>

        {/* Follower Count */}
        <FollowerCount />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-1">
            <PromotionsManager />
          </div>
          <div className="lg:col-span-1 space-y-3">
            <ScheduleManager />
            <NotificationCenter />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

