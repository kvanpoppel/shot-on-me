'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { getApiUrl } from '../utils/api'

type VenueRole = 'owner' | 'manager' | 'staff'

interface VenueContextType {
  venueId: string | null
  venueName: string
  venueSlug: string | null
  tier: string
  subscriptionExpiresAt: string | null
  followerCount: number
  loading: boolean
  role: VenueRole | null
  isOwner: boolean
  refetch: () => void
}

const VenueContext = createContext<VenueContextType | undefined>(undefined)

export function VenueProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [venueName, setVenueName] = useState<string>('Your Venue')
  const [venueSlug, setVenueSlug] = useState<string | null>(null)
  const [tier, setTier] = useState<string>('free')
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null)
  const [followerCount, setFollowerCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<VenueRole | null>(null)

  const fetchVenue = useCallback(async () => {
    if (!token || !user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await axios.get(`${getApiUrl()}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venues: any[] = Array.isArray(res.data) ? res.data : res.data?.venues || []
      const userId = user.id?.toString() || (user as any)?._id?.toString()
      const myVenue = venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        return ownerId === userId
      }) || venues.find((v: any) => {
        return v.staff?.some((s: any) => {
          const staffUserId = s.user?._id?.toString() || s.user?.toString() || s.user
          return staffUserId === userId
        })
      }) || venues[0]

      if (myVenue) {
        setVenueId(myVenue._id?.toString() || null)
        setVenueName(myVenue.name || 'Your Venue')
        setVenueSlug(myVenue.slug || null)
        setTier(myVenue.subscriptionTier || 'free')
        setSubscriptionExpiresAt(myVenue.subscriptionExpiresAt || null)
        setFollowerCount(Number(myVenue.followerCount) || 0)

        // Determine role
        const ownerId = myVenue.owner?._id?.toString() || myVenue.owner?.toString() || myVenue.owner
        if (ownerId === userId) {
          setRole('owner')
        } else {
          const staffEntry = myVenue.staff?.find((s: any) => {
            const sid = s.user?._id?.toString() || s.user?.toString() || s.user
            return sid === userId
          })
          setRole(staffEntry?.role || 'staff')
        }
      }
    } catch (e: any) {
      console.error('VenueContext fetch failed:', e?.message, e?.response?.status)
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    fetchVenue()
  }, [fetchVenue])

  return (
    <VenueContext.Provider value={{ venueId, venueName, venueSlug, tier, subscriptionExpiresAt, followerCount, loading, role, isOwner: role === 'owner', refetch: fetchVenue }}>
      {children}
    </VenueContext.Provider>
  )
}

export function useVenue() {
  const context = useContext(VenueContext)
  if (!context) throw new Error('useVenue must be used within VenueProvider')
  return context
}
