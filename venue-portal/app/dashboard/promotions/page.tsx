'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import PromotionsManager, { PromotionsManagerRef } from '../../components/PromotionsManager'
import { Sparkles } from 'lucide-react'

function PromotionsPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const promotionsManagerRef = useRef<PromotionsManagerRef | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/')
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
      } else if (['happy-hour', 'flash-deal', 'weekend', 'vip'].includes(pendingAction)) {
        manager.handleInstantQuickAction(pendingAction)
      }
      setPendingAction(null)
      router.replace('/dashboard/promotions', { scroll: false })
    }, 180)
    return () => clearTimeout(timer)
  }, [pendingAction, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  )
  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-8">

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" /> Deals
            </h1>
            <p className="text-xs text-primary-400/50 mt-0.5">Build campaigns that convert faster and keep your venue full.</p>
          </div>
        </div>

        <div className="rounded-xl border border-primary-500/20 bg-black/40 p-3">
          <PromotionsManager ref={promotionsManagerRef} hideQuickActions={true} compactView={true} />
        </div>

      </div>
    </DashboardLayout>
  )
}

export default function PromotionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    }>
      <PromotionsPageContent />
    </Suspense>
  )
}
