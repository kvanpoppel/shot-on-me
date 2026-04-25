'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import VenueManager from '../../components/VenueManager'
import SubscriptionPlansManager from '../../components/SubscriptionPlansManager'
import { useAuth } from '../../contexts/AuthContext'
import { useVenue } from '../../contexts/VenueContext'
import { Building2, Link as LinkIcon, Crown, ExternalLink, Copy, BadgeCheck } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const { venueSlug } = useVenue()
  const router = useRouter()
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  const portalPath = venueSlug ? `/v/${venueSlug}` : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) return null

  const portalUrl = portalPath && typeof window !== 'undefined'
    ? `${window.location.origin}${portalPath}`
    : null

  const handleCopyPortalLink = async () => {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1800)
    } catch {
      // copy silently
    }
  }

  return (
    <DashboardLayout>
      <DashboardPageShell
        icon={<Building2 className="w-5 h-5 text-primary-500" />}
        title="Venue Profile"
        subtitle="Manage your public venue identity, subscription, and account settings."
        actions={(
          <div className="rounded-lg border border-primary-500/25 bg-black/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-primary-400/70">Account</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-500">
              <BadgeCheck className="h-4 w-4" />
              {user.email || 'Venue account'}
            </p>
          </div>
        )}
        metrics={[
          { label: 'Public Path', value: portalPath || 'Pending slug', detail: 'Guest-facing venue page route.' },
          { label: 'Profile Controls', value: 'Live', detail: 'Details and branding updates available.' },
          { label: 'Subscription', value: 'Managed Here', detail: 'Plan changes and growth controls.' }
        ]}
      >

        <div className="rounded-lg border border-primary-500/20 bg-black/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-primary-500">
                <LinkIcon className="w-4 h-4" />
                <p className="text-sm font-semibold">Public venue page</p>
              </div>
              <p className="text-xs text-primary-400/80 mt-1">
                {portalPath ? `Your venue page path: ${portalPath}` : 'Venue page URL will appear here after slug is available.'}
              </p>
            </div>
            {portalUrl ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPortalLink}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-500/30 bg-black/40 px-3 py-1.5 text-xs font-medium text-primary-400 transition hover:border-primary-500/50 hover:text-primary-500"
                >
                  <Copy className="h-3 w-3" />
                  {linkCopied ? 'Copied' : 'Copy link'}
                </button>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-primary-400"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-primary-500/20 bg-black/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-primary-500" />
            <p className="text-sm font-semibold text-primary-500">Subscription Plans</p>
          </div>
          <SubscriptionPlansManager />
        </div>

        <div className="rounded-lg border border-primary-500/20 bg-black/30 p-4">
          <p className="mb-3 text-sm font-semibold text-primary-500">Venue Details</p>
          <VenueManager />
        </div>
      </DashboardPageShell>
    </DashboardLayout>
  )
}
