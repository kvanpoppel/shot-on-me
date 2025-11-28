'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'

export default function AnalyticsPage() {
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
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl logo-script text-primary-500 mb-2">Analytics</h1>
          <p className="text-primary-400 text-sm">View detailed analytics and insights about your venue</p>
        </div>
        <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-6">
          <p className="text-primary-400 text-sm">Analytics dashboard coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

