'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import { Check, Crown } from 'lucide-react'

type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise'

export default function SubscriptionPlansManager() {
  const { token, user } = useAuth()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free')
  const [updatingTier, setUpdatingTier] = useState<SubscriptionTier | null>(null)

  const subscriptionPlans: {
    tier: SubscriptionTier
    name: string
    monthlyPrice: string
    description: string
    features: string[]
    cta: string
  }[] = [
    {
      tier: 'free',
      name: 'Starter',
      monthlyPrice: '$0/mo',
      description: 'For getting your venue online and testing the basics.',
      features: [
        'Basic promotion creation',
        'Venue profile and hours',
        'Manual campaign management'
      ],
      cta: 'Current baseline'
    },
    {
      tier: 'basic',
      name: 'Growth',
      monthlyPrice: '$79/mo',
      description: 'For venues focused on consistent weekly traffic.',
      features: [
        'AI-assisted promotion generation',
        'Standard analytics dashboard',
        'Promotion performance alerts',
        'Team access controls'
      ],
      cta: 'Upgrade to Growth'
    },
    {
      tier: 'premium',
      name: 'Performance',
      monthlyPrice: '$199/mo',
      description: 'For venues using AI automation as a core growth engine.',
      features: [
        'Continuous AI specials optimization',
        'Advanced forecasting and recommendation confidence',
        'Auto-post and optimization workflows',
        'Priority support'
      ],
      cta: 'Upgrade to Performance'
    },
    {
      tier: 'enterprise',
      name: 'Multi-Venue Enterprise',
      monthlyPrice: 'Custom',
      description: 'For groups with multiple locations and advanced needs.',
      features: [
        'Everything in Performance',
        'Custom AI strategies',
        'Multi-venue reporting',
        'Dedicated account support'
      ],
      cta: 'Contact for Enterprise'
    }
  ]

  useEffect(() => {
    fetchVenueSubscription()
  }, [token, user])

  const fetchVenueSubscription = async () => {
    if (!token || !user) return
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      let venues: any[] = []
      if (Array.isArray(response.data)) {
        venues = response.data
      } else if (response.data?.venues) {
        venues = response.data.venues
      }

      const userId = user?.id?.toString() || (user as any)?._id?.toString()
      const myVenue = userId
        ? venues.find((v: any) => {
            const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
            return ownerId === userId
          }) || venues[0]
        : venues[0]

      if (myVenue?._id) {
        setVenueId(myVenue._id.toString())
        setCurrentTier((myVenue.subscriptionTier || 'free') as SubscriptionTier)
      }
    } catch (error) {
      console.error('Failed to fetch venue subscription:', error)
    }
  }

  const handleTierChange = async (tier: SubscriptionTier) => {
    if (!token || !venueId || tier === currentTier) return

    try {
      setUpdatingTier(tier)
      const apiUrl = getApiUrl()
      await axios.put(
        `${apiUrl}/venues/${venueId}`,
        { subscriptionTier: tier },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCurrentTier(tier)
      alert(`Subscription updated to ${tier}.`)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update subscription tier')
    } finally {
      setUpdatingTier(null)
    }
  }

  return (
    <div className="pt-2 space-y-4">
      <div className="p-3 rounded-lg border border-primary-500/20 bg-black/40">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary-500" />
          <p className="text-sm text-primary-400">
            Current plan: <span className="font-semibold text-primary-500 capitalize">{currentTier}</span>
          </p>
        </div>
        <p className="text-xs text-primary-400/70 mt-1">
          AI optimization value increases as plans unlock more automation and analytics depth.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {subscriptionPlans.map((plan) => {
          const isCurrent = currentTier === plan.tier
          const isUpdating = updatingTier === plan.tier
          return (
            <div
              key={plan.tier}
              className={`rounded-lg border p-4 ${
                isCurrent ? 'border-primary-500/60 bg-primary-500/10' : 'border-primary-500/20 bg-black/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-primary-500">{plan.name}</p>
                  <p className="text-xs text-primary-400/70 mt-0.5">{plan.description}</p>
                </div>
                <p className="text-sm font-semibold text-primary-400">{plan.monthlyPrice}</p>
              </div>

              <ul className="mt-3 space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-primary-400/85">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-primary-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleTierChange(plan.tier)}
                disabled={!venueId || isCurrent || updatingTier !== null}
                className="mt-4 w-full bg-primary-500 text-black px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all"
              >
                {isCurrent ? 'Current Plan' : isUpdating ? 'Updating...' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
