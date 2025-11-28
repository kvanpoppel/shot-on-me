'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import VenueManager from '../../components/VenueManager'
import StaffManager from '../../components/StaffManager'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function SettingsPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connectStatus, setConnectStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Check for success/refresh params from Stripe Connect return
    const success = searchParams?.get('success')
    const refresh = searchParams?.get('refresh')
    
    if (success || refresh) {
      checkStripeStatus()
      // Clean up URL
      if (success) {
        router.replace('/dashboard/settings')
      }
    } else if (user && token) {
      checkStripeStatus()
    }
  }, [user, token, searchParams])

  const checkStripeStatus = async () => {
    if (!token) {
      console.log('No token available for Stripe status check')
      return
    }
    
    setLoadingStatus(true)
    try {
      console.log('Checking Stripe status...', `${API_URL}/venues/connect/status`)
      const response = await axios.get(`${API_URL}/venues/connect/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('Stripe status response:', response.data)
      setConnectStatus(response.data)
    } catch (error: any) {
      console.error('Error checking Stripe status:', error)
      console.error('Error details:', error.response?.data)
      setConnectStatus({ 
        connected: false, 
        error: error.response?.data?.error || error.message || 'Failed to check status' 
      })
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleConnectBank = async () => {
    if (!token) return
    
    setConnecting(true)
    try {
      const response = await axios.post(`${API_URL}/venues/connect/onboard`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Redirect to Stripe onboarding
      if (response.data.url) {
        window.location.href = response.data.url
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to start bank connection')
      setConnecting(false)
    }
  }

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
          <h1 className="text-3xl logo-script text-primary-500 mb-2">Settings</h1>
          <p className="text-primary-400 text-sm">Manage your venue settings and preferences</p>
        </div>

        {/* Debug info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-black border border-primary-500/20 rounded p-2 text-xs text-primary-400">
            <p>Status: {connectStatus ? JSON.stringify(connectStatus, null, 2) : 'Not loaded'}</p>
            <p>Loading: {loadingStatus ? 'Yes' : 'No'}</p>
            <p>User Type: {user?.userType}</p>
          </div>
        )}

        {/* Payment Setup - Only show if not connected */}
        {(!connectStatus || !connectStatus.connected) && (
          <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h2 className="text-lg font-semibold text-primary-500">Payment Setup</h2>
                  <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded uppercase tracking-wide">Needs Action</span>
                </div>
              </div>
            </div>
            <p className="text-primary-400 text-sm mb-4">Link your bank via Stripe Connect to receive payments.</p>
            
            {connectStatus && !connectStatus.connected && connectStatus.error && (
              <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="text-red-400 text-xs font-medium">
                  ⚠️ {connectStatus.error}
                </div>
              </div>
            )}
            
            {!connectStatus && (
              <div className="mb-4 p-3 rounded-lg border border-primary-500/20 bg-primary-500/5">
                <div className="text-primary-400 text-xs">
                  Click "Check Status" to verify your Stripe connection status.
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button 
                onClick={handleConnectBank}
                disabled={connecting || loadingStatus}
                className="bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
              >
                {connecting ? 'Connecting...' : 'Connect Bank'}
              </button>
              <button 
                onClick={checkStripeStatus}
                disabled={loadingStatus || connecting}
                className="bg-black border border-primary-500/30 text-primary-500 px-4 py-2 rounded-lg hover:bg-primary-500/10 disabled:opacity-50 text-sm transition-colors"
              >
                {loadingStatus ? 'Checking...' : 'Check Status'}
              </button>
            </div>
          </div>
        )}

        {/* Payment Status - Show when connected */}
        {connectStatus && connectStatus.connected && (
          <div className="bg-black border-2 border-emerald-500/30 rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xl">✅</span>
                <div>
                  <h2 className="text-lg font-semibold text-emerald-400">Payment Setup Complete</h2>
                  <p className="text-primary-400 text-xs mt-0.5">Your bank account is connected and ready to receive payments</p>
                  {connectStatus.accountId && (
                    <p className="text-primary-500/60 text-xs mt-1 font-mono">Account: {connectStatus.accountId.substring(0, 20)}...</p>
                  )}
                </div>
              </div>
              <button
                onClick={checkStripeStatus}
                disabled={loadingStatus}
                className="bg-black border border-primary-500/30 text-primary-500 px-3 py-1.5 rounded-lg hover:bg-primary-500/10 disabled:opacity-50 text-xs transition-colors"
                title="Refresh status"
              >
                🔄
              </button>
            </div>
          </div>
        )}

        {/* Venue Management */}
        <VenueManager />

        {/* Staff Management */}
        <StaffManager />
      </div>
    </DashboardLayout>
  )
}

