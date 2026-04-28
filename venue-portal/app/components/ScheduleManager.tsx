'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Loader2 } from 'lucide-react'
import axios from 'axios'
import { useVenue } from '../contexts/VenueContext'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'

interface VenueDetails {
  name: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  location?: {
    latitude?: number
    longitude?: number
  }
}

export default function ScheduleManager() {
  const router = useRouter()
  const { venueId, venueName } = useVenue()
  const { token } = useAuth()
  const [venue, setVenue] = useState<VenueDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVenueDetails = async () => {
      if (!token || !venueId) {
        setLoading(false)
        return
      }
      try {
        const res = await axios.get(`${getApiUrl()}/venues/${venueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const v = res.data?.venue || res.data
        if (v) setVenue(v)
      } catch {
        // fall back to context name
      } finally {
        setLoading(false)
      }
    }
    fetchVenueDetails()
  }, [token, venueId])

  const displayName = venue?.name || venueName || 'Your Venue'

  const addressParts = [
    venue?.address?.street,
    venue?.address?.city,
    venue?.address?.state,
    venue?.address?.zipCode
  ].filter(Boolean)
  const displayAddress = addressParts.length > 0 ? addressParts.join(', ') : null

  const buildMapsUrl = () => {
    if (venue?.location?.latitude && venue?.location?.longitude) {
      return `https://www.google.com/maps?q=${venue.location.latitude},${venue.location.longitude}`
    }
    if (displayAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`
    }
    return null
  }

  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
            <MapPin className="w-4 h-4 text-primary-500" />
          </div>
          <h2 className="text-base font-semibold text-primary-500 tracking-tight">Venue Info</h2>
        </div>
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="text-primary-500/80 hover:text-primary-500 font-medium text-xs transition-all"
        >
          Edit
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-primary-500/60 animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5 mb-2">
            <div>
              <p className="text-primary-400/70 text-xs mb-0.5 uppercase tracking-wider font-medium">Name</p>
              <p className="text-primary-500 font-medium text-xs tracking-tight">{displayName}</p>
            </div>
            <div>
              <p className="text-primary-400/70 text-xs mb-0.5 uppercase tracking-wider font-medium">Address</p>
              <p className="text-primary-400/80 text-xs font-light">
                {displayAddress || 'No address on file'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const url = buildMapsUrl()
              if (url) {
                window.open(url, '_blank', 'noopener,noreferrer')
              } else {
                router.push('/dashboard/settings')
              }
            }}
            className="w-full bg-black/40 border border-primary-500/20 text-primary-500 py-1.5 rounded hover:bg-primary-500/10 hover:border-primary-500/30 transition-all font-medium text-xs backdrop-blur-sm"
          >
            Open in Google Maps
          </button>
        </>
      )}
    </div>
  )
}

