'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import EarningsDashboard from '../../components/EarningsDashboard'
import LiveActivityDashboard from '../../components/LiveActivityDashboard'
import AIAnalyticsDashboard from '../../components/AIAnalyticsDashboard'
import PersonalizedPromotions from '../../components/PersonalizedPromotions'
import PromotionSuggestions from '../../components/PromotionSuggestions'
import ROICalculator from '../../components/ROICalculator'
import CheckInsHistory from '../../components/CheckInsHistory'
import PaymentsHistory from '../../components/PaymentsHistory'
import PayoutsHistory from '../../components/PayoutsHistory'
import {
  CircleDollarSign,
  Sparkles,
  Users,
  Landmark
} from 'lucide-react'

function AnalyticsPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>('earnings')
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    const tab = searchParams?.get('tab')
    setActiveTab(tab || 'earnings')
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
    { id: 'earnings', label: 'Earnings', icon: CircleDollarSign },
    { id: 'ai', label: 'AI Insights', icon: Sparkles },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'payouts', label: 'Payouts', icon: Landmark }
  ]

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Earnings'

  return (
    <DashboardLayout>
      <DashboardPageShell
        icon={<CircleDollarSign className="w-5 h-5 text-primary-500" />}
        title="Earnings & Analytics"
        subtitle="Track revenue, monitor performance, and act faster with AI insights."
        metrics={[
          { label: 'Active View', value: activeTabLabel, detail: 'Current analytics workspace.' },
          { label: 'Revenue', tone: 'success' as const, value: 'Earnings + ROI', detail: 'Track all income and forecast.' },
          { label: 'AI', value: 'Analytics + Suggestions', detail: 'Personalized insights and next steps.' }
        ]}
      >

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
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[400px] md:min-h-[500px] space-y-4">
          {activeTab === 'earnings' && (
            <>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <EarningsDashboard />
              </div>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <ROICalculator />
              </div>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <PaymentsHistory />
              </div>
            </>
          )}
          {activeTab === 'ai' && (
            <>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <PromotionSuggestions />
              </div>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <AIAnalyticsDashboard />
              </div>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <PersonalizedPromotions />
              </div>
            </>
          )}
          {activeTab === 'guests' && (
            <>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <LiveActivityDashboard />
              </div>
              <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
                <CheckInsHistory />
              </div>
            </>
          )}
          {activeTab === 'payouts' && (
            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 md:p-6 overflow-x-hidden">
              <PayoutsHistory />
            </div>
          )}
        </div>
      </DashboardPageShell>
    </DashboardLayout>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      }
    >
      <AnalyticsPageContent />
    </Suspense>
  )
}
