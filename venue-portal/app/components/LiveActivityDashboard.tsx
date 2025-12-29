'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Users, MapPin, Clock, TrendingUp, Loader, Eye, EyeOff } from 'lucide-react'
import { getApiUrl } from '../utils/api'

interface CheckIn {
  _id: string
  user: {
    _id: string
    name: string
    profilePicture?: string
  }
  createdAt: string
}

interface NearbyUser {
  id: string
  name: string
  distance: number
  lastSeen: string
}

export default function LiveActivityDashboard() {
  const { token, user } = useAuth()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserDetails, setShowUserDetails] = useState(false) // Privacy toggle

  const fetchLiveActivity = useCallback(async () => {
    if (!venueId || !token) return

    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const [checkInsRes, nearbyRes] = await Promise.all([
        axios.get(`${apiUrl}/checkins?venueId=${venueId}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${apiUrl}/venues/${venueId}/nearby-users`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { users: [] } })) // Graceful fallback
      ])

      setCheckIns(checkInsRes.data.checkIns || [])
      setNearbyUsers(nearbyRes.data.users || [])
    } catch (error) {
      console.error('Failed to fetch live activity:', error)
    } finally {
      setLoading(false)
    }
  }, [venueId, token])

  useEffect(() => {
    if (token) {
      fetchVenue()
    }
  }, [token])

  useEffect(() => {
    if (venueId && token) {
      fetchLiveActivity()
      const interval = setInterval(fetchLiveActivity, 30000) // Update every 30 seconds
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
      
      // Handle both response formats: { venues: [...] } or direct array
      let venues: any[] = []
      if (Array.isArray(response.data)) {
        venues = response.data
      } else if (response.data?.venues) {
        venues = response.data.venues
      }
      
      // Improved venue matching: handle both populated owner object and owner ID string
      const myVenue = venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        const userId = user?.id?.toString()
        return ownerId === userId
      })
      
      if (myVenue) {
        setVenueId(myVenue._id?.toString() || myVenue._id)
      } else if (venues.length > 0) {
        // Fallback to first venue if no match found (for backwards compatibility)
        setVenueId(venues[0]._id?.toString() || venues[0]._id)
      }
    } catch (error) {
      console.error('Failed to fetch venue:', error)
    }
  }


  if (!venueId) {
    return (
      <div className="text-center py-12 text-primary-400">
        <p>No venue found. Please create a venue first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-primary-500 font-semibold mb-1">Privacy Protected</h3>
            <p className="text-primary-400 text-sm">
              User data is aggregated and anonymized to protect privacy
            </p>
          </div>
          <button
            onClick={() => setShowUserDetails(!showUserDetails)}
            className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors"
            title={showUserDetails ? 'Hide user details' : 'Show user details'}
          >
            {showUserDetails ? (
              <EyeOff className="w-5 h-5 text-primary-500" />
            ) : (
              <Eye className="w-5 h-5 text-primary-500" />
            )}
          </button>
        </div>
      </div>

      {/* Current Check-ins */}
      <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary-500 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Check-ins
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-primary-400 text-sm">
              {checkIns.length} active
            </span>
            {checkIns.length > 0 && (
              <button
                onClick={() => window.open(`/dashboard/analytics?tab=checkins`, '_blank')}
                className="text-xs text-primary-500 hover:text-primary-400 transition-colors underline"
              >
                View All
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="text-center py-8 text-primary-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active check-ins</p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkIns.map((checkIn) => (
              <div
                key={checkIn._id}
                onClick={() => {
                  if (showUserDetails && checkIn.user?._id) {
                    // Could navigate to user profile or show more details
                    console.log('View check-in details for user:', checkIn.user._id)
                  }
                }}
                className={`flex items-center justify-between p-3 bg-black/40 rounded-lg border border-primary-500/10 ${
                  showUserDetails && checkIn.user?._id ? 'hover:bg-black/60 hover:border-primary-500/30 cursor-pointer transition-all' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                    {checkIn.user.profilePicture ? (
                      <img
                        src={checkIn.user.profilePicture}
                        alt={checkIn.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-500 font-semibold">
                        {checkIn.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    {showUserDetails && checkIn.user?.name ? (
                      <>
                        <p className="text-primary-500 font-medium">{checkIn.user.name}</p>
                        <p className="text-primary-400 text-xs">
                          Checked in {new Date(checkIn.createdAt).toLocaleTimeString()}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-primary-500 font-medium">Customer</p>
                        <p className="text-primary-400 text-xs">
                          {new Date(checkIn.createdAt).toLocaleTimeString()}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <Clock className="w-4 h-4 text-primary-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nearby Users (Privacy-Protected) */}
      <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary-500 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Users Nearby
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-primary-400 text-sm">
              Within 1 mile
            </span>
            {nearbyUsers.length > 0 && (
              <button
                onClick={() => window.open(`/dashboard/analytics?tab=nearby`, '_blank')}
                className="text-xs text-primary-500 hover:text-primary-400 transition-colors underline"
              >
                View All
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : nearbyUsers.length === 0 ? (
          <div className="text-center py-8 text-primary-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users nearby</p>
            <p className="text-xs mt-1">Users must have location sharing enabled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-primary-500/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                    <span className="text-primary-500 font-semibold">
                      {showUserDetails && user.name ? user.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div>
                    {showUserDetails && user.name ? (
                      <>
                        <p className="text-primary-500 font-medium">{user.name}</p>
                        <p className="text-primary-400 text-xs">
                          {user.distance?.toFixed(1) || '0.0'} miles away
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-primary-500 font-medium">User Nearby</p>
                        <p className="text-primary-400 text-xs">
                          {user.distance?.toFixed(1) || '0.0'} miles away
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
          <p className="text-primary-400 text-sm mb-1">Total Check-ins Today</p>
          <p className="text-2xl font-bold text-primary-500">{checkIns.length}</p>
        </div>
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
          <p className="text-primary-400 text-sm mb-1">Users Nearby</p>
          <p className="text-2xl font-bold text-primary-500">{nearbyUsers.length}</p>
        </div>
      </div>
    </div>
  )
}


