'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalyticsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/money') }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  )
}
