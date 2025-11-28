'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface StripeStatus {
  connected: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  error?: string
}

export default function StripeStatusIndicator() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && token && (user.userType === 'venue' || user.userType === 'admin')) {
      checkStripeStatus()
    } else {
      setLoading(false)
    }
  }, [user, token])

  const checkStripeStatus = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await axios.get(`${API_URL}/venues/connect/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStatus(response.data)
    } catch (error: any) {
      // If Stripe is not configured, don't show an error
      if (error.response?.status === 400) {
        setStatus({ connected: false, error: 'Stripe not configured' })
      } else {
        setStatus({ connected: false, error: error.response?.data?.error || 'Unknown error' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConnectClick = () => {
    router.push('/dashboard/settings')
  }

  // Don't show anything if loading or if user is not a venue/admin
  if (loading || !user || (user.userType !== 'venue' && user.userType !== 'admin')) {
    return null
  }

  // Don't show if Stripe is not configured
  if (status?.error === 'Stripe not configured') {
    return null
  }

  // Show warning if not connected
  if (!status || !status.connected) {
    return (
      <div className="inline-flex items-center bg-primary-500/5 border border-primary-500/20 rounded px-2.5 py-1.5 mb-2 backdrop-blur-sm">
        <span className="text-xs mr-1.5">⚠️</span>
        <span className="text-primary-400/80 font-medium text-xs mr-2">Stripe Not Connected</span>
        <button
          onClick={handleConnectClick}
          className="bg-primary-500 text-black px-2.5 py-1 rounded text-xs font-medium hover:bg-primary-600 transition-all"
        >
          Connect
        </button>
      </div>
    )
  }

  // Show success indicator if connected
  return (
    <div className="inline-flex items-center bg-emerald-500/5 border border-emerald-500/20 rounded px-2.5 py-1.5 mb-2 backdrop-blur-sm">
      <span className="text-xs mr-1.5">✅</span>
      <span className="text-emerald-400/90 font-medium text-xs">Stripe Connected</span>
      {status.chargesEnabled && status.payoutsEnabled && (
        <span className="text-primary-400/70 text-xs ml-1.5 font-light">• Ready</span>
      )}
    </div>
  )
}

