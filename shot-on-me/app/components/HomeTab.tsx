'use client'

import { useState, useEffect } from 'react'
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
  Martini
} from 'lucide-react'

import { useApiUrl } from '../utils/api'
import { Tab } from '../types'

interface HomeTabProps {
  setActiveTab?: (tab: Tab) => void
  onSendShot?: () => void
  onViewProfile?: (userId: string) => void
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

export default function HomeTab({ setActiveTab, onSendShot, onViewProfile }: HomeTabProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [walletBalance, setWalletBalance] = useState(0)
  const [quickDeals, setQuickDeals] = useState<QuickDeal[]>([])
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [trendingVenuesActivity, setTrendingVenuesActivity] = useState<any[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && user) {
      fetchHomeData()
    }
  }, [token, user])

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

  const fetchHomeData = async () => {
    if (!token) return
    setLoading(true)

    try {
      // Fetch wallet balance
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const userData = userResponse.data.user
      setWalletBalance(userData.wallet?.balance || 0)

      // Fetch venues with active promotions (quick deals)
      const venuesResponse = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venues = venuesResponse.data.venues || []

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

      // Get trending venues (by follower count) - fallback
      const trending = venues
        .filter((v: any) => v.followerCount > 0)
        .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
        .slice(0, 3)
      setTrendingVenues(trending)

      // Fetch trending venues by activity
      try {
        const activityResponse = await axios.get(`${API_URL}/venue-activity/trending/list?limit=5&period=24h`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setTrendingVenuesActivity(activityResponse.data.venues || [])
      } catch (error) {
        console.error('Failed to fetch trending venues by activity:', error)
        // Fallback to regular trending venues
        setTrendingVenuesActivity(trending)
      }

      // Get nearby friends
      try {
        const friendsResponse = await axios.get(`${API_URL}/location/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setNearbyFriends(friendsResponse.data.friends?.slice(0, 3) || [])
      } catch (error) {
        console.error('Failed to fetch nearby friends:', error)
      }

    } catch (error) {
      console.error('Failed to fetch home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteFriend = () => {
    const inviteLink = `${window.location.origin}?ref=${user?.id}`
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Shot On Me!',
        text: 'Send drinks to friends at any bar or coffee shop. Join me!',
        url: inviteLink
      }).catch(() => {
        navigator.clipboard.writeText(inviteLink)
        alert('Invite link copied! Share it with your friends!')
      })
    } else {
      navigator.clipboard.writeText(inviteLink)
      alert('Invite link copied! Share it with your friends!')
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 bg-black max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary-500/10 via-transparent to-transparent border-b border-primary-500/10 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-primary-500 mb-1.5 tracking-tight">
              Welcome back, {user?.firstName}
            </h1>
            <p className="text-primary-400/80 text-sm font-light">Discover exclusive deals and connect with friends</p>
          </div>
        </div>

        {/* Wallet Quick View */}
        <div 
          onClick={() => setActiveTab?.('wallet')}
          className="bg-black/40 border border-primary-500/20 rounded-lg p-4 cursor-pointer hover:border-primary-500/30 hover:bg-black/50 transition-all backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-2.5">
                <Wallet className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="text-primary-400/70 text-xs uppercase tracking-wider font-medium mb-0.5">Wallet Balance</p>
                <p className="text-xl font-semibold text-primary-500">${walletBalance.toFixed(2)}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary-400/60" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-4">
        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Send Shot - Quick Action */}
          <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                <Martini className="w-4 h-4 text-primary-500" />
              </div>
              <h3 className="text-sm font-semibold text-primary-500 tracking-tight">Send Shot</h3>
            </div>
            <p className="text-primary-400/70 text-xs mb-3 font-light">Buy someone a drink</p>
            <button
              onClick={() => setActiveTab?.('wallet')}
              className="w-full bg-primary-500 text-black py-2 rounded-lg font-medium hover:bg-primary-600 transition-all text-xs"
            >
              Send Now
            </button>
          </div>

          {/* Invite Friends */}
          <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                <UserPlus className="w-4 h-4 text-primary-500" />
              </div>
              <h3 className="text-sm font-semibold text-primary-500 tracking-tight">Invite</h3>
            </div>
            <p className="text-primary-400/70 text-xs mb-3 font-light">Share with friends</p>
            <button
              onClick={handleInviteFriend}
              className="w-full bg-primary-500/10 border border-primary-500/20 text-primary-500 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all text-xs"
            >
              <Share2 className="w-3.5 h-3.5 inline mr-1.5" />
              Invite
            </button>
          </div>
        </div>

        {/* Quick Deals / Pop-up Happy Hours */}
        {quickDeals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                  <Gift className="w-4 h-4 text-primary-500" />
                </div>
                <h2 className="text-lg font-semibold text-primary-500 tracking-tight">Live Deals</h2>
              </div>
              <button
                onClick={() => setActiveTab?.('map')}
                className="text-primary-400 hover:text-primary-500 text-sm flex items-center"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-3">
              {quickDeals.map((deal, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTab?.('map')}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-4 cursor-pointer hover:border-primary-500/30 hover:bg-black/50 transition-all backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <h3 className="font-bold text-primary-500">{deal.venue.name}</h3>
                      </div>
                      <p className="text-primary-400 text-sm font-semibold mb-1">
                        {deal.promotion.title}
                      </p>
                      {deal.promotion.description && (
                        <p className="text-primary-300 text-xs mb-2">
                          {deal.promotion.description}
                        </p>
                      )}
                    </div>
                    {deal.promotion.type === 'happy-hour' && (
                      <span className="bg-primary-500/10 border border-primary-500/20 text-primary-500 px-2 py-1 rounded text-xs font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        NOW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-primary-400">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeRemaining(deal.promotion.endTime)}</span>
                    </div>
                    <button className="text-primary-500 hover:text-primary-400 text-xs font-semibold flex items-center">
                      View
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Venues by Activity */}
        {(trendingVenuesActivity.length > 0 || trendingVenues.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                </div>
                <h2 className="text-lg font-semibold text-primary-500 tracking-tight">🔥 Trending Now</h2>
              </div>
              <button
                onClick={() => setActiveTab?.('map')}
                className="text-primary-400 hover:text-primary-500 text-sm flex items-center"
              >
                See All
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {(trendingVenuesActivity.length > 0 ? trendingVenuesActivity : trendingVenues).slice(0, 5).map((venue: any) => (
                <div
                  key={venue._id}
                  onClick={() => setActiveTab?.('map')}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-3 cursor-pointer hover:border-primary-500/30 hover:bg-black/50 transition-all backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary-500 truncate">{venue.name}</p>
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
                    <ArrowRight className="w-4 h-4 text-primary-400 flex-shrink-0 ml-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Friends */}
        {nearbyFriends.length > 0 && (
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                <Users className="w-4 h-4 text-primary-500" />
              </div>
              <h2 className="text-lg font-semibold text-primary-500 tracking-tight">Friends Nearby</h2>
            </div>
            <div className="space-y-2">
              {nearbyFriends.map((friend) => (
                <div
                  key={friend._id || friend.id}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-3 flex items-center justify-between backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-all"
                  onClick={() => onViewProfile?.(friend._id || friend.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 border-2 border-primary-500/30 rounded-full overflow-hidden">
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                          <span className="text-primary-500 font-medium">
                            {friend.firstName?.[0]}{friend.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-primary-500 tracking-tight">
                        {friend.firstName} {friend.lastName}
                      </p>
                      {friend.distance && (
                        <p className="text-xs text-primary-400/70 font-light">{friend.distance} km away</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Quick Deals */}
        {quickDeals.length === 0 && (
          <div className="text-center py-12 border border-primary-500/10 rounded-lg bg-black/20">
            <Gift className="w-10 h-10 text-primary-500/40 mx-auto mb-3" />
            <p className="text-primary-400/80 mb-2 font-light">No active deals right now</p>
            <p className="text-primary-500/60 text-sm mb-4 font-light">Check back soon for special offers</p>
            <button
              onClick={() => setActiveTab?.('map')}
              className="bg-primary-500 text-black px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all"
            >
              Browse Venues
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

