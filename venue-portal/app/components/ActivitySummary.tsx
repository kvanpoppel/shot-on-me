'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Users, Clock, Loader2 } from 'lucide-react'
import { getApiUrl } from '../utils/api'

interface CheckIn {
  _id: string
  user: {
    _id: string
    name: string
  }
  createdAt: string
}

export default function ActivitySummary() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLiveActivity = useCallback(async () => {
    if (!venueId || !token) return

    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/checkins?venueId=${venueId}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCheckIns(response.data.checkIns || [])
    } catch (error) {
      console.error('Failed to fetch live activity:', error)
    } finally {
      setLoading(false)
    }
  }, [venueId, token])

  useEffect(() => {
    if (token && user) {
      fetchVenue()
    }
  }, [token, user])

  useEffect(() => {
    if (venueId && token) {
      fetchLiveActivity()
      const interval = setInterval(fetchLiveActivity, 30000)
      return () => clearInterval(interval)
    }
  }, [venueId, token, fetchLiveActivity])

  const fetchVenue = async () => {
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
      
      const myVenue = venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        const userId = user?.id?.toString()
        return ownerId === userId
      })
      
      if (myVenue) {
        setVenueId(myVenue._id?.toString() || myVenue._id)
      }
    } catch (error) {
      console.error('Failed to fetch venue:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
      </div>
    )
  }

  if (checkIns.length === 0) {
    return (
      <div className="text-center py-6">
        <Users className="w-8 h-8 text-primary-500/50 mx-auto mb-2" />
        <p className="text-sm text-primary-400/70">No recent check-ins</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {checkIns.slice(0, 5).map((checkIn) => (
        <div
          key={checkIn._id}
          className="flex items-center justify-between p-2 bg-black/20 rounded border border-primary-500/10"
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
              <span className="text-xs text-primary-500 font-medium">
                {checkIn.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-primary-500">Customer</p>
              <p className="text-xs text-primary-400/60">
                {new Date(checkIn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <Clock className="w-3 h-3 text-primary-400/50" />
        </div>
      ))}
    </div>
  )
}

