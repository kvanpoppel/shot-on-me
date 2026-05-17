'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useVenue } from '../../contexts/VenueContext'
import DashboardLayout from '../../components/DashboardLayout'
import VenueManager from '../../components/VenueManager'
import SubscriptionPlansManager from '../../components/SubscriptionPlansManager'
import StaffManager from '../../components/StaffManager'
import CollapsibleSection from '../../components/CollapsibleSection'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { useToast } from '../../components/ToastContainer'
import {
  Settings, CreditCard, MapPin, Bell, Clock, Target, Zap,
  QrCode, Download, Sparkles, Crown, Users
} from 'lucide-react'

function SettingsPageContent() {
  const { user, loading, token } = useAuth()
  const { isOwner } = useVenue()
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
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    const success = searchParams?.get('success')
    const refresh = searchParams?.get('refresh')
    if (success || refresh) {
      checkStripeStatus()
      if (success) router.replace('/dashboard/settings')
    } else if (user && token) {
      checkStripeStatus()
      fetchNotificationPreferences()
    }
  }, [user, token, searchParams])

  const fetchNotificationPreferences = async () => {
    if (!token || !user) return
    try {
      const res = await axios.get(`${getApiUrl()}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.notificationPreferences) {
        setNotificationPrefs({
          promotionExpiring: res.data.notificationPreferences.promotionExpiring ?? true,
          promotionLaunching: res.data.notificationPreferences.promotionLaunching ?? true,
          promotionObjectives: res.data.notificationPreferences.promotionObjectives ?? true,
          aiRenewalSuggestions: res.data.notificationPreferences.aiRenewalSuggestions ?? true,
          expirationWarningHours: res.data.notificationPreferences.expirationWarningHours ?? 24,
          launchWarningHours: res.data.notificationPreferences.launchWarningHours ?? 1
        })
      }
    } catch {
      // silent
    }
  }

  const saveNotificationPreferences = async () => {
    if (!token) return
    setPreferencesMessage(null)
    setSavingPrefs(true)
    try {
      await axios.put(
        `${getApiUrl()}/users/me/notification-preferences`,
        { notificationPreferences: notificationPrefs },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPreferencesMessage({ type: 'success', text: 'Preferences saved.' })
    } catch (error: any) {
      setPreferencesMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save' })
    } finally {
      setSavingPrefs(false)
    }
  }

  const checkStripeStatus = async () => {
    if (!token) return
    setLoadingStatus(true)
    try {
      const res = await axios.get(`${getApiUrl()}/venues/connect/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConnectStatus(res.data)
    } catch (error: any) {
      setConnectStatus({ connected: false, error: error.response?.data?.error || error.message })
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleConnectBank = async () => {
    if (!token) return
    setConnecting(true)
    try {
      const res = await axios.post(`${getApiUrl()}/venues/connect/onboard`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.url) window.location.href = res.data.url
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to start bank connection')
      setConnecting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  )
  if (!user) return null

  const venueId = (user as any)?.venueId || (user as any)?._id
  const venueUrl = `https://www.shotonme.com?venue=${venueId}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(venueUrl)}&size=300x300&color=B8945A&bgcolor=000000`

  const handleQRDownload = async () => {
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
    <DashboardLayout>
      <div className="space-y-5 pb-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-500" /> Settings
          </h1>
          <p className="text-xs text-primary-400/50 mt-0.5">Subscription, venue info, bank account, QR code, and notification preferences.</p>
        </div>

        <div className="space-y-3">

          {/* Subscription — owner only */}
          {isOwner && (
            <CollapsibleSection
              title="Subscription Plan"
              subtitle="Upgrade or manage your current plan"
              defaultOpen={true}
              icon={<Crown className="w-4 h-4" />}
            >
              <div className="pt-2">
                <SubscriptionPlansManager />
              </div>
            </CollapsibleSection>
          )}

          {/* Payment / Stripe — owner only */}
          {isOwner && (
            <CollapsibleSection
              title="Bank Account"
              subtitle="Connect your bank to receive payouts via Stripe"
              defaultOpen={false}
              icon={<CreditCard className="w-4 h-4" />}
            >
              <div className="space-y-3 pt-2">
                {connectStatus?.connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <span className="text-emerald-400">✅</span>
                      <p className="text-sm text-emerald-400 font-medium">Bank account connected</p>
                    </div>
                    <button
                      onClick={checkStripeStatus}
                      disabled={loadingStatus}
                      className="w-full border border-primary-500/30 text-primary-500 px-4 py-2.5 rounded-lg hover:bg-primary-500/10 disabled:opacity-50 text-sm transition-colors"
                    >
                      {loadingStatus ? 'Checking...' : 'Refresh Status'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectStatus?.error && (
                      <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                        <p className="text-red-400 text-xs">⚠️ {connectStatus.error}</p>
                      </div>
                    )}
                    <button
                      onClick={handleConnectBank}
                      disabled={connecting || loadingStatus}
                      className="w-full bg-primary-500 text-black px-4 py-3 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 text-sm transition-all shadow-lg"
                    >
                      {connecting ? 'Connecting...' : 'Connect Bank Account'}
                    </button>
                    <p className="text-xs text-primary-400/50 text-center">Secure connection powered by Stripe</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Venue Info */}
          <CollapsibleSection
            title="Venue Information"
            subtitle="Name, hours, location, and branding"
            defaultOpen={false}
            icon={<MapPin className="w-4 h-4" />}
          >
            <div className="pt-2">
              <VenueManager />
            </div>
          </CollapsibleSection>

          {/* Staff — owner only */}
          {isOwner && (
            <CollapsibleSection
              title="Staff & Team"
              subtitle="Manage team member access to the portal"
              defaultOpen={false}
              icon={<Users className="w-4 h-4" />}
            >
              <div className="pt-2">
                <StaffManager />
              </div>
            </CollapsibleSection>
          )}

          {/* QR Code */}
          <CollapsibleSection
            title="Table QR Code"
            subtitle="Print and place on tables — guests scan to open Shot On Me"
            defaultOpen={false}
            icon={<QrCode className="w-4 h-4" />}
          >
            <div className="pt-2 flex flex-col items-center gap-4">
              <p className="text-xs text-primary-400/60 text-center">
                Place this QR on your tables, menus, or bar top. Guests scan to connect with your venue instantly.
              </p>
              {venueId ? (
                <>
                  <div className="p-3 bg-black border border-primary-500/30 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt="Venue QR Code" width={200} height={200} className="rounded-lg" />
                  </div>
                  <p className="text-[10px] text-primary-400/40 break-all text-center px-4">{venueUrl}</p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={handleQRDownload}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-black px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-400 text-sm transition-all"
                    >
                      <Download className="w-4 h-4" /> Download PNG
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
                <p className="text-xs text-primary-400/40 text-center">Venue ID not available. Please refresh.</p>
              )}
            </div>
          </CollapsibleSection>

          {/* Notifications */}
          <CollapsibleSection
            title="Notification Preferences"
            subtitle="Alerts for promotions, objectives, and AI suggestions"
            defaultOpen={false}
            icon={<Bell className="w-4 h-4" />}
          >
            <div className="pt-2 space-y-3">
              {[
                { key: 'promotionExpiring', label: 'Promotion Expiring', desc: 'Alert before a promotion ends', icon: Clock },
                { key: 'promotionLaunching', label: 'Promotion Launching', desc: 'Alert before a promotion starts', icon: Zap },
                { key: 'promotionObjectives', label: 'Objective Milestones', desc: 'Views, clicks, redemption goals', icon: Target },
                { key: 'aiRenewalSuggestions', label: 'AI Renewal Suggestions', desc: 'Smart suggestions to extend deals', icon: Sparkles },
              ].map(({ key, label, desc, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-primary-400">{label}</p>
                      <p className="text-[10px] text-primary-400/50">{desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(notificationPrefs as any)[key]}
                      onChange={e => setNotificationPrefs({ ...notificationPrefs, [key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-black/60 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                </div>
              ))}

              {notificationPrefs.promotionExpiring && (
                <div className="ml-7 p-3 bg-black/30 border border-primary-500/10 rounded-lg">
                  <label className="block text-[11px] font-medium text-primary-400/70 mb-1.5">Warn me when expiring in (hours):</label>
                  <input
                    type="number" min="1" max="168"
                    value={notificationPrefs.expirationWarningHours}
                    onChange={e => setNotificationPrefs({ ...notificationPrefs, expirationWarningHours: parseInt(e.target.value) || 24 })}
                    className="w-full px-3 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-400 text-sm focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30"
                  />
                </div>
              )}
              {notificationPrefs.promotionLaunching && (
                <div className="ml-7 p-3 bg-black/30 border border-primary-500/10 rounded-lg">
                  <label className="block text-[11px] font-medium text-primary-400/70 mb-1.5">Notify before launch (hours):</label>
                  <input
                    type="number" min="0.5" max="24" step="0.5"
                    value={notificationPrefs.launchWarningHours}
                    onChange={e => setNotificationPrefs({ ...notificationPrefs, launchWarningHours: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-400 text-sm focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30"
                  />
                </div>
              )}

              <button
                onClick={saveNotificationPreferences}
                disabled={savingPrefs}
                className="w-full bg-primary-500 text-black px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 text-sm transition-all shadow-lg"
              >
                {savingPrefs ? 'Saving...' : 'Save Preferences'}
              </button>
              {preferencesMessage && (
                <div className={`rounded-lg border px-3 py-2 text-xs ${
                  preferencesMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}>
                  {preferencesMessage.text}
                </div>
              )}
            </div>
          </CollapsibleSection>

        </div>
      </div>
    </DashboardLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}
