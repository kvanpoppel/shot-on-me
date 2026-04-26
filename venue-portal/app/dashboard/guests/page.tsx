'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useVenue } from '../../contexts/VenueContext'
import DashboardLayout from '../../components/DashboardLayout'
import LiveActivityDashboard from '../../components/LiveActivityDashboard'
import CheckInsHistory from '../../components/CheckInsHistory'
import AIAnalyticsSummary from '../../components/AIAnalyticsSummary'
import { Users, Sparkles, Activity, ClipboardList } from 'lucide-react'

type Tab = 'live' | 'checkins' | 'insights'

export default function GuestsPage() {
  const { user, loading } = useAuth()
  const { followerCount } = useVenue()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('live')

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  )
  if (!user) return null

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'live',     label: 'Live',      icon: Activity },
    { id: 'checkins', label: 'Check-ins', icon: ClipboardList },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" /> Guests
          </h1>
          <p className="text-xs text-primary-400/50 mt-0.5">Live activity, check-in history, and AI insights for your audience.</p>
        </div>

        {/* Followers KPI */}
        <div className="rounded-xl border border-primary-500/15 bg-black/40 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[11px] text-primary-400/50 font-medium">Followers</p>
            <p className="text-2xl font-bold text-cyan-400">{followerCount}</p>
            <p className="text-[10px] text-primary-400/30">guests following your venue</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/5 bg-black/40 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === id
                  ? 'bg-primary-500 text-black shadow'
                  : 'text-primary-400/60 hover:text-primary-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'live' && (
          <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
            <LiveActivityDashboard />
          </div>
        )}

        {activeTab === 'checkins' && (
          <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
            <CheckInsHistory />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
              <AIAnalyticsSummary />
            </div>
            <button
              onClick={() => router.push('/dashboard/money?tab=payments')}
              className="w-full rounded-xl border border-primary-500/15 bg-black/40 py-3 text-xs text-primary-400/60 hover:text-primary-400 hover:border-primary-500/30 transition-all"
            >
              View full payment history in Money →
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
