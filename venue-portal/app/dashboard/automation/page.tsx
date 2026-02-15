'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import AIAutomationDashboard from '../../components/AIAutomationDashboard'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { Crown, ArrowRight, Bot } from 'lucide-react'

type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise'

export default function AutomationPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [tier, setTier] = useState<SubscriptionTier>('free')
  const [loadingTier, setLoadingTier] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTier = async () => {
      if (!token || !user) {
        setLoadingTier(false)
        return
      }
      try {
        const response = await axios.get(`${getApiUrl()}/venues`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const venues = Array.isArray(response.data) ? response.data : response.data?.venues || []
        const userId = user?.id?.toString() || (user as any)?._id?.toString()
        const myVenue = venues.find((v: any) => {
          const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
          return ownerId === userId
        }) || venues[0]
        setTier((myVenue?.subscriptionTier || 'free') as SubscriptionTier)
      } catch {
        setTier('free')
      } finally {
        setLoadingTier(false)
      }
    }

    fetchTier()
  }, [token, user])

  const hasAutomationAccess = tier === 'premium' || tier === 'enterprise'

  if (loading || loadingTier) {
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

