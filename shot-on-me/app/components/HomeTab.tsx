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
  const [liveActivity, setLiveActivity] = useState<any[]>([])

  // Use refs to track if we've already fetched to prevent duplicate fetches
  const hasFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

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
      fetchLiveActivity()
    }
  }, [token])

  const fetchLiveActivity = async () => {
    if (!token) return
    try {
      // Fetch recent friend activity: check-ins, payments, posts
      const [paymentsRes, feedRes] = await Promise.allSettled([
        axios.get(`${API_URL}/payments/history?limit=5&type=transfer`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { payments: [] } })),
        axios.get(`${API_URL}/feed?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { posts: [] } }))
      ])

      const activities: any[] = []
      const userId = user?.id || (user as any)?._id

      // Add payment activities (only from friends)
      if (paymentsRes.status === 'fulfilled') {
        const payments = paymentsRes.value.data.payments || []
        payments.forEach((payment: any) => {
          // Only show if user is sender or recipient (friend activity)
          if (payment.senderId?._id?.toString() === userId || payment.recipientId?._id?.toString() === userId) {
            activities.push({
              type: 'payment',
              sender: payment.senderId,
              recipient: payment.recipientId,
              amount: payment.amount,
              timestamp: payment.createdAt,
              id: `payment-${payment._id}`
            })
          }
        })
      }

      // Add recent posts from friends
      if (feedRes.status === 'fulfilled') {
        const posts = feedRes.value.data.posts || []
        posts.slice(0, 3).forEach((post: any) => {
          if (post.checkIn) {
            activities.push({
              type: 'checkin',
              user: post.author,
              venue: post.checkIn.venue,
              timestamp: post.createdAt,
              id: `checkin-${post._id}`
            })
          } else {
            activities.push({
              type: 'post',
              user: post.author,
              timestamp: post.createdAt,
              id: `post-${post._id}`
            })
          }
        })
      }

      // Sort by timestamp and take most recent
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setLiveActivity(activities.slice(0, 10))
    } catch (error) {
      console.error('Failed to fetch live activity:', error)
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
        axios.get(`${API_URL}/venue-activity/trending/list?limit=5&period=24h`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: { venues: [] } })),
        axios.get(`${API_URL}/location/friends`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: { friends: [] } }))
      ]).then(([activityResponse, friendsResponse]) => {
        // Process activity venues (non-critical)
        if (activityResponse.status === 'fulfilled') {
          setTrendingVenuesActivity(activityResponse.value.data.venues || [])
        } else {
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
    <div className="min-h-screen pb-20 bg-black max-w-2xl mx-auto">
      {/* Enhanced Hero Section with Search */}
      <div className="bg-gradient-to-b from-primary-500/15 via-primary-500/5 to-transparent p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-primary-500 mb-2 tracking-tight">
              Welcome back, {user?.firstName} 👋
            </h1>
            <p className="text-primary-400/80 text-sm font-light">Discover exclusive deals and connect with friends</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400/60" />
            <input
              type="text"
              placeholder="Search venues, deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
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

        {/* Enhanced Wallet Quick View */}
        <div 
          onClick={() => setActiveTab?.('wallet')}
          className="relative bg-gradient-to-br from-primary-500/20 via-primary-500/10 to-transparent border-2 border-primary-500/30 rounded-2xl p-5 cursor-pointer hover:border-primary-500/50 hover:from-primary-500/25 transition-all backdrop-blur-sm group overflow-hidden"
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-500/20 border-2 border-primary-500/40 rounded-xl p-3 shadow-lg shadow-primary-500/20">
                <Wallet className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-primary-400/70 text-xs uppercase tracking-wider font-semibold mb-1">Wallet Balance</p>
                <p className="text-3xl font-bold text-primary-500">${walletBalance.toFixed(2)}</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary-400/60 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      {/* Live Activity Feed - THE MOST ENGAGING FEATURE */}
      {liveActivity.length > 0 && !searchQuery && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-gradient-to-br from-primary-500/20 to-primary-500/10 border border-primary-500/30 rounded-lg p-1.5 animate-pulse">
                <Activity className="w-4 h-4 text-primary-500" />
              </div>
              <h2 className="text-lg font-bold text-primary-500 tracking-tight">What's Happening Now</h2>
            </div>
            <button
              onClick={() => setActiveTab?.('feed')}
              className="text-primary-400 hover:text-primary-500 text-sm flex items-center font-medium"
            >
              See All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-2">
            {liveActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                onClick={() => {
                  if (activity.type === 'checkin' && activity.venue) {
                    setActiveTab?.('map')
                  } else if (activity.user) {
                    onViewProfile?.(activity.user._id || activity.user.id)
                  }
                }}
                className="bg-black/50 border-2 border-primary-500/20 rounded-xl p-3 cursor-pointer hover:border-primary-500/40 hover:bg-black/60 transition-all backdrop-blur-sm group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                    {activity.user?.profilePicture ? (
                      <img src={activity.user.profilePicture} alt={activity.user.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                        <span className="text-primary-500 font-medium text-xs">
                          {activity.user?.firstName?.[0]}{activity.user?.lastName?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {activity.type === 'checkin' && (
                      <p className="text-sm text-primary-400">
                        <span className="font-semibold text-primary-500">{activity.user?.firstName} {activity.user?.lastName}</span>
                        {' checked in at '}
                        <span className="font-semibold text-primary-500">{activity.venue?.name || 'a venue'}</span>
                      </p>
                    )}
                    {activity.type === 'payment' && (
                      <p className="text-sm text-primary-400">
                        <span className="font-semibold text-primary-500">{activity.sender?.firstName} {activity.sender?.lastName}</span>
                        {' sent $'}
                        <span className="font-semibold text-primary-500">{activity.amount?.toFixed(2)}</span>
                        {' to '}
                        <span className="font-semibold text-primary-500">{activity.recipient?.firstName} {activity.recipient?.lastName}</span>
                      </p>
                    )}
                    {activity.type === 'post' && (
                      <p className="text-sm text-primary-400">
                        <span className="font-semibold text-primary-500">{activity.user?.firstName} {activity.user?.lastName}</span>
                        {' shared a new post'}
                      </p>
                    )}
                    <p className="text-xs text-primary-400/60 mt-0.5">
                      {getTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {activity.type === 'checkin' && <MapPin className="w-4 h-4 text-primary-500/60" />}
                    {activity.type === 'payment' && <Send className="w-4 h-4 text-primary-500/60" />}
                    {activity.type === 'post' && <Radio className="w-4 h-4 text-primary-500/60" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - Enhanced */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Send Money - Primary Action */}
          <button
            onClick={() => {
              if (onSendMoney) {
                onSendMoney()
              } else {
                setActiveTab?.('wallet')
              }
            }}
            className="group relative bg-gradient-to-br from-primary-500 to-primary-600 text-black rounded-2xl p-5 hover:from-primary-500 hover:to-primary-500 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-2">
                <Send className="w-5 h-5" />
                <h3 className="text-sm font-bold tracking-tight">Send Money</h3>
              </div>
              <p className="text-black/70 text-xs font-medium">Send to friends instantly</p>
            </div>
          </button>

          {/* Invite Friends */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleInviteFriend(e)
            }}
            className="group bg-black/50 border-2 border-primary-500/30 text-primary-500 rounded-2xl p-5 hover:bg-primary-500/10 hover:border-primary-500/50 transition-all backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center space-x-2 mb-2">
              <UserPlus className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-tight">Invite</h3>
            </div>
            <p className="text-primary-400/70 text-xs font-medium">Share with friends</p>
          </button>
        </div>
      </div>

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

      {/* Trending Venues by Activity */}
      {filteredTrending.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                <TrendingUp className="w-4 h-4 text-primary-500" />
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
            {filteredTrending.slice(0, 5).map((venue: any) => (
              <div
                key={venue._id}
                onClick={() => setActiveTab?.('map')}
                className="bg-black/50 border-2 border-primary-500/20 rounded-xl p-4 cursor-pointer hover:border-primary-500/40 hover:bg-black/60 transition-all backdrop-blur-sm group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary-500 truncate">{venue.name}</p>
                      {venue.activity ? (
                        <div className="flex items-center space-x-3 mt-1">
                          <p className="text-xs text-primary-400">
                            <span className="text-primary-500 font-semibold">{venue.activity.totalActivity || 0}</span> activity
                          </p>
                          {venue.activity.checkIns > 0 && (
                            <p className="text-xs text-primary-400/70">
                              {venue.activity.checkIns} check-in{venue.activity.checkIns !== 1 ? 's' : ''}
                            </p>
                          )}
                          {venue.activity.posts > 0 && (
                            <p className="text-xs text-primary-400/70">
                              {venue.activity.posts} post{venue.activity.posts !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-primary-400">
                          {venue.followerCount || 0} followers
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary-400/60 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Friends */}
      {nearbyFriends.length > 0 && !searchQuery && (
        <div className="px-4 mb-6">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
              <Users className="w-4 h-4 text-primary-500" />
            </div>
            <h2 className="text-lg font-bold text-primary-500 tracking-tight">Friends Nearby</h2>
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
