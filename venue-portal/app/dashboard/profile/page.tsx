'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import DashboardLayout from '../../components/DashboardLayout'
import VenueManager from '../../components/VenueManager'
import SubscriptionPlansManager from '../../components/SubscriptionPlansManager'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/api'
import { Building2, Link as LinkIcon, Crown } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [portalPath, setPortalPath] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    const fetchPortalPath = async () => {
      if (!token || !user) return
      try {
        const response = await axios.get(`${getApiUrl()}/venues`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const venues = Array.isArray(response.data) ? response.data : response.data?.venues || []
        const userId = user?.id?.toString() || (user as any)?._id?.toString()
        const myVenue = venues.find((v: any) => {
          const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
          return ownerId === userId
        }) || venues[0]

        if (myVenue?.slug) {
          setPortalPath(`/v/${myVenue.slug}`)
        }
      } catch (error) {
        console.error('Failed to fetch venue portal path:', error)
      }
    }

    fetchPortalPath()
  }, [token, user])

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
      <div className="space-y-4 md:space-y-5 w-full max-w-full">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary-500/10 rounded-lg border border-primary-500/20">
              <Building2 className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-400 mb-1">Venue Profile</h1>
              <p className="text-sm text-primary-500/70">Control your public venue page, details, and subscription</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-primary-500/20 bg-black/40 p-4">
          <div className="flex items-center gap-2 text-primary-500">
            <LinkIcon className="w-4 h-4" />
            <p className="text-sm font-semibold">Public venue page</p>
          </div>
          <p className="text-xs text-primary-400/80 mt-1">
            {portalPath ? `Your venue page path: ${portalPath}` : 'Venue page URL will appear here after slug is available.'}
          </p>
        </div>

        <div className="rounded-lg border border-primary-500/20 bg-black/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-primary-500" />
            <p className="text-sm font-semibold text-primary-500">Subscription Plans</p>
          </div>
          <SubscriptionPlansManager />
        </div>

        <VenueManager />
      </div>
    </DashboardLayout>
  )
}
