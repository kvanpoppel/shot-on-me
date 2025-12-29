'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import PromotionsManager from '../../components/PromotionsManager'
import { Sparkles } from 'lucide-react'

export default function PromotionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

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
      <div className="space-y-4 md:space-y-5 w-full max-w-full">
        {/* Clean Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary-500/10 rounded-lg border border-primary-500/20">
              <Sparkles className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-400 mb-1">Promotions</h1>
              <p className="text-sm text-primary-500/70">Create and manage your venue promotions</p>
            </div>
          </div>
        </div>

        {/* Promotions Manager - Main Content */}
        <PromotionsManager />
      </div>
    </DashboardLayout>
  )
}

