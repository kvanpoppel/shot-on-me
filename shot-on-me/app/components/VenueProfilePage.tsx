'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { 
  MapPin, 
  Clock, 
  Star, 
  Users, 
  Calendar, 
  Sparkles,
  ArrowLeft,
  CheckCircle,
  X,
  Loader,
  MapPin as CheckInIcon
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

  useEffect(() => {
    if (token && venueId && API_URL) {
      fetchVenue()
      checkFollowStatus()
      fetchReviews()
      fetchLoyalty()
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
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        } catch (error) {
          console.log('Location not available, proceeding without it')
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
      alert(errorMessage)
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
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-md border-b border-primary-500/20 z-10">
        <div className="flex items-center justify-between p-4">
          <BackButton onClick={onClose} />
          <h1 className="text-xl font-semibold text-primary-500">{venue?.name || 'Venue'}</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Venue Info */}
      <div className="p-4 space-y-4">
        {/* Rating & Followers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
        <div className="flex gap-3">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checkingIn ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Checking in...</span>
              </>
            ) : (
              <>
                <CheckInIcon className="w-5 h-5" />
                <span>Check In</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowReferralInvite(true)}
            className="bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            title="Invite friends to check in"
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">Invite</span>
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
        {venue?.schedule && typeof venue.schedule === 'object' && (
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

        {/* Active Promotions */}
        {activePromotions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-primary-500 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Active Promotions
            </h2>
            <div className="space-y-3">
              {activePromotions.map((promo: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-primary-500">{promo.title}</h3>
                    {promo.discount && (
                      <span className="text-green-500 font-bold">
                        {promo.discount}% OFF
                      </span>
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

        {/* Reviews */}
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
                <div
                  key={review._id}
                  className="bg-black/40 border border-primary-500/10 rounded-lg p-3"
                >
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
                      {review.isVerified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-primary-500/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.review && (
                    <p className="text-primary-400 text-sm">{review.review}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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


