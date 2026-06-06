'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import {
  Clock,
  ArrowRight,
  Users,
  Send,
} from 'lucide-react'

import { useApiUrl } from '../utils/api'
import { Tab } from '@/app/types'
import FindFriends from './FindFriends'

interface HomeTabProps {
  setActiveTab?: (tab: Tab) => void
  onViewProfile?: (userId: string) => void
  onSendMoney?: () => void
  onViewVenue?: (venueId: string) => void
}

interface QuickDeal {
  venue: {
    _id: string
    name: string
    address?: any
    subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise'
    isFeatured?: boolean
  }
  promotion: {
    title: string
    description?: string
    type: string
    endTime: string
  }
  distance?: string
}

export default function HomeTab({ setActiveTab, onViewProfile, onSendMoney, onViewVenue }: HomeTabProps) {
  const { token, user } = useAuth()
  const userId = user?.id || (user as any)?._id || null
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [walletBalance, setWalletBalance] = useState(0)
  const [quickDeals, setQuickDeals] = useState<QuickDeal[]>([])
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [trendingVenuesActivity, setTrendingVenuesActivity] = useState<any[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [featuredVenues, setFeaturedVenues] = useState<any[]>([])
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [aiVibes, setAiVibes] = useState<{ key: string; emoji: string; label: string; score: number; friendsNow: number; reason: string | null }[]>([])

  // Use refs to track if we've already fetched to prevent duplicate fetches
  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Scroll to top when HomeTab mounts
  useEffect(() => {
    if (!isMounted) return
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [isMounted])

  useEffect(() => {
    const userIdChanged = userIdRef.current !== userId

    if (token && user && (!hasFetchedRef.current || userIdChanged)) {
      hasFetchedRef.current = true
      userIdRef.current = userId

      fetchHomeData()
    } else if (!token || !user) {
      setLoading(false)
    }
  }, [token, userId])

  // Real-time wallet updates
  useEffect(() => {
    if (!socket) return

    const handleWalletUpdate = (data: { userId: string; balance: number }) => {
      if (data.userId === userId) {
        setWalletBalance(data.balance)
      }
    }

    socket.on('wallet-updated', handleWalletUpdate)

    return () => {
      socket.off('wallet-updated', handleWalletUpdate)
    }
  }, [socket, user])

  // Fetch featured venues + AI vibes on load
  useEffect(() => {
    if (token) {
      fetchFeaturedVenues()
      fetchAiVibes()
    }
  }, [token])

  const fetchAiVibes = async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/venue-activity/vibes`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      setAiVibes(res.data.vibes || [])
    } catch {
      // Fallback: use default static vibes
      setAiVibes([])
    }
  }

  const fetchFeaturedVenues = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/venues/featured`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venues = response.data.venues || []
      const sortedVenues = [...venues].sort((a: any, b: any) => (b.spotlightScore || 0) - (a.spotlightScore || 0))
      setFeaturedVenues(sortedVenues)
    } catch (error) {
      console.error('Failed to fetch featured venues:', error)
      setFeaturedVenues([])
    }
  }

  const fetchHomeData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    // Show UI immediately - don't block on loading
    setLoading(false)

    try {
      // Fetch critical data first (user and venues)
      const [userResponse, venuesResponse] = await Promise.allSettled([
        axios.get(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 6000
        }),
        axios.get(`${API_URL}/venues`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 6000
        })
      ])
      
      // Process critical data immediately
      if (userResponse.status === 'fulfilled') {
        const userData = userResponse.value.data.user
        setWalletBalance(userData.wallet?.balance || 0)

      }
      
      let venues: any[] = []
      if (venuesResponse.status === 'fulfilled') {
        venues = venuesResponse.value.data.venues || []
      }

      // Get current active promotions
      const now = new Date()
      const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const deals: QuickDeal[] = []

      // Helper function to check if promotion is active based on schedule
      const isPromotionActive = (promo: any): boolean => {
        if (!promo.isActive) return false

        // Check if promotion has expired based on endTime, flashDealEndsAt, or validUntil
        const endTime = promo.endTime ? new Date(promo.endTime) : null
        const flashDealEndsAt = promo.flashDealEndsAt ? new Date(promo.flashDealEndsAt) : null
        const validUntil = promo.validUntil ? new Date(promo.validUntil) : null
        
        // Determine the actual expiration time
        const expirationTime = endTime || flashDealEndsAt || validUntil
        
        // If there's an expiration time and it's in the past, the promotion is expired
        if (expirationTime && expirationTime < now) {
          return false
        }

        // Check if promotion has a startTime and hasn't started yet
        if (promo.startTime) {
          const startTime = new Date(promo.startTime)
          if (startTime > now) {
            return false // Promotion hasn't started yet
          }
        }

        // Check if promotion has a schedule (recurring promotions)
        if (promo.schedule && promo.schedule.length > 0) {
          // Check if current day matches any schedule entry
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const currentDayName = dayNames[currentDay].toLowerCase()
          
          const matchingSchedule = promo.schedule.find((sched: any) => {
            const scheduleDays = (sched.days || '').toLowerCase().split(',').map((d: string) => d.trim())
            const dayMatches = scheduleDays.includes(currentDayName) || scheduleDays.includes('all')
            
            if (!dayMatches) return false
            
            // Check if current time is within schedule time window
            if (sched.start && sched.end) {
              return currentTime >= sched.start && currentTime <= sched.end
            }
            
            return true
          })
          
          if (matchingSchedule) {
            return true
          }
        }

        // Fallback to startTime/endTime check for one-time promotions
        if (promo.startTime && promo.endTime) {
          const startTime = new Date(promo.startTime)
          const endTime = new Date(promo.endTime)
          return now >= startTime && now <= endTime
        }

        // If no schedule or time window, check if it's marked as active and not expired
        return promo.isActive === true && (!expirationTime || expirationTime >= now)
      }

      venues.forEach((venue: any) => {
        if (venue.promotions && venue.promotions.length > 0) {
          venue.promotions.forEach((promo: any) => {
            if (isPromotionActive(promo)) {
              deals.push({
                venue: {
                  _id: venue._id,
                  name: venue.name,
                  address: venue.address,
                  subscriptionTier: venue.subscriptionTier,
                  isFeatured: venue.isFeatured
                },
                promotion: {
                  title: promo.title,
                  description: promo.description,
                  type: promo.type,
                  endTime: promo.endTime || promo.flashDealEndsAt || promo.validUntil
                },
                distance: venue.distance
              })
            }
          })
        }
      })

      // Sort by end time (soonest ending first) and take top 5
      deals.sort((a, b) => 
        new Date(a.promotion.endTime).getTime() - new Date(b.promotion.endTime).getTime()
      )
      setQuickDeals(deals.slice(0, 5))

      // Get trending venues (by follower count)
      const trending = venues
        .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
        .slice(0, 10)
      setTrendingVenues(trending)
      
      // Fetch non-critical data in background (don't await - let it load asynchronously)
      Promise.allSettled([
        // Fetch friend-based trending (aggregated from user connections)
        axios.get(`${API_URL}/venue-activity/trending/friends?limit=10&period=24h`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: { venues: [] } })),
        axios.get(`${API_URL}/location/friends`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: { friends: [] } }))
      ]).then(([activityResponse, friendsResponse]) => {
        // Process friend-based trending venues (non-critical)
        if (activityResponse.status === 'fulfilled') {
          setTrendingVenuesActivity(activityResponse.value.data.venues || [])
        } else {
          // Fallback to regular trending if friend-based fails
          setTrendingVenuesActivity(trending)
        }

        // Process nearby friends (non-critical)
        if (friendsResponse.status === 'fulfilled') {
          setNearbyFriends(friendsResponse.value.data.friends?.slice(0, 3) || [])
        } else {
          setNearbyFriends([])
        }
      })

    } catch (error: any) {
      console.error('Failed to fetch home data:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      // Don't block the UI - show empty state instead
      setQuickDeals([])
      setTrendingVenues([])
      setTrendingVenuesActivity([])
      setNearbyFriends([])
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [token, API_URL])

  // Real-time promotion updates - Watch venue-portal for new/updated promotions
  useEffect(() => {
    if (!socket || !token || !fetchHomeData) return

    const handleNewPromotion = (data: { venueId: string; promotion: any }) => {
      // Refresh deals when a new promotion is created
      fetchHomeData()
    }

    const handlePromotionUpdated = (data: { venueId: string; promotion: any }) => {
      // Refresh deals when a promotion is updated
      fetchHomeData()
    }

    const handlePromotionDeleted = (data: { venueId: string; promotionId: string }) => {
      // Refresh deals when a promotion is deleted
      fetchHomeData()
    }

    const handleVenueUpdated = (data: { venueId: string; venue: any }) => {
      // Refresh deals when venue is updated (might affect promotions)
      fetchHomeData()
    }

    socket.on('new-promotion', handleNewPromotion)
    socket.on('promotion-updated', handlePromotionUpdated)
    socket.on('promotion-deleted', handlePromotionDeleted)
    socket.on('venue-updated', handleVenueUpdated)

    return () => {
      socket.off('new-promotion', handleNewPromotion)
      socket.off('promotion-updated', handlePromotionUpdated)
      socket.off('promotion-deleted', handlePromotionDeleted)
      socket.off('venue-updated', handleVenueUpdated)
    }
  }, [socket, token, fetchHomeData])

  // Periodic refresh of deals to catch promotions that become active
  useEffect(() => {
    if (!token || !fetchHomeData) return

    // Refresh deals every 60 seconds to catch promotions that just became active
    const interval = setInterval(() => {
      fetchHomeData()
    }, 60000)

    return () => clearInterval(interval)
  }, [token, fetchHomeData])


  const getTimeRemaining = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end.getTime() - now.getTime()
    
    if (diff <= 0) return 'Ended'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) return `${hours}h ${minutes}m left`
    return `${minutes}m left`
  }

  // Show loading only for initial load
  if (!isMounted || (loading && hasFetchedRef.current === false)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Consolidated venue items: group deals by venue (one card per venue with deal count)
  const venueItems: ({ type: 'venue-deals'; venueId: string; venueName: string; deals: QuickDeal[] } | { type: 'venue'; venue: any })[] = []
  if (quickDeals.length > 0) {
    const grouped = new Map<string, QuickDeal[]>()
    quickDeals.forEach(deal => {
      const vid = deal.venue._id
      if (!grouped.has(vid)) grouped.set(vid, [])
      grouped.get(vid)!.push(deal)
    })
    Array.from(grouped.entries()).slice(0, 5).forEach(([vid, deals]) => {
      venueItems.push({ type: 'venue-deals', venueId: vid, venueName: deals[0].venue.name, deals })
    })
  } else {
    const fallback = featuredVenues.length > 0 ? featuredVenues : (trendingVenuesActivity.length > 0 ? trendingVenuesActivity : trendingVenues)
    fallback.slice(0, 4).forEach((venue: any) => venueItems.push({ type: 'venue', venue }))
  }

  return (
    <div className="min-h-screen pb-14 bg-black max-w-2xl mx-auto overflow-visible pt-16" suppressHydrationWarning>

      {/* 1. Welcome + Quick Actions */}
      <div className="px-4 pt-2 mb-5">
        <div className="bg-gradient-to-br from-primary-500/10 via-black/60 to-black/80 border border-primary-500/25 rounded-2xl p-5 shadow-lg shadow-primary-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-15 blur-3xl bg-primary-500" style={{ transform: 'translate(30%,-30%)' }} />
            <p className="text-primary-400/60 text-sm mb-0.5 relative z-10">Hey there,</p>
            <h2 className="text-[28px] font-bold text-white leading-tight relative z-10">
              {(user as any)?.name?.split(' ')[0] || 'there'} <span className="text-primary-500">👋</span>
            </h2>
            <p className="text-primary-400/60 text-sm mt-1 mb-4 relative z-10">{walletBalance === 0 ? 'Ready to send your first shot?' : 'What are you buying tonight?'}</p>
            <div className="flex gap-2 relative z-10">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onSendMoney) onSendMoney(); else setActiveTab?.('wallet') }}
                className="flex-1 bg-primary-500 text-black font-bold py-3 rounded-xl text-sm hover:bg-primary-400 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Send a Shot
              </button>
              <button
                onClick={() => setShowFindFriends(true)}
                className="flex-1 border border-primary-500/30 text-primary-500 font-bold py-3 rounded-xl text-sm hover:bg-primary-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                Invite Friends
              </button>
            </div>
          </div>
      </div>

      {/* 2. Friends Out Tonight — always visible */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-primary-500">Friends Out Tonight</h2>
          {nearbyFriends.length > 0 && (
            <button onClick={() => setActiveTab?.('happening')} className="text-primary-400 hover:text-primary-500 text-sm flex items-center gap-1 font-medium">
              See All <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {nearbyFriends.length > 0 ? (
          <div className="space-y-2">
            {nearbyFriends.map((friend) => (
              <div
                key={friend._id || friend.id}
                className="bg-black/50 border border-primary-500/20 rounded-xl p-3 flex items-center gap-3 hover:border-primary-500/40 hover:bg-black/60 transition-all"
              >
                <div
                  onClick={() => onViewProfile?.(friend._id || friend.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="w-10 h-10 border border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                    {friend.profilePicture ? (
                      <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                        <span className="text-primary-500 font-medium text-sm">{friend.firstName?.[0]}{friend.lastName?.[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-primary-500 text-sm">{friend.firstName} {friend.lastName}</p>
                    <p className="text-xs text-primary-400/60">
                      {friend.currentVenueName
                        ? `📍 ${friend.currentVenueName}`
                        : 'Out tonight'}
                      {friend.timeLabel && friend.timeLabel !== 'now' && (
                        <span className="ml-1.5 text-primary-400/40">· {friend.timeLabel}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (onSendMoney) onSendMoney(); else setActiveTab?.('wallet') }}
                  className="bg-primary-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-400 transition-all active:scale-[0.98] flex-shrink-0"
                >
                  🍺 Send
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/40 border border-primary-500/15 rounded-xl p-4 text-center">
            <p className="text-primary-400/70 text-sm">No friends out yet tonight</p>
          </div>
        )}
      </div>


      {/* 4. Happening Now — deals + venues */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-primary-500">Happening Now</h2>
          {venueItems.length > 0 && (
            <button onClick={() => setActiveTab?.('map')} className="text-primary-400 hover:text-primary-500 text-sm flex items-center gap-1 font-medium">
              See All <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {venueItems.length > 0 ? (
          <div className="space-y-2.5">
            {venueItems.map((item, idx) => {
              if (item.type === 'venue-deals') {
                const { venueId, venueName, deals } = item
                const sorted = [...deals].sort((a, b) => new Date(a.promotion.endTime).getTime() - new Date(b.promotion.endTime).getTime())
                const soonest = sorted[0]
                return (
                  <div
                    key={`vd-${venueId}`}
                    onClick={() => {
                      if (onViewVenue) { onViewVenue(venueId) }
                      else { localStorage.setItem('highlightVenue', venueId); setActiveTab?.('map') }
                    }}
                    className="bg-black/50 border border-primary-500/25 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 hover:bg-black/70 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-primary-500 truncate">{venueName}</p>
                        <p className="text-sm text-white/80 mt-0.5 line-clamp-1">{soonest.promotion.title}</p>
                        {deals.length > 1 && (
                          <p className="text-xs text-primary-400/50 mt-0.5">+ {deals.length - 1} more deal{deals.length > 2 ? 's' : ''}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1 text-xs text-primary-400/60">
                            <Clock className="w-3 h-3" />
                            <span>{getTimeRemaining(soonest.promotion.endTime)}</span>
                          </div>
                          {deals.length > 1 && (
                            <span className="text-[10px] font-semibold text-primary-500 bg-primary-500/15 border border-primary-500/25 px-1.5 py-0.5 rounded-full">{deals.length} deals</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {sorted.some(d => d.promotion.type === 'happy-hour') && (
                          <span className="text-[10px] font-bold text-primary-500 bg-primary-500/15 border border-primary-500/30 px-2 py-0.5 rounded-lg">LIVE</span>
                        )}
                        {sorted.some(d => d.promotion.type === 'flash-deal') && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-lg">FLASH</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
              const venue = (item as any).venue
              return (
                <div
                  key={`venue-${venue._id}`}
                  onClick={() => { if (onViewVenue && venue._id) { onViewVenue(venue._id) } else { if (venue._id) localStorage.setItem('highlightVenue', venue._id); setActiveTab?.('map') } }}
                  className="bg-black/50 border border-primary-500/20 rounded-xl p-4 cursor-pointer hover:border-primary-500/40 hover:bg-black/60 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary-500 truncate">{venue.name}</p>
                      <p className="text-xs text-primary-400/60 mt-0.5 line-clamp-1">
                        {venue.description || (venue.promotions?.length > 0 ? `${venue.promotions.length} active special${venue.promotions.length !== 1 ? 's' : ''}` : 'Tap & pay venue')}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary-400/50 flex-shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-black/40 border border-primary-500/15 rounded-xl p-4 text-center">
            <p className="text-primary-400/70 text-sm mb-2">No deals happening right now</p>
            <button
              onClick={() => setActiveTab?.('map')}
              className="text-primary-500 font-semibold text-sm hover:text-primary-400 transition-all"
            >
              Explore venues nearby
            </button>
          </div>
        )}
      </div>

      {/* 4. Vibes — AI-personalized category browse */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-primary-500">Vibes</h2>
          {aiVibes.some(v => v.reason) && (
            <span className="text-[10px] text-primary-400/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500/50 animate-pulse" />
              Personalized for you
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(aiVibes.length > 0 ? aiVibes : [
            { key: 'happyHour', emoji: '🍻', label: 'Happy Hr', score: 0, friendsNow: 0, reason: null },
            { key: 'trivia', emoji: '🧠', label: 'Trivia', score: 0, friendsNow: 0, reason: null },
            { key: 'liveMusic', emoji: '🎸', label: 'Live Music', score: 0, friendsNow: 0, reason: null },
            { key: 'karaoke', emoji: '🎤', label: 'Karaoke', score: 0, friendsNow: 0, reason: null },
            { key: 'sportsTv', emoji: '🏈', label: 'Sports', score: 0, friendsNow: 0, reason: null },
            { key: 'danceFloor', emoji: '🕺', label: 'Dancing', score: 0, friendsNow: 0, reason: null },
            { key: 'poolTables', emoji: '🎱', label: 'Pool', score: 0, friendsNow: 0, reason: null },
            { key: 'outdoorSeating', emoji: '🌅', label: 'Outdoor', score: 0, friendsNow: 0, reason: null },
          ]).map(({ key, emoji, label, friendsNow, reason }) => (
            <button
              key={key}
              onClick={() => {
                try { localStorage.setItem('som-vibe-jump', key) } catch {}
                setActiveTab?.('map')
              }}
              className={`relative rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition-all active:scale-[0.96] ${
                friendsNow > 0
                  ? 'bg-primary-500/10 border border-primary-500/30 shadow-sm shadow-primary-500/10'
                  : reason
                    ? 'bg-black/50 border border-primary-500/20'
                    : 'bg-black/50 border border-primary-500/10'
              } hover:border-primary-500/40 hover:bg-primary-500/8`}
            >
              {friendsNow > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                  {friendsNow}
                </span>
              )}
              <span className="text-xl">{emoji}</span>
              <span className="text-[10px] font-semibold text-primary-400/70 text-center leading-tight">{label}</span>
              {reason && !friendsNow && (
                <span className="text-[7px] text-primary-500/50 text-center leading-tight truncate w-full">{reason}</span>
              )}
              {friendsNow > 0 && (
                <span className="text-[7px] text-primary-500 text-center leading-tight font-semibold">
                  {friendsNow === 1 ? '1 friend' : `${friendsNow} friends`}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <FindFriends
        isOpen={showFindFriends}
        onClose={() => setShowFindFriends(false)}
        onViewProfile={(userId) => { setShowFindFriends(false); onViewProfile?.(userId) }}
      />
    </div>
  )
}
