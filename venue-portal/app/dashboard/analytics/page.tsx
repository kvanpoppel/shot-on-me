'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import EarningsDashboard from '../../components/EarningsDashboard'
import LiveActivityDashboard from '../../components/LiveActivityDashboard'
import AIAnalyticsDashboard from '../../components/AIAnalyticsDashboard'
import PersonalizedPromotions from '../../components/PersonalizedPromotions'
import PromotionSuggestions from '../../components/PromotionSuggestions'
import ROICalculator from '../../components/ROICalculator'
import CheckInsHistory from '../../components/CheckInsHistory'
import PaymentsHistory from '../../components/PaymentsHistory'
import PayoutsHistory from '../../components/PayoutsHistory'

export default function AnalyticsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>('earnings')
  
  // Ensure earnings tab is shown by default on initial load
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    } else {
      // Default to earnings if no tab specified
      setActiveTab('earnings')
    }
  }, [searchParams])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Check for tab parameter in URL, default to earnings if none
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    } else {
      // Ensure earnings is shown by default
      setActiveTab('earnings')
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) return null

  const tabs = [
    { id: 'earnings', label: 'Earnings', icon: '💰' },
    { id: 'roi', label: 'ROI Forecast', icon: '📊' },
    { id: 'ai-analytics', label: 'AI Analytics', icon: '🤖' },
    { id: 'suggestions', label: 'AI Suggestions', icon: '✨' },
    { id: 'personalized', label: 'Personalized', icon: '🎯' },
    { id: 'activity', label: 'Activity', icon: '📊' },
    { id: 'checkins', label: 'Check-ins', icon: '📍' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'payouts', label: 'Payouts', icon: '🏦' }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-5 w-full max-w-full">
        {/* Clean Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-400 mb-1">Earnings & Analytics</h1>
          <p className="text-sm text-primary-500/70">View earnings, track performance, and analyze insights</p>
        </div>

        {/* Tab Navigation - Enhanced & Responsive */}
        <div className="bg-black/40 border border-primary-500/20 rounded-xl p-1.5 md:p-2 mb-4 md:mb-5">
          <div className="flex space-x-1 md:space-x-2 overflow-x-auto scrollbar-hide pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  const url = new URL(window.location.href)
                  url.searchParams.set('tab', tab.id)
                  window.history.pushState({}, '', url.toString())
                }}
                className={`px-2 md:px-4 py-1.5 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex items-center space-x-1 md:space-x-2 flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/40 text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
                }`}
              >
                <span className="text-sm md:text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Organized */}
        <div className="min-h-[400px] md:min-h-[500px]">
          {activeTab === 'earnings' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <EarningsDashboard />
            </div>
          )}
          {activeTab === 'roi' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <ROICalculator />
            </div>
          )}
          {activeTab === 'ai-analytics' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <AIAnalyticsDashboard />
            </div>
          )}
          {activeTab === 'suggestions' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <PromotionSuggestions />
            </div>
          )}
          {activeTab === 'personalized' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <PersonalizedPromotions />
            </div>
          )}
          {activeTab === 'activity' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <LiveActivityDashboard />
            </div>
          )}
          {activeTab === 'checkins' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <CheckInsHistory />
            </div>
          )}
          {activeTab === 'payments' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <PaymentsHistory />
            </div>
          )}
          {activeTab === 'payouts' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <PayoutsHistory />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
