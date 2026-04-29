'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useVenue } from '../../contexts/VenueContext'
import DashboardLayout from '../../components/DashboardLayout'
import EarningsDashboard from '../../components/EarningsDashboard'
import ROICalculator from '../../components/ROICalculator'
import PaymentsHistory from '../../components/PaymentsHistory'
import PayoutsHistory from '../../components/PayoutsHistory'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { useToast } from '../../components/ToastContainer'
import FeatureGate from '../../components/FeatureGate'
import { DollarSign, TrendingUp, Landmark, CreditCard } from 'lucide-react'

type Tab = 'earnings' | 'payments' | 'payouts'

function MoneyPageContent() {
  const { user, loading, token } = useAuth()
  const { tier } = useVenue()
  const { showError } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('earnings')
  const [connectStatus, setConnectStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    const tab = searchParams?.get('tab') as Tab | null
    if (tab && ['earnings', 'payments', 'payouts'].includes(tab)) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (user && token) checkStripeStatus()
  }, [user, token])

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

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'earnings',  label: 'Earnings',  icon: TrendingUp },
    { id: 'payments',  label: 'Payments',  icon: CreditCard },
    { id: 'payouts',   label: 'Payouts',   icon: Landmark },
  ]

  const stripeConnected = connectStatus?.connected

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-500" /> Money
            </h1>
            <p className="text-xs text-primary-400/50 mt-0.5">Earnings, payment history, and bank payouts.</p>
          </div>
          {/* Stripe status pill */}
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
            stripeConnected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-primary-500/20 bg-black/40 text-primary-400/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stripeConnected ? 'bg-emerald-400' : 'bg-primary-500/40'}`} />
            {loadingStatus ? 'Checking...' : stripeConnected ? 'Bank Connected' : 'Bank Not Connected'}
          </div>
        </div>

        {/* Stripe connect CTA if not connected */}
        {!loadingStatus && !stripeConnected && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-300">Connect your bank to receive payouts</p>
              <p className="text-xs text-amber-300/60 mt-0.5">Secure connection via Stripe — takes about 2 minutes.</p>
              {connectStatus?.error && (
                <p className="text-xs text-red-400 mt-1">⚠️ {connectStatus.error}</p>
              )}
            </div>
            <button
              onClick={handleConnectBank}
              disabled={connecting}
              className="flex-shrink-0 rounded-xl bg-amber-400 text-black px-4 py-2.5 text-sm font-bold hover:bg-amber-300 disabled:opacity-50 transition-all"
            >
              {connecting ? 'Connecting...' : 'Connect Bank'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/5 bg-black/40 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === id
                  ? 'bg-primary-500 text-black shadow'
                  : 'text-primary-400/60 hover:text-primary-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'earnings' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
              <EarningsDashboard />
            </div>
            <FeatureGate requires="growth" message="AI revenue forecasting is a Growth feature">
              <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
                <ROICalculator />
              </div>
            </FeatureGate>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
            <PaymentsHistory />
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-4">
            {stripeConnected && (
              <FeatureGate requires="growth" message="Payout requests are a Growth feature">
                <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
                  <PayoutsHistory />
                </div>
              </FeatureGate>
            )}
            {!stripeConnected && !loadingStatus && (
              <div className="rounded-xl border border-primary-500/15 bg-black/40 p-8 text-center">
                <Landmark className="w-8 h-8 text-primary-500/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-primary-400">No bank account connected</p>
                <p className="text-xs text-primary-400/50 mt-1 mb-4">Connect your bank above to start receiving payouts.</p>
                <button
                  onClick={handleConnectBank}
                  disabled={connecting}
                  className="rounded-xl bg-primary-500 text-black px-6 py-2.5 text-sm font-bold hover:bg-primary-400 disabled:opacity-50 transition-all"
                >
                  {connecting ? 'Connecting...' : 'Connect Bank Account'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

export default function MoneyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    }>
      <MoneyPageContent />
    </Suspense>
  )
}
