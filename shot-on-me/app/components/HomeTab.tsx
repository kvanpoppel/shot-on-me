'use client'

import { useState, useEffect, useRef } from 'react'
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
  Radio
} from 'lucide-react'

import { useApiUrl } from '../utils/api'
import { Tab } from '@/app/types'
import InviteFriendsModal from './InviteFriendsModal'

interface HomeTabProps {
  setActiveTab?: (tab: Tab) => void
  onSendShot?: () => void
  onViewProfile?: (userId: string) => void
  onSendMoney?: () => void
}

interface QuickDeal {
  venue: {
    _id: string
    name: string
    address?: any
  }
  promotion: {
    title: string
    description?: string
    type: string
    endTime: string
  }
  distance?: string
}

export default function HomeTab({ setActiveTab, onSendShot, onViewProfile, onSendMoney }: HomeTabProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [walletBalance, setWalletBalance] = useState(0)
  const [quickDeals, setQuickDeals] = useState<QuickDeal[]>([])
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [trendingVenuesActivity, setTrendingVenuesActivity] = useState<any[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [liveActivity, setLiveActivity] = useState<any[]>([]) // Venue-specific events
  const [trendingFriendActivity, setTrendingFriendActivity] = useState<any[]>([]) // Aggregated friend activity
  const [featuredVenues, setFeaturedVenues] = useState<any[]>([]) // Featured/promoted venues for Spotlight

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
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      requestAnimationFrame(() => {
      scrollToTop()
      setTimeout(scrollToTop, 0)
      setTimeout(scrollToTop, 10)
      setTimeout(scrollToTop, 50)
      setTimeout(scrollToTop, 100)
      setTimeout(scrollToTop, 200)
      setTimeout(scrollToTop, 300)
      setTimeout(scrollToTop, 500)
    })
  }, []) // Empty dependency array - only run on mount

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

  // Fetch recent activity on load
  useEffect(() => {
    if (token) {
      fetchLiveActivity() // Venue-specific events
      fetchTrendingFriendActivity() // Friend activity aggregation
      fetchFeaturedVenues() // Featured venues for Spotlight
    }
  }, [token])

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
                  venue: { _id: venue._id, name: venue.name, address: venue.address },
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
      setFeaturedVenues(response.data.venues || [])
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
    if (token && user && quickDeals.length > 0) {
      generateAIRecommendations()
    }
  }, [token, user, quickDeals, nearbyFriends])

  const generateAIRecommendations = async () => {
    try {
      // AI logic: Recommend deals based on:
      // 1. Time of day (happy hours in evening)
      // 2. Nearby friends' activity
      // 3. User's past venue preferences
      // 4. Trending venues with high activity
      
      const now = new Date()
      const hour = now.getHours()
      const recommendations: any[] = []

      // Time-based recommendations
      if (hour >= 17 && hour <= 22) {
        // Evening - prioritize happy hours
        const happyHours = quickDeals.filter(d => d.promotion.type === 'happy-hour')
        recommendations.push(...happyHours.slice(0, 2))
      }

      // Friend activity-based recommendations
      if (nearbyFriends.length > 0) {
        const friendVenues = trendingVenuesActivity.filter(v => 
          nearbyFriends.some(f => f.currentVenue === v._id)
        )
        recommendations.push(...friendVenues.slice(0, 2))
      }

      // Trending venues with high activity
      const trending = trendingVenuesActivity
        .filter(v => v.activity && v.activity.totalActivity > 5)
        .slice(0, 2)
      recommendations.push(...trending)

      // Remove duplicates and limit to 3
      const unique = Array.from(new Map(recommendations.map(r => [r._id || r.venue?._id, r])).values())
      setAiRecommendations(unique.slice(0, 3))
    } catch (error) {
      console.error('Error generating AI recommendations:', error)
    }
  }

  const fetchHomeData = async () => {
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
      const deals: QuickDeal[] = []

      venues.forEach((venue: any) => {
        if (venue.promotions && venue.promotions.length > 0) {
          venue.promotions.forEach((promo: any) => {
            const startTime = new Date(promo.startTime)
            const endTime = new Date(promo.endTime)
            
            // Check if promotion is currently active
            if (promo.isActive && now >= startTime && now <= endTime) {
              deals.push({
                venue: {
                  _id: venue._id,
                  name: venue.name,
                  address: venue.address
                },
                promotion: {
                  title: promo.title,
                  description: promo.description,
                  type: promo.type,
                  endTime: promo.endTime
                }
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
  }

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
    return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  // Show loading only for initial load, not if data fetch fails
  if (loading && hasFetchedRef.current === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 bg-black max-w-2xl mx-auto overflow-visible">
      {/* Enhanced Hero Section - Extends behind header */}
      <div className="bg-gradient-to-b from-primary-500/15 via-primary-500/5 to-transparent p-6 pb-8 pt-24 -mt-16">
        {/* Centered "Shot on me" title */}
        <div className="text-center mb-6">
          <h1 className="text-5xl md:text-6xl logo-script text-primary-500 mb-3 tracking-wide drop-shadow-lg">
            Shot on me
          </h1>
          <p className="text-primary-400/80 text-sm font-light">Discover exclusive deals and connect with friends</p>
        </div>
      </div>

      {/* Search Modal - Shown when search icon is clicked */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 pt-20">
          <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-2xl w-full backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-primary-500">Search</h2>
              <button
                onClick={() => {
                  setShowSearchModal(false)
                  setSearchQuery('')
                }}
                className="text-primary-400 hover:text-primary-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400/60" />
              <input
                type="text"
                placeholder="Search venues, deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                autoFocus
                className="w-full pl-12 pr-4 py-3.5 bg-black/60 border border-primary-500/20 rounded-xl text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all backdrop-blur-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setShowSearch(false)
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-primary-400/60 hover:text-primary-500"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions - Enhanced - Moved Above "What's Happening Now" */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Send Money - Primary Action */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onSendMoney) {
                onSendMoney()
              } else {
                setActiveTab?.('wallet')
              }
            }}
            className="group relative bg-gradient-to-br from-primary-500 to-primary-600 text-black rounded-2xl p-5 hover:from-primary-500 hover:to-primary-500 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] overflow-hidden pointer-events-auto z-10"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex items-center justify-center space-x-2">
              <Send className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-tight">Send Money</h3>
            </div>
          </button>

          {/* Find Friends on Map - Quick Access */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab?.('map')
            }}
            className="group relative bg-black/50 border-2 border-primary-500/30 text-primary-500 rounded-2xl p-5 hover:border-primary-500/50 hover:bg-black/70 transition-all shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] overflow-hidden pointer-events-auto z-10"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex items-center justify-center space-x-2">
              <MapPin className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-tight">Find Friends</h3>
            </div>
          </button>
        </div>
        
        {/* Invite Friends - Secondary Action */}
        <div className="mt-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleInviteFriend(e)
            }}
            className="w-full group bg-black/50 border-2 border-primary-500/30 text-primary-500 rounded-2xl p-4 hover:bg-primary-500/10 hover:border-primary-500/50 transition-all backdrop-blur-sm hover:scale-[1.01] active:scale-[0.99] pointer-events-auto z-10"
          >
            <div className="flex items-center justify-center space-x-2">
              <UserPlus className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-tight">Invite</h3>
            </div>
          </button>
        </div>
      </div>

      {/* What's Happening Now - Venue Promotions & Deals */}
      {liveActivity.length > 0 && !searchQuery && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-gradient-to-br from-primary-500/20 to-primary-500/10 border border-primary-500/30 rounded-lg p-1.5">
                <Gift className="w-4 h-4 text-primary-500" />
              </div>
              <h2 className="text-lg font-bold text-primary-500 tracking-tight">What's Happening Now</h2>
            </div>
            <button
              onClick={() => setActiveTab?.('map')}
              className="text-primary-400 hover:text-primary-500 text-sm flex items-center font-medium"
            >
              See All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {liveActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                onClick={() => {
                  if (activity.venue) {
                    setActiveTab?.('map')
                    // Track view analytics for promotion
                    if (activity.event && activity.venue?._id) {
                      axios.post(`${API_URL}/venues/${activity.venue._id}/promotions/track`, {
                        promotionTitle: activity.event.title,
                        type: 'view'
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      }).catch(() => {})
                    }
                  }
                }}
                className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border-2 border-primary-500/30 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 hover:from-primary-500/15 transition-all backdrop-blur-sm group shadow-lg shadow-primary-500/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1.5">
                      <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <p className="text-sm font-bold text-primary-500">{activity.venue?.name}</p>
                      <span className="text-[10px] text-primary-400/60 bg-primary-500/10 px-1.5 py-0.5 rounded">Promoted</span>
                    </div>
                    {activity.type === 'venue-event' && (
                      <>
                        <p className="text-base font-bold text-primary-400 mb-1">{activity.event?.title}</p>
                        {activity.event?.description && (
                          <p className="text-xs text-primary-400/80 mb-2 line-clamp-2">{activity.event.description}</p>
                        )}
                        {activity.event?.type && (
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded mb-2 ${
                            activity.event.type === 'happy-hour' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            activity.event.type === 'flash-deal' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          }`}>
                            {activity.event.type === 'happy-hour' ? '🍺 Happy Hour' :
                             activity.event.type === 'flash-deal' ? '⚡ Flash Deal' :
                             activity.event.type === 'special' ? '⭐ Special' :
                             activity.event.type}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <div className="w-12 h-12 border-2 border-primary-500/40 rounded-lg flex items-center justify-center bg-primary-500/10">
                      <Gift className="w-6 h-6 text-primary-500" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary-500/20">
                  <div className="flex items-center space-x-2 text-xs text-primary-400/70">
                    <Clock className="w-3 h-3" />
                    <span>
                      {activity.event?.timeRemaining > 0 
                        ? `${Math.floor(activity.event.timeRemaining / 60000)} min remaining`
                        : 'Ending soon'}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTab?.('map')
                      // Track click analytics
                      if (activity.event && activity.venue?._id) {
                        axios.post(`${API_URL}/venues/${activity.venue._id}/promotions/track`, {
                          promotionTitle: activity.event.title,
                          type: 'click'
                        }, {
                          headers: { Authorization: `Bearer ${token}` }
                        }).catch(() => {})
                      }
                    }}
                    className="bg-primary-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-600 transition-all flex items-center"
                  >
                    Claim Deal
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* AI-Powered Recommendations */}
      {aiRecommendations.length > 0 && !searchQuery && (
        <div className="px-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="bg-gradient-to-br from-primary-500/20 to-primary-500/10 border border-primary-500/30 rounded-lg p-1.5">
              <Zap className="w-4 h-4 text-primary-500" />
            </div>
            <h2 className="text-lg font-bold text-primary-500 tracking-tight">For You</h2>
            <span className="text-xs text-primary-400/60 bg-primary-500/10 px-2 py-0.5 rounded-full">AI</span>
          </div>
          <div className="space-y-3">
            {aiRecommendations.map((rec, idx) => {
              const venue = rec.venue || rec
              return (
                <div
                  key={venue._id || idx}
                  onClick={() => setActiveTab?.('map')}
                  className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border-2 border-primary-500/20 rounded-xl p-4 cursor-pointer hover:border-primary-500/40 hover:from-primary-500/15 transition-all backdrop-blur-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <Star className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-primary-500 truncate">{venue.name}</p>
                        <p className="text-xs text-primary-400/70 mt-0.5">Recommended for you</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary-400/60 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Deals / Pop-up Happy Hours */}
      {filteredDeals.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                <Gift className="w-4 h-4 text-primary-500" />
              </div>
              <h2 className="text-lg font-bold text-primary-500 tracking-tight">Live Deals</h2>
            </div>
            <button
              onClick={() => setActiveTab?.('map')}
              className="text-primary-400 hover:text-primary-500 text-sm flex items-center font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {filteredDeals.map((deal, idx) => (
              <div
                key={idx}
                onClick={() => setActiveTab?.('map')}
                className="bg-black/50 border-2 border-primary-500/20 rounded-xl p-4 cursor-pointer hover:border-primary-500/40 hover:bg-black/60 transition-all backdrop-blur-sm group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <h3 className="font-bold text-primary-500">{deal.venue.name}</h3>
                    </div>
                    <p className="text-primary-400 text-sm font-semibold mb-1">
                      {deal.promotion.title}
                    </p>
                    {deal.promotion.description && (
                      <p className="text-primary-300/80 text-xs mb-2">
                        {deal.promotion.description}
                      </p>
                    )}
                  </div>
                    {deal.promotion.type === 'happy-hour' && (
                      <span className="bg-primary-500/20 border border-primary-500/40 text-primary-500 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center flex-shrink-0">
                        <Clock className="w-3 h-3 mr-1" />
                        NOW
                      </span>
                    )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary-500/10">
                  <div className="flex items-center space-x-2 text-xs text-primary-400">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeRemaining(deal.promotion.endTime)}</span>
                  </div>
                  <button className="text-primary-500 hover:text-primary-400 text-xs font-semibold flex items-center">
                    View
                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Now - Friend Activity & Social Discovery */}
      {filteredTrending.length > 0 && !searchQuery && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                <Users className="w-4 h-4 text-primary-500" />
              </div>
              <h2 className="text-lg font-bold text-primary-500 tracking-tight">🔥 Trending Now</h2>
            </div>
            <button
              onClick={() => setActiveTab?.('map')}
              className="text-primary-400 hover:text-primary-500 text-sm flex items-center font-medium"
            >
              See All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {filteredTrending
              .filter((venue: any) => venue.activity && venue.activity.friendCount > 0) // Only show venues with friend activity
              .slice(0, 5)
              .map((venue: any) => (
              <div
                key={venue._id}
                onClick={() => setActiveTab?.('map')}
                className="bg-black/50 border-2 border-primary-500/20 rounded-xl p-4 cursor-pointer hover:border-primary-500/40 hover:bg-black/60 transition-all backdrop-blur-sm group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="relative">
                      <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      {venue.activity?.friendCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full border-2 border-black flex items-center justify-center">
                          <span className="text-[8px] font-bold text-black">{venue.activity.friendCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary-500 truncate">{venue.name}</p>
                      {venue.activity && (
                        <div className="flex items-center space-x-3 mt-1.5 flex-wrap gap-2">
                          {venue.activity.friendCount > 0 && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3 text-primary-500" />
                              <p className="text-xs text-primary-400">
                                <span className="text-primary-500 font-bold">{venue.activity.friendCount}</span>
                                <span className="text-primary-400/70"> friend{venue.activity.friendCount !== 1 ? 's' : ''} here now</span>
                              </p>
                            </div>
                          )}
                          {venue.activity.checkIns > 0 && (
                            <p className="text-xs text-primary-400/70">
                              <span className="text-primary-500 font-semibold">{venue.activity.checkIns}</span> check-in{venue.activity.checkIns !== 1 ? 's' : ''}
                            </p>
                          )}
                          {venue.activity.posts > 0 && (
                            <p className="text-xs text-primary-400/70">
                              <span className="text-primary-500 font-semibold">{venue.activity.posts}</span> post{venue.activity.posts !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center">
                    Join
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What's Happening - Nearby Friends */}
      {nearbyFriends.length > 0 && !searchQuery && (
        <div className="px-4 mb-6">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
              <Users className="w-4 h-4 text-primary-500" />
            </div>
            <h2 className="text-lg font-bold text-primary-500 tracking-tight">What's Happening</h2>
          </div>
          <div className="space-y-2">
            {nearbyFriends.map((friend) => (
              <div
                key={friend._id || friend.id}
                className="bg-black/50 border-2 border-primary-500/20 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm cursor-pointer hover:bg-black/60 hover:border-primary-500/40 transition-all group"
                onClick={() => onViewProfile?.(friend._id || friend.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                    {friend.profilePicture ? (
                      <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                        <span className="text-primary-500 font-medium text-sm">
                          {friend.firstName?.[0]}{friend.lastName?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-primary-500 tracking-tight">
                      {friend.firstName} {friend.lastName}
                    </p>
                    {friend.distance && (
                      <p className="text-xs text-primary-400/70 font-light">{friend.distance} km away</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-400/60 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Quick Deals */}
      {quickDeals.length === 0 && !searchQuery && (
        <div className="px-4">
          <div className="text-center py-16 border-2 border-primary-500/10 rounded-2xl bg-black/30 backdrop-blur-sm">
            <Gift className="w-12 h-12 text-primary-500/40 mx-auto mb-4" />
            <p className="text-primary-400/80 mb-2 font-light text-lg">No active deals right now</p>
            <p className="text-primary-500/60 text-sm mb-6 font-light">Check back soon for special offers</p>
            <button
              onClick={() => setActiveTab?.('map')}
              className="bg-primary-500 text-black px-8 py-3 rounded-xl font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25"
            >
              Browse Venues
            </button>
          </div>
        </div>
      )}

      {/* Search Results Empty State */}
      {searchQuery && filteredDeals.length === 0 && filteredTrending.length === 0 && (
        <div className="px-4">
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-primary-500/40 mx-auto mb-4" />
            <p className="text-primary-400/80 mb-2 font-light text-lg">No results found</p>
            <p className="text-primary-500/60 text-sm font-light">Try a different search term</p>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  )
}
