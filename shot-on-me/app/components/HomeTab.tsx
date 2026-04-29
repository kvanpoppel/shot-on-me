'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { 
  Wallet, 
  UserPlus, 
  Sparkles, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Gift, 
  ArrowRight,
  Bell,
  Share2,
  Users,
  Martini,
  Search,
  Zap,
  Star,
  Heart,
  Send,
  X,
  Activity,
  Radio,
  List
} from 'lucide-react'

import { useApiUrl } from '../utils/api'
import { Tab } from '@/app/types'
import InviteFriendsModal from './InviteFriendsModal'
import FindFriends from './FindFriends'
import GoogleMapComponent from './GoogleMap'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'

interface HomeTabProps {
  setActiveTab?: (tab: Tab) => void
  onSendShot?: () => void
  onViewProfile?: (userId: string) => void
  onSendMoney?: () => void
  onViewVenue?: (venueId: string) => void
  onOpenAddFunds?: () => void
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

interface AIRecommendation {
  id: string
  venue: {
    _id: string
    name: string
  }
  reason: string
  confidence: number
  source: 'friends' | 'time' | 'trending'
}

export default function HomeTab({ setActiveTab, onSendShot, onViewProfile, onSendMoney, onViewVenue, onOpenAddFunds }: HomeTabProps) {
  const { token, user } = useAuth()
  const aiEnabled = (user as any)?.notificationPreferences?.aiPersonalizationEnabled ?? true
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [walletBalance, setWalletBalance] = useState(0)
  const [quickDeals, setQuickDeals] = useState<QuickDeal[]>([])
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [trendingVenuesActivity, setTrendingVenuesActivity] = useState<any[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [liveActivity, setLiveActivity] = useState<any[]>([]) // Venue-specific events
  const [trendingFriendActivity, setTrendingFriendActivity] = useState<any[]>([]) // Aggregated friend activity
  const [featuredVenues, setFeaturedVenues] = useState<any[]>([]) // Featured/promoted venues for Spotlight
  const [activityStrip, setActivityStrip] = useState<string[]>([])
  const [showFriendsMap, setShowFriendsMap] = useState(false) // Toggle between list and map view for friends
  const [showFindFriends, setShowFindFriends] = useState(false) // Control FindFriends modal
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { isLoaded: mapsLoaded } = useGoogleMaps()

  const getVenueBadge = (venue: any) => {
    if (!venue) return null
    if (venue.isFeatured) return { label: 'Featured', className: 'bg-primary-500/20 text-primary-400 border-primary-500/40' }
    if (venue.subscriptionTier === 'enterprise') return { label: 'Enterprise', className: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
    if (venue.subscriptionTier === 'premium') return { label: 'AI Optimized', className: 'bg-primary-500/20 text-primary-400 border-primary-500/40' }
    return null
  }

  // Use refs to track if we've already fetched to prevent duplicate fetches
  const hasFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Scroll to top when HomeTab mounts or becomes visible
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    
    // Force scroll to absolute top - ensure the very top is visible
    const scrollToTop = () => {
      try {
        // Set scroll position to 0 on all scrollable elements
        if (typeof window !== 'undefined') {
          window.scrollTo(0, 0)
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        }
        
        if (typeof document !== 'undefined') {
          // Force scroll on document elements
          if (document.documentElement) {
            document.documentElement.scrollTop = 0
            document.documentElement.scrollLeft = 0
            document.documentElement.style.scrollBehavior = 'auto'
            document.documentElement.style.overflowY = 'auto'
          }
          if (document.body) {
            document.body.scrollTop = 0
            document.body.scrollLeft = 0
            document.body.style.scrollBehavior = 'auto'
            document.body.style.overflowY = 'auto'
          }
          
          // Also try scrolling the main element
          const mainElement = document.querySelector('main') as HTMLElement | null
          if (mainElement) {
            mainElement.scrollTop = 0
            mainElement.style.scrollBehavior = 'auto'
          }
          
          // Force scroll on window - check current position and force scroll if needed
          if (typeof window !== 'undefined') {
            if (typeof window.pageYOffset !== 'undefined' && window.pageYOffset > 0) {
              window.scrollTo(0, 0)
            }
            if (typeof window.scrollY !== 'undefined' && window.scrollY > 0) {
              window.scrollTo(0, 0)
            }
          }
        }
      } catch (e) {
        // Silently handle scroll errors
      }
    }
    
    // Scroll immediately and repeatedly to ensure it sticks
    scrollToTop()
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        scrollToTop()
        setTimeout(scrollToTop, 0)
        setTimeout(scrollToTop, 10)
        setTimeout(scrollToTop, 50)
        setTimeout(scrollToTop, 100)
        setTimeout(scrollToTop, 200)
        setTimeout(scrollToTop, 300)
        setTimeout(scrollToTop, 500)
      })
    }
  }, [isMounted]) // Run when component mounts

  useEffect(() => {
    const currentUserId = user?.id || (user as any)?._id || null
    const userIdChanged = userIdRef.current !== currentUserId
    
    if (token && user && (!hasFetchedRef.current || userIdChanged)) {
      hasFetchedRef.current = true
      userIdRef.current = currentUserId
      
      // Fetch immediately - no delay to speed up loading
      fetchHomeData()
    } else if (!token || !user) {
      // If no token or user, stop loading immediately
      setLoading(false)
    }
  }, [token, user?.id, (user as any)?._id])

  // Real-time wallet updates
  useEffect(() => {
    if (!socket) return

    const handleWalletUpdate = (data: { userId: string; balance: number }) => {
      if (data.userId === user?.id || data.userId === (user as any)?._id) {
        setWalletBalance(data.balance)
      }
    }

    socket.on('wallet-updated', handleWalletUpdate)

    return () => {
      socket.off('wallet-updated', handleWalletUpdate)
    }
  }, [socket, user])

  // Real-time activity feed - THE MOST ENGAGING FEATURE
  useEffect(() => {
    if (!socket || !token) return

    // Listen for friend activity
    const handleFriendCheckIn = (data: any) => {
      setLiveActivity(prev => [{
        type: 'checkin',
        user: data.user,
        venue: data.venue,
        timestamp: new Date(),
        id: `checkin-${Date.now()}`
      }, ...prev.slice(0, 9)]) // Keep last 10 items
    }

    const handlePaymentActivity = (data: any) => {
      setLiveActivity(prev => [{
        type: 'payment',
        sender: data.sender,
        recipient: data.recipient,
        amount: data.amount,
        timestamp: new Date(),
        id: `payment-${Date.now()}`
      }, ...prev.slice(0, 9)])
    }

    const handleNewPost = (data: any) => {
      setLiveActivity(prev => [{
        type: 'post',
        user: data.author,
        venue: data.venue,
        timestamp: new Date(),
        id: `post-${Date.now()}`
      }, ...prev.slice(0, 9)])
    }

    socket.on('friend-checkin', handleFriendCheckIn)
    socket.on('payment-sent', handlePaymentActivity)
    socket.on('new-post', handleNewPost)

    return () => {
      socket.off('friend-checkin', handleFriendCheckIn)
      socket.off('payment-sent', handlePaymentActivity)
      socket.off('new-post', handleNewPost)
    }
  }, [socket, token])

  // Get user location for map
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        () => {
          // Default to Indianapolis if location unavailable
          setUserLocation({ lat: 39.7684, lng: -86.1581 })
        },
        { timeout: 5000, maximumAge: 300000 }
      )
    } else {
      // Default to Indianapolis if geolocation unavailable
      setUserLocation({ lat: 39.7684, lng: -86.1581 })
    }
  }, [])

  // Fetch recent activity on load
  useEffect(() => {
    if (token) {
      fetchLiveActivity() // Venue-specific events
      fetchTrendingFriendActivity() // Friend activity aggregation
      fetchFeaturedVenues() // Featured venues for Spotlight
      fetchActivityStrip()
    }
  }, [token])

  const fetchActivityStrip = async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/feed/activity-strip`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setActivityStrip(res.data.events || [])
    } catch {}
  }

  // Fetch venue-specific events for "What's Happening Now"
  const fetchLiveActivity = async () => {
    if (!token) return
    try {
      // Fetch venue-specific ongoing events (promotions, active events)
      const [venuesRes] = await Promise.allSettled([
        axios.get(`${API_URL}/venues`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { venues: [] } }))
      ])

      const venueEvents: any[] = []
      const now = new Date()

      // Get venues with active promotions (ongoing events)
      if (venuesRes.status === 'fulfilled') {
        const venues = venuesRes.value.data.venues || []
        
        venues.forEach((venue: any) => {
          if (venue.promotions && venue.promotions.length > 0) {
            venue.promotions.forEach((promo: any) => {
              const startTime = new Date(promo.startTime)
              const endTime = new Date(promo.endTime)
              if (promo.isActive && now >= startTime && now <= endTime) {
                venueEvents.push({
                  type: 'venue-event',
                  venue: {
                    _id: venue._id,
                    name: venue.name,
                    address: venue.address,
                    subscriptionTier: venue.subscriptionTier,
                    isFeatured: venue.isFeatured
                  },
                  event: {
                    title: promo.title,
                    description: promo.description,
                    type: promo.type,
                    startTime: promo.startTime,
                    endTime: promo.endTime,
                    timeRemaining: Math.max(0, new Date(promo.endTime).getTime() - now.getTime())
                  },
                  timestamp: now,
                  id: `event-${venue._id}-${promo.title}`
                })
              }
            })
          }
        })
      }

      // Sort by time remaining (soonest ending first) and take most recent
      venueEvents.sort((a, b) => a.event.timeRemaining - b.event.timeRemaining)
      setLiveActivity(venueEvents.slice(0, 10))
    } catch (error) {
      console.error('Failed to fetch venue events:', error)
    }
  }

  // Fetch featured venues for Venue Spotlight
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

  // Fetch aggregated friend activity for "Trending Now"
  const fetchTrendingFriendActivity = async () => {
    if (!token) return
    try {
      // Fetch friend activity: check-ins, posts, location updates
      const [feedRes, friendsLocationRes] = await Promise.allSettled([
        axios.get(`${API_URL}/feed?limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { posts: [] } })),
        axios.get(`${API_URL}/location/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { friends: [] } }))
      ])

      const activities: any[] = []

      // Get friend check-ins and posts (aggregated across diverse venues)
      if (feedRes.status === 'fulfilled') {
        const posts = feedRes.value.data.posts || []
        posts.forEach((post: any) => {
          if (post.checkIn && post.checkIn.venue) {
            activities.push({
              type: 'friend-checkin',
              user: post.author,
              venue: post.checkIn.venue,
              timestamp: post.createdAt,
              id: `checkin-${post._id}`
            })
          } else if (post.location && post.location.venue) {
            activities.push({
              type: 'friend-post',
              user: post.author,
              venue: post.location.venue,
              content: post.content,
              timestamp: post.createdAt,
              id: `post-${post._id}`
            })
          } else if (post.content || post.media?.length > 0) {
            // General posts from friends
            activities.push({
              type: 'friend-activity',
              user: post.author,
              content: post.content,
              timestamp: post.createdAt,
              id: `activity-${post._id}`
            })
          }
        })
      }

      // Get real-time location updates from friends
      if (friendsLocationRes.status === 'fulfilled') {
        const friends = friendsLocationRes.value.data.friends || []
        friends.forEach((friend: any) => {
          if (friend.location && friend.currentVenue) {
            activities.push({
              type: 'friend-location',
              user: {
                _id: friend._id,
                firstName: friend.firstName,
                lastName: friend.lastName,
                profilePicture: friend.profilePicture
              },
              venue: friend.currentVenue,
              location: friend.location,
              timestamp: friend.location.updatedAt || new Date(),
              id: `location-${friend._id}`
            })
          }
        })
      }

      // Sort by timestamp and take most recent (most frequently shared activities)
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setTrendingFriendActivity(activities.slice(0, 15))
    } catch (error) {
      console.error('Failed to fetch trending friend activity:', error)
    }
  }

  // AI-powered personalized recommendations
  useEffect(() => {
    if (!aiEnabled) {
      setAiRecommendations([])
      return
    }
    if (token && user && quickDeals.length > 0) {
      generateAIRecommendations()
    }
  }, [token, user, quickDeals, nearbyFriends, aiEnabled])

  const generateAIRecommendations = async () => {
    try {
      // AI logic: Recommend deals based on:
      // 1. Time of day (happy hours in evening)
      // 2. Nearby friends' activity
      // 3. User's past venue preferences
      // 4. Trending venues with high activity
      
      const now = new Date()
      const hour = now.getHours()
      const recommendations: AIRecommendation[] = []

      // Time-based recommendations
      if (hour >= 17 && hour <= 22) {
        // Evening - prioritize happy hours
        const happyHours = quickDeals.filter(d => d.promotion.type === 'happy-hour')
        recommendations.push(
          ...happyHours.slice(0, 2).map((deal) => ({
            id: `time-${deal.venue._id}`,
            venue: {
              _id: deal.venue._id,
              name: deal.venue.name
            },
            reason: `Great timing: ${deal.promotion.title}`,
            confidence: 82,
            source: 'time' as const
          }))
        )
      }

      // Friend activity-based recommendations
      if (nearbyFriends.length > 0) {
        const friendVenues = trendingVenuesActivity.filter(v => 
          nearbyFriends.some(f => f.currentVenue === v._id)
        )
        recommendations.push(
          ...friendVenues.slice(0, 2).map((venue: any) => {
            const friendsAtVenue = nearbyFriends.filter(f => f.currentVenue === venue._id).length
            return {
              id: `friends-${venue._id}`,
              venue: {
                _id: venue._id,
                name: venue.name
              },
              reason: `${friendsAtVenue} friend${friendsAtVenue !== 1 ? 's' : ''} active here now`,
              confidence: Math.min(98, 75 + friendsAtVenue * 8),
              source: 'friends' as const
            }
          })
        )
      }

      // Trending venues with high activity
      const trending = trendingVenuesActivity
        .filter(v => v.activity && v.activity.totalActivity > 5)
        .slice(0, 2)
      recommendations.push(
        ...trending.map((venue: any) => ({
          id: `trending-${venue._id}`,
          venue: {
            _id: venue._id,
            name: venue.name
          },
          reason: `${venue.activity?.totalActivity || 0} actions in the last 24h`,
          confidence: 70,
          source: 'trending' as const
        }))
      )

      // Remove duplicates by venue, prioritize confidence, and limit to top 3
      const byVenue = new Map<string, AIRecommendation>()
      recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .forEach((rec) => {
          if (!byVenue.has(rec.venue._id)) byVenue.set(rec.venue._id, rec)
        })
      setAiRecommendations(Array.from(byVenue.values()).slice(0, 3))
    } catch (error) {
      console.error('Error generating AI recommendations:', error)
    }
  }

  const fetchHomeData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
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
      console.log('HomeTab: Finished loading, loading state:', false)
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

    // Refresh deals every 30 seconds to catch promotions that just became active
    const interval = setInterval(() => {
      fetchHomeData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [token, fetchHomeData])

  const [showInviteModal, setShowInviteModal] = useState(false)

  const handleInviteFriend = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!user?.id && !(user as any)?._id) {
      alert('Please wait for your account to load, then try again.')
      return
    }
    
    // Open invite modal for better UX
    setShowInviteModal(true)
  }

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

  const getTimeAgo = (timestamp: string | Date) => {
    // CRITICAL: Always return empty string during SSR to prevent hydration mismatch
    if (typeof window === 'undefined' || !isMounted) return ''
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now.getTime() - time.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    // Use safe date formatting
    try {
      return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  // Filter venues based on search
  const filteredDeals = searchQuery
    ? quickDeals.filter(deal => 
        deal.venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.promotion.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quickDeals

  const filteredTrending = searchQuery
    ? (trendingVenuesActivity.length > 0 ? trendingVenuesActivity : trendingVenues).filter((venue: any) =>
        venue.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (trendingVenuesActivity.length > 0 ? trendingVenuesActivity : trendingVenues)

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
  if (filteredDeals.length > 0) {
    const grouped = new Map<string, QuickDeal[]>()
    filteredDeals.forEach(deal => {
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

      {/* 1. Wallet Hero */}
      <div className="px-4 pt-2 mb-5">
        {walletBalance === 0 ? (
          <div className="bg-gradient-to-br from-primary-500/10 via-black/60 to-black/80 border border-primary-500/25 rounded-2xl p-5 shadow-lg shadow-primary-500/10">
            <p className="text-primary-400/70 text-sm mb-0.5">Hey {(user as any)?.name?.split(' ')[0] || 'there'} 👋</p>
            <p className="text-white font-semibold text-base mb-1">Ready to send your first shot?</p>
            <p className="text-primary-400/60 text-xs mb-4">Add money to your wallet to buy drinks for friends at the bar.</p>
            <button
              onClick={() => { if (onOpenAddFunds) onOpenAddFunds(); else setActiveTab?.('wallet') }}
              className="w-full bg-primary-500 text-black font-bold py-3 rounded-xl text-sm tracking-wide hover:bg-primary-400 transition-all active:scale-[0.98]"
            >
              + Add Money to Get Started
            </button>
            <p className="text-center text-primary-400/40 text-xs mt-3">You can also receive shots — no balance needed</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary-500/10 via-black/60 to-black/80 border border-primary-500/25 rounded-2xl p-5 shadow-lg shadow-primary-500/10">
            <p className="text-primary-400/70 text-sm mb-0.5">Hey {(user as any)?.name?.split(' ')[0] || 'there'} 👋</p>
            <p className="text-primary-400/60 text-xs">Wallet balance</p>
            <p className="text-4xl font-bold text-white mt-1 mb-4">${walletBalance.toFixed(2)}</p>
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onSendMoney) onSendMoney(); else setActiveTab?.('wallet') }}
                className="flex-1 bg-primary-500 text-black font-bold py-3 rounded-xl text-sm tracking-wide hover:bg-primary-400 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Send a Shot
              </button>
              <button
                onClick={() => { if (onOpenAddFunds) onOpenAddFunds(); else setActiveTab?.('wallet') }}
                className="flex-1 border border-primary-500/40 text-primary-500 font-semibold py-3 rounded-xl text-sm hover:border-primary-500/60 hover:bg-primary-500/5 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                Add Money
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Invite Friends */}
      <div className="px-4 mb-6">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInviteModal(true) }}
          className="group relative w-full bg-black/50 border-2 border-primary-500/30 text-primary-500 rounded-2xl p-4 hover:border-primary-500/50 hover:bg-black/70 transition-all hover:scale-[1.01] active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary-500/5 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-sm font-bold tracking-tight">Invite Friends</h3>
          </div>
        </button>
      </div>

      {/* 3. Happening Now — deals + venues, one unified section */}
      {venueItems.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-primary-500">Happening Now</h2>
            <button onClick={() => setActiveTab?.('map')} className="text-primary-400 hover:text-primary-500 text-sm flex items-center gap-1 font-medium">
              See All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2.5">
            {venueItems.map((item, idx) => {
              if (item.type === 'venue-deals') {
                const { venueId, venueName, deals } = item
                // Sort deals: soonest-ending first
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
        </div>
      )}

      {/* 4. Friends out tonight */}
      {nearbyFriends.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-primary-500">Friends Out Tonight</h2>
            <button onClick={() => setActiveTab?.('happening')} className="text-primary-400 hover:text-primary-500 text-sm flex items-center gap-1 font-medium">
              See All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {nearbyFriends.map((friend) => (
              <div
                key={friend._id || friend.id}
                onClick={() => onViewProfile?.(friend._id || friend.id)}
                className="bg-black/50 border border-primary-500/20 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-primary-500/40 hover:bg-black/60 transition-all active:scale-[0.98]"
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
                  {friend.distance && (
                    <p className="text-xs text-primary-400/60">
                      {typeof friend.distance === 'number'
                        ? friend.distance < 0.1 ? `${Math.round(friend.distance * 5280)}ft away` : `${friend.distance.toFixed(1)}mi away`
                        : String(friend.distance).replace('miles', 'mi')}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-primary-400/50 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. New user fallback — only when no deals and no friends */}
      {quickDeals.length === 0 && nearbyFriends.length === 0 && (
        <div className="px-4 space-y-4 pb-2">
          <div>
            <p className="text-primary-400/50 text-[10px] font-bold uppercase tracking-widest mb-3">How it works</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { Icon: Wallet, label: 'Add Money',  sub: 'Fund your wallet once'    },
                { Icon: MapPin, label: 'Hit the Bar', sub: 'Find a tap & pay venue'   },
                { Icon: Send,   label: 'Send a Shot', sub: 'Buy a drink for a friend' },
              ] as const).map(({ Icon, label, sub }) => (
                <div key={label} className="bg-black/50 border border-primary-500/20 rounded-xl p-3 text-center">
                  <div className="w-8 h-8 bg-primary-500/15 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-4 h-4 text-primary-500" />
                  </div>
                  <p className="text-primary-500 font-bold text-xs leading-tight">{label}</p>
                  <p className="text-primary-400/50 text-[10px] mt-0.5 leading-tight">{sub}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary-500/10 via-black/60 to-black/80 border border-primary-500/25 rounded-2xl p-5">
            <p className="text-white font-bold text-base mb-1">Your crew is out there tonight</p>
            <p className="text-primary-400/60 text-sm mb-4">Find friends on Shot On Me and see where they're headed. Never miss a round.</p>
            <button
              onClick={() => setShowFindFriends(true)}
              className="w-full border border-primary-500/40 text-primary-500 font-semibold py-3 rounded-xl text-sm hover:border-primary-500/60 hover:bg-primary-500/5 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              Find Your Friends
            </button>
          </div>
          <div className="relative bg-gradient-to-br from-primary-500/15 via-black/70 to-black/90 border border-primary-500/30 rounded-2xl p-5 overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
            <p className="text-white font-bold text-base mb-1 relative z-10">Be the one who buys the round</p>
            <p className="text-primary-400/60 text-sm mb-4 relative z-10">Invite friends — the more people on Shot On Me, the more shots fly.</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full bg-primary-500 text-black font-bold py-3 rounded-xl text-sm hover:bg-primary-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 relative z-10"
            >
              <UserPlus className="w-4 h-4" />
              Invite Friends Now
            </button>
          </div>
          <div className="bg-black/40 border border-primary-500/15 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-primary-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Find venues near you</p>
                <p className="text-primary-400/50 text-xs">Deals go live the moment you arrive</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab?.('map')}
              className="w-full border border-primary-500/25 text-primary-400 font-medium py-2.5 rounded-xl text-sm hover:border-primary-500/50 hover:text-primary-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Explore the Map
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteFriendsModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
      <FindFriends
        isOpen={showFindFriends}
        onClose={() => setShowFindFriends(false)}
        onViewProfile={(userId) => { setShowFindFriends(false); onViewProfile?.(userId) }}
      />
    </div>
  )
}
