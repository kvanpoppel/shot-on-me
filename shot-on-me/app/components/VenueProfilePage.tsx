'use client'

import { showToast } from '../utils/toast'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import {
  MapPin,
  Clock,
  Star,
  Users,
  Sparkles,
  Crown,
  CheckCircle,
  X,
  Loader,
  MapPin as CheckInIcon,
  Navigation,
  Globe,
  Share2,
  GlassWater as Wine,
  Info,
  Tag,
  TrendingUp,
  Moon,
  CalendarDays,
  Flame
} from 'lucide-react'
import BackButton from './BackButton'
import CheckInSuccessModal from './CheckInSuccessModal'
import VenueReferralInvite from './VenueReferralInvite'

interface VenueProfilePageProps {
  venueId: string
  onClose: () => void
}

export default function VenueProfilePage({ venueId, onClose }: VenueProfilePageProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [venue, setVenue] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [myReview, setMyReview] = useState<any>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false)
  const [checkInResult, setCheckInResult] = useState<any>(null)
  const [loyaltyData, setLoyaltyData] = useState<any>(null)
  const [showReferralInvite, setShowReferralInvite] = useState(false)
  const [friendsHere, setFriendsHere] = useState<any[]>([])
  const [activeVenueTab, setActiveVenueTab] = useState<'info' | 'happyhour' | 'special' | 'wine' | 'weekend' | 'trending' | 'tonight' | 'reviews'>('info')

  useEffect(() => {
    if (token && venueId && API_URL) {
      fetchVenue()
      checkFollowStatus()
      fetchReviews()
      fetchLoyalty()
      fetchFriendsHere()
    }
  }, [token, venueId, API_URL])

  const fetchLoyalty = async () => {
    try {
      const response = await axios.get(`${API_URL}/loyalty/venue/${venueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLoyaltyData(response.data)
      return response.data
    } catch (error) {
      // Loyalty data might not exist yet, that's okay
      console.log('No loyalty data yet')
      return null
    }
  }

  const fetchFriendsHere = async () => {
    try {
      const res = await axios.get(`${API_URL}/checkins/friends-at/${venueId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      setFriendsHere(res.data.friends || [])
    } catch {
      setFriendsHere([])
    }
  }

  const fetchVenue = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/venues/${venueId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      
      let venueData = null
      if (response.data && response.data.venue) {
        venueData = response.data.venue
      } else if (response.data && !response.data.venue) {
        // Sometimes the API returns venue directly
        venueData = response.data
      } else {
        console.error('Invalid venue response:', response.data)
        setVenue(null)
        return
      }
      
      // Normalize rating object to number to prevent React rendering errors
      if (venueData.rating && typeof venueData.rating === 'object' && 'average' in venueData.rating) {
        venueData.rating = typeof venueData.rating.average === 'number' ? venueData.rating.average : null
      }
      
      setVenue(venueData)
    } catch (error: any) {
      console.error('Failed to fetch venue:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      setVenue(null)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/venue-follows/${venueId}/follow-status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIsFollowing(response.data.isFollowing)
    } catch (error) {
      console.error('Failed to check follow status:', error)
    }
  }

  const fetchReviews = async () => {
    try {
      const [reviewsRes, myReviewRes] = await Promise.all([
        axios.get(`${API_URL}/venue-reviews/${venueId}/reviews`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/venue-reviews/${venueId}/my-review`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setReviews(reviewsRes.data.reviews)
      setMyReview(myReviewRes.data.review)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    }
  }

  const handleFollow = async () => {
    try {
      setFollowing(true)
      if (isFollowing) {
        await axios.delete(`${API_URL}/venue-follows/${venueId}/follow`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setIsFollowing(false)
      } else {
        await axios.post(`${API_URL}/venue-follows/${venueId}/follow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    } finally {
      setFollowing(false)
    }
  }

  const handleCheckIn = async () => {
    if (!token || !venue) return
    
    setCheckingIn(true)
    try {
      // Get user location if available
      let latitude: number | undefined
      let longitude: number | undefined
      
      if (navigator.geolocation) {
        // Check permission status first
        let permissionStatus: 'granted' | 'denied' | 'prompt' = 'prompt'
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
            permissionStatus = result.state as 'granted' | 'denied' | 'prompt'
          } catch {
            permissionStatus = 'prompt'
          }
        }

        // Only request location if permission is not denied
        if (permissionStatus !== 'denied') {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { 
                timeout: 15000, // Increased to 15 seconds
                enableHighAccuracy: false, // Use less accurate but faster location
                maximumAge: 300000 // Accept cached location up to 5 minutes old
              })
            })
            latitude = position.coords.latitude
            longitude = position.coords.longitude
          } catch (error) {
            console.log('Location not available, proceeding without it')
          }
        }
      }

      // Check if this check-in is via a venue referral
      let referralId = null
      if (typeof window !== 'undefined') {
        const storedRef = sessionStorage.getItem(`venue_referral_${venue._id}`)
        if (storedRef) {
          referralId = storedRef
          // Clear it after use
          sessionStorage.removeItem(`venue_referral_${venue._id}`)
        }
      }

      const response = await axios.post(
        `${API_URL}/checkins`,
        {
          venueId: venue._id,
          latitude,
          longitude,
          referralId // Pass referral ID if present
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Fetch updated loyalty data after check-in
      let updatedLoyalty = loyaltyData
      try {
        const loyaltyRes = await axios.get(`${API_URL}/loyalty/venue/${venueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        updatedLoyalty = loyaltyRes.data
        setLoyaltyData(updatedLoyalty)
      } catch (error) {
        // If loyalty doesn't exist yet, it will be created by the backend
        // Use the previous count + 1 as estimate
        updatedLoyalty = { 
          tier: 'bronze', 
          checkInCount: (loyaltyData?.checkInCount || 0) + 1 
        }
      }

      // Show success modal with check-in data
      setCheckInResult({
        pointsEarned: response.data.pointsEarned || 10,
        totalPoints: response.data.totalPoints || 0,
        streak: response.data.streak,
        reward: response.data.reward,
        venueName: venue?.name || 'Venue',
        tier: updatedLoyalty?.tier || 'bronze',
        checkInCount: updatedLoyalty?.checkInCount || 1
      })
      setShowCheckInSuccess(true)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to check in'
      showToast(errorMessage)
    } finally {
      setCheckingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-primary-400">Venue not found</p>
          <div className="mt-4">
            <BackButton onClick={onClose} label="Go Back" />
          </div>
        </div>
      </div>
    )
  }

  const activePromotions = (venue && venue.promotions && Array.isArray(venue.promotions)) 
    ? venue.promotions.filter((p: any) => p && p.isActive) 
    : []

  const venueBadge = venue?.isFeatured
    ? { label: 'Featured Venue', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' }
    : venue?.subscriptionTier === 'enterprise'
      ? { label: 'Enterprise Partner', className: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
      : venue?.subscriptionTier === 'premium'
        ? { label: 'AI Optimized Specials', className: 'bg-primary-500/20 text-primary-400 border-primary-500/40' }
        : null

  // Safety check - if venue is null or invalid, show error
  if (!venue || !venue._id) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center p-6">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-primary-400 mb-4">Venue data is invalid</p>
          <BackButton onClick={onClose} label="Go Back" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto pb-14">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-md border-b border-primary-500/20 z-10">
        <div className="flex items-center justify-between p-4">
          <BackButton onClick={onClose} />
          <h1 className="text-xl font-semibold text-primary-500">{venue?.name || 'Venue'}</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Tab Bar — horizontally scrollable */}
      <div className="border-b border-primary-500/20 bg-black/60 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {([
            { id: 'info',      label: 'Info',          icon: Info },
            { id: 'tonight',   label: 'Tonight',        icon: Moon },
            { id: 'happyhour', label: 'Happy Hour',     icon: Clock },
            { id: 'special',   label: 'Special',        icon: Tag },
            { id: 'wine',      label: 'Wine',           icon: Wine },
            { id: 'weekend',   label: 'Weekend',        icon: CalendarDays },
            { id: 'trending',  label: 'Trending',       icon: TrendingUp },
            { id: 'reviews',   label: 'Reviews',        icon: Star },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveVenueTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeVenueTab === tab.id
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-primary-400/60 hover:text-primary-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Venue Info */}
      <div className="p-4 space-y-4">
        {/* Rating & Followers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {venueBadge && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${venueBadge.className}`}>
                {venueBadge.label}
              </span>
            )}
            {venue?.rating && typeof venue.rating === 'number' && (
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-primary-500 font-semibold">
                  {venue.rating.toFixed(1)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="w-5 h-5 text-primary-500" />
              <span className="text-primary-400">
                {venue?.followerCount || 0} followers
              </span>
            </div>
          </div>
          <button
            onClick={handleFollow}
            disabled={following}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              isFollowing
                ? 'bg-primary-500/20 text-primary-500 border border-primary-500'
                : 'bg-primary-500 text-black hover:bg-primary-400'
            } disabled:opacity-50`}
          >
            {following ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Following
              </>
            ) : (
              'Follow'
            )}
          </button>
        </div>

        {venue?.subscriptionTier === 'premium' || venue?.subscriptionTier === 'enterprise' || venue?.isFeatured ? (
          <div className="bg-black/40 border border-primary-500/20 rounded-lg px-4 py-3 flex items-start gap-2">
            <Crown className="w-4 h-4 text-primary-500 mt-0.5" />
            <p className="text-xs text-primary-400/85 leading-relaxed">
              This venue is actively managed through the Venue Portal with enhanced optimization.
              Specials and event timing may update more frequently based on live performance.
            </p>
          </div>
        ) : null}

        {/* Address */}
        {venue?.address && (
          <div className="flex items-start gap-2 text-primary-400">
            <MapPin className="w-5 h-5 text-primary-500 mt-0.5" />
            <div>
              {venue.address?.street && <p>{venue.address.street}</p>}
              {(venue.address?.city || venue.address?.state) && (
                <p>
                  {venue.address.city || ''}
                  {venue.address.city && venue.address.state && ', '}
                  {venue.address.state || ''} {venue.address.zipCode || ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Check-in Button */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="flex-1 bg-primary-500 text-black py-2.5 sm:py-3 rounded-lg font-semibold active:bg-primary-600 hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
          >
            {checkingIn ? (
              <>
                <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                <span className="text-sm sm:text-base">Checking in...</span>
              </>
            ) : (
              <>
                <CheckInIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Check In</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowReferralInvite(true)}
            className="bg-primary-500/20 active:bg-primary-500/40 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
            title="Invite friends to check in"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="hidden sm:inline text-sm sm:text-base">Invite</span>
          </button>
        </div>

        {/* Friends Here */}
        {friendsHere.length > 0 && (
          <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-primary-500 mb-2">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              {friendsHere.length} friend{friendsHere.length !== 1 ? 's' : ''} checked in
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {friendsHere.map((f: any) => (
                <div key={f._id} className="flex items-center gap-1.5 bg-black/40 rounded-full pl-1 pr-2.5 py-1">
                  {f.profilePicture ? (
                    <img src={f.profilePicture} alt={f.firstName} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <span className="text-primary-500 text-[10px] font-bold">{f.firstName?.[0]}{f.lastName?.[0]}</span>
                    </div>
                  )}
                  <span className="text-xs text-white font-medium">{f.firstName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Directions, Website & Share */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (venue.location?.latitude && venue.location?.longitude) {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.location.latitude},${venue.location.longitude}`
                window.open(url, '_blank')
              }
            }}
            className="flex-1 bg-primary-500/20 active:bg-primary-500/40 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
          >
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-sm sm:text-base">Directions</span>
          </button>
          {venue?.website && (
            <button
              onClick={() => window.open(venue.website, '_blank', 'noopener,noreferrer')}
              className="flex-1 bg-primary-500/20 active:bg-primary-500/40 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base">Website</span>
            </button>
          )}
          <button
            onClick={async () => {
              if (navigator.share && venue.name) {
                try {
                  await navigator.share({
                    title: venue.name,
                    text: `Check out ${venue.name} on Shot On Me!`,
                    url: window.location.href
                  })
                } catch (error) {
                  // User cancelled or error - fallback to clipboard
                  if ((error as any).name !== 'AbortError') {
                    try {
                      await navigator.clipboard.writeText(window.location.href)
                      showToast('Link copied to clipboard!')
                    } catch (clipboardError) {
                      console.error('Failed to copy:', clipboardError)
                    }
                  }
                }
              } else {
                // Fallback for browsers without share API
                try {
                  await navigator.clipboard.writeText(window.location.href)
                  showToast('Link copied to clipboard!')
                } catch (clipboardError) {
                  console.error('Failed to copy:', clipboardError)
                }
              }
            }}
            className="flex-1 bg-primary-500/20 active:bg-primary-500/40 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-sm sm:text-base">Share</span>
          </button>
        </div>
        
        {/* Loyalty info */}
        {loyaltyData && loyaltyData.checkInCount > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg px-4 py-3 flex items-center gap-2 mt-3">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-primary-500 font-semibold text-sm">
                {loyaltyData.checkInCount} check-in{loyaltyData.checkInCount !== 1 ? 's' : ''}
              </p>
              {loyaltyData.tier && loyaltyData.tier !== 'bronze' && (
                <p className="text-primary-400 text-xs capitalize">{loyaltyData.tier} Member</p>
              )}
            </div>
          </div>
        )}

        {/* Hours */}
        {activeVenueTab === 'info' && venue?.schedule && typeof venue.schedule === 'object' && (
          <div className="flex items-start gap-2 text-primary-400">
            <Clock className="w-5 h-5 text-primary-500 mt-0.5" />
            <div className="text-sm">
              <p className="text-primary-500 font-medium mb-1">Hours</p>
              {Object.entries(venue.schedule).map(([day, hours]: [string, any]) => {
                if (!hours || typeof hours !== 'object') return null
                return (
                  <div key={day} className="flex justify-between gap-4">
                    <span className="capitalize">{day}:</span>
                    <span>
                      {hours.closed ? 'Closed' : `${hours.open || 'N/A'} - ${hours.close || 'N/A'}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Promotions — Info tab only */}
        {activeVenueTab === 'info' && activePromotions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Active Promotions
            </h2>
            <div className="space-y-3">
              {activePromotions.map((promo: any, idx: number) => (
                <div key={idx} className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-primary-500">{promo.title}</h3>
                    {promo.discount && (
                      <span className="text-green-500 font-bold">{promo.discount}% OFF</span>
                    )}
                  </div>
                  {promo.description && (
                    <p className="text-primary-400 text-sm mb-2">{promo.description}</p>
                  )}
                  {promo.validUntil && (
                    <p className="text-primary-500/60 text-xs">
                      Valid until {new Date(promo.validUntil).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Happy Hour Tab */}
        {activeVenueTab === 'happyhour' && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Happy Hour
            </h2>
            {venue?.happyHour || venue?.happyHourDetails ? (
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
                {venue.happyHour?.times && (
                  <p className="text-primary-400 font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500" />
                    {venue.happyHour.times}
                  </p>
                )}
                {(venue.happyHour?.description || venue.happyHourDetails) && (
                  <p className="text-primary-400/80 text-sm">{venue.happyHour?.description || venue.happyHourDetails}</p>
                )}
              </div>
            ) : activePromotions.filter((p: any) => p.type === 'happy_hour' || p.title?.toLowerCase().includes('happy')).length > 0 ? (
              <div className="space-y-3">
                {activePromotions.filter((p: any) => p.type === 'happy_hour' || p.title?.toLowerCase().includes('happy')).map((promo: any, idx: number) => (
                  <div key={idx} className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
                    <p className="font-semibold text-primary-500">{promo.title}</p>
                    {promo.description && <p className="text-primary-400/80 text-sm mt-1">{promo.description}</p>}
                    {promo.discount && <p className="text-green-400 font-bold text-sm mt-1">{promo.discount}% OFF</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-black/40 border border-primary-500/10 rounded-xl p-6 text-center">
                <Clock className="w-10 h-10 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/60 text-sm">Happy hour details coming soon</p>
                <p className="text-primary-400/40 text-xs mt-1">Ask your server for today's specials</p>
              </div>
            )}
          </div>
        )}

        {/* Current Special Tab */}
        {activeVenueTab === 'special' && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Current Specials
            </h2>
            {venue?.currentSpecial || venue?.specials?.length > 0 || activePromotions.length > 0 ? (
              <div className="space-y-3">
                {venue?.currentSpecial && (
                  <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
                    <p className="text-primary-400/80 text-sm">{venue.currentSpecial}</p>
                  </div>
                )}
                {venue?.specials?.map((s: any, idx: number) => (
                  <div key={idx} className="bg-black/40 border border-primary-500/15 rounded-xl p-4">
                    <p className="font-semibold text-primary-500">{s.name || s.title}</p>
                    {s.description && <p className="text-primary-400/70 text-sm mt-1">{s.description}</p>}
                    {s.price && <p className="text-primary-400 font-bold mt-1">${s.price}</p>}
                  </div>
                ))}
                {!venue?.currentSpecial && !venue?.specials?.length && activePromotions.map((promo: any, idx: number) => (
                  <div key={idx} className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-primary-500">{promo.title}</p>
                      {promo.discount && <span className="text-green-400 font-bold text-sm">{promo.discount}% OFF</span>}
                    </div>
                    {promo.description && <p className="text-primary-400/70 text-sm">{promo.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-black/40 border border-primary-500/10 rounded-xl p-6 text-center">
                <Tag className="w-10 h-10 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/60 text-sm">No active specials right now</p>
                <p className="text-primary-400/40 text-xs mt-1">Check back soon or follow this venue</p>
              </div>
            )}
          </div>
        )}

        {/* Wine Tab */}
        {activeVenueTab === 'wine' && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <Wine className="w-5 h-5" />
              Wine Menu
            </h2>
            {venue?.wineMenu && venue.wineMenu.length > 0 ? (
              <div className="space-y-3">
                {venue.wineMenu.map((item: any, idx: number) => (
                  <div key={idx} className="bg-black/40 border border-primary-500/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-primary-400 font-semibold">{item.name}</p>
                      {item.price && (
                        <span className="text-primary-500 font-bold">${item.price}</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-primary-400/70 text-sm">{item.description}</p>
                    )}
                    {item.varietal && (
                      <p className="text-primary-400/50 text-xs mt-1">{item.varietal}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-black/40 border border-primary-500/10 rounded-xl p-6 text-center">
                <Wine className="w-10 h-10 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/60 text-sm">Wine menu coming soon</p>
                <p className="text-primary-400/40 text-xs mt-1">Check back or ask your server</p>
              </div>
            )}
          </div>
        )}

        {/* Weekend Tab */}
        {activeVenueTab === 'weekend' && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Weekend Specials
            </h2>
            {venue?.weekendSpecials?.length > 0 ? (
              <div className="space-y-3">
                {venue.weekendSpecials.map((s: any, idx: number) => (
                  <div key={idx} className="bg-black/40 border border-primary-500/15 rounded-xl p-4">
                    <p className="font-semibold text-primary-500">{s.name || s.title}</p>
                    {s.description && <p className="text-primary-400/70 text-sm mt-1">{s.description}</p>}
                    {s.price && <p className="text-primary-400 font-bold mt-1">${s.price}</p>}
                    {s.days && <p className="text-primary-400/50 text-xs mt-1">{s.days}</p>}
                  </div>
                ))}
              </div>
            ) : activePromotions.filter((p: any) => p.type === 'weekend' || p.title?.toLowerCase().includes('weekend') || p.days?.toLowerCase().includes('sat') || p.days?.toLowerCase().includes('sun')).length > 0 ? (
              <div className="space-y-3">
                {activePromotions.filter((p: any) => p.type === 'weekend' || p.title?.toLowerCase().includes('weekend')).map((promo: any, idx: number) => (
                  <div key={idx} className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
                    <p className="font-semibold text-primary-500">{promo.title}</p>
                    {promo.description && <p className="text-primary-400/70 text-sm mt-1">{promo.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-black/40 border border-primary-500/10 rounded-xl p-6 text-center">
                <CalendarDays className="w-10 h-10 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/60 text-sm">Weekend specials coming soon</p>
                <p className="text-primary-400/40 text-xs mt-1">Follow this venue to get notified</p>
              </div>
            )}
          </div>
        )}

        {/* Trending Tab */}
        {activeVenueTab === 'trending' && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trending Here
            </h2>
            {venue?.trending?.length > 0 ? (
              <div className="space-y-3">
                {venue.trending.map((item: any, idx: number) => (
                  <div key={idx} className="bg-black/40 border border-primary-500/15 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-primary-500">{item.name}</p>
                      {item.description && <p className="text-primary-400/70 text-sm mt-0.5">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 text-primary-500/60 text-xs font-semibold ml-3">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      {item.orders || item.count || 'Hot'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-black/40 border border-primary-500/10 rounded-xl p-6 text-center">
                <TrendingUp className="w-10 h-10 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/60 text-sm">Trending items loading soon</p>
                <p className="text-primary-400/40 text-xs mt-1">Most ordered drinks & food will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Tonight Tab */}
        {activeVenueTab === 'tonight' && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Tonight
            </h2>
            {venue?.tonight || venue?.tonightSpecials?.length > 0 || venue?.events?.length > 0 ? (
              <div className="space-y-3">
                {venue.tonight && (
                  <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
                    <p className="text-primary-400/80 text-sm">{venue.tonight}</p>
                  </div>
                )}
                {venue?.tonightSpecials?.map((s: any, idx: number) => (
                  <div key={idx} className="bg-black/40 border border-primary-500/15 rounded-xl p-4">
                    <p className="font-semibold text-primary-500">{s.name || s.title}</p>
                    {s.description && <p className="text-primary-400/70 text-sm mt-1">{s.description}</p>}
                    {s.time && <p className="text-primary-400/50 text-xs mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{s.time}</p>}
                  </div>
                ))}
                {venue?.events?.filter((e: any) => {
                  const today = new Date().toDateString()
                  return new Date(e.date).toDateString() === today
                }).map((event: any, idx: number) => (
                  <div key={idx} className="bg-black/40 border border-primary-500/15 rounded-xl p-4">
                    <p className="font-semibold text-primary-500">{event.name || event.title}</p>
                    {event.description && <p className="text-primary-400/70 text-sm mt-1">{event.description}</p>}
                    {event.time && <p className="text-primary-400/50 text-xs mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-black/40 border border-primary-500/10 rounded-xl p-6 text-center">
                <Moon className="w-10 h-10 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/60 text-sm">Nothing posted for tonight yet</p>
                <p className="text-primary-400/40 text-xs mt-1">Check back later or follow this venue</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeVenueTab === 'reviews' && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-primary-400 text-sm">No reviews yet</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 5).map((review: any) => (
                  <div key={review._id} className="bg-black/40 border border-primary-500/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                          <span className="text-primary-500 text-sm font-semibold">
                            {((review.user as any)?.name || (review.user as any)?.firstName || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-primary-500 font-medium text-sm">
                          {(review.user as any)?.name || (review.user as any)?.firstName || 'Unknown User'}
                        </span>
                        {review.isVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-primary-500/20'}`} />
                        ))}
                      </div>
                    </div>
                    {review.review && <p className="text-primary-400 text-sm">{review.review}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Check-in Success Modal */}
      <CheckInSuccessModal
        isOpen={showCheckInSuccess}
        onClose={() => {
          setShowCheckInSuccess(false)
          setCheckInResult(null)
        }}
        checkInData={checkInResult}
      />

      {/* Venue Referral Invite Modal */}
      {venue && (
        <VenueReferralInvite
          isOpen={showReferralInvite}
          onClose={() => setShowReferralInvite(false)}
          venue={venue}
        />
      )}
    </div>
  )
}


