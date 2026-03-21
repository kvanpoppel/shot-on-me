'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect /home to root / to avoid duplicate pages
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  )
}

