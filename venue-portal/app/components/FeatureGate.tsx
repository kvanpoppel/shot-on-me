'use client'

import { useRouter } from 'next/navigation'
import { Lock, Crown, Zap } from 'lucide-react'
import { useVenue } from '../contexts/VenueContext'

// Tier hierarchy
const TIER_RANK: Record<string, number> = {
  free: 0,
  basic: 1,
  growth: 2,
  premium: 3,
  performance: 4,
  enterprise: 5,
}

function meetsRequirement(currentTier: string, requiredTier: string): boolean {
  return (TIER_RANK[currentTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 1)
}

const TIER_LABEL: Record<string, string> = {
  basic:       'Basic',
  growth:      'Growth',
  premium:     'Growth',      // map premium → Growth for display
  performance: 'Performance',
  enterprise:  'Enterprise',
}

interface FeatureGateProps {
  /** Minimum tier required to access this feature */
  requires?: string
  /** Custom message shown in the gate overlay */
  message?: string
  /** If true, dims the children but still shows them. Default: true */
  showPreview?: boolean
  children: React.ReactNode
  /** Override: treat as locked regardless of tier */
  locked?: boolean
}

/**
 * Wrap any premium feature with FeatureGate.
 * Free-tier users see the feature dimmed with a lock + upgrade CTA.
 * Paid users (meeting `requires`) see it normally.
 *
 * Usage:
 *   <FeatureGate requires="growth" message="Unlimited deals is a Growth feature">
 *     <MyPremiumComponent />
 *   </FeatureGate>
 */
export default function FeatureGate({
  requires = 'growth',
  message,
  showPreview = true,
  children,
  locked: forceLocked,
}: FeatureGateProps) {
  const { tier } = useVenue()
  const router = useRouter()

  const isLocked = forceLocked !== undefined ? forceLocked : !meetsRequirement(tier, requires)

  if (!isLocked) return <>{children}</>

  const upgradeLabel = TIER_LABEL[requires] ?? 'Growth'
  const defaultMessage = `${upgradeLabel} plan feature`

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Dimmed preview of the feature behind the gate */}
      {showPreview && (
        <div className="select-none pointer-events-none" style={{ filter: 'blur(3px)', opacity: 0.35 }}>
          {children}
        </div>
      )}

      {/* Lock overlay */}
      <div className={`${showPreview ? 'absolute inset-0' : ''} flex flex-col items-center justify-center bg-black/75 backdrop-blur-[2px] rounded-xl p-6 text-center gap-3 min-h-[120px]`}>
        <div className="w-10 h-10 rounded-2xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{message || defaultMessage}</p>
          <p className="text-xs text-white/40 mt-1">Upgrade to unlock this and more.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-all shadow-lg shadow-primary-500/20 min-h-[44px]"
        >
          <Crown className="w-3.5 h-3.5" />
          Upgrade — $79/mo
        </button>
      </div>
    </div>
  )
}

/**
 * Inline lock badge — use this for smaller locked items (buttons, menu items).
 * Shows the item greyed out with a small lock icon inline.
 */
export function LockedBadge({ requires = 'growth' }: { requires?: string }) {
  const { tier } = useVenue()
  const router = useRouter()
  if (meetsRequirement(tier, requires)) return null
  const label = TIER_LABEL[requires] ?? 'Growth'
  return (
    <button
      onClick={(e) => { e.stopPropagation(); router.push('/dashboard/settings') }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold hover:bg-amber-500/25 transition-all"
    >
      <Lock className="w-2.5 h-2.5" />
      {label}
    </button>
  )
}

/**
 * Hook to check if a feature is available for the current tier.
 */
export function useFeatureAvailable(requires = 'growth'): boolean {
  const { tier } = useVenue()
  return meetsRequirement(tier, requires)
}
