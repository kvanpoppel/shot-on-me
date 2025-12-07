'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { MapPin, Star, Users, Sparkles, Clock, Loader } from 'lucide-react'
import VenueProfilePage from './VenueProfilePage'

export default function MyVenuesTab() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [followedVenues, setFollowedVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'with-promotions'>('all')

  useEffect(() => {
    if (token) {
      fetchFollowedVenues()
    }
  }, [token])

  const fetchFollowedVenues = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/venue-follows/following`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      
      if (response.data && response.data.followedVenues) {
        // Normalize rating objects to numbers to prevent React rendering errors
        const normalizedVenues = response.data.followedVenues.map((venue: any) => {
          if (venue.rating && typeof venue.rating === 'object' && 'average' in venue.rating) {
            venue.rating = typeof venue.rating.average === 'number' ? venue.rating.average : null
          }
          return venue
        })
        setFollowedVenues(normalizedVenues)
      } else {
        console.warn('Unexpected response format:', response.data)
        setFollowedVenues([])
      }
    } catch (error: any) {
      console.error('Failed to fetch followed venues:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      // Set empty array on error so UI shows "no venues" instead of crashing
      setFollowedVenues([])
    } finally {
      setLoading(false)
    }
  }

  const filteredVenues = activeFilter === 'with-promotions'
    ? followedVenues.filter(v => {
        const activePromos = v.promotions?.filter((p: any) => p.isActive) || []
        return activePromos.length > 0
      })
    : followedVenues

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (selectedVenue) {
    return (
      <VenueProfilePage
        venueId={selectedVenue}
        onClose={() => setSelectedVenue(null)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="p-4 border-b border-primary-500/20">
        <h1 className="text-2xl font-semibold text-primary-500 mb-4">My Venues</h1>
        
        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'all'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 text-primary-400 border border-primary-500/20'
            }`}
          >
            All ({followedVenues.length})
          </button>
          <button
            onClick={() => setActiveFilter('with-promotions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'with-promotions'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 text-primary-400 border border-primary-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            With Promotions
          </button>
        </div>
      </div>

      {/* Venues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredVenues.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-primary-500/40 mx-auto mb-4" />
            <p className="text-primary-400 text-lg mb-2">
              {activeFilter === 'with-promotions'
                ? 'No venues with active promotions'
                : 'No followed venues yet'}
            </p>
            <p className="text-primary-400/60 text-sm">
              {activeFilter === 'with-promotions'
                ? 'Follow venues to see their promotions here'
                : 'Follow venues to see them here and get notified about promotions'}
            </p>
          </div>
        ) : (
          filteredVenues.map((venue) => {
            const activePromos = venue.promotions?.filter((p: any) => p.isActive) || []
            
            return (
              <div
                key={venue._id}
                onClick={() => setSelectedVenue(venue._id)}
                className="bg-black/40 border border-primary-500/20 rounded-lg p-4 cursor-pointer hover:bg-primary-500/10 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary-500 mb-1">
                      {venue.name}
                    </h3>
                    {venue.address && (
                      <div className="flex items-center gap-1 text-primary-400 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {venue.address.city}
                          {venue.address.state && `, ${venue.address.state}`}
                        </span>
                      </div>
                    )}
                  </div>
                  {venue.rating && typeof venue.rating === 'number' && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-primary-500 font-semibold text-sm">
                        {venue.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-3 text-sm text-primary-400">
                  {venue.followerCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{venue.followerCount} followers</span>
                    </div>
                  )}
                  {activePromos.length > 0 && (
                    <div className="flex items-center gap-1 text-primary-500">
                      <Sparkles className="w-4 h-4" />
                      <span>{activePromos.length} active promotion{activePromos.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {/* Active Promotions Preview */}
                {activePromos.length > 0 && (
                  <div className="space-y-2">
                    {activePromos.slice(0, 2).map((promo: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-primary-500/10 border border-primary-500/20 rounded p-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-primary-500 font-medium text-sm">
                            {promo.title}
                          </span>
                          {promo.discount && (
                            <span className="text-green-500 font-bold text-sm">
                              {promo.discount}% OFF
                            </span>
                          )}
                        </div>
                        {promo.description && (
                          <p className="text-primary-400 text-xs mt-1 line-clamp-1">
                            {promo.description}
                          </p>
                        )}
                      </div>
                    ))}
                    {activePromos.length > 2 && (
                      <p className="text-primary-400/60 text-xs">
                        +{activePromos.length - 2} more promotion{activePromos.length - 2 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}


