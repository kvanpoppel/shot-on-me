'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import PromotionsManager, { PromotionsManagerRef } from '../../components/PromotionsManager'
import { Sparkles, ArrowRight } from 'lucide-react'

function PromotionsPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const promotionsManagerRef = useRef<PromotionsManagerRef | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    const action = searchParams.get('action')
    setPendingAction(action)
  }, [searchParams])

  useEffect(() => {
    if (!pendingAction) return

    const timer = setTimeout(() => {
      const manager = promotionsManagerRef.current
      if (!manager) return

      if (pendingAction === 'new') {
        manager.handleNewPromotion()
      } else if (pendingAction === 'happy-hour' || pendingAction === 'flash-deal' || pendingAction === 'weekend' || pendingAction === 'vip') {
        manager.handleInstantQuickAction(pendingAction)
      }

      setPendingAction(null)
      router.replace('/dashboard/promotions', { scroll: false })
    }, 180)

    return () => clearTimeout(timer)
  }, [pendingAction, router])

  if (loading) {
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
        icon={<Sparkles className="w-5 h-5 text-primary-500" />}
        title="Promotions"
        subtitle="Build campaigns that convert faster and keep your venue full."
        actions={(
          <button
            onClick={() => router.push('/dashboard/analytics?tab=suggestions')}
            className="inline-flex items-center gap-2 rounded-lg border border-primary-500/30 bg-black/40 px-4 py-2 text-sm font-semibold text-primary-400 transition hover:border-primary-500/50 hover:text-primary-500"
          >
            Open AI Suggestions
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        metrics={[
          {
            label: 'Creative Engine',
            value: 'AI-Assisted Copy',
            detail: 'Launch stronger offers with smarter messaging.'
          },
          {
            label: 'Campaign Timing',
            value: 'Scheduled Campaigns',
            detail: 'Queue deals in advance for peak traffic windows.'
          },
          {
            label: 'Optimization',
            value: 'Performance Focused',
            detail: 'Iterate quickly based on what is converting.'
          }
        ]}
      >
        <div className="rounded-2xl border border-primary-500/20 bg-black/40 p-2 md:p-3">
          <PromotionsManager ref={promotionsManagerRef} hideQuickActions={true} compactView={true} />
        </div>
      </DashboardPageShell>
    </DashboardLayout>
  )
}

export default function PromotionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      }
    >
      <PromotionsPageContent />
    </Suspense>
  )
}
