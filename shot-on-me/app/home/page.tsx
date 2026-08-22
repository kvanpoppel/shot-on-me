'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SpinnerS from '../components/SpinnerS'

// Redirect /home to root / to avoid duplicate pages
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0C0B10' }}>
      <SpinnerS size="splash" />
    </div>
  )
}

