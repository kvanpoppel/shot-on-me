'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { MapPin, Clock, Tag, Star, Share2, Navigation, Martini, Users, Search, X, List, Map, ChevronDown, TrendingUp } from 'lucide-react'
import GoogleMapComponent from './GoogleMap'
import PlacesAutocomplete from './PlacesAutocomplete'
import VenueProfilePage from './VenueProfilePage'
import { ErrorBoundary } from './ErrorBoundary'

import { useApiUrl } from '../utils/api'
import { Tab } from '../types'

interface MapTabProps {
  setActiveTab?: (tab: Tab) => void
}

export default function MapTab({ setActiveTab }: MapTabProps) {
  const API_URL = useApiUrl()
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [venues, setVenues] = useState<any[]>([])
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null)
  const [viewingVenueId, setViewingVenueId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'happy-hour' | 'specials' | 'trending'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [googlePlace, setGooglePlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [googlePlacesResults, setGooglePlacesResults] = useState<any[]>([])

  const fetchTrendingVenues = async () => {
    if (!token || !API_URL) return
    try {
      const response = await axios.get(`${API_URL}/venue-activity/trending/list?limit=10&period=24h`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      setTrendingVenues(response.data.venues || [])
    } catch (error) {
      console.error('Failed to fetch trending venues:', error)
      setTrendingVenues([])
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }

  const fetchVenues = async () => {
    if (!token || !API_URL) {
      console.warn('Cannot fetch venues: missing token or API_URL', { token: !!token, API_URL })
      return
    }
    try {
      console.log('📍 Fetching venues from:', `${API_URL}/venues`)
      const response = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000 // 8 second timeout - increased for mobile networks
      })
      // Backend returns array directly, not wrapped in venues property
      const fetchedVenues = Array.isArray(response.data) ? response.data : (response.data.venues || [])
      console.log('Fetched venues:', fetchedVenues.length)
      
      // Deduplicate venues by name and location
      // Normalize venue names for comparison (remove apostrophes, lowercase, trim)
      const normalizeName = (name: string) => {
        return (name || '').toLowerCase()
          .replace(/[''""]/g, '') // Remove all apostrophe/quote variations
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }
      
      // Only filter out "Kate's Venue" specifically - keep all other venues including "Kate's Pub" and "Paige's Pub"
      const uniqueVenues = fetchedVenues.filter((venue: any) => {
        const normalizedName = normalizeName(venue.name)
        
        // ONLY filter out "Kate's Venue" - be very specific
        // After normalization: "kate's venue" becomes "kates venue"
        const isKatesVenue = normalizedName === "kates venue" || normalizedName === "kate venue"
        
        if (isKatesVenue) {
          console.log(`Filtering out venue: "${venue.name}" (normalized: "${normalizedName}") - only showing "Kate's Pub"`)
          return false
        }
        
        // Keep all other venues - including "Kate's Pub", "Paige's Pub", etc.
        return true
      })
      
      console.log('✅ Unique venues after deduplication:', uniqueVenues.length)
      console.log('📍 Venue names:', uniqueVenues.map((v: any) => v.name).join(', '))
      setVenues(uniqueVenues)
    } catch (error: any) {
      console.error('❌ Failed to fetch venues:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        API_URL: API_URL
      })
      // Set empty array on error to prevent crashes
      setVenues([])
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  const getFilteredVenues = () => {
    // Safety check: ensure venues is an array
    if (!Array.isArray(venues)) {
      console.warn('Venues is not an array:', venues)
      return []
    }
    
    // Helper function to normalize venue names
    const normalizeName = (name: string) => {
      return (name || '').toLowerCase()
        .replace(/[''""]/g, '') // Remove all apostrophe/quote variations
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }
    
    // Only filter out "Kate's Venue" specifically - keep all other venues
    let filtered = venues.filter((venue: any) => {
      const normalizedName = normalizeName(venue.name)
      
      // ONLY filter out "Kate's Venue" - be very specific
      const isKatesVenue = normalizedName === "kates venue" || normalizedName === "kate venue"
      
      if (isKatesVenue) {
        console.log(`Filtering out venue in getFilteredVenues: "${venue.name}" (normalized: "${normalizedName}")`)
        return false
      }
      // Keep all other venues - including "Kate's Pub", "Paige's Pub", etc.
      return true
    })

    // If Google Place is selected, prioritize showing it or matching venues
    if (googlePlace && googlePlace.geometry?.location) {
      // Add the Google Place as a temporary venue result
      const googlePlaceVenue = {
        _id: `google_${googlePlace.place_id}`,
        name: googlePlace.name || searchQuery,
        address: {
          street: googlePlace.formatted_address?.split(',')[0] || '',
          city: googlePlace.address_components?.find((c: any) => c.types.includes('locality'))?.long_name || '',
          state: googlePlace.address_components?.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || '',
        },
        location: {
          latitude: googlePlace.geometry.location.lat(),
          longitude: googlePlace.geometry.location.lng()
        },
        rating: googlePlace.rating,
        user_ratings_total: googlePlace.user_ratings_total,
        isGooglePlace: true,
        placeId: googlePlace.place_id,
        types: googlePlace.types
      }
      
      // Try to match with existing venues by location (within 100m)
      const matchingVenue = venues.find((venue) => {
        if (!venue.location?.latitude || !venue.location?.longitude) return false
        const distance = calculateDistance(
          googlePlace.geometry!.location!.lat(),
          googlePlace.geometry!.location!.lng(),
          venue.location.latitude,
          venue.location.longitude
        )
        return distance < 0.1 // 100 meters
      })
      
      if (matchingVenue) {
        // If we found a matching venue, highlight it
        filtered = [matchingVenue, ...filtered.filter(v => v._id !== matchingVenue._id)]
      } else {
        // Otherwise, show the Google Place result first
        filtered = [googlePlaceVenue, ...filtered]
      }
    }

    // Apply search filter
    if (searchQuery.trim() && !googlePlace) {
      // Normalize search query: lowercase, remove apostrophes, trim
      const normalize = (str: string) => {
        if (!str) return ''
        return str.toLowerCase()
          .replace(/[''""]/g, '') // Remove all apostrophe/quote variations
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }
      
      const query = normalize(searchQuery)
      console.log('Searching for:', query, 'in', filtered.length, 'venues')
      
      filtered = filtered.filter((venue) => {
        // Normalize all searchable fields
        const name = normalize(venue.name || '')
        const city = normalize(venue.address?.city || '')
        const state = normalize(venue.address?.state || '')
        const street = normalize(venue.address?.street || '')
        const description = normalize(venue.description || '')
        
        // Check if query matches any field
        const nameMatch = name.includes(query)
        const cityMatch = city.includes(query)
        const stateMatch = state.includes(query)
        const streetMatch = street.includes(query)
        const descriptionMatch = description.includes(query)
        
        // Also check individual words for partial matching
        const queryWords = query.split(' ').filter(w => w.length > 0)
        const allFields = `${name} ${city} ${state} ${street} ${description}`
        const wordMatch = queryWords.every(word => allFields.includes(word))
        
        const matches = nameMatch || cityMatch || stateMatch || streetMatch || descriptionMatch || wordMatch
        if (matches) {
          console.log('Match found:', venue.name)
        }
        return matches
      })
      
      console.log('Filtered results:', filtered.length)
    }

    // Apply promotion filter
    if (filter === 'all') return filtered
    if (filter === 'trending') {
      // Show trending venues (by activity)
      const trendingIds = new Set(trendingVenues.map(v => v._id?.toString()))
      return filtered.filter(venue => trendingIds.has(venue._id?.toString()))
    }
    return filtered.filter((venue) => {
      const promotions = venue.promotions || []
      return promotions.some((p: any) => 
        filter === 'happy-hour' 
          ? p.type === 'happy-hour' || p.title?.toLowerCase().includes('happy hour')
          : p.type === 'special' || p.title?.toLowerCase().includes('special')
      )
    })
  }

  const getActivePromotions = (venue: any) => {
    if (!venue) return []
    
    const now = new Date()
    const dayOfWeek = now.getDay()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    return (venue.promotions || []).filter((promo: any) => {
      // Check if promotion is active based on schedule
      if (promo.schedule) {
        const schedule = promo.schedule[dayOfWeek]
        if (schedule && schedule.start && schedule.end) {
          const start = parseInt(schedule.start.replace(':', ''))
          const end = parseInt(schedule.end.replace(':', ''))
          return currentTime >= start && currentTime <= end
        }
      }
      return true
    })
  }

  // Fetch venues, trending venues, and location on mount and when token/API_URL changes
  useEffect(() => {
    if (token && API_URL) {
      console.log('🔄 MapTab: Fetching venues, trending venues, and location...')
      fetchVenues()
      fetchTrendingVenues()
      getCurrentLocation()
    }
  }, [token, API_URL])

  // Memoize venue markers for map - must be called unconditionally
  const venueMarkers = useMemo(() => {
    return getFilteredVenues()
      .filter((venue) => venue.location?.latitude && venue.location?.longitude)
      .map((venue) => ({
        id: venue._id,
        position: {
          lat: venue.location.latitude,
          lng: venue.location.longitude
        },
        title: venue.name,
        label: venue.name?.[0] || 'V',
        onClick: () => setViewingVenueId(venue._id)
      }))
  }, [venues, filter, searchQuery, googlePlace, trendingVenues])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false)
      }
    }
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterDropdown])

  return (
    <div className="min-h-screen pb-16 bg-black max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-black border-b border-primary-500/10 sticky top-16 z-10 p-4 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-primary-500 mb-3 tracking-tight">Venues</h1>
        
        {/* Search Bar */}
        <div className="relative mb-3">
          <PlacesAutocomplete
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value)
              // Clear Google Place if search is manually changed
              if (!value) setGooglePlace(null)
            }}
            onPlaceSelect={(place) => {
              setGooglePlace(place)
              setSearchQuery(place.name || place.formatted_address || '')
            }}
            placeholder="Search venues by name, city, or address..."
            className="w-full"
          />
        </div>
        
        {/* Filter Dropdown and View Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="relative filter-dropdown-container">
            {/* Dropdown Menu */}
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center space-x-2 px-4 py-2 bg-black/40 border border-primary-500/20 text-primary-400 hover:text-primary-500 hover:border-primary-500/30 rounded-lg backdrop-blur-sm transition-all"
            >
              <span className="text-sm font-medium">
                {filter === 'all' && 'All Venues'}
                {filter === 'happy-hour' && (
                  <>
                    <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                    Happy Hour
                  </>
                )}
                {filter === 'specials' && (
                  <>
                    <Tag className="w-3.5 h-3.5 inline mr-1.5" />
                    Specials
                  </>
                )}
                {filter === 'trending' && (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
                    Trending
                  </>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu Items */}
            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-black border border-primary-500/20 rounded-lg shadow-xl z-20 min-w-[180px] backdrop-blur-sm">
                <button
                  onClick={() => {
                    setFilter('all')
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-primary-500/20 text-primary-500'
                      : 'text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
                  }`}
                >
                  All Venues
                </button>
                <button
                  onClick={() => {
                    setFilter('trending')
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center ${
                    filter === 'trending'
                      ? 'bg-primary-500/20 text-primary-500'
                      : 'text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trending Now
                </button>
                <button
                  onClick={() => {
                    setFilter('happy-hour')
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center ${
                    filter === 'happy-hour'
                      ? 'bg-primary-500/20 text-primary-500'
                      : 'text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Happy Hour
                </button>
                <button
                  onClick={() => {
                    setFilter('specials')
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center ${
                    filter === 'specials'
                      ? 'bg-primary-500/20 text-primary-500'
                      : 'text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
                  }`}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Specials
                </button>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 border border-primary-500/20 text-primary-400 hover:text-primary-500'
              }`}
            >
              <List className="w-4 h-4 inline mr-1.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 border border-primary-500/20 text-primary-400 hover:text-primary-500'
              }`}
            >
              <Map className="w-4 h-4 inline mr-1.5" />
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="h-[calc(100vh-16rem)] relative">
          {userLocation ? (
            <GoogleMapComponent
              center={userLocation}
              zoom={12}
              markers={venueMarkers}
              mapContainerStyle={{ width: '100%', height: '100%' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-primary-400">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Requesting location...</p>
                <p className="text-sm mt-2">Please allow location access to see venues on map</p>
                <button
                  onClick={getCurrentLocation}
                  className="mt-4 bg-primary-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-primary-600"
                >
                  Enable Location
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Venue Advertisement Cards - List View */}
      {viewMode === 'list' && (
      <div className="p-4 space-y-4">
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-primary-400/50 mb-2">
            Debug: {venues.length} total venues, {getFilteredVenues().length} filtered, search: "{searchQuery}", filter: {filter}
          </div>
        )}
        {getFilteredVenues().length === 0 ? (
          <div className="text-center py-12 text-primary-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">
              {searchQuery ? `No venues found matching "${searchQuery}"` : 'No venues found'}
            </p>
            <p className="text-sm mt-2">
              {searchQuery ? 'Try a different search term' : 'Check back soon for special offers!'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-primary-500 hover:text-primary-400 underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          getFilteredVenues().map((venue: any) => {
            try {
              if (!venue || !venue._id) {
                console.warn('Invalid venue in list:', venue)
                return null
              }
              
              const activePromos = getActivePromotions(venue)
              const hasActivePromotions = activePromos.length > 0

              return (
                <div
                  key={venue._id}
                  onClick={() => {
                    try {
                      if (!venue.isGooglePlace && venue._id) {
                        setViewingVenueId(venue._id)
                      }
                    } catch (err) {
                      console.error('Error setting viewing venue:', err)
                    }
                  }}
                className={`bg-black/40 border rounded-lg overflow-hidden backdrop-blur-sm cursor-pointer hover:bg-primary-500/5 transition-colors ${
                  hasActivePromotions
                    ? 'border-primary-500/30 shadow-lg shadow-primary-500/10'
                    : 'border-primary-500/15'
                }`}
              >
                {/* Venue Header */}
                <div className="p-4 border-b border-primary-500/10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-primary-500 tracking-tight">{venue?.name || 'Unknown Venue'}</h3>
                        {venue.isGooglePlace && (
                          <span className="text-xs bg-primary-500/20 border border-primary-500/30 text-primary-500 px-2 py-0.5 rounded font-medium">
                            Google
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-primary-400 text-sm">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>
                          {venue.isGooglePlace 
                            ? (venue.address?.street || venue.address || '')
                            : `${venue.address?.street || ''} ${venue.address?.city || ''}, ${venue.address?.state || ''}`.trim()}
                        </span>
                      </div>
                    </div>
                    {(() => {
                      // Safely extract rating value
                      let ratingValue: number | null = null
                      let ratingCount: number | null = null
                      
                      if (typeof venue.rating === 'number') {
                        ratingValue = venue.rating
                      } else if (venue.rating && typeof venue.rating === 'object' && 'average' in venue.rating && typeof venue.rating.average === 'number') {
                        ratingValue = venue.rating.average
                        if ('count' in venue.rating && typeof venue.rating.count === 'number') {
                          ratingCount = venue.rating.count
                        }
                      }
                      
                      const displayCount = venue.user_ratings_total || ratingCount
                      
                      if (ratingValue === null && !displayCount) return null
                      
                      return (
                        <div className="flex items-center text-primary-500">
                          <Star className="w-4 h-4 fill-primary-500 mr-1" />
                          <span className="text-sm font-semibold">
                            {ratingValue !== null ? ratingValue.toFixed(1) : 'N/A'}
                          </span>
                          {displayCount && (
                            <span className="text-xs text-primary-400 ml-1">
                              ({displayCount})
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Active Promotions - Advertisement Focus */}
                {hasActivePromotions && (
                  <div className="bg-gradient-to-r from-primary-500/10 to-primary-500/5 border-y border-primary-500/20 p-4">
                    <div className="flex items-center mb-3">
                      <Tag className="w-5 h-5 text-primary-500 mr-2" />
                      <h4 className="font-bold text-primary-500 text-base tracking-tight">🔥 LIVE SPECIALS</h4>
                    </div>
                    <div className="space-y-3">
                      {activePromos.map((promo: any, idx: number) => (
                        <div key={idx} className="bg-black/40 border-2 border-primary-500/30 rounded-lg p-4 backdrop-blur-sm shadow-lg shadow-primary-500/10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-bold text-primary-500 text-base tracking-tight">{promo.title}</h5>
                                {promo.type === 'happy-hour' && (
                                  <span className="flex items-center text-xs text-black bg-primary-500 border border-primary-500 px-2 py-1 rounded-full font-bold animate-pulse">
                                    <Martini className="w-3 h-3 mr-1" />
                                    HAPPY HOUR
                                  </span>
                                )}
                                {promo.type === 'special' && (
                                  <span className="flex items-center text-xs text-black bg-primary-500 border border-primary-500 px-2 py-1 rounded-full font-bold">
                                    <Tag className="w-3 h-3 mr-1" />
                                    SPECIAL
                                  </span>
                                )}
                              </div>
                              {promo.discount && (
                                <div className="text-primary-400 text-sm font-semibold mb-1">
                                  {promo.discount}% OFF
                                </div>
                              )}
                            </div>
                          </div>
                          {promo.description && (
                            <p className="text-primary-300/90 text-sm mb-3 font-light leading-relaxed">{promo.description}</p>
                          )}
                          {(promo.startTime || promo.endTime) && (
                            <div className="flex items-center text-xs text-primary-400/80 mb-2">
                              <Clock className="w-3 h-3 mr-1" />
                              {promo.startTime && new Date(promo.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {promo.startTime && promo.endTime && ' - '}
                              {promo.endTime && new Date(promo.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {promo.schedule && Array.isArray(promo.schedule) && promo.schedule.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-primary-400/80">
                              <Clock className="w-3 h-3" />
                              {promo.schedule.map((s: any, i: number) => (
                                <span key={i} className="bg-black/30 px-2 py-1 rounded border border-primary-500/20">
                                  {s.days}: {s.start} - {s.end}
                                </span>
                              ))}
                            </div>
                          )}
                          {promo.validUntil && (
                            <div className="mt-2 text-xs text-primary-400/70">
                              Valid until: {new Date(promo.validUntil).toLocaleDateString()}
                            </div>
                          )}
                          {promo.discount && (
                            <div className="mt-2 text-primary-500 font-bold">
                              {promo.discount}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Promotions (if no active ones) */}
                {!hasActivePromotions && venue?.promotions && Array.isArray(venue.promotions) && venue.promotions.length > 0 && (
                  <div className="p-4 border-y border-primary-500/10">
                    <h4 className="font-semibold text-primary-400 text-sm mb-2">Upcoming Promotions</h4>
                    <div className="space-y-2">
                      {venue.promotions.slice(0, 2).map((promo: any, idx: number) => (
                        <div key={idx} className="text-primary-400 text-sm">
                          <Tag className="w-3 h-3 inline mr-1" />
                          {promo.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {!venue.isGooglePlace && (
                    <button
                      onClick={() => setViewingVenueId(venue._id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-500 text-black rounded-lg hover:bg-primary-600 transition-all font-medium"
                    >
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">View Profile</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Open Google Maps with directions
                      let url = ''
                      
                      if (venue.isGooglePlace && venue.location) {
                        // Use coordinates for Google Places
                        url = `https://www.google.com/maps/dir/?api=1&destination=${venue.location.latitude},${venue.location.longitude}`
                      } else if (venue.location?.latitude && venue.location?.longitude) {
                        // Use coordinates if available
                        url = `https://www.google.com/maps/dir/?api=1&destination=${venue.location.latitude},${venue.location.longitude}`
                      } else {
                        // Fall back to address search
                        const address = `${venue.address?.street || ''} ${venue.address?.city || ''}, ${venue.address?.state || ''}`.trim()
                        url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                      }
                      
                      // Open in new tab/window
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-black border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-500/10 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span className="text-sm font-medium">Directions</span>
                  </button>
                  {!venue.isGooglePlace && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedVenue(venue)
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-500/20 border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-all font-medium"
                    >
                      <Martini className="w-4 h-4" />
                      <span className="text-sm">Send Drink</span>
                    </button>
                  )}
                  {venue.isGooglePlace && (
                    <button
                      onClick={() => {
                        alert('This venue is from Google Maps. To send a drink, the venue needs to be registered on Shot On Me.')
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-500/20 border border-primary-500/30 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-all font-medium"
                      >
                        <Martini className="w-4 h-4" />
                        <span className="text-sm">Not Registered</span>
                      </button>
                  )}
                  <button
                    onClick={async () => {
                      const venueUrl = `${window.location.origin}/venues/${venue._id}`
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: venue.name,
                            text: `Check out ${venue.name} and their specials on Shot On Me!`,
                            url: venueUrl
                          })
                        } catch (err) {}
                      } else {
                        navigator.clipboard.writeText(venueUrl)
                        alert('Venue link copied!')
                      }
                    }}
                    className="px-4 py-2.5 bg-black border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-500/10 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              )
            } catch (error) {
              console.error('Error rendering venue card:', error, venue)
              return (
                <div key={venue?._id || Math.random()} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-500 text-sm">Error loading venue</p>
                </div>
              )
            }
          })
        )}
      </div>
      )}

      {/* Venue Profile Page */}
      {viewingVenueId && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
              <div className="text-center p-6">
                <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-primary-400 mb-4">Failed to load venue</p>
                <button
                  onClick={() => setViewingVenueId(null)}
                  className="bg-primary-500 text-black px-6 py-2 rounded-lg font-semibold"
                >
                  Go Back
                </button>
              </div>
            </div>
          }
        >
          <VenueProfilePage
            venueId={viewingVenueId}
            onClose={() => setViewingVenueId(null)}
          />
        </ErrorBoundary>
      )}

      {/* Venue Selection Modal - for sending drinks */}
      {selectedVenue && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-primary-500 mb-4">Send a Drink to {selectedVenue.name}</h3>
            <p className="text-primary-400 text-sm mb-4">
              This will redirect you to the Send Shot form with {selectedVenue.name} pre-selected.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Store venue data and navigate to profile tab
                  localStorage.setItem('selectedVenue', JSON.stringify({
                    id: selectedVenue._id,
                    name: selectedVenue.name,
                    address: selectedVenue.address?.street || '',
                    city: selectedVenue.address?.city || '',
                    state: selectedVenue.address?.state || '',
                    placeId: selectedVenue.placeId
                  }))
                  localStorage.setItem('profileAction', 'send-shot')
                  setSelectedVenue(null)
                  // Navigate to profile tab
                  if (setActiveTab) {
                    setActiveTab('profile')
                  } else {
                    window.location.hash = 'profile'
                    window.dispatchEvent(new Event('hashchange'))
                  }
                }}
                className="flex-1 bg-primary-500 text-black py-2.5 rounded-lg font-semibold hover:bg-primary-600"
              >
                Continue
              </button>
              <button
                onClick={() => setSelectedVenue(null)}
                className="flex-1 bg-black border border-primary-500 text-primary-500 py-2.5 rounded-lg font-semibold hover:bg-primary-500/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
