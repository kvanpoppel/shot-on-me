'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import VenueManager from '../../components/VenueManager'
import CollapsibleSection from '../../components/CollapsibleSection'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { useToast } from '../../components/ToastContainer'
import { Settings, CreditCard, MapPin, Bell, Clock, Target, Zap, QrCode, Download, Sparkles } from 'lucide-react'

function SettingsPageContent() {
  const { user, loading, token } = useAuth()
  const { showError } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connectStatus, setConnectStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [notificationPrefs, setNotificationPrefs] = useState({
    promotionExpiring: true,
    promotionLaunching: true,
    promotionObjectives: true,
    aiRenewalSuggestions: true,
    expirationWarningHours: 24,
    launchWarningHours: 1
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      fetchNotificationPreferences()
    }
  }, [user, token, searchParams])

  const fetchNotificationPreferences = async () => {
    if (!token || !user) return
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.notificationPreferences) {
        setNotificationPrefs({
          promotionExpiring: response.data.notificationPreferences.promotionExpiring ?? true,
          promotionLaunching: response.data.notificationPreferences.promotionLaunching ?? true,
          promotionObjectives: response.data.notificationPreferences.promotionObjectives ?? true,
          aiRenewalSuggestions: response.data.notificationPreferences.aiRenewalSuggestions ?? true,
          expirationWarningHours: response.data.notificationPreferences.expirationWarningHours ?? 24,
          launchWarningHours: response.data.notificationPreferences.launchWarningHours ?? 1
        })
      }
    } catch {
      // fetch silently
    }
  }

  const saveNotificationPreferences = async () => {
    if (!token) return
    setPreferencesMessage(null)
    setSavingPrefs(true)
    try {
      const apiUrl = getApiUrl()
      await axios.put(
        `${apiUrl}/users/me/notification-preferences`,
        { notificationPreferences: notificationPrefs },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPreferencesMessage({ type: 'success', text: 'Notification preferences saved.' })
    } catch (error: any) {
      setPreferencesMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save preferences' })
    } finally {
      setSavingPrefs(false)
    }
  }

  const checkStripeStatus = async () => {
    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('No token available for Stripe status check')
      }
      return
    }
    
    setLoadingStatus(true)
    try {
      const apiUrl = getApiUrl()
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Checking Stripe status...', `${apiUrl}/venues/connect/status`)
      }
      const response = await axios.get(`${apiUrl}/venues/connect/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Stripe status response:', response.data)
      }
      setConnectStatus(response.data)
    } catch (error: any) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Error checking Stripe status:', error.message || error)
      }
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
      const apiUrl = getApiUrl()
      const response = await axios.post(`${apiUrl}/venues/connect/onboard`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Redirect to Stripe onboarding
      if (response.data.url) {
        window.location.href = response.data.url
      }
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to start bank connection')
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
      <DashboardPageShell
        icon={<Settings className="w-5 h-5 text-primary-500" />}
        title="Settings"
        subtitle="Manage payments, team access, venue details, and notifications in one place."
        metrics={[
          { label: 'Payments', value: connectStatus?.connected ? 'Connected' : 'Not Connected', tone: connectStatus?.connected ? 'success' : 'info' },
          { label: 'Notifications', value: notificationPrefs.promotionObjectives ? 'Enabled' : 'Disabled' },
          { label: 'AI Suggestions', value: notificationPrefs.aiRenewalSuggestions ? 'On' : 'Off' }
        ]}
      >

        {/* Debug info - Only show in development with debug flag */}
        {process.env.NODE_ENV === 'development' && 
         typeof window !== 'undefined' && 
         (window as any).__SHOW_DEBUG_INFO__ && (
          <div className="bg-black border border-primary-500/20 rounded p-2 text-xs text-primary-400">
            <p>Status: {connectStatus ? JSON.stringify(connectStatus, null, 2) : 'Not loaded'}</p>
            <p>Loading: {loadingStatus ? 'Yes' : 'No'}</p>
            <p>User Type: {user?.userType}</p>
          </div>
        )}

        {/* Organized Sections */}
        <div className="space-y-4">
          {/* Payment Setup - Collapsible */}
          <CollapsibleSection
            title="Payment Setup"
            subtitle="Connect your bank account to receive payouts"
            defaultOpen={false}
            icon={<CreditCard className="w-4 h-4" />}
          >
            <div className="space-y-4 pt-2">
              {connectStatus && connectStatus.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <span className="text-emerald-400">✅</span>
                    <p className="text-sm text-emerald-400 font-medium">Payment account connected</p>
                  </div>
                  <button
                    onClick={checkStripeStatus}
                    disabled={loadingStatus}
                    className="w-full bg-black border border-primary-500/30 text-primary-500 px-4 py-2.5 rounded-lg hover:bg-primary-500/10 disabled:opacity-50 text-sm transition-colors"
                  >
                    {loadingStatus ? 'Checking...' : 'Refresh Status'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {connectStatus && !connectStatus.connected && connectStatus.error && (
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                      <div className="text-red-400 text-xs font-medium">
                        ⚠️ {connectStatus.error}
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={handleConnectBank}
                    disabled={connecting || loadingStatus}
                    className="w-full bg-primary-500 text-black px-4 py-3 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all shadow-lg hover:shadow-xl"
                  >
                    {connecting ? 'Connecting...' : 'Connect Payment Account'}
                  </button>
                  <p className="text-xs text-primary-500/70 text-center">
                    Secure connection powered by Stripe
                  </p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Venue Management - Collapsible */}
          <CollapsibleSection
            title="Venue Information"
            subtitle="Manage your venue details, hours, and location"
            defaultOpen={false}
            icon={<MapPin className="w-4 h-4" />}
          >
            <div className="pt-2">
              <VenueManager />
            </div>
          </CollapsibleSection>

          {/* Table QR Code */}
          <CollapsibleSection
            title="Table QR Code"
            subtitle="Print and place on tables — guests scan to download Shot On Me"
            defaultOpen={false}
            icon={<QrCode className="w-4 h-4" />}
          >
            {(() => {
              const venueId = (user as any)?.venueId || (user as any)?._id
              const venueUrl = `https://www.shotonme.com?venue=${venueId}`
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(venueUrl)}&size=300x300&color=B8945A&bgcolor=000000`
              const handleDownload = async () => {
                try {
                  const res = await fetch(qrUrl)
                  const blob = await res.blob()
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = 'shotonme-qr.png'
                  a.click()
                  URL.revokeObjectURL(a.href)
                } catch {
                  window.open(qrUrl, '_blank')
                }
              }
              return (
                <div className="pt-2 flex flex-col items-center gap-4">
                  <p className="text-xs text-primary-400/70 text-center">
                    Place this QR on your tables, menus, or bar top. Guests scan it to open Shot On Me and connect with your venue instantly.
                  </p>
                  {venueId ? (
                    <>
                      <div className="p-3 bg-black border border-primary-500/30 rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="Venue QR Code" width={200} height={200} className="rounded-lg" />
                      </div>
                      <p className="text-xs text-primary-400/50 break-all text-center px-4">{venueUrl}</p>
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={handleDownload}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-black px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-400 text-sm transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Download PNG
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="flex-1 border border-primary-500/30 text-primary-400 px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-500/10 text-sm transition-colors"
                        >
                          Print
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-primary-400/50 text-center">Venue ID not available. Please refresh or contact support.</p>
                  )}
                </div>
              )
            })()}
          </CollapsibleSection>

          {/* Notification Preferences - Collapsible */}
          <CollapsibleSection
            title="Notification Preferences"
            subtitle="Manage alerts for promotions, objectives, and AI suggestions"
            defaultOpen={false}
            icon={<Bell className="w-4 h-4" />}
          >
            <div className="pt-2 space-y-4">
              {/* Promotion Expiring */}
              <div className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/15 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-primary-500">Promotion Expiring Alerts</p>
                    <p className="text-xs text-primary-400/70">Get notified when promotions are about to expire</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.promotionExpiring}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, promotionExpiring: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-black/60 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              {notificationPrefs.promotionExpiring && (
                <div className="ml-8 p-3 bg-black/30 border border-primary-500/10 rounded-lg">
                  <label className="block text-xs font-medium text-primary-500 mb-2">
                    Warn me when promotion expires in (hours):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={notificationPrefs.expirationWarningHours}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, expirationWarningHours: parseInt(e.target.value) || 24 })}
                    className="w-full px-3 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 text-sm focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30"
                  />
                </div>
              )}

              {/* Promotion Launching */}
              <div className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/15 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-primary-500">Promotion Launching Alerts</p>
                    <p className="text-xs text-primary-400/70">Get notified when promotions are about to start</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.promotionLaunching}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, promotionLaunching: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-black/60 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              {notificationPrefs.promotionLaunching && (
                <div className="ml-8 p-3 bg-black/30 border border-primary-500/10 rounded-lg">
                  <label className="block text-xs font-medium text-primary-500 mb-2">
                    Notify me when promotion launches in (hours):
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={notificationPrefs.launchWarningHours}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, launchWarningHours: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 text-sm focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30"
                  />
                </div>
              )}

              {/* Promotion Objectives */}
              <div className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/15 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-primary-500">Objective Milestones</p>
                    <p className="text-xs text-primary-400/70">Get notified when reaching views, clicks, redemptions, or revenue goals</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.promotionObjectives}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, promotionObjectives: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-black/60 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              {/* AI Renewal Suggestions */}
              <div className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/15 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-primary-500">AI Renewal Suggestions</p>
                    <p className="text-xs text-primary-400/70">Receive AI-powered suggestions to extend or adjust promotions</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.aiRenewalSuggestions}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, aiRenewalSuggestions: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-black/60 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <button
                onClick={saveNotificationPreferences}
                disabled={savingPrefs}
                className="w-full bg-primary-500 text-black px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all shadow-lg hover:shadow-xl"
              >
                {savingPrefs ? 'Saving...' : 'Save Preferences'}
              </button>
              {preferencesMessage ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    preferencesMessage.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  {preferencesMessage.text}
                </div>
              ) : null}
            </div>
          </CollapsibleSection>

        </div>
      </DashboardPageShell>
    </DashboardLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  )
}
