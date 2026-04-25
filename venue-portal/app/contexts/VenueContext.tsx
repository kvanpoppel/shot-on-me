'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { getApiUrl } from '../utils/api'

interface VenueContextType {
  venueId: string | null
  venueName: string
  venueSlug: string | null
  tier: string
  followerCount: number
  loading: boolean
  refetch: () => void
}

const VenueContext = createContext<VenueContextType | undefined>(undefined)

export function VenueProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [venueName, setVenueName] = useState<string>('Your Venue')
  const [venueSlug, setVenueSlug] = useState<string | null>(null)
  const [tier, setTier] = useState<string>('free')
  const [followerCount, setFollowerCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

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
      }) || venues[0]

      if (myVenue) {
        setVenueId(myVenue._id?.toString() || null)
        setVenueName(myVenue.name || 'Your Venue')
        setVenueSlug(myVenue.slug || null)
        setTier(myVenue.subscriptionTier || 'free')
        setFollowerCount(Number(myVenue.followerCount) || 0)
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    fetchVenue()
  }, [fetchVenue])

  return (
    <VenueContext.Provider value={{ venueId, venueName, venueSlug, tier, followerCount, loading, refetch: fetchVenue }}>
      {children}
    </VenueContext.Provider>
  )
}

export function useVenue() {
  const context = useContext(VenueContext)
  if (!context) throw new Error('useVenue must be used within VenueProvider')
  return context
}
