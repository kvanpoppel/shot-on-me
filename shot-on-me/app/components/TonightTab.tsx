'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { MapPin, Users, Calendar, Sparkles, TrendingUp, Clock } from 'lucide-react'

interface FriendOut {
  user: {
    _id: string
    name: string
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

interface TrendingVenue {
  _id: string
  name: string
  address?: {
    street?: string
    city?: string
  }
  checkInsToday: number
}

interface Promotion {
  _id?: string
  title: string
  description: string
  discount?: number
  isFlashDeal?: boolean
  flashDealEndsAt?: string
  pointsReward?: number
  venue: {
    id: string
    name: string
    address?: {
      street?: string
      city?: string
    }
  }
}

interface Event {
  _id: string
  title: string
  description: string
  startTime: string
  endTime: string
  venue: {
    _id: string
    name: string
    address?: {
      street?: string
      city?: string
    }
  }
  rsvpCount: number
  attendeeCount: number
}

interface TonightData {
  friendsOut: FriendOut[]
  trendingVenues: TrendingVenue[]
  activePromotions: Promotion[]
  eventsTonight: Event[]
  recentPosts: any[]
  usersOut: number
}

export default function TonightTab() {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [data, setData] = useState<TonightData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && user?.location) {
      fetchTonightData()
      const interval = setInterval(fetchTonightData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [token, user])

  const fetchTonightData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (user?.location?.latitude && user?.location?.longitude) {
        params.append('latitude', user.location.latitude.toString())
        params.append('longitude', user.location.longitude.toString())
      }
      params.append('radius', '10')

      const response = await axios.get(`${API_URL}/tonight?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch tonight data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-14 pt-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-primary-500/10 p-4">
        <h1 className="text-2xl font-bold text-primary-500 mb-2">Tonight</h1>
        <p className="text-sm text-primary-400">See what's happening right now</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Friends Out */}
        {data?.friendsOut && data.friendsOut.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold">Friends Out</h2>
              <span className="text-sm text-primary-400">({data.friendsOut.length})</span>
            </div>
            <div className="space-y-2">
              {data.friendsOut.map((friend, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-black/40 border border-primary-500/10 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center overflow-hidden">
                    {friend.user.profilePicture ? (
                      <img
                        src={friend.user.profilePicture}
                        alt={(friend.user as any)?.name || (friend.user as any)?.firstName || 'Friend'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-500 font-semibold">
                        {((friend.user as any)?.name || (friend.user as any)?.firstName || 'F').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{(friend.user as any)?.name || (friend.user as any)?.firstName || 'Friend'}</p>
                    <div className="flex items-center gap-1 text-sm text-primary-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{friend.venue.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Venues */}
        {data?.trendingVenues && data.trendingVenues.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold">Trending Venues</h2>
            </div>
            <div className="space-y-2">
              {data.trendingVenues.slice(0, 5).map(venue => (
                <div
                  key={venue._id}
                  className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/10 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{venue.name}</p>
                    {venue.address?.city && (
                      <p className="text-sm text-primary-400 truncate">{venue.address.city}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-primary-500">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">{venue.checkInsToday}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Promotions */}
        {data?.activePromotions && data.activePromotions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold">Active Promotions</h2>
            </div>
            <div className="space-y-2">
              {data.activePromotions.slice(0, 5).map((promo, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    promo.isFlashDeal
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-black/40 border-primary-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{promo.title}</h3>
                        {promo.isFlashDeal && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                            Flash Deal
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-primary-400 mt-1">{promo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3 h-3 text-primary-400" />
                      <span className="text-primary-400">{promo.venue.name}</span>
                    </div>
                    {promo.pointsReward && promo.pointsReward > 0 && (
                      <span className="text-xs text-yellow-500">
                        +{promo.pointsReward} pts
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Events Tonight */}
        {data?.eventsTonight && data.eventsTonight.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold">Events Tonight</h2>
            </div>
            <div className="space-y-2">
              {data.eventsTonight.map(event => (
                <div
                  key={event._id}
                  className="p-3 bg-black/40 border border-primary-500/10 rounded-lg"
                >
                  <h3 className="font-semibold mb-1">{event.title}</h3>
                  <p className="text-sm text-primary-400 mb-2">{event.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-primary-400">
                      <MapPin className="w-3 h-3" />
                      <span>{event.venue.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary-400">
                      <Users className="w-3 h-3" />
                      <span>{event.rsvpCount} going</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(event.startTime).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!data || (
          data.friendsOut.length === 0 &&
          data.trendingVenues.length === 0 &&
          data.activePromotions.length === 0 &&
          data.eventsTonight.length === 0
        )) && (
          <div className="text-center py-12 text-primary-400">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nothing happening tonight</p>
            <p className="text-sm mt-2">Check back later or explore venues!</p>
          </div>
        )}
      </div>
    </div>
  )
}

