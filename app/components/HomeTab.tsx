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

type Tab = 'feed' | 'map' | 'wallet' | 'profile'

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
    offer?: string
    type: string
    endTime: string
    flashDealEndsAt?: string
    isFlashDeal?: boolean
  }
  distance?: string
}

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  'happy-hour':  { label: 'Happy Hour',   color: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  'flash-deal':  { label: 'Flash Deal',   color: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
  'special':     { label: 'Special',      color: 'bg-primary-500/10 border-primary-500/20 text-primary-500' },
  'exclusive':   { label: 'VIP',          color: 'bg-purple-500/20 border-purple-500/30 text-purple-400' },
  'event':       { label: 'Event',        color: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  // legacy underscore fallbacks
  'happy_hour':  { label: 'Happy Hour',   color: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  'flash_deal':  { label: 'Flash Deal',   color: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
}

export default function HomeTab({ setActiveTab, onSendShot, onViewProfile }: HomeTabProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [walletBalance, setWalletBalance] = useState(0)
  const [quickDeals, setQuickDeals] = useState<QuickDeal[]>([])
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && user) {
      fetchHomeData()
    }
  }, [token, user])

  // Real-time wallet + promotion updates
  useEffect(() => {
    if (!socket) return

    const handleWalletUpdate = (data: { userId: string; balance: number }) => {
      if (data.userId === user?.id || data.userId === (user as any)?._id) {
        setWalletBalance(data.balance)
      }
    }

    // Refresh deals list whenever promotions change from venue portal
    const handlePromotionChange = () => {
      if (token && user) fetchHomeData()
    }

    socket.on('wallet-updated', handleWalletUpdate)
    socket.on('promotion-updated', handlePromotionChange)
    socket.on('new-promotion', handlePromotionChange)
    socket.on('promotion-deleted', handlePromotionChange)

    return () => {
      socket.off('wallet-updated', handleWalletUpdate)
      socket.off('promotion-updated', handlePromotionChange)
      socket.off('new-promotion', handlePromotionChange)
      socket.off('promotion-deleted', handlePromotionChange)
    }
  }, [socket, user, token])

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
            // Flash deals use flashDealEndsAt; regular promos use endTime
            const expiryTime = (promo.isFlashDeal && promo.flashDealEndsAt)
              ? new Date(promo.flashDealEndsAt)
              : (promo.endTime ? new Date(promo.endTime) : null)

            // Check if promotion is currently active (exclusive upper bound)
            if (promo.isActive && now >= startTime && expiryTime && now < expiryTime) {
              deals.push({
                venue: {
                  _id: venue._id,
                  name: venue.name,
                  address: venue.address
                },
                promotion: {
                  title: promo.title,
                  description: promo.description,
                  offer: promo.offer,
                  type: promo.type,
                  endTime: promo.endTime,
                  flashDealEndsAt: promo.flashDealEndsAt,
                  isFlashDeal: promo.isFlashDeal
                }
              })
            }
          })
        }
      })

      // Sort by effective expiry time (soonest ending first) and take top 5
      const getExpiry = (d: QuickDeal) =>
        (d.promotion.isFlashDeal && d.promotion.flashDealEndsAt)
          ? new Date(d.promotion.flashDealEndsAt).getTime()
          : new Date(d.promotion.endTime).getTime()
      deals.sort((a, b) => getExpiry(a) - getExpiry(b))
      setQuickDeals(deals.slice(0, 5))

      // Get trending venues (by follower count)
      const trending = venues
        .filter((v: any) => v.followerCount > 0)
        .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
        .slice(0, 3)
      setTrendingVenues(trending)

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

  const getTimeRemaining = (deal: QuickDeal) => {
    const now = new Date()
    const expiryStr = (deal.promotion.isFlashDeal && deal.promotion.flashDealEndsAt)
      ? deal.promotion.flashDealEndsAt
      : deal.promotion.endTime
    const end = new Date(expiryStr)
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
                      <p className="text-primary-400 text-sm font-semibold mb-0.5">
                        {deal.promotion.title}
                      </p>
                      {deal.promotion.offer && (
                        <p className="text-primary-500 text-sm font-bold mb-1">
                          {deal.promotion.offer}
                        </p>
                      )}
                      {deal.promotion.description && (
                        <p className="text-primary-300 text-xs mb-2">
                          {deal.promotion.description}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const t = TYPE_LABEL[deal.promotion.type]
                      return t ? (
                        <span className={`border px-2 py-1 rounded text-xs font-medium flex items-center ${t.color}`}>
                          <Clock className="w-3 h-3 mr-1" />
                          {t.label}
                        </span>
                      ) : null
                    })()}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-primary-400">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeRemaining(deal)}</span>
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

        {/* Trending Venues */}
        {trendingVenues.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                </div>
                <h2 className="text-lg font-semibold text-primary-500 tracking-tight">Trending Venues</h2>
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
              {trendingVenues.map((venue) => (
                <div
                  key={venue._id}
                  onClick={() => setActiveTab?.('map')}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-3 cursor-pointer hover:border-primary-500/30 hover:bg-black/50 transition-all backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-primary-500" />
                      <div>
                        <p className="font-semibold text-primary-500">{venue.name}</p>
                        <p className="text-xs text-primary-400">
                          {venue.followerCount || 0} followers
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary-400" />
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

