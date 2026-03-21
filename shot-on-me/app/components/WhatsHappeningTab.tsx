'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Users, MapPin, TrendingUp, Clock, ArrowLeft, Star, Zap, Calendar } from 'lucide-react'
import { Tab } from '@/app/types'

interface FriendCheckIn {
  user: {
    _id: string
    name?: string
    firstName?: string
    profilePicture?: string
  }
  venue: {
    _id: string
    name: string
    address?: {
      street?: string
      city?: string
    }
  }
  checkedInAt: string
}

interface SuggestedVenue {
  _id: string
  name: string
  address?: {
    street?: string
    city?: string
  }
  checkInsToday?: number
  rating?: number
  friendsHere?: number
}

interface WhatsHappeningTabProps {
  setActiveTab?: (tab: Tab) => void
  onViewProfile?: (userId: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function WhatsHappeningTab({ setActiveTab, onViewProfile }: WhatsHappeningTabProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [friendCheckIns, setFriendCheckIns] = useState<FriendCheckIn[]>([])
  const [suggestedVenues, setSuggestedVenues] = useState<SuggestedVenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [token, user])

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (user?.location?.latitude && user?.location?.longitude) {
        params.append('latitude', user.location.latitude.toString())
        params.append('longitude', user.location.longitude.toString())
      }
      params.append('radius', '10')

      const [tonightRes, friendsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/tonight?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/location/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (tonightRes.status === 'fulfilled') {
        const data = tonightRes.value.data
        setFriendCheckIns(data.friendsOut || [])
        setSuggestedVenues(data.trendingVenues || [])
      }

      if (friendsRes.status === 'fulfilled') {
        const friends = friendsRes.value.data.friends || []
        // Merge live location friends as check-ins if not already in list
        setFriendCheckIns(prev => {
          const existingIds = new Set(prev.map((f: FriendCheckIn) => f.user._id))
          const extra: FriendCheckIn[] = friends
            .filter((f: any) => f.currentVenue && !existingIds.has(f._id))
            .map((f: any) => ({
              user: { _id: f._id, name: f.name, firstName: f.firstName, profilePicture: f.profilePicture },
              venue: { _id: f.currentVenue, name: f.currentVenueName || 'a venue', address: f.currentVenueAddress },
              checkedInAt: f.lastSeen || new Date().toISOString()
            }))
          return [...prev, ...extra]
        })
      }
    } catch (err) {
      console.error('WhatsHappeningTab fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFriendName = (friend: FriendCheckIn) =>
    (friend.user as any).name || (friend.user as any).firstName || 'Friend'

  const getFriendInitial = (friend: FriendCheckIn) =>
    getFriendName(friend).charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-black text-white pb-20 pt-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-primary-500/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setActiveTab?.('home')}
          className="text-primary-400 hover:text-primary-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-primary-500">What&apos;s Happening</h1>
          <p className="text-xs text-primary-400/70">Where your friends are tonight</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="p-4 space-y-6">

          {/* Friend Check-ins */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-semibold text-white">Friends Out Tonight</h2>
              {friendCheckIns.length > 0 && (
                <span className="text-xs text-primary-400 bg-primary-500/10 border border-primary-500/20 rounded-full px-2 py-0.5">
                  {friendCheckIns.length}
                </span>
              )}
            </div>

            {friendCheckIns.length === 0 ? (
              <div className="p-6 bg-black/40 border border-primary-500/10 rounded-xl text-center">
                <Users className="w-8 h-8 text-primary-500/40 mx-auto mb-2" />
                <p className="text-primary-400/70 text-sm">No friends checked in yet</p>
                <p className="text-primary-400/50 text-xs mt-1">Check back later tonight</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friendCheckIns.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onViewProfile?.(item.user._id)}
                    className="w-full flex items-center gap-3 p-3 bg-black/40 border border-primary-500/10 rounded-xl hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.user.profilePicture ? (
                        <img src={item.user.profilePicture} alt={getFriendName(item)} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary-500 font-semibold text-sm">{getFriendInitial(item)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{getFriendName(item)}</p>
                      <div className="flex items-center gap-1 text-primary-400/70 text-xs mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{item.venue.name}</span>
                        {item.venue.address?.city && (
                          <span className="text-primary-400/50">· {item.venue.address.city}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-primary-400/50 text-xs flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(item.checkedInAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Suggested Venues */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-semibold text-white">Hot Right Now</h2>
            </div>

            {suggestedVenues.length === 0 ? (
              <div className="p-6 bg-black/40 border border-primary-500/10 rounded-xl text-center">
                <MapPin className="w-8 h-8 text-primary-500/40 mx-auto mb-2" />
                <p className="text-primary-400/70 text-sm">No trending venues nearby</p>
                <p className="text-primary-400/50 text-xs mt-1">Enable location to see what&apos;s hot around you</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestedVenues.map((venue, i) => (
                  <div
                    key={venue._id}
                    className="flex items-center gap-3 p-3 bg-black/40 border border-primary-500/10 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                      {i === 0 ? (
                        <Zap className="w-5 h-5 text-primary-500" />
                      ) : (
                        <MapPin className="w-5 h-5 text-primary-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{venue.name}</p>
                      {venue.address?.city && (
                        <p className="text-primary-400/70 text-xs mt-0.5">{venue.address.city}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {(venue.checkInsToday ?? 0) > 0 && (
                        <span className="text-xs text-primary-500 font-semibold">
                          {venue.checkInsToday} check-in{venue.checkInsToday !== 1 ? 's' : ''}
                        </span>
                      )}
                      {(venue.friendsHere ?? 0) > 0 && (
                        <span className="text-xs text-primary-400/70 flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          {venue.friendsHere} friend{venue.friendsHere !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Explore more CTA */}
          <div className="pt-2">
            <button
              onClick={() => setActiveTab?.('map')}
              className="w-full py-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-400 hover:text-primary-500 hover:border-primary-500/40 hover:bg-primary-500/15 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Explore All Venues
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
