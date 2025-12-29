'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

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
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues/connect/status`, {
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
      <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">⚠️</span>
            <div>
              <p className="text-xs font-medium text-primary-400/70 uppercase tracking-wider mb-0.5">Payment Setup</p>
              <p className="text-sm text-primary-500">Not Connected</p>
            </div>
          </div>
          <button
            onClick={handleConnectClick}
            className="bg-primary-500 text-black px-3 py-1.5 rounded text-xs font-medium hover:bg-primary-400 transition-all"
          >
            Connect
          </button>
        </div>
      </div>
    )
  }

  // Show success indicator if connected
  return (
    <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm">✅</span>
        <div>
          <p className="text-xs font-medium text-primary-400/70 uppercase tracking-wider mb-0.5">Payment Setup</p>
          <p className="text-sm text-emerald-400">Connected</p>
        </div>
      </div>
    </div>
  )
}

