'use client'

import { useVenue } from '../contexts/VenueContext'
import { Check, Crown, Lock, Mail } from 'lucide-react'

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
    priceSub: 'Free forever',
    features: [
      { label: '2 active deals', included: true },
      { label: 'Bank payouts', included: true },
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
      { label: 'Staff access', included: true },
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
  const { venueName, tier: currentTier, subscriptionExpiresAt } = useVenue()

  const normalizedTier = (currentTier || 'free') as SubscriptionTier
  const currentIdx = TIER_ORDER.indexOf(normalizedTier)

  // Determine if the subscription is still active (not expired)
  const now = new Date()
  const expiryDate = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null
  const isExpired = expiryDate ? expiryDate < now : true
  const isPaidTier = normalizedTier !== 'free'
  const isLocked = isPaidTier && !isExpired // paid and not yet expired

  const mailtoLink = (planName: string) =>
    `mailto:shotonme@yahoo.com?subject=${encodeURIComponent(
      `Subscription Inquiry - ${venueName}`
    )}&body=${encodeURIComponent(
      `Hi Shot On Me team,\n\nI'd like to discuss upgrading to the ${planName} plan for ${venueName}.\n\nThanks!`
    )}`

  return (
    <div className="pt-2 space-y-4">
      {/* Current plan banner */}
      <div className="p-3 rounded-lg border border-primary-500/20 bg-black/40">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary-500" />
          <p className="text-sm text-primary-400">
            Current plan:{' '}
            <span className="font-semibold text-primary-500">
              {PLANS.find((p) => p.tier === normalizedTier)?.name || 'Starter'}
            </span>
          </p>
        </div>
        {isPaidTier && expiryDate && (
          <p className="text-xs text-primary-400/70 mt-1">
            {isExpired
              ? `Expired on ${formatDate(subscriptionExpiresAt!)}`
              : `Renews / expires on ${formatDate(subscriptionExpiresAt!)}`}
          </p>
        )}
      </div>

      {/* Plan cards — 2x2 on md+, single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = normalizedTier === plan.tier
          const planIdx = TIER_ORDER.indexOf(plan.tier)
          const isUpgrade = planIdx > currentIdx
          const isDowngrade = planIdx < currentIdx

          // CTA logic
          let ctaLabel: string
          let ctaHref: string | null = null
          let ctaDisabled = false

          if (isCurrent) {
            ctaLabel = 'Current Plan'
            ctaDisabled = true
          } else if (isLocked && isDowngrade) {
            ctaLabel = `Downgrade after ${formatDate(subscriptionExpiresAt!)}`
            ctaDisabled = true
          } else {
            ctaLabel = isUpgrade ? 'Upgrade' : 'Switch Plan'
            ctaHref = mailtoLink(plan.name)
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
              {/* Current plan badge */}
              {isCurrent && (
                <span className="absolute -top-2.5 left-4 bg-primary-500 text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Current Plan
                </span>
              )}

              {/* Header */}
              <div className="mb-4">
                <p className="text-lg font-bold text-primary-400">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-sm text-primary-400/70">{plan.priceSub}</span>
                </div>
                {isCurrent && isPaidTier && expiryDate && !isExpired && (
                  <p className="text-xs text-primary-400/60 mt-1">
                    Expires {formatDate(subscriptionExpiresAt!)}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-xs">
                    <Check
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        f.included ? 'text-primary-500' : 'text-primary-500/25'
                      }`}
                    />
                    <span
                      className={f.included ? 'text-primary-400/90' : 'text-primary-400/40'}
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {ctaDisabled ? (
                <button
                  disabled
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                    isCurrent
                      ? 'bg-primary-500 text-black opacity-60 cursor-default'
                      : 'bg-primary-500/10 text-primary-400/50 border border-primary-500/10 cursor-not-allowed'
                  }`}
                >
                  {!isCurrent && <Lock className="w-3 h-3" />}
                  {ctaLabel}
                </button>
              ) : (
                <a
                  href={ctaHref!}
                  className="w-full flex items-center justify-center gap-2 bg-primary-500 text-black px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-400 text-xs transition-all"
                >
                  <Mail className="w-3 h-3" />
                  {ctaLabel}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
