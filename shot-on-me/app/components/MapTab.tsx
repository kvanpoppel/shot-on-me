'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { MapPin, Clock, Tag, Star, Share2, Navigation, Martini, Users, Search, X, List, Map, ChevronDown, TrendingUp, Moon, Loader2, AlertCircle, RefreshCw, Settings, User, ThermometerSun } from 'lucide-react'
import GoogleMapComponent from './GoogleMap'
import PlacesAutocomplete from './PlacesAutocomplete'
import VenueProfilePage from './VenueProfilePage'
import { ErrorBoundary } from './ErrorBoundary'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'
import { useApiUrl } from '../utils/api'
import { Tab } from '@/app/types'

interface MapTabProps {
  setActiveTab?: (tab: Tab) => void
  onViewProfile?: (userId: string) => void
  activeTab?: Tab
  onOpenSettings?: () => void
}

export default function MapTab({ setActiveTab, onViewProfile, activeTab, onOpenSettings }: MapTabProps) {
  const API_URL = useApiUrl()
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const { isLoaded: mapsLoaded } = useGoogleMaps()
  const [venues, setVenues] = useState<any[]>([])
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null)
  const [viewingVenueId, setViewingVenueId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'happy-hour' | 'specials' | 'trending' | 'tonight'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map')
  
  // Auto-switch to map view when tab becomes active
  useEffect(() => {
    if (activeTab === 'map' && viewMode === 'list') {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setViewMode('map')
      }, 100)
    }
  }, [activeTab, viewMode])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [googlePlace, setGooglePlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [showFriends, setShowFriends] = useState(true)
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null)
  const [currentCity, setCurrentCity] = useState<string>('Indianapolis')
  const [explorationPercent, setExplorationPercent] = useState<number>(45.1)
  const [temperature, setTemperature] = useState<number>(73)

  const fetchTrendingVenues = useCallback(async () => {
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
  }, [token, API_URL])

  const fetchFriends = useCallback(async () => {
    if (!token || !API_URL) return
    try {
      const response = await axios.get(`${API_URL}/location/friends`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      setFriends(response.data.friends || [])
    } catch (error) {
      console.error('Failed to fetch friends:', error)
      setFriends([])
    }
  }, [token, API_URL])

  const getCurrentLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not available in this browser')
      return
    }

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

    // If denied, inform user but don't block
    if (permissionStatus === 'denied') {
      console.warn('Location permission denied. Please enable it in Settings → Device Permissions.')
      return
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Geolocation error:', error.message || error)
          if (error.code === error.PERMISSION_DENIED) {
            console.warn('Location permission denied. Please enable it in Settings → Device Permissions.')
          } else if (error.code === error.TIMEOUT) {
            console.warn('Location request timed out. This is normal if location services are slow.')
          }
        },
        {
          enableHighAccuracy: false, // Use less accurate but faster location
          timeout: 15000, // Increased to 15 seconds
          maximumAge: 300000 // Accept cached location up to 5 minutes old
        }
      )
    } catch (error) {
      console.warn('Geolocation request failed:', error)
    }
  }, [])

  const fetchVenues = useCallback(async () => {
    if (!token || !API_URL) {
      console.warn('Cannot fetch venues: missing token or API_URL', { token: !!token, API_URL })
      return
    }
    try {
      setError(null)
      console.log('🔍 Fetching venues from:', `${API_URL}/venues`)
      console.log('🔍 User info:', { userId: (user as any)?.id || (user as any)?._id, userType: (user as any)?.userType })
      
      const response = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      
      console.log('📦 API Response:', {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        hasVenues: !!response.data.venues,
        venuesCount: response.data.venues?.length || (Array.isArray(response.data) ? response.data.length : 0)
      })
      
      const fetchedVenues = Array.isArray(response.data) ? response.data : (response.data.venues || [])
      console.log('📋 Fetched venues count:', fetchedVenues.length)
      
      // Normalize venue names for comparison
      const normalizeName = (name: string) => {
        return (name || '').toLowerCase()
          .replace(/[''""]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }
      
      // Keep all venues - only filter out "Kate's Venue" (not "Kate's Pub" or "Paige's Pub")
      const uniqueVenues = fetchedVenues.filter((venue: any) => {
        const normalizedName = normalizeName(venue.name)
        // Only filter out "Kate's Venue" specifically (keep "Kate's Pub" and "Paige's Pub")
        const isKatesVenue = normalizedName === "kates venue" || normalizedName === "kate venue"
        // Always keep Kate's Pub and Paige's Pub (test venues)
        const isKatesPub = normalizedName === "kates pub" || normalizedName === "kate pub"
        const isPaigesPub = normalizedName === "paiges pub" || normalizedName === "paige pub"
        // Keep if it's NOT Kate's Venue, OR if it IS Kate's Pub or Paige's Pub
        return !isKatesVenue || isKatesPub || isPaigesPub
      })
      
      // Normalize rating objects to numbers and transform location format
      const normalizedVenues = uniqueVenues.map((venue: any) => {
        const normalized = { ...venue }
        
        // Normalize rating
        if (normalized.rating && typeof normalized.rating === 'object' && 'average' in normalized.rating) {
          normalized.rating = typeof normalized.rating.average === 'number' ? normalized.rating.average : null
        }
        
        // Transform location from GeoJSON format [longitude, latitude] to { latitude, longitude }
        if (normalized.location) {
          if (normalized.location.coordinates && Array.isArray(normalized.location.coordinates) && normalized.location.coordinates.length === 2) {
            // GeoJSON format: [longitude, latitude]
            const [longitude, latitude] = normalized.location.coordinates
            normalized.location = {
              ...normalized.location,
              latitude: latitude,
              longitude: longitude
            }
          } else if (!normalized.location.latitude || !normalized.location.longitude) {
            // If location doesn't have latitude/longitude, try to extract from coordinates
            console.warn(`Venue ${venue.name} has invalid location format:`, normalized.location)
          }
        }
        
        return normalized
      })
      
      console.log('✅ Normalized venues count:', normalizedVenues.length)
      if (normalizedVenues.length > 0) {
        console.log('📍 Venue names:', normalizedVenues.map((v: any) => v.name))
      }
      setVenues(normalizedVenues)
    } catch (error: any) {
      console.error('❌ Failed to fetch venues:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      setError('Failed to load venues. Please try again.')
      setVenues([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, API_URL])

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  const getFilteredVenues = useMemo(() => {
    if (!Array.isArray(venues)) return []
    
    let filtered = venues

    // Apply Google Place if selected
    if (googlePlace && googlePlace.geometry?.location) {
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
        rating: typeof googlePlace.rating === 'number' ? googlePlace.rating : null,
        user_ratings_total: googlePlace.user_ratings_total,
        isGooglePlace: true,
        placeId: googlePlace.place_id,
        types: googlePlace.types
      }
      
      // Try to match with existing venues
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
        filtered = [matchingVenue, ...filtered.filter(v => v._id !== matchingVenue._id)]
      } else {
        filtered = [googlePlaceVenue, ...filtered]
      }
    }

    // Apply search filter
    if (searchQuery.trim() && !googlePlace) {
      const normalize = (str: string) => {
        if (!str) return ''
        return str.toLowerCase().replace(/[''""]/g, '').replace(/\s+/g, ' ').trim()
      }
      
      const query = normalize(searchQuery)
      filtered = filtered.filter((venue) => {
        const name = normalize(venue.name || '')
        const city = normalize(venue.address?.city || '')
        const state = normalize(venue.address?.state || '')
        const street = normalize(venue.address?.street || '')
        const description = normalize(venue.description || '')
        
        const queryWords = query.split(' ').filter(w => w.length > 0)
        const allFields = `${name} ${city} ${state} ${street} ${description}`
        return queryWords.every(word => allFields.includes(word))
      })
    }

    // Apply promotion filter
    if (filter === 'all') return filtered
    if (filter === 'trending') {
      const trendingIds = new Set(trendingVenues.map(v => v._id?.toString()))
      return filtered.filter(venue => trendingIds.has(venue._id?.toString()))
    }
    if (filter === 'tonight') {
      const now = new Date()
      const currentHour = now.getHours()
      const dayOfWeek = now.getDay()
      
      return filtered.filter((venue) => {
        const promotions = venue.promotions || []
        return promotions.some((p: any) => {
          if (p.schedule && Array.isArray(p.schedule)) {
            const todaySchedule = p.schedule.find((s: any) => {
              const scheduleDays = s.days?.toLowerCase() || ''
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
              const todayName = dayNames[dayOfWeek]
              return scheduleDays.includes(todayName)
            })
            
            if (todaySchedule) {
              const startTime = todaySchedule.start ? parseInt(todaySchedule.start.replace(':', '')) : 0
              const endTime = todaySchedule.end ? parseInt(todaySchedule.end.replace(':', '')) : 2359
              const currentTime = currentHour * 100 + now.getMinutes()
              const isEvening = currentHour >= 17 || currentHour < 2
              return isEvening && currentTime >= startTime && currentTime <= endTime
            }
          }
          
          if (p.isActive) {
            const title = (p.title || '').toLowerCase()
            const description = (p.description || '').toLowerCase()
            return title.includes('tonight') || title.includes('evening') || description.includes('tonight') || description.includes('evening')
          }
          
          return false
        })
      })
    }
    // Filter for happy-hour or specials with improved logic
    return filtered.filter((venue) => {
      const promotions = venue.promotions || []
      if (filter === 'happy-hour') {
        return promotions.some((p: any) => {
          if (!p.isActive) return false
          const isHappyHourType = p.type === 'happy-hour'
          const hasHappyHourTitle = p.title?.toLowerCase().includes('happy hour')
          // Check schedule if available
          if (p.schedule && Array.isArray(p.schedule)) {
            const now = new Date()
            const dayOfWeek = now.getDay()
            const todaySchedule = p.schedule.find((s: any) => {
              const scheduleDays = s.days?.toLowerCase() || ''
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
              const todayName = dayNames[dayOfWeek]
              return scheduleDays.includes(todayName)
            })
            if (todaySchedule) {
              const currentTime = now.getHours() * 100 + now.getMinutes()
              const startTime = todaySchedule.start ? parseInt(todaySchedule.start.replace(':', '')) : 0
              const endTime = todaySchedule.end ? parseInt(todaySchedule.end.replace(':', '')) : 2359
              return (isHappyHourType || hasHappyHourTitle) && currentTime >= startTime && currentTime <= endTime
            }
          }
          return isHappyHourType || hasHappyHourTitle
        })
      } else if (filter === 'specials') {
        return promotions.some((p: any) => {
          if (!p.isActive) return false
          const isSpecialType = p.type === 'special'
          const hasSpecialTitle = p.title?.toLowerCase().includes('special')
          // Check schedule if available
          if (p.schedule && Array.isArray(p.schedule)) {
            const now = new Date()
            const dayOfWeek = now.getDay()
            const todaySchedule = p.schedule.find((s: any) => {
              const scheduleDays = s.days?.toLowerCase() || ''
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
              const todayName = dayNames[dayOfWeek]
              return scheduleDays.includes(todayName)
    })
            if (todaySchedule) {
              const currentTime = now.getHours() * 100 + now.getMinutes()
              const startTime = todaySchedule.start ? parseInt(todaySchedule.start.replace(':', '')) : 0
              const endTime = todaySchedule.end ? parseInt(todaySchedule.end.replace(':', '')) : 2359
              return (isSpecialType || hasSpecialTitle) && currentTime >= startTime && currentTime <= endTime
            }
          }
          return isSpecialType || hasSpecialTitle
        })
      }
      return false
    })
  }, [venues, filter, searchQuery, googlePlace, trendingVenues, calculateDistance])

  const getActivePromotions = useCallback((venue: any) => {
    if (!venue) return []
    
    const now = new Date()
    const dayOfWeek = now.getDay()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    return (venue.promotions || []).filter((promo: any) => {
      if (promo.schedule) {
        const schedule = promo.schedule[dayOfWeek]
        if (schedule && schedule.start && schedule.end) {
          const start = parseInt(schedule.start.replace(':', ''))
          const end = parseInt(schedule.end.replace(':', ''))
          return currentTime >= start && currentTime <= end
        }
      }
      return promo.isActive !== false
    })
  }, [])

  // Real-time friend location updates
  useEffect(() => {
    if (!socket) return

    const handleLocationUpdate = (data: { userId: string; location: any }) => {
      setFriends((prevFriends) =>
        prevFriends.map((friend) =>
          (friend._id === data.userId || friend.id === data.userId)
            ? { ...friend, location: data.location }
            : friend
        )
      )
    }

    socket.on('location-updated', handleLocationUpdate)
    socket.on('friend-location-update', handleLocationUpdate)

    return () => {
      socket.off('location-updated', handleLocationUpdate)
      socket.off('friend-location-update', handleLocationUpdate)
    }
  }, [socket])

  // Fetch data on mount
  useEffect(() => {
    if (token && API_URL) {
      fetchVenues()
      fetchTrendingVenues()
      fetchFriends()
      getCurrentLocation()
    }
  }, [token, API_URL, fetchVenues, fetchTrendingVenues, fetchFriends, getCurrentLocation])

  // Create friend avatar markers (like Snapchat Bitmojis)
  const friendMarkers = useMemo(() => {
    if (!showFriends || !mapsLoaded || typeof google === 'undefined' || !google.maps) return []
    
    return friends
      .filter((friend) => friend.location?.latitude && friend.location?.longitude && friend.location?.isVisible)
      .map((friend) => {
        // Create circular avatar icon from profile picture
        let iconConfig: any = undefined
        
        if (friend.profilePicture) {
          // Use profile picture as circular marker
          iconConfig = {
            url: friend.profilePicture,
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 25),
            // Add border styling via custom icon
            shape: { type: 'circle', coords: [25, 25, 25] }
          }
        } else {
          // Fallback: create colored circle with initials
          const initials = `${friend.firstName?.[0] || ''}${friend.lastName?.[0] || ''}`.toUpperCase() || '?'
          // Create a data URL for a circular avatar with initials
          const canvas = document.createElement('canvas')
          canvas.width = 50
          canvas.height = 50
          const ctx = canvas.getContext('2d')
          if (ctx) {
            // Draw circle background
            ctx.beginPath()
            ctx.arc(25, 25, 25, 0, 2 * Math.PI)
            ctx.fillStyle = '#D4AF37' // Gold color
            ctx.fill()
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 3
            ctx.stroke()
            // Draw initials
            ctx.fillStyle = '#000000'
            ctx.font = 'bold 20px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(initials, 25, 25)
          }
          iconConfig = {
            url: canvas.toDataURL(),
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 25)
          }
        }
        
        // Create label with name and timestamp
        const friendName = friend.firstName || friend.name?.split(' ')[0] || 'Friend'
        const timeLabel = friend.timeLabel || 'now'
        const isActive = timeLabel === 'now' || (timeLabel.includes('m') && parseInt(timeLabel) < 60)
        
        return {
          id: `friend-${friend._id || friend.id}`,
          position: {
            lat: friend.location.latitude,
            lng: friend.location.longitude
          },
          title: `${friend.firstName} ${friend.lastName} - ${timeLabel}`,
          icon: iconConfig,
          label: {
            text: `${friendName} ${isActive ? '🟢' : ''} ${timeLabel}`,
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '11px',
            className: 'friend-marker-label'
          },
          onClick: () => setSelectedFriend(friend)
        }
      })
  }, [friends, showFriends, mapsLoaded])

  // Memoize venue markers for map with enhanced styling
  const venueMarkers = useMemo(() => {
    return getFilteredVenues
      .filter((venue) => venue.location?.latitude && venue.location?.longitude)
      .map((venue) => {
        const hasActivePromotions = (venue.promotions || []).some((p: any) => {
          if (!p.isActive) return false
          const now = new Date()
          const dayOfWeek = now.getDay()
          if (p.schedule && Array.isArray(p.schedule)) {
            const todaySchedule = p.schedule.find((s: any) => {
              const scheduleDays = s.days?.toLowerCase() || ''
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
              const todayName = dayNames[dayOfWeek]
              return scheduleDays.includes(todayName)
            })
            if (todaySchedule) {
              const currentTime = now.getHours() * 100 + now.getMinutes()
              const startTime = todaySchedule.start ? parseInt(todaySchedule.start.replace(':', '')) : 0
              const endTime = todaySchedule.end ? parseInt(todaySchedule.end.replace(':', '')) : 2359
              return currentTime >= startTime && currentTime <= endTime
            }
          }
          return p.isActive
        })
        
        // Create custom marker icon with gold color
        // Use SVG path for better control
        const markerIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: hasActivePromotions ? 10 : 8,
          fillColor: hasActivePromotions ? '#D4AF37' : '#B8945A',
          fillOpacity: 1,
          strokeColor: '#000000',
          strokeWeight: 2
        }
        
        return {
        id: venue._id,
        position: {
          lat: venue.location.latitude,
          lng: venue.location.longitude
        },
        title: venue.name || 'Venue',
          label: hasActivePromotions ? {
            text: '🔥',
            color: '#000000',
            fontWeight: 'bold',
            fontSize: '16px'
          } : {
            text: venue.name?.[0]?.toUpperCase() || 'V',
            color: '#000000',
            fontWeight: 'bold',
            fontSize: '12px'
          },
          icon: markerIcon,
        onClick: () => setViewingVenueId(venue._id)
        }
      })
  }, [getFilteredVenues])

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchVenues(),
        fetchTrendingVenues(),
        fetchFriends(),
        getCurrentLocation()
      ])
    } catch (error) {
      console.error('Error refreshing map data:', error)
    } finally {
      setTimeout(() => {
        setRefreshing(false)
      }, 1000)
    }
  }, [fetchVenues, fetchTrendingVenues, fetchFriends, getCurrentLocation])

  return (
    <div className="min-h-screen pb-16 bg-black max-w-4xl mx-auto">
      {/* Header - Screenshot Design */}
      {viewMode === 'map' ? (
        <div className="bg-black/95 backdrop-blur-md border-b border-primary-500/10 sticky top-0 z-20 p-4">
          {/* Location Bar with Profile and Settings */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {/* Profile Icon */}
            <button
              onClick={() => onViewProfile && user && onViewProfile((user as any)._id || (user as any).id)}
              className="flex-shrink-0"
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.firstName || 'Profile'}
                  className="w-10 h-10 rounded-full border-2 border-primary-500/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-500/20 border-2 border-primary-500/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-500" />
                </div>
              )}
            </button>
            
            {/* Location Bar */}
            <div className="flex-1 max-w-md bg-white rounded-xl px-4 py-3 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 text-black" />
              <span className="text-black font-semibold text-base">{currentCity}</span>
            </div>
            
            {/* Settings Icon */}
            <button
              onClick={() => onOpenSettings?.()}
              className="flex-shrink-0 p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          
          {/* Exploration and Temperature */}
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-full px-3 py-1">
              <span className="text-purple-400 text-sm font-semibold">{explorationPercent}% Explored</span>
            </div>
            <div className="flex items-center gap-1 text-primary-400">
              <ThermometerSun className="w-4 h-4" />
              <span className="text-sm font-semibold">{temperature} °F</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-black/95 backdrop-blur-md border-b border-primary-500/10 sticky top-0 z-20 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-primary-500 tracking-tight">Venues</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all disabled:opacity-50"
              title="Refresh venues"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Search Bar - Only for List View */}
          <div className="relative mb-3">
            <PlacesAutocomplete
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value)
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
          <div className="flex items-center justify-between">
            <div className="relative filter-dropdown-container">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50 rounded-xl backdrop-blur-sm transition-all"
              >
                <span className="text-sm font-semibold">
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
                  {filter === 'tonight' && (
                    <>
                      <Moon className="w-3.5 h-3.5 inline mr-1.5" />
                      Tonight's Specials
                    </>
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-black/95 border border-primary-500/30 rounded-xl shadow-2xl z-30 min-w-[240px] backdrop-blur-md overflow-hidden">
                  <button
                    onClick={() => {
                      setFilter('all')
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all ${
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
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center ${
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
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center ${
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
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center ${
                      filter === 'specials'
                        ? 'bg-primary-500/20 text-primary-500'
                        : 'text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
                    }`}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Specials
                  </button>
                  <div className="border-t border-primary-500/20 my-1"></div>
                  <button
                    onClick={() => {
                      setFilter('tonight')
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all flex items-center ${
                      filter === 'tonight'
                        ? 'bg-primary-500/20 text-primary-500'
                        : 'text-primary-400 hover:bg-primary-500/10 hover:text-primary-500'
                    }`}
                  >
                    <Moon className="w-4 h-4 mr-2 text-primary-500" />
                    Tonight's Specials
                  </button>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <List className="w-4 h-4 inline mr-1.5" />
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  (viewMode as string) === 'map'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <Map className="w-4 h-4 inline mr-1.5" />
                Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-red-400/70 hover:text-red-400 text-xs underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="h-[calc(100vh-16rem)] relative">
          {!mapsLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center text-primary-400">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-500" />
                <p className="text-lg font-semibold">Loading map...</p>
              </div>
            </div>
          ) : userLocation || (venueMarkers.length > 0 && venueMarkers[0]?.position) ? (
            <div className="relative w-full h-full">
            <GoogleMapComponent
                center={userLocation || {
                  lat: venueMarkers[0]?.position?.lat || 39.7684,
                  lng: venueMarkers[0]?.position?.lng || -86.1581
                }}
                zoom={venueMarkers.length > 0 ? 13 : 12}
              markers={[...venueMarkers, ...friendMarkers]}
              mapContainerStyle={{ width: '100%', height: '100%' }}
            />
              {/* Map Legend */}
              {(venueMarkers.length > 0 || friendMarkers.length > 0) && (
                <div className="absolute top-4 right-4 bg-black/90 backdrop-blur-md border border-primary-500/30 rounded-xl p-3 shadow-lg z-10">
                  <div className="text-xs text-primary-400 mb-2 font-semibold">Legend</div>
                  <div className="space-y-2">
                    {venueMarkers.length > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-primary-500 border-2 border-black"></div>
                          <span className="text-xs text-primary-400">Active Specials</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-primary-400 border-2 border-black"></div>
                          <span className="text-xs text-primary-400">Regular Venue</span>
                        </div>
                      </>
                    )}
                    {friendMarkers.length > 0 && (
                      <>
                        {venueMarkers.length > 0 && <div className="border-t border-primary-500/20 my-2"></div>}
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-primary-500/20 border-2 border-primary-500"></div>
                          <span className="text-xs text-primary-400">Friends</span>
                        </div>
                        <button
                          onClick={() => setShowFriends(!showFriends)}
                          className="w-full mt-2 px-2 py-1 text-xs bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 rounded-lg transition-all"
                        >
                          {showFriends ? 'Hide' : 'Show'} Friends
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center text-primary-400 max-w-sm mx-4">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50 text-primary-500" />
                <p className="text-lg font-semibold mb-2 text-primary-500">Location Access Needed</p>
                <p className="text-sm mb-6 text-primary-400/80">Please allow location access to see venues on the map</p>
                <button
                  onClick={getCurrentLocation}
                  className="bg-primary-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30"
                >
                  Enable Location
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
      <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
                <p className="text-primary-400">Loading venues...</p>
          </div>
            </div>
          ) : getFilteredVenues.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-primary-500/30" />
              <p className="text-lg font-semibold text-primary-400 mb-2">
              {searchQuery ? `No venues found matching "${searchQuery}"` : 'No venues found'}
            </p>
              <p className="text-sm text-primary-400/70 mb-4">
              {searchQuery ? 'Try a different search term' : 'Check back soon for special offers!'}
            </p>
            {searchQuery && (
              <button
                  onClick={() => {
                    setSearchQuery('')
                    setGooglePlace(null)
                  }}
                  className="text-primary-500 hover:text-primary-400 underline font-semibold"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
            getFilteredVenues.map((venue: any) => {
              if (!venue || !venue._id) return null
              
              const activePromos = getActivePromotions(venue)
              const hasActivePromotions = activePromos.length > 0
              const distance = userLocation && venue.location?.latitude && venue.location?.longitude
                ? calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    venue.location.latitude,
                    venue.location.longitude
                  )
                : null

              return (
                <div
                  key={venue._id}
                  onClick={() => {
                      if (!venue.isGooglePlace && venue._id) {
                        setViewingVenueId(venue._id)
                    }
                  }}
                  className={`bg-black/40 border rounded-2xl overflow-hidden backdrop-blur-sm cursor-pointer hover:bg-primary-500/5 transition-all ${
                  hasActivePromotions
                      ? 'border-primary-500/40 shadow-lg shadow-primary-500/20'
                      : 'border-primary-500/20'
                }`}
              >
                {/* Venue Header */}
                  <div className="p-5 border-b border-primary-500/10">
                  <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-xl font-bold text-primary-500 tracking-tight truncate">{venue?.name || 'Unknown Venue'}</h3>
                        {venue.isGooglePlace && (
                            <span className="text-xs bg-primary-500/20 border border-primary-500/30 text-primary-500 px-2 py-1 rounded-lg font-semibold flex-shrink-0">
                            Google
                          </span>
                        )}
                      </div>
                        <div className="flex items-center text-primary-400/80 text-sm mb-2">
                          <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                          <span className="truncate">
                          {venue.isGooglePlace 
                            ? (venue.address?.street || venue.address || '')
                            : `${venue.address?.street || ''} ${venue.address?.city || ''}, ${venue.address?.state || ''}`.trim()}
                        </span>
                      </div>
                        {distance !== null && (
                          <p className="text-primary-400/60 text-xs">
                            {distance < 1 ? `${(distance * 1000).toFixed(0)}m away` : `${distance.toFixed(1)}km away`}
                          </p>
                        )}
                    </div>
                    {(() => {
                      const ratingValue: number | null = typeof venue.rating === 'number' ? venue.rating : null
                      const displayCount = venue.user_ratings_total
                      
                      if (ratingValue === null && !displayCount) return null
                      
                      return (
                          <div className="flex items-center text-primary-500 flex-shrink-0 ml-3">
                          <Star className="w-4 h-4 fill-primary-500 mr-1" />
                            <span className="text-sm font-bold">
                            {ratingValue !== null ? ratingValue.toFixed(1) : 'N/A'}
                          </span>
                          {displayCount && (
                              <span className="text-xs text-primary-400/70 ml-1">
                              ({displayCount})
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                  {/* Active Promotions */}
                {hasActivePromotions && (
                    <div className="bg-gradient-to-r from-primary-500/15 to-primary-500/5 border-y border-primary-500/20 p-5">
                    <div className="flex items-center mb-3">
                      <Tag className="w-5 h-5 text-primary-500 mr-2" />
                        <h4 className="font-bold text-primary-500 text-base">🔥 LIVE SPECIALS</h4>
                    </div>
                    <div className="space-y-3">
                      {activePromos.map((promo: any, idx: number) => (
                          <div key={idx} className="bg-black/50 border-2 border-primary-500/40 rounded-xl p-4 backdrop-blur-sm shadow-lg shadow-primary-500/10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-bold text-primary-500 text-base">{promo.title}</h5>
                                {promo.type === 'happy-hour' && (
                                    <span className="flex items-center text-xs text-black bg-primary-500 border border-primary-500 px-2.5 py-1 rounded-full font-bold animate-pulse">
                                    <Martini className="w-3 h-3 mr-1" />
                                    HAPPY HOUR
                                  </span>
                                )}
                                {promo.type === 'special' && (
                                    <span className="flex items-center text-xs text-black bg-primary-500 border border-primary-500 px-2.5 py-1 rounded-full font-bold">
                                    <Tag className="w-3 h-3 mr-1" />
                                    SPECIAL
                                  </span>
                                )}
                              </div>
                              {promo.discount && (
                                  <div className="text-primary-400 text-sm font-bold mb-2">
                                  {promo.discount}% OFF
                                </div>
                              )}
                            </div>
                          </div>
                          {promo.description && (
                              <p className="text-primary-300/90 text-sm mb-3 leading-relaxed">{promo.description}</p>
                          )}
                          {(promo.startTime || promo.endTime) && (
                            <div className="flex items-center text-xs text-primary-400/80 mb-2">
                              <Clock className="w-3 h-3 mr-1" />
                              {promo.startTime && new Date(promo.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {promo.startTime && promo.endTime && ' - '}
                              {promo.endTime && new Date(promo.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                  <div className="p-5 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {!venue.isGooglePlace && (
                    <button
                      onClick={() => setViewingVenueId(venue._id)}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-primary-500 text-black rounded-xl hover:bg-primary-600 transition-all font-bold shadow-lg shadow-primary-500/20"
                    >
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">View Profile</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      let url = ''
                      if (venue.isGooglePlace && venue.location) {
                        url = `https://www.google.com/maps/dir/?api=1&destination=${venue.location.latitude},${venue.location.longitude}`
                      } else if (venue.location?.latitude && venue.location?.longitude) {
                        url = `https://www.google.com/maps/dir/?api=1&destination=${venue.location.latitude},${venue.location.longitude}`
                      } else {
                        const address = `${venue.address?.street || ''} ${venue.address?.city || ''}, ${venue.address?.state || ''}`.trim()
                        url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                      }
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-black/60 border border-primary-500/30 text-primary-500 rounded-xl hover:bg-primary-500/10 transition-all font-semibold"
                  >
                    <Navigation className="w-4 h-4" />
                      <span className="text-sm">Directions</span>
                  </button>
                  {!venue.isGooglePlace && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedVenue(venue)
                      }}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-primary-500/20 border border-primary-500 text-primary-500 rounded-xl hover:bg-primary-500/30 transition-all font-semibold"
                    >
                      <Martini className="w-4 h-4" />
                      <span className="text-sm">Send Drink</span>
                      </button>
                  )}
                  <button
                    onClick={async () => {
                        try {
                      const venueUrl = `${window.location.origin}/venues/${venue._id}`
                          const shareText = `Check out ${venue.name}${venue.address?.city ? ` in ${venue.address.city}` : ''} and their specials on Shot On Me!`
                          
                          // Try Web Share API first
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: venue.name,
                                text: shareText,
                            url: venueUrl
                          })
                              // Success - user shared via native share dialog
                              return
                            } catch (shareError: any) {
                              // User cancelled share - this is fine, just return
                              if (shareError.name === 'AbortError' || shareError.name === 'NotAllowedError') {
                                return
                              }
                              // Other error - fall through to clipboard
                              console.warn('Web Share API error:', shareError)
                            }
                          }
                          
                          // Fallback: Copy to clipboard
                          try {
                            // Check if clipboard API is available
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              await navigator.clipboard.writeText(venueUrl)
                              // Show success feedback
                              const toast = document.createElement('div')
                              toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                              toast.textContent = 'Venue link copied to clipboard!'
                              document.body.appendChild(toast)
                              setTimeout(() => {
                                toast.remove()
                              }, 3000)
                      } else {
                              // Fallback for older browsers - use textarea method
                              const textarea = document.createElement('textarea')
                              textarea.value = venueUrl
                              textarea.style.position = 'fixed'
                              textarea.style.opacity = '0'
                              document.body.appendChild(textarea)
                              textarea.select()
                              try {
                                document.execCommand('copy')
                                const toast = document.createElement('div')
                                toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                                toast.textContent = 'Venue link copied to clipboard!'
                                document.body.appendChild(toast)
                                setTimeout(() => {
                                  toast.remove()
                                }, 3000)
                              } catch (err) {
                                console.error('Failed to copy:', err)
                                // Last resort: show the URL in a prompt
                                prompt('Copy this link to share:', venueUrl)
                              } finally {
                                document.body.removeChild(textarea)
                              }
                            }
                          } catch (clipboardError: any) {
                            console.error('Clipboard error:', clipboardError)
                            // Last resort: show the URL in a prompt
                            prompt('Copy this link to share:', venueUrl)
                          }
                        } catch (error: any) {
                          console.error('Share error:', error)
                          const toast = document.createElement('div')
                          toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-3 rounded-lg shadow-lg font-semibold'
                          toast.textContent = 'Unable to share venue. Please try again.'
                          document.body.appendChild(toast)
                          setTimeout(() => {
                            toast.remove()
                          }, 3000)
                      }
                    }}
                      className="px-4 py-3 bg-black/60 border border-primary-500/30 text-primary-500 rounded-xl hover:bg-primary-500/10 transition-all"
                      title="Share venue"
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

      {/* Venue Selection Modal */}
      {selectedVenue && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-primary-500 mb-4">Send a Drink to {selectedVenue.name}</h3>
            <p className="text-primary-400 text-sm mb-4">
              This will redirect you to the Send Shot form with {selectedVenue.name} pre-selected.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  localStorage.setItem('selectedVenue', JSON.stringify({
                    id: selectedVenue._id,
                    name: selectedVenue.name,
                    address: selectedVenue.address?.street || '',
                    city: selectedVenue.address?.city || '',
                    state: selectedVenue.address?.state || '',
                    placeId: selectedVenue.placeId
                  }))
                  localStorage.setItem('profileAction', 'send-money')
                  setSelectedVenue(null)
                  if (setActiveTab) {
                    setActiveTab('profile')
                  }
                }}
                className="flex-1 bg-primary-500 text-black py-3 rounded-xl font-bold hover:bg-primary-600 transition-all"
              >
                Continue
              </button>
              <button
                onClick={() => setSelectedVenue(null)}
                className="flex-1 bg-black border border-primary-500 text-primary-500 py-3 rounded-xl font-semibold hover:bg-primary-500/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friend Profile Modal - Snapchat-style */}
      {selectedFriend && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black/95 backdrop-blur-md border border-primary-500/30 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-500">Friend Location</h3>
              <button
                onClick={() => setSelectedFriend(null)}
                className="text-primary-400 hover:text-primary-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              {selectedFriend.profilePicture ? (
                <img
                  src={selectedFriend.profilePicture}
                  alt={`${selectedFriend.firstName} ${selectedFriend.lastName}`}
                  className="w-16 h-16 rounded-full border-2 border-primary-500/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-500/20 border-2 border-primary-500/30 flex items-center justify-center">
                  <span className="text-primary-500 font-bold text-lg">
                    {selectedFriend.firstName?.[0]}{selectedFriend.lastName?.[0]}
                  </span>
                </div>
              )}
              <div>
                <h4 className="text-primary-500 font-semibold">
                  {selectedFriend.firstName} {selectedFriend.lastName}
                </h4>
                {selectedFriend.distance && (
                  <p className="text-primary-400/70 text-sm">{selectedFriend.distance} away</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (selectedFriend.location) {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedFriend.location.latitude},${selectedFriend.location.longitude}`
                    window.open(url, '_blank')
                  }
                }}
                className="flex-1 bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </button>
              <button
                onClick={() => {
                  if (onViewProfile && selectedFriend) {
                    onViewProfile(selectedFriend._id || selectedFriend.id)
                  }
                  setSelectedFriend(null)
                }}
                className="flex-1 bg-black/40 border border-primary-500/30 text-primary-500 px-4 py-2 rounded-lg font-semibold hover:bg-primary-500/10 transition-all"
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
