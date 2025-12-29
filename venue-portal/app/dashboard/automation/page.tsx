'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import AIAutomationDashboard from '../../components/AIAutomationDashboard'

export default function AutomationPage() {
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
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-primary-500 mb-2">AI Automation</h1>
          <p className="text-primary-400">
            Set up intelligent automation to handle promotions, notifications, and optimizations automatically
          </p>
        </div>
        <AIAutomationDashboard />
      </div>
    </DashboardLayout>
  )
}

