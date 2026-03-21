'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  Users, MapPin, Clock, ArrowRight, Star,
  TrendingUp, Flame, RefreshCw, List, Map as MapIcon
} from 'lucide-react'
import { Tab } from '@/app/types'

interface Friend {
  _id: string
  firstName: string
  lastName: string
  profilePicture?: string
}

interface FriendCheckIn {
  friend: Friend
  venue: {
    _id: string
    name: string
    address?: { street?: string; city?: string }
    location?: { coordinates?: number[] }
  }
  checkedInAt: string
}

interface VenueWithFriends {
  venue: {
    _id: string
    name: string
    address?: { street?: string; city?: string }
    location?: { coordinates?: number[] }
    category?: string
  }
  friends: Friend[]
  lastCheckIn: string
  totalCheckIns: number
}

interface SuggestedVenue {
  venue: {
    _id: string
    name: string
    address?: { street?: string; city?: string }
    category?: string
  }
  friendCount: number
  friends: Friend[]
  reason: string
}

interface WhatsHappeningTabProps {
  setActiveTab?: (tab: Tab) => void
  onViewProfile?: (userId: string) => void
  onViewVenue?: (venueId: string) => void
}

type TimeRange = '2h' | '8h' | '7d'

export default function WhatsHappeningTab({
  setActiveTab,
  onViewProfile,
  onViewVenue
}: WhatsHappeningTabProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()

  const [timeRange, setTimeRange] = useState<TimeRange>('8h')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [venuesWithFriends, setVenuesWithFriends] = useState<VenueWithFriends[]>([])
  const [recentCheckIns, setRecentCheckIns] = useState<FriendCheckIn[]>([])
  const [suggestedVenues, setSuggestedVenues] = useState<SuggestedVenue[]>([])

  const timeRangeMs: Record<TimeRange, number> = {
    '2h': 2 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  }

  const timeRangeLabel: Record<TimeRange, string> = {
    '2h': 'Right Now',
    '8h': 'Tonight',
    '7d': 'This Week',
  }

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!token || !user) return
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      // Fetch friend check-ins and user's friends in parallel
      const [checkInsRes, friendsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/checkins`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 }
        }),
        axios.get(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      // Get friend IDs
      const myFriendIds: string[] = []
      if (friendsRes.status === 'fulfilled') {
        const userData = friendsRes.value.data.user
        myFriendIds.push(...(userData?.friends?.map((f: any) => f.toString()) || []))
      }

      if (myFriendIds.length === 0) {
        setVenuesWithFriends([])
        setRecentCheckIns([])
        setSuggestedVenues([])
        return
      }

      // Batch fetch friend details
      const friendsData: Record<string, Friend> = {}
      try {
        const batchRes = await axios.get(`${API_URL}/users/batch`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { ids: myFriendIds.slice(0, 50).join(',') }
        })
        for (const f of batchRes.data.users || []) {
          friendsData[f._id.toString()] = f
        }
      } catch {
        // continue without friend details
      }

      // Filter check-ins to friends only within time range
      const cutoff = new Date(Date.now() - timeRangeMs[timeRange])
      const allCheckIns: any[] = checkInsRes.status === 'fulfilled'
        ? (checkInsRes.value.data.checkIns || checkInsRes.value.data.checkins || [])
        : []

      const friendCheckIns = allCheckIns.filter((c: any) => {
        const authorId = c.author?._id?.toString() || c.author?.toString() || c.userId?.toString()
        const checkedInAt = new Date(c.checkIn?.checkedInAt || c.createdAt)
        return myFriendIds.includes(authorId) && checkedInAt >= cutoff && c.checkIn?.venue
      })

      // Build recent check-ins list
      const recent: FriendCheckIn[] = friendCheckIns
        .slice(0, 20)
        .map((c: any) => ({
          friend: friendsData[c.author?._id?.toString() || c.author?.toString()] || {
            _id: c.author?._id || c.author,
            firstName: c.author?.firstName || 'Friend',
            lastName: c.author?.lastName || '',
            profilePicture: c.author?.profilePicture
          },
          venue: c.checkIn.venue,
          checkedInAt: c.checkIn.checkedInAt || c.createdAt
        }))

      setRecentCheckIns(recent)

      // Aggregate by venue
      const venueMap: Record<string, VenueWithFriends> = {}
      for (const ci of friendCheckIns) {
        const venueId = ci.checkIn.venue._id?.toString()
        if (!venueId) continue
        const friendId = ci.author?._id?.toString() || ci.author?.toString()
        const friend = friendsData[friendId] || {
          _id: friendId,
          firstName: ci.author?.firstName || 'Friend',
          lastName: ci.author?.lastName || '',
          profilePicture: ci.author?.profilePicture
        }

        if (!venueMap[venueId]) {
          venueMap[venueId] = {
            venue: ci.checkIn.venue,
            friends: [],
            lastCheckIn: ci.checkIn.checkedInAt || ci.createdAt,
            totalCheckIns: 0
          }
        }

        // Deduplicate friends
        const existing = venueMap[venueId].friends.find(f => f._id === friend._id)
        if (!existing) venueMap[venueId].friends.push(friend)
        venueMap[venueId].totalCheckIns++

        const ciTime = new Date(ci.checkIn.checkedInAt || ci.createdAt)
        if (ciTime > new Date(venueMap[venueId].lastCheckIn)) {
          venueMap[venueId].lastCheckIn = ci.checkIn.checkedInAt || ci.createdAt
        }
      }

      const sorted = Object.values(venueMap).sort((a, b) => b.friends.length - a.friends.length)
      setVenuesWithFriends(sorted)

      // Build suggestions — venues friends frequent that user hasn't visited
      // Use broader time range for suggestions (always 7 days)
      const sevenDayCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const allRecentCheckIns = allCheckIns.filter((c: any) => {
        const authorId = c.author?._id?.toString() || c.author?.toString()
        const checkedInAt = new Date(c.checkIn?.checkedInAt || c.createdAt)
        return myFriendIds.includes(authorId) && checkedInAt >= sevenDayCutoff && c.checkIn?.venue
      })

      const myUserId = (user as any).id || (user as any)._id
      const myCheckInVenueIds = new Set(
        allCheckIns
          .filter((c: any) => {
            const authorId = c.author?._id?.toString() || c.author?.toString()
            return authorId === myUserId?.toString()
          })
          .map((c: any) => c.checkIn?.venue?._id?.toString())
          .filter(Boolean)
      )

      const suggestionMap: Record<string, SuggestedVenue> = {}
      for (const ci of allRecentCheckIns) {
        const venueId = ci.checkIn.venue._id?.toString()
        if (!venueId || myCheckInVenueIds.has(venueId)) continue
        const friendId = ci.author?._id?.toString() || ci.author?.toString()
        const friend = friendsData[friendId] || {
          _id: friendId,
          firstName: ci.author?.firstName || 'Friend',
          lastName: ci.author?.lastName || '',
          profilePicture: ci.author?.profilePicture
        }

        if (!suggestionMap[venueId]) {
          suggestionMap[venueId] = {
            venue: ci.checkIn.venue,
            friendCount: 0,
            friends: [],
            reason: 'Your friends go here'
          }
        }
        const existing = suggestionMap[venueId].friends.find(f => f._id === friend._id)
        if (!existing) {
          suggestionMap[venueId].friends.push(friend)
          suggestionMap[venueId].friendCount++
        }
      }

      const suggestions = Object.values(suggestionMap)
        .sort((a, b) => b.friendCount - a.friendCount)
        .slice(0, 5)
        .map(s => ({
          ...s,
          reason: s.friendCount >= 3
            ? `${s.friendCount} of your friends come here`
            : s.friendCount === 2
              ? `${s.friends[0]?.firstName} and ${s.friends[1]?.firstName} visit this spot`
              : `${s.friends[0]?.firstName} loves this place`
        }))

      setSuggestedVenues(suggestions)
    } catch (error) {
      console.error('WhatsHappeningTab fetch error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, user, API_URL, timeRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const FriendAvatars = ({ friends, max = 3 }: { friends: Friend[], max?: number }) => (
    <div className="flex -space-x-2">
      {friends.slice(0, max).map((f, i) => (
        <div
          key={f._id}
          className="w-7 h-7 rounded-full border-2 border-black overflow-hidden flex-shrink-0 cursor-pointer"
          style={{ zIndex: max - i }}
          onClick={() => onViewProfile?.(f._id)}
        >
          {f.profilePicture ? (
            <img src={f.profilePicture} alt={f.firstName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-primary-500 text-xs font-bold">{f.firstName?.[0]}</span>
            </div>
          )}
        </div>
      ))}
      {friends.length > max && (
        <div className="w-7 h-7 rounded-full border-2 border-black bg-primary-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-500 text-xs font-bold">+{friends.length - max}</span>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  const noActivity = venuesWithFriends.length === 0 && recentCheckIns.length === 0

  return (
    <div className="min-h-screen bg-black pb-20 pt-16">

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary-500">What&apos;s Happening</h1>
          <p className="text-xs text-primary-400/60">Where your friends are</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-500"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Time range + view toggle */}
      <div className="px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-black/40 border border-primary-500/20 rounded-lg p-1">
          {(['2h', '8h', '7d'] as TimeRange[]).map(t => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                timeRange === t
                  ? 'bg-primary-500 text-black'
                  : 'text-primary-400 hover:text-primary-500'
              }`}
            >
              {timeRangeLabel[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-black/40 border border-primary-500/20 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary-500 text-black' : 'text-primary-400'}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'map' ? 'bg-primary-500 text-black' : 'text-primary-400'}`}
          >
            <MapIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {noActivity ? (
        <div className="px-4 py-16 text-center">
          <Users className="w-14 h-14 text-primary-500/20 mx-auto mb-4" />
          <p className="text-primary-400/70 font-light">No friend activity in this time range</p>
          <p className="text-primary-400/40 text-sm mt-1">Try expanding to &quot;This Week&quot;</p>
          {suggestedVenues.length > 0 && (
            <p className="text-primary-400/60 text-sm mt-4">Scroll down to see suggestions</p>
          )}
        </div>
      ) : (
        <>
          {/* Friends at venues */}
          {venuesWithFriends.length > 0 && (
            <div className="px-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-semibold text-primary-500">Friends out right now</h2>
              </div>
              <div className="space-y-3">
                {venuesWithFriends.map((item, i) => (
                  <div
                    key={item.venue._id || i}
                    className="bg-black/40 border border-primary-500/15 rounded-xl p-4 cursor-pointer hover:border-primary-500/30 transition-all"
                    onClick={() => onViewVenue?.(item.venue._id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                          <h3 className="font-semibold text-primary-500 text-sm truncate">
                            {item.venue.name}
                          </h3>
                        </div>
                        {item.venue.address?.city && (
                          <p className="text-xs text-primary-400/50 ml-5 mb-2">
                            {item.venue.address.street ? `${item.venue.address.street}, ` : ''}
                            {item.venue.address.city}
                          </p>
                        )}
                        <div className="flex items-center gap-3 ml-5">
                          <FriendAvatars friends={item.friends} />
                          <span className="text-xs text-primary-400/70">
                            {item.friends.length === 1
                              ? `${item.friends[0].firstName} is here`
                              : `${item.friends.length} friends here`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-primary-400/50 text-xs">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(item.lastCheckIn)}
                        </div>
                        <ArrowRight className="w-4 h-4 text-primary-500/40 mt-2 ml-auto" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent check-ins feed */}
          {recentCheckIns.length > 0 && (
            <div className="px-4 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary-500" />
                <h2 className="text-sm font-semibold text-primary-500">Recent check-ins</h2>
              </div>
              <div className="space-y-2">
                {recentCheckIns.slice(0, 8).map((ci, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-primary-500/5">
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border border-primary-500/20"
                      onClick={() => onViewProfile?.(ci.friend._id)}
                    >
                      {ci.friend.profilePicture ? (
                        <img src={ci.friend.profilePicture} alt={ci.friend.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary-500/10 flex items-center justify-center">
                          <span className="text-primary-500 text-sm font-bold">{ci.friend.firstName?.[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary-400/80">
                        <span
                          className="font-semibold text-primary-500 cursor-pointer"
                          onClick={() => onViewProfile?.(ci.friend._id)}
                        >
                          {ci.friend.firstName} {ci.friend.lastName}
                        </span>
                        {' checked in at '}
                        <span
                          className="font-semibold text-primary-500 cursor-pointer"
                          onClick={() => onViewVenue?.(ci.venue._id)}
                        >
                          {ci.venue.name}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs text-primary-400/40 flex-shrink-0">
                      {formatTimeAgo(ci.checkedInAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Suggested venues */}
      {suggestedVenues.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-primary-500">Suggested for you</h2>
            <span className="text-xs text-primary-400/40">Based on your friends</span>
          </div>
          <div className="space-y-3">
            {suggestedVenues.map((item, i) => (
              <div
                key={item.venue._id || i}
                className="bg-black/40 border border-primary-500/10 rounded-xl p-4 cursor-pointer hover:border-primary-500/25 transition-all"
                onClick={() => onViewVenue?.(item.venue._id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                      <h3 className="font-semibold text-primary-500 text-sm truncate">{item.venue.name}</h3>
                    </div>
                    {item.venue.address?.city && (
                      <p className="text-xs text-primary-400/50 ml-5 mb-2">{item.venue.address.city}</p>
                    )}
                    <div className="flex items-center gap-2 ml-5">
                      <FriendAvatars friends={item.friends} max={3} />
                      <p className="text-xs text-primary-400/60">{item.reason}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary-500/30 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty suggestions state */}
      {suggestedVenues.length === 0 && !noActivity && (
        <div className="px-4 mt-6 py-6 text-center border-t border-primary-500/10">
          <p className="text-primary-400/40 text-xs">
            Suggestions will appear as your friends check in to more venues
          </p>
        </div>
      )}

    </div>
  )
}
