'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { MapPin, Clock, Tag, Star, Share2, Navigation, Martini, Users, Search, X, List, Map } from 'lucide-react'
import GoogleMapComponent from './GoogleMap'
import PlacesAutocomplete from './PlacesAutocomplete'

import { useApiUrl } from '../utils/api'

type Tab = 'feed' | 'map' | 'wallet' | 'profile'

interface MapTabProps {
  setActiveTab?: (tab: Tab) => void
}

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  'happy-hour':  { label: 'Happy Hour',   color: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  'flash-deal':  { label: 'Flash Deal',   color: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
  'special':     { label: 'Special',      color: 'bg-primary-500/10 border-primary-500/20 text-primary-500' },
  'exclusive':   { label: 'VIP',          color: 'bg-purple-500/20 border-purple-500/30 text-purple-400' },
  'event':       { label: 'Event',        color: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  'happy_hour':  { label: 'Happy Hour',   color: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  'flash_deal':  { label: 'Flash Deal',   color: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
}

export default function MapTab({ setActiveTab }: MapTabProps) {
  const API_URL = useApiUrl()
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [venues, setVenues] = useState<any[]>([])
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null)
  const [filter, setFilter] = useState<'all' | 'happy-hour' | 'specials'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [googlePlace, setGooglePlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [googlePlacesResults, setGooglePlacesResults] = useState<any[]>([])
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { const s = localStorage.getItem('som-amenity-filters'); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
  })
  const [showVibeDropdown, setShowVibeDropdown] = useState(false)
  const toggleAmenity = (key: string) => {
    setAmenityFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      try { localStorage.setItem('som-amenity-filters', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  useEffect(() => {
    if (token) {
      fetchVenues()
      getCurrentLocation()
    }
  }, [token])

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
          // Only log non-timeout errors (timeouts are expected on desktop)
          if (error.code !== error.TIMEOUT) {
            console.error('Geolocation error:', error)
          }
          // Silently handle timeout - it's expected on desktop browsers
        },
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 60000
        }
      )
    }
  }

  // Listen for real-time promotion updates
  useEffect(() => {
    if (!socket) return

    const handlePromotionUpdate = (data: { venueId: string; promotion: any }) => {
      setVenues((prevVenues) =>
        prevVenues.map((venue) =>
          venue._id === data.venueId
            ? { ...venue, promotions: [...(venue.promotions || []), data.promotion] }
            : venue
        )
      )
      if (token) {
        fetchVenues()
      }
    }

    const handleVenueUpdate = (data: { venueId: string; venue: any }) => {
      setVenues((prevVenues) =>
        prevVenues.map((venue) =>
          venue._id === data.venueId ? data.venue : venue
        )
      )
      if (token) {
        fetchVenues()
      }
    }

    socket.emit('join-room', 'promotions')
    socket.emit('join-room', 'venues')
    socket.on('promotion-updated', handlePromotionUpdate)
    socket.on('venue-updated', handleVenueUpdate)

    return () => {
      socket.off('promotion-updated', handlePromotionUpdate)
      socket.off('venue-updated', handleVenueUpdate)
    }
  }, [socket, token])

  const fetchVenues = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const fetchedVenues = response.data.venues || []
      // Deduplicate venues by name and location
      // Normalize venue names for comparison (remove apostrophes, lowercase, trim)
      const normalizeName = (name: string) => {
        return (name || '').toLowerCase()
          .replace(/[''""]/g, '') // Remove all apostrophe/quote variations
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }
      
      const seen: Record<string, any> = {}
      const uniqueVenues = fetchedVenues.filter((venue: any) => {
        // Filter out "Kate's Venue" - only show "Kate's Pub"
        const normalizedName = normalizeName(venue.name)
        
        // Check for variations of "Kate's Venue" (after normalization, apostrophes are removed)
        // So "kate's venue" becomes "kates venue", "kate venue" also matches
        const isKatesVenue = normalizedName === "kates venue" || 
                             normalizedName === "kate venue" ||
                             normalizedName.includes("kate") && normalizedName.includes("venue") && !normalizedName.includes("pub")
        
        if (isKatesVenue) {
          return false
        }
        
        // If we've seen this venue name before, check if it's a duplicate
        if (seen[normalizedName]) {
          const existing = seen[normalizedName]
          
          // If both have locations, check if they're the same location (within 100m)
          if (venue.location?.latitude && venue.location?.longitude && 
              existing.location?.latitude && existing.location?.longitude) {
            const distance = calculateDistance(
              venue.location.latitude,
              venue.location.longitude,
              existing.location.latitude,
              existing.location.longitude
            )
            // If same name and same location (within 100m), it's a duplicate
            if (distance < 0.1) {
              return false
            }
          } else {
            // Same normalized name but no location or different location - keep the first one
            return false
          }
        }
        
        seen[normalizedName] = venue
        return true
      })
      
      setVenues(uniqueVenues)
    } catch (error) {
      console.error('Failed to fetch venues:', error)
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
    // Helper function to normalize venue names
    const normalizeName = (name: string) => {
      return (name || '').toLowerCase()
        .replace(/[''""]/g, '') // Remove all apostrophe/quote variations
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }
    
    // First, filter out "Kate's Venue" from the venues list
    let filtered = venues.filter((venue: any) => {
      const normalizedName = normalizeName(venue.name)
      
      // Check for variations of "Kate's Venue" (after normalization, apostrophes are removed)
      const isKatesVenue = normalizedName === "kates venue" || 
                           normalizedName === "kate venue" ||
                           (normalizedName.includes("kate") && normalizedName.includes("venue") && !normalizedName.includes("pub"))
      
      if (isKatesVenue) {
        return false
      }
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
        return matches
      })
      
    }

    // Apply amenity filters (AND logic)
    if (amenityFilters.size > 0) {
      filtered = filtered.filter(venue => {
        const a = venue.amenities || {}
        return Array.from(amenityFilters).every(key => a[key] === true)
      })
    }

    // Apply promotion filter
    if (filter === 'all') return filtered
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
    const now = new Date()
    const dayOfWeek = now.getDay()
    const currentTime = now.getHours() * 100 + now.getMinutes()

    return (venue.promotions || []).filter((promo: any) => {
      if (!promo.isActive) return false

      // Check hard expiry (flash deals use flashDealEndsAt; others use endTime)
      const expiryTime = (promo.isFlashDeal && promo.flashDealEndsAt)
        ? new Date(promo.flashDealEndsAt)
        : (promo.endTime ? new Date(promo.endTime) : null)
      if (expiryTime && now >= expiryTime) return false

      // Check schedule window if present
      if (promo.schedule) {
        const schedule = promo.schedule[dayOfWeek]
        if (schedule && schedule.start && schedule.end) {
          const start = parseInt(schedule.start.replace(':', ''))
          const end = parseInt(schedule.end.replace(':', ''))
          return currentTime >= start && currentTime < end
        }
      }
      return true
    })
  }

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
        onClick: () => setSelectedVenue(venue)
      }))
  }, [venues, filter, searchQuery, googlePlace, amenityFilters])

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
        
        {/* Filter Tabs and View Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 border border-primary-500/20 text-primary-400 hover:text-primary-500 hover:border-primary-500/30 backdrop-blur-sm'
              }`}
            >
              All Venues
            </button>
            <button
              onClick={() => setFilter('happy-hour')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === 'happy-hour'
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 border border-primary-500/20 text-primary-400 hover:text-primary-500 hover:border-primary-500/30 backdrop-blur-sm'
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline mr-1.5" />
              Happy Hour
            </button>
            <button
              onClick={() => setFilter('specials')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === 'specials'
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 border border-primary-500/20 text-primary-400 hover:text-primary-500 hover:border-primary-500/30 backdrop-blur-sm'
              }`}
            >
              <Tag className="w-3.5 h-3.5 inline mr-1.5" />
              Specials
            </button>
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

        {/* Vibes dropdown filter */}
        <div className="relative mb-3">
          <button
            onClick={() => setShowVibeDropdown(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              amenityFilters.size > 0
                ? 'bg-primary-500/15 border border-primary-500/40 text-primary-400'
                : 'bg-black/40 border border-primary-500/20 text-primary-400/60'
            }`}
          >
            Vibes {amenityFilters.size > 0 && `(${amenityFilters.size})`}
            <span className={`text-[10px] transition-transform ${showVibeDropdown ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showVibeDropdown && (
            <div className="absolute top-full left-0 mt-1.5 z-30 rounded-xl border border-primary-500/20 bg-black/95 backdrop-blur-md shadow-xl p-3 w-72">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/50">Filter by vibe</p>
                {amenityFilters.size > 0 && (
                  <button onClick={() => { setAmenityFilters(new Set()); try { localStorage.removeItem('som-amenity-filters') } catch {} ; setShowVibeDropdown(false) }} className="text-[10px] font-semibold text-red-400">
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { key: 'dogFriendly',    label: '🐕 Dogs OK' },
                  { key: 'kidsFriendly',   label: '👶 Kids OK' },
                  { key: 'hasFood',        label: '🍕 Food' },
                  { key: 'byob',           label: '🥂 BYOB' },
                  { key: 'trivia',         label: '🎯 Trivia' },
                  { key: 'liveMusic',      label: '🎵 Live Music' },
                  { key: 'outdoorSeating', label: '🌿 Outdoor' },
                  { key: 'happyHour',      label: '🍺 Happy Hr' },
                  { key: 'poolTables',     label: '🎱 Pool' },
                  { key: 'danceFloor',     label: '🕺 Dancing' },
                  { key: 'sportsTv',       label: '📺 Sports' },
                  { key: 'karaoke',        label: '🎤 Karaoke' },
                  { key: 'arcade',         label: '🎮 Arcade' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleAmenity(key)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      amenityFilters.has(key)
                        ? 'bg-primary-500/20 border border-primary-500/50 text-primary-400'
                        : 'bg-black/40 border border-primary-500/10 text-primary-400/50'
                    }`}
                  >
                    {label}
                    {amenityFilters.has(key) && <span className="ml-auto text-primary-500">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          getFilteredVenues().map((venue) => {
            const activePromos = getActivePromotions(venue)
            const hasActivePromotions = activePromos.length > 0

            return (
              <div
                key={venue._id}
                className={`bg-black/40 border rounded-lg overflow-hidden backdrop-blur-sm ${
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
                        <h3 className="text-lg font-semibold text-primary-500 tracking-tight">{venue.name}</h3>
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
                    {(venue.rating || venue.user_ratings_total) && (
                      <div className="flex items-center text-primary-500">
                        <Star className="w-4 h-4 fill-primary-500 mr-1" />
                        <span className="text-sm font-semibold">{typeof venue.rating === 'number' ? venue.rating.toFixed(1) : venue.rating || 'N/A'}</span>
                        {venue.user_ratings_total && (
                          <span className="text-xs text-primary-400 ml-1">({venue.user_ratings_total})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Promotions - Advertisement Focus */}
                {hasActivePromotions && (
                  <div className="bg-primary-500/5 border-y border-primary-500/15 p-4">
                    <div className="flex items-center mb-3">
                      <Tag className="w-4 h-4 text-primary-500 mr-2" />
                      <h4 className="font-semibold text-primary-500 text-sm tracking-tight">Current Specials</h4>
                    </div>
                    <div className="space-y-3">
                      {activePromos.map((promo: any, idx: number) => (
                        <div key={idx} className="bg-black/30 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-primary-500 text-sm tracking-tight">{promo.title}</h5>
                            {(() => {
                              const t = TYPE_LABEL[promo.type]
                              return t ? (
                                <span className={`flex items-center text-xs border px-2 py-1 rounded font-medium ${t.color}`}>
                                  <Clock className="w-3 h-3 mr-1" />
                                  {t.label}
                                </span>
                              ) : null
                            })()}
                          </div>
                          <p className="text-primary-400/80 text-sm mb-2 font-light">{promo.description || promo.message}</p>
                          {promo.schedule && (
                            <div className="flex items-center text-xs text-primary-400">
                              <Clock className="w-3 h-3 mr-1" />
                              {promo.schedule.map((s: any, i: number) => (
                                <span key={i} className="mr-2">
                                  {s.days}: {s.start} - {s.end}
                                </span>
                              ))}
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
                {!hasActivePromotions && venue.promotions && venue.promotions.length > 0 && (
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
                <div className="p-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
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
                      onClick={() => setSelectedVenue(venue)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-500 text-black rounded-lg hover:bg-primary-600 transition-all font-medium"
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
          })
        )}
      </div>
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
