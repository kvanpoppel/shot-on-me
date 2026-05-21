'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { Check, Crown, Lock, Loader2, ArrowUpRight, CreditCard, AlertTriangle } from 'lucide-react'

type SubscriptionTier = 'free' | 'basic' | 'premium'

interface PlanFeature {
  label: string
  included: boolean
}

interface Plan {
  tier: SubscriptionTier
  name: string
  price: string
  priceSub: string
  features: PlanFeature[]
}

const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Starter',
    price: '$0',
    priceSub: '12-week trial',
    features: [
      { label: '2 active deals', included: true },
      { label: 'Bank payouts', included: true },
      { label: 'Staff access', included: true },
      { label: 'QR code + venue profile', included: true },
      { label: '1 follower push per week', included: true },
      { label: 'AI deal suggestions', included: false },
      { label: 'Full analytics', included: false },
    ],
  },
  {
    tier: 'basic',
    name: 'Pro',
    price: '$29',
    priceSub: '/mo',
    features: [
      { label: 'Unlimited deals', included: true },
      { label: 'Staff access', included: true },
      { label: 'AI-powered deal suggestions', included: true },
      { label: 'Full analytics + ROI tracking', included: true },
      { label: 'Unlimited push notifications', included: true },
      { label: 'Recurring deals', included: true },
      { label: 'Guest location data', included: true },
    ],
  },
  {
    tier: 'premium',
    name: 'Business',
    price: '$99',
    priceSub: '/mo',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Featured venue placement', included: true },
      { label: 'Advanced automation', included: true },
      { label: 'Priority support', included: true },
    ],
  },
]

const TIER_ORDER: SubscriptionTier[] = ['free', 'basic', 'premium']

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SubscriptionPlansManager() {
  const { token } = useAuth()
  const { venueName, tier: currentTier, subscriptionExpiresAt, refetch } = useVenue()

  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [downgradeMsg, setDowngradeMsg] = useState('')

  const normalizedTier = (currentTier || 'free') as SubscriptionTier
  const currentIdx = TIER_ORDER.indexOf(normalizedTier)

  const now = new Date()
  const expiryDate = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null
  const isExpired = expiryDate ? expiryDate < now : true
  const isPaidTier = normalizedTier !== 'free'

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!token) return
    setLoading(tier)
    setError('')
    try {
      const res = await axios.post(`${getApiUrl()}/subscriptions/checkout`, { tier }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Redirect to Stripe Checkout or Billing Portal
      window.location.href = res.data.url
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout')
      setLoading(null)
    }
  }

  const handleDowngrade = async (tier: SubscriptionTier) => {
    if (!token) return
    setLoading(tier)
    setError('')
    setDowngradeMsg('')
    try {
      const res = await axios.post(`${getApiUrl()}/subscriptions/change`, { tier }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.downgradePending) {
        setDowngradeMsg(res.data.message)
      } else {
        refetch()
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change plan')
    } finally {
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    if (!token) return
    setLoading('portal')
    setError('')
    try {
      const res = await axios.post(`${getApiUrl()}/subscriptions/portal`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      window.location.href = res.data.url
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to open billing portal')
      setLoading(null)
    }
  }

  return (
    <div className="pt-2 space-y-4">
      {/* Current plan banner */}
      <div className="p-3 rounded-lg border border-primary-500/20 bg-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary-500" />
            <p className="text-sm text-primary-400">
              Current plan:{' '}
              <span className="font-semibold text-primary-500">
                {PLANS.find((p) => p.tier === normalizedTier)?.name || 'Starter'}
              </span>
            </p>
          </div>
          {isPaidTier && (
            <button
              onClick={handleManageBilling}
              disabled={loading === 'portal'}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary-400/60 hover:text-primary-400 transition-colors"
            >
              {loading === 'portal' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
              Manage Billing
            </button>
          )}
        </div>
        {expiryDate && (
          <p className="text-xs text-primary-400/70 mt-1">
            {isExpired
              ? `Trial ended ${formatDate(subscriptionExpiresAt!)} — upgrade to keep your deals live`
              : normalizedTier === 'free'
                ? `Free trial ends ${formatDate(subscriptionExpiresAt!)} (${Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000))} days left)`
                : `Renews ${formatDate(subscriptionExpiresAt!)}`}
          </p>
        )}
      </div>

      {/* Error / downgrade message */}
      {error && (
        <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      )}
      {downgradeMsg && (
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06]">
          <p className="text-xs text-amber-300">{downgradeMsg}</p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = normalizedTier === plan.tier
          const planIdx = TIER_ORDER.indexOf(plan.tier)
          const isUpgrade = planIdx > currentIdx
          const isDowngrade = planIdx < currentIdx
          const isLoading = loading === plan.tier

          let ctaLabel: string
          let ctaAction: (() => void) | null = null
          let ctaDisabled = false
          let ctaStyle: 'primary' | 'outline' | 'disabled' = 'primary'

          if (isCurrent) {
            ctaLabel = 'Current Plan'
            ctaDisabled = true
            ctaStyle = 'disabled'
          } else if (isUpgrade) {
            ctaLabel = 'Upgrade'
            ctaAction = () => handleUpgrade(plan.tier)
          } else if (isDowngrade) {
            if (plan.tier === 'free') {
              ctaLabel = 'Downgrade to Free'
              ctaAction = () => handleDowngrade(plan.tier)
              ctaStyle = 'outline'
            } else {
              ctaLabel = 'Switch Plan'
              ctaAction = () => handleUpgrade(plan.tier)
              ctaStyle = 'outline'
            }
          } else {
            ctaLabel = 'Select'
            ctaAction = () => handleUpgrade(plan.tier)
          }

          return (
            <div
              key={plan.tier}
              className={`relative rounded-xl border p-5 flex flex-col transition-all ${
                isCurrent
                  ? 'border-primary-500/60 bg-primary-500/10 shadow-lg shadow-primary-500/5'
                  : 'border-primary-500/20 bg-black/40'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-4 bg-primary-500 text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Current Plan
                </span>
              )}

              <div className="mb-4">
                <p className="text-lg font-bold text-primary-400">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-sm text-primary-400/70">{plan.priceSub}</span>
                </div>
                {isUpgrade && isPaidTier && (
                  <p className="text-[10px] text-primary-400/50 mt-1">Pro-rated — only pay the difference</p>
                )}
                {isDowngrade && plan.tier === 'free' && isPaidTier && !isExpired && (
                  <p className="text-[10px] text-amber-400/60 mt-1">Access continues until billing period ends</p>
                )}
              </div>

              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-xs">
                    <Check
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        f.included ? 'text-primary-500' : 'text-primary-500/25'
                      }`}
                    />
                    <span className={f.included ? 'text-primary-400/90' : 'text-primary-400/40'}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                disabled={ctaDisabled || isLoading}
                onClick={ctaAction || undefined}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs transition-all min-h-[40px] ${
                  ctaStyle === 'primary'
                    ? 'bg-primary-500 text-black hover:bg-primary-400 disabled:opacity-40'
                    : ctaStyle === 'outline'
                      ? 'bg-transparent text-primary-400 border border-primary-500/20 hover:border-primary-500/40 disabled:opacity-40'
                      : 'bg-primary-500 text-black opacity-60 cursor-default'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    {!isCurrent && isUpgrade && <ArrowUpRight className="w-3 h-3" />}
                    {!isCurrent && isDowngrade && <Lock className="w-3 h-3" />}
                    {ctaLabel}
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
