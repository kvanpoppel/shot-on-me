'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useVenue } from '../../contexts/VenueContext'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import AIAutomationDashboard from '../../components/AIAutomationDashboard'
import { Crown, ArrowRight, Bot } from 'lucide-react'

export default function AutomationPage() {
  const { user, loading } = useAuth()
  const { tier, loading: venueLoading } = useVenue()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const hasAutomationAccess = tier === 'premium' || tier === 'enterprise'

  if (loading || venueLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <DashboardPageShell
        icon={<Bot className="w-5 h-5 text-primary-500" />}
        title="AI Automation"
        subtitle="Automate promotions, notifications, and optimization cycles with less manual work."
        metrics={[
          { label: 'Current Plan', value: tier.charAt(0).toUpperCase() + tier.slice(1) },
          { label: 'Automation Access', value: hasAutomationAccess ? 'Enabled' : 'Upgrade Required', tone: hasAutomationAccess ? 'success' : 'info' },
          { label: 'Mode', value: hasAutomationAccess ? 'Auto + Assisted' : 'Manual' }
        ]}
      >
        {!hasAutomationAccess ? (
          <div className="rounded-xl border border-primary-500/30 bg-black/50 p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary-500/15">
                <Crown className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-primary-500">Automation is included in Performance plans</p>
                <p className="text-sm text-primary-400/80 mt-1">
                  Your current plan is <span className="capitalize font-semibold">{tier}</span>. Upgrade to Performance
                  or Enterprise to unlock Auto Mode, scheduled optimization cycles, and auto-post workflows.
                </p>
                <button
                  onClick={() => router.push('/dashboard/profile')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-primary-400 transition-colors"
                >
                  Upgrade Plan
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <AIAutomationDashboard />
        )}
      </DashboardPageShell>
    </DashboardLayout>
  )
}

