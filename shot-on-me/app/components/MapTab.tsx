'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { MapPin, Clock, Tag, Star, Navigation, Martini, Users, Search, X, List, Map as MapIcon, ChevronDown, ChevronUp, TrendingUp, Moon, Loader2, AlertCircle, RefreshCw, Settings, User, ThermometerSun, Heart, Calendar, Phone, Coffee, UtensilsCrossed, Music, Flame, Award, Activity, Wine, ExternalLink, Sparkles } from 'lucide-react'
import GoogleMapComponent from './GoogleMap'
import PlacesAutocomplete from './PlacesAutocomplete'
import VenueProfilePage from './VenueProfilePage'
import QuickSendDrinkSheet from './QuickSendDrinkSheet'
import { ErrorBoundary } from './ErrorBoundary'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'
import { useApiUrl } from '../utils/api'
import { Tab } from '@/app/types'
import { type SavedGoogleVenue } from './MyVenuesTab'

interface MapTabProps {
  setActiveTab?: (tab: Tab) => void
  onViewProfile?: (userId: string) => void
  activeTab?: Tab
  onOpenSettings?: () => void
  onVenueSaved?: () => void
  savedGoogleVenues?: SavedGoogleVenue[]
  onSavedVenuesChange?: () => void
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Returns distance in miles
}

function getTierWeight(tier?: string) {
  switch (tier) {
    case 'enterprise': return 4
    case 'premium': return 3
    case 'basic': return 1
    default: return 0
  }
}

export default function MapTab({ setActiveTab, onViewProfile, activeTab, onOpenSettings, onVenueSaved, savedGoogleVenues: savedGoogleVenuesProp = [], onSavedVenuesChange }: MapTabProps) {
  const API_URL = useApiUrl()
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const { isLoaded: mapsLoaded } = useGoogleMaps()
  const [venues, setVenues] = useState<any[]>([])
  const [venuesPage, setVenuesPage] = useState(1)
  const [venuesHasMore, setVenuesHasMore] = useState(true)
  const [loadingMoreVenues, setLoadingMoreVenues] = useState(false)
  const venuesContainerRef = useRef<HTMLDivElement>(null)
  const [viewingVenueId, setViewingVenueId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'favorites' | 'for-you' | 'happy-hour' | 'specials' | 'weekend' | 'trending' | 'tonight' | 'wine'>('all')
  const [sortMode, setSortMode] = useState<'smart' | 'nearest' | 'az'>('smart')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list') // Default to list view to show venues
  const [isMounted, setIsMounted] = useState(false)
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<Set<string>>(new Set())
  
  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check for venue from SearchModal or other sources
  useEffect(() => {
    if (activeTab === 'map' && token) {
      const storedVenueId = localStorage.getItem('selectedVenueId')
      if (storedVenueId) {
        setViewingVenueId(storedVenueId)
        localStorage.removeItem('selectedVenueId')
      }
    }
  }, [activeTab, token])
  
  // Don't auto-switch to map - let user choose their preferred view
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const locationWatchRef = useRef<number | null>(null)
  const [googlePlace, setGooglePlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [showFriends, setShowFriends] = useState(true)
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null)
  const [showSendSheet, setShowSendSheet] = useState(false)
  const [currentCity, setCurrentCity] = useState<string>('')
  const [temperature, setTemperature] = useState<number | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [legendMinimized, setLegendMinimized] = useState(false)
  const [showActiveVenues, setShowActiveVenues] = useState(true)
  const [showRegularVenues, setShowRegularVenues] = useState(true)
  const [circularFriendAvatars, setCircularFriendAvatars] = useState<Map<string, string>>(new Map())
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set())
  const [justSavedPlaceId, setJustSavedPlaceId] = useState<string | null>(null)
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      // One-shot vibe jump from Home tab — read and clear
      const vibeJump = localStorage.getItem('som-vibe-jump')
      if (vibeJump) {
        localStorage.removeItem('som-vibe-jump')
        return new Set([vibeJump])
      }
      const saved = localStorage.getItem('som-amenity-filters')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  // Load already-saved Google venues from backend on mount
  useEffect(() => {
    if (!token) return
    axios.get(`${API_URL}/saved-venues`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const ids = (res.data.venues || []).map((v: any) => v.placeId)
        setSavedPlaceIds(new Set(ids))
      })
      .catch(() => {})
  }, [token, API_URL])

  // Fetch AI recommendations
  useEffect(() => {
    if (!token) return
    setLoadingRecs(true)
    axios.get(`${API_URL}/venues/recommendations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setRecommendations(res.data.recommendations || [])
      })
      .catch(() => {})
      .finally(() => setLoadingRecs(false))
  }, [token, API_URL])

  const toggleAmenityFilter = (key: string) => {
    setAmenityFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try { localStorage.setItem('som-amenity-filters', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  const handleSaveGoogleVenue = async (venue: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!venue.placeId || savedPlaceIds.has(venue.placeId)) return

    const googleMapsUrl = venue.location?.latitude && venue.location?.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}&query_place_id=${venue.placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + (venue.address?.city || ''))}`

    const payload = {
      placeId: venue.placeId,
      name: venue.name,
      address: venue.address || {},
      website: venue.website || '',
      googleMapsUrl,
      rating: venue.rating || undefined,
      lat: venue.location?.latitude,
      lng: venue.location?.longitude,
      coverPhoto: venue.coverPhoto || venue.image || '',
    }

    // Optimistic update
    setSavedPlaceIds(prev => new Set([...prev, venue.placeId]))
    setJustSavedPlaceId(venue.placeId)
    setTimeout(() => setJustSavedPlaceId(null), 2000)

    try {
      const res = await axios.post(`${API_URL}/saved-venues`, payload, { headers: { Authorization: `Bearer ${token}` } })
      onVenueSaved?.()
    } catch (err: any) {
      setSavedPlaceIds(prev => { const next = new Set(prev); next.delete(venue.placeId); return next })
    }
  }

  const handleUnsaveVenue = async (placeId: string) => {
    setSavedPlaceIds(prev => { const next = new Set(prev); next.delete(placeId); return next })
    try {
      await axios.delete(`${API_URL}/saved-venues/${placeId}`, { headers: { Authorization: `Bearer ${token}` } })
      onSavedVenuesChange?.()
    } catch (err) {
    }
  }

  const fetchTrendingVenues = useCallback(async () => {
    if (!token || !API_URL) return
    try {
      const response = await axios.get(`${API_URL}/venue-activity/trending/list?limit=10&period=24h`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      setTrendingVenues(response.data.venues || [])
    } catch (error) {
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
      const friendsList = response.data.friends || []
      // Remove duplicates based on friend ID to prevent duplicate profile pictures
      const uniqueFriends = friendsList.filter((friend: any, index: number, self: any[]) => 
        index === self.findIndex((f: any) => 
          (f._id && friend._id && f._id.toString() === friend._id.toString()) ||
          (f.id && friend.id && f.id && f.id.toString() === friend.id.toString()) ||
          (f.phoneNumber && friend.phoneNumber && f.phoneNumber === friend.phoneNumber)
        )
      )
      setFriends(uniqueFriends)
    } catch (error) {
      setFriends([])
    }
  }, [token, API_URL])

  // Fetch real weather data using OpenWeatherMap API (free tier)
  const fetchWeatherData = useCallback(async (lat: number, lng: number) => {
    setWeatherLoading(true)
    try {
      // Using OpenWeatherMap API (free tier - requires API key)
      // For production, add NEXT_PUBLIC_OPENWEATHER_API_KEY to .env.local
      // For now, we'll use a fallback approach
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
      
      if (apiKey && apiKey !== 'demo') {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${apiKey}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.main?.temp) {
            setTemperature(Math.round(data.main.temp))
            setWeatherLoading(false)
            return
          }
        }
      }
      
      // Fallback: Use a simple estimation based on location and time of year
      const month = new Date().getMonth()
      const isSummer = month >= 5 && month <= 8
      const isWinter = month >= 11 || month <= 2
      let estimatedTemp = 65
      
      if (isSummer) {
        estimatedTemp = 75 + Math.floor(Math.random() * 15) // 75-90°F
      } else if (isWinter) {
        estimatedTemp = 35 + Math.floor(Math.random() * 15) // 35-50°F
      } else {
        estimatedTemp = 55 + Math.floor(Math.random() * 15) // 55-70°F
      }
      
      setTemperature(estimatedTemp)
    } catch (error) {
      // Fallback temperature
      const month = new Date().getMonth()
      const isSummer = month >= 5 && month <= 8
      const estimatedTemp = isSummer ? 75 + Math.floor(Math.random() * 15) : 45 + Math.floor(Math.random() * 20)
      setTemperature(estimatedTemp)
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  const reverseGeocodeCity = useCallback((lat: number, lng: number) => {
    if (!mapsLoaded || typeof google === 'undefined' || !google.maps) return
    try {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const city = results[0].address_components?.find(c => c.types.includes('locality'))?.long_name
          if (city) setCurrentCity(city)
        }
      })
    } catch { /* ignore */ }
  }, [mapsLoaded])

  // Clean up location watcher on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current)
      }
    }
  }, [])

  const getCurrentLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      // Geolocation not available - use default location
      fetchWeatherData(39.7684, -86.1581)
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

    // If denied, inform user but don't block - fetch weather for default location
    if (permissionStatus === 'denied') {
      fetchWeatherData(39.7684, -86.1581) // Default to Indianapolis
      return
    }

    try {
      // Get initial position quickly, then watch for updates
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const loc = { lat: latitude, lng: longitude }
          setUserLocation(loc)
          userLocationRef.current = loc
          reverseGeocodeCity(latitude, longitude)
          fetchWeatherData(latitude, longitude)
        },
        () => { fetchWeatherData(39.7684, -86.1581) },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      )

      // Watch for location changes so the map follows the user
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const loc = { lat: latitude, lng: longitude }
          setUserLocation(loc)
          userLocationRef.current = loc
          reverseGeocodeCity(latitude, longitude)
        },
        () => { /* ignore watch errors */ },
        { enableHighAccuracy: true, maximumAge: 30000 }
      )
      locationWatchRef.current = watchId
    } catch (error) {
      // Geolocation failed - use default location silently
      fetchWeatherData(39.7684, -86.1581)
    }
  }, [mapsLoaded, fetchWeatherData])

  const fetchVenues = useCallback(async (pageNum: number = 1, reset: boolean = true) => {
    if (!token || !API_URL) {
      return
    }
    try {
      if (reset) {
        setError(null)
        setLoading(true)
      } else {
        setLoadingMoreVenues(true)
      }
      
      const limit = 20
      const skip = (pageNum - 1) * limit
      
      const params: any = { skip, limit }
      const loc = userLocationRef.current
      if (loc) {
        params.lat = loc.lat
        params.lng = loc.lng
        params.radius = 25 // miles
      }
      const response = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: 10000
      })
      
      const fetchedVenues = response.data.venues || []
      
      // Normalize venue names for comparison
      const normalizeName = (name: string) => {
        return (name || '').toLowerCase()
          .replace(/[''""]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }
      
      // Normalize rating objects to numbers and transform location format
      const normalizedVenues = fetchedVenues.map((venue: any) => {
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
          }
        }
        
        return normalized
      })
      
      if (reset || pageNum === 1) {
        setVenues(normalizedVenues)
      } else {
        // Filter out duplicates when appending venues
        setVenues(prev => {
          const existingIds = new Set(prev.map(v => v._id))
          const uniqueNewVenues = normalizedVenues.filter((v: any) => !existingIds.has(v._id))
          return [...prev, ...uniqueNewVenues]
        })
      }
      
      setVenuesHasMore(response.data.hasMore !== false && normalizedVenues.length === limit)
      setError(null)
    } catch (error: any) {
      if (reset || pageNum === 1) {
        setError('Failed to load venues. Please try again.')
        setVenues([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMoreVenues(false)
    }
  }, [token, API_URL, user])

  // Re-fetch venues once location becomes available (initial fetch may have gone without it)
  const locationFetchedRef = useRef(false)
  useEffect(() => {
    if (userLocation && token && !locationFetchedRef.current) {
      locationFetchedRef.current = true
      fetchVenues(1, true)
    }
  }, [userLocation, token, fetchVenues])

  const rankVenues = useCallback((source: any[]) => {
    if (sortMode === 'az') {
      return [...source].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
    }
    if (sortMode === 'nearest' && userLocation) {
      return [...source].sort((a: any, b: any) => {
        const distA = a.location?.coordinates
          ? calculateDistance(userLocation.lat, userLocation.lng, a.location.coordinates[1], a.location.coordinates[0])
          : 9999
        const distB = b.location?.coordinates
          ? calculateDistance(userLocation.lat, userLocation.lng, b.location.coordinates[1], b.location.coordinates[0])
          : 9999
        return distA - distB
      })
    }
    // Smart sort (default)
    return [...source].sort((a: any, b: any) => {
      const activeA = (a.promotions || []).filter((p: any) => p?.isActive).length
      const activeB = (b.promotions || []).filter((p: any) => p?.isActive).length
      const trendingA = trendingVenues.some((tv: any) => tv._id?.toString() === a._id?.toString()) ? 1 : 0
      const trendingB = trendingVenues.some((tv: any) => tv._id?.toString() === b._id?.toString()) ? 1 : 0

      const scoreA =
        (a.isFeatured ? 60 : 0) +
        (getTierWeight(a.subscriptionTier) * 20) +
        (activeA * 10) +
        Math.min(a.followerCount || 0, 100) +
        (trendingA * 15)
      const scoreB =
        (b.isFeatured ? 60 : 0) +
        (getTierWeight(b.subscriptionTier) * 20) +
        (activeB * 10) +
        Math.min(b.followerCount || 0, 100) +
        (trendingB * 15)

      return scoreB - scoreA
    })
  }, [trendingVenues, sortMode, userLocation])

  const getVenueBadge = useCallback((venue: any) => {
    if (!venue) return null
    if (venue.isFeatured) return { label: 'Featured', className: 'bg-primary-500/90 text-black' }
    if (venue.subscriptionTier === 'enterprise') return { label: 'Enterprise', className: 'bg-purple-500/90 text-white' }
    if (venue.subscriptionTier === 'premium') return { label: 'AI Optimized', className: 'bg-primary-500/90 text-black' }
    return null
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
        website: (googlePlace as any).website || '',
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
        return distance < 0.000189394 // ~100 feet (in miles)
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

    // Apply amenity filters first (multi-select AND logic — applied to all filter paths)
    if (amenityFilters.size > 0) {
      filtered = filtered.filter(venue => {
        const a = venue.amenities || {}
        return Array.from(amenityFilters).every(key => a[key] === true)
      })
    }

    // Apply promotion filter
    if (filter === 'all') return rankVenues(filtered)
    if (filter === 'for-you') {
      const recIds = new Set(recommendations.map((r: any) => r._id?.toString()))
      return rankVenues(filtered.filter(venue => recIds.has(venue._id?.toString())))
    }
    if (filter === 'favorites') {
      return rankVenues(filtered.filter(venue => favoriteVenueIds.has(venue._id?.toString())))
    }
    if (filter === 'trending') {
      const trendingIds = new Set(trendingVenues.map(v => v._id?.toString()))
      return rankVenues(filtered.filter(venue => trendingIds.has(venue._id?.toString())))
    }
    if (filter === 'weekend') {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
      
      return rankVenues(filtered.filter((venue) => {
        const promotions = venue.promotions || []
        return promotions.some((p: any) => {
          if (!p.isActive) return false
          if (p.schedule && Array.isArray(p.schedule)) {
            const scheduleDays = (p.schedule.find((s: any) => s.days)?.days || '').toLowerCase()
            const dayNames = ['sunday', 'saturday']
            return dayNames.some(dayName => scheduleDays.includes(dayName))
          }
          // Check if promotion mentions weekend
          const title = (p.title || '').toLowerCase()
          const description = (p.description || '').toLowerCase()
          return title.includes('weekend') || description.includes('weekend') || 
                 title.includes('saturday') || description.includes('saturday') ||
                 title.includes('sunday') || description.includes('sunday')
        })
      }))
    }
    if (filter === 'tonight') {
      const now = new Date()
      const currentHour = now.getHours()
      const dayOfWeek = now.getDay()
      
      return rankVenues(filtered.filter((venue) => {
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
      }))
    }
    if (filter === 'wine') {
      return rankVenues(filtered.filter((venue) => {
        const wineKeywords = ['wine', 'winery', 'vineyard', 'sommelier', 'pinot', 'cabernet', 'chardonnay', 'rosé', 'rose', 'merlot', 'prosecco', 'champagne', 'sparkling']
        const nameMatch = wineKeywords.some(k => (venue.name || '').toLowerCase().includes(k))
        const categoryMatch = ['wine', 'wine_bar', 'winery'].includes(venue.category)
        const descMatch = wineKeywords.some(k => (venue.description || '').toLowerCase().includes(k))
        const promoMatch = (venue.promotions || []).some((p: any) =>
          wineKeywords.some(k =>
            (p.title || '').toLowerCase().includes(k) || (p.description || '').toLowerCase().includes(k)
          )
        )
        return nameMatch || categoryMatch || descMatch || promoMatch
      }))
    }

    // Filter for happy-hour or specials with improved logic
    return rankVenues(filtered.filter((venue) => {
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
    }))
  }, [venues, filter, searchQuery, googlePlace, trendingVenues, favoriteVenueIds, rankVenues, amenityFilters, recommendations, sortMode])

  // Get category icon
  const getCategoryIcon = useCallback((category: string) => {
    switch (category?.toLowerCase()) {
      case 'bar':
        return <Martini className="w-4 h-4" />
      case 'restaurant':
        return <UtensilsCrossed className="w-4 h-4" />
      case 'cafe':
        return <Coffee className="w-4 h-4" />
      case 'club':
        return <Music className="w-4 h-4" />
      default:
        return <MapPin className="w-4 h-4" />
    }
  }, [])

  // Format venue rating with stars
  const formatRating = useCallback((rating: number | null | undefined) => {
    if (!rating || rating === 0) return null
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    return { fullStars, hasHalfStar, rating: rating.toFixed(1) }
  }, [])

  // Check if venue is currently open based on schedule
  const isVenueOpen = useCallback((venue: any) => {
    if (!venue.schedule) return null
    
    const now = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = dayNames[now.getDay()]
    const daySchedule = venue.schedule[currentDay]
    
    if (!daySchedule || daySchedule.closed) return false
    
    if (daySchedule.open && daySchedule.close) {
      const [openHour, openMin] = daySchedule.open.split(':').map(Number)
      const [closeHour, closeMin] = daySchedule.close.split(':').map(Number)
      const currentTime = now.getHours() * 60 + now.getMinutes()
      const openTime = openHour * 60 + openMin
      const closeTime = closeHour * 60 + closeMin
      
      // Handle overnight hours (e.g., 10 PM - 2 AM)
      if (closeTime < openTime) {
        return currentTime >= openTime || currentTime <= closeTime
      }
      return currentTime >= openTime && currentTime <= closeTime
    }
    
    return null // Unknown status
  }, [])

  // Format date for display
  const formatPromotionDate = useCallback((promo: any) => {
    if (!promo) return null
    
    const startTime = promo.startTime ? new Date(promo.startTime) : null
    const endTime = new Date(promo.endTime || promo.flashDealEndsAt || promo.validUntil || Date.now() + 86400000)
    const now = new Date()
    
    // Format date as "MMM DD" (e.g., "Jan 15")
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    // Format time as "HH:MM AM/PM" (e.g., "5:00 PM")
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    
    // If same day, show time range
    if (startTime && startTime.toDateString() === endTime.toDateString()) {
      return `${formatDate(startTime)} • ${formatTime(startTime)} - ${formatTime(endTime)}`
    }
    
    // If different days, show date range
    if (startTime) {
      return `${formatDate(startTime)} - ${formatDate(endTime)}`
    }
    
    // If no start time, just show end date
    return `Until ${formatDate(endTime)}`
  }, [])

  const getActivePromotions = useCallback((venue: any) => {
    if (!venue) return []
    
    const now = new Date()
    const dayOfWeek = now.getDay()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    return (venue.promotions || []).filter((promo: any) => {
      // First check if promotion is marked as inactive
      if (promo.isActive === false) return false
      
      // Check if promotion has expired based on endTime, flashDealEndsAt, or validUntil
      const endTime = promo.endTime ? new Date(promo.endTime) : null
      const flashDealEndsAt = promo.flashDealEndsAt ? new Date(promo.flashDealEndsAt) : null
      const validUntil = promo.validUntil ? new Date(promo.validUntil) : null
      
      // Determine the actual expiration time
      const expirationTime = endTime || flashDealEndsAt || validUntil
      
      // If there's an expiration time and it's in the past, the promotion is expired
      if (expirationTime && expirationTime < now) {
        return false
      }
      
      // Check if promotion has a startTime and hasn't started yet
      if (promo.startTime) {
        const startTime = new Date(promo.startTime)
        if (startTime > now) {
          return false // Promotion hasn't started yet
        }
      }
      
      // For schedule-based promotions, check if current time is within the schedule window
      if (promo.schedule && Array.isArray(promo.schedule)) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const todayName = dayNames[dayOfWeek]
        
        const todaySchedule = promo.schedule.find((s: any) => {
          const scheduleDays = (s.days || '').toLowerCase().split(',').map((d: string) => d.trim())
          return scheduleDays.includes(todayName) || scheduleDays.includes('all')
        })
        
        if (todaySchedule) {
          if (todaySchedule.start && todaySchedule.end) {
            const start = parseInt(todaySchedule.start.replace(':', ''))
            const end = parseInt(todaySchedule.end.replace(':', ''))
            return currentTime >= start && currentTime <= end
          }
          // If schedule exists but no time window, it's active all day
          return true
        }
        // If no schedule for today, check if it's a recurring promotion that's active
        return promo.isActive === true
      }
      
      // For non-scheduled promotions, check if it's active and not expired
      return promo.isActive === true || (promo.isActive !== false && !expirationTime)
    })
  }, [])

  // Preload and create circular versions of friend profile pictures
  useEffect(() => {
    if (!friends.length || typeof window === 'undefined') return

    const loadCircularAvatars = async () => {
      const avatarMap = new Map<string, string>()
      
      await Promise.all(
        friends.map((friend) => {
          return new Promise<void>((resolve) => {
            const friendId = friend._id?.toString() || friend.id?.toString() || ''
            if (!friendId || !friend.profilePicture) {
              // Create initials fallback
              const initials = `${friend.firstName?.[0] || ''}${friend.lastName?.[0] || ''}`.toUpperCase() || '?'
              const canvas = document.createElement('canvas')
              canvas.width = 50
              canvas.height = 50
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(25, 25, 22, 0, 2 * Math.PI)
                ctx.fillStyle = '#D4AF37'
                ctx.fill()
                ctx.strokeStyle = '#000000'
                ctx.lineWidth = 3
                ctx.stroke()
                ctx.fillStyle = '#000000'
                ctx.font = 'bold 20px Arial'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(initials, 25, 25)
                avatarMap.set(friendId, canvas.toDataURL())
              }
              resolve()
              return
            }

            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width = 50
              canvas.height = 50
              const ctx = canvas.getContext('2d')
              
              if (ctx) {
                // Create clipping path for perfect circle
                ctx.save()
                ctx.beginPath()
                ctx.arc(25, 25, 22, 0, 2 * Math.PI)
                ctx.clip()
                
                // Calculate center crop for square image
                const size = Math.min(img.width, img.height)
                const sx = (img.width - size) / 2
                const sy = (img.height - size) / 2
                
                // Draw image centered and scaled to fill circle
                ctx.drawImage(img, sx, sy, size, size, 0, 0, 50, 50)
                
                // Restore context to draw border
                ctx.restore()
                
                // Draw gold border
                ctx.beginPath()
                ctx.arc(25, 25, 22, 0, 2 * Math.PI)
                ctx.strokeStyle = '#D4AF37'
                ctx.lineWidth = 3
                ctx.stroke()
                
                // Add outer black border for depth
                ctx.beginPath()
                ctx.arc(25, 25, 24, 0, 2 * Math.PI)
                ctx.strokeStyle = '#000000'
                ctx.lineWidth = 1
                ctx.stroke()
                
                avatarMap.set(friendId, canvas.toDataURL())
              }
              resolve()
            }
            
            img.onerror = () => {
              // Fallback to initials if image fails
              const initials = `${friend.firstName?.[0] || ''}${friend.lastName?.[0] || ''}`.toUpperCase() || '?'
              const canvas = document.createElement('canvas')
              canvas.width = 50
              canvas.height = 50
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.beginPath()
                ctx.arc(25, 25, 22, 0, 2 * Math.PI)
                ctx.fillStyle = '#D4AF37'
                ctx.fill()
                ctx.strokeStyle = '#000000'
                ctx.lineWidth = 3
                ctx.stroke()
                ctx.fillStyle = '#000000'
                ctx.font = 'bold 20px Arial'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(initials, 25, 25)
                avatarMap.set(friendId, canvas.toDataURL())
              }
              resolve()
            }
            
            img.src = friend.profilePicture
          })
        })
      )
      
      setCircularFriendAvatars(avatarMap)
    }

    loadCircularAvatars()
  }, [friends])

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

  // Fetch favorite venues
  const fetchFavoriteVenues = useCallback(async () => {
    if (!token || !API_URL) return
    try {
      const response = await axios.get(`${API_URL}/favorites/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const favoriteIds = new Set<string>((response.data.venues || []).map((v: any) => v._id?.toString() || v.toString()))
      setFavoriteVenueIds(favoriteIds)
    } catch (error) {
      setFavoriteVenueIds(new Set())
    }
  }, [token, API_URL])

  // Toggle favorite venue
  const toggleFavorite = useCallback(async (venueId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!token || !API_URL) return
    
    try {
      const response = await axios.post(`${API_URL}/favorites/venues/${venueId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const isFavorite = response.data.isFavorite
      setFavoriteVenueIds(prev => {
        const newSet = new Set(prev)
        if (isFavorite) {
          newSet.add(venueId)
        } else {
          newSet.delete(venueId)
        }
        return newSet
      })
    } catch (error) {
    }
  }, [token, API_URL])

  // Fetch data on mount
  useEffect(() => {
    if (token && API_URL) {
      setVenuesPage(1)
      setVenuesHasMore(true)
      fetchVenues(1, true)
      fetchTrendingVenues()
      fetchFriends()
      fetchFavoriteVenues()
      getCurrentLocation()
    } else if (!token) {
      // Still fetch weather even if not logged in
      fetchWeatherData(39.7684, -86.1581) // Default to Indianapolis
    }
  }, [token, API_URL, fetchVenues, fetchTrendingVenues, fetchFriends, fetchFavoriteVenues, getCurrentLocation, fetchWeatherData])

  // Reset pagination when filter changes
  useEffect(() => {
    setVenuesPage(1)
    setVenuesHasMore(true)
  }, [filter])

  // Infinite scroll for venues
  useEffect(() => {
    const handleScroll = () => {
      if (!loadingMoreVenues && venuesHasMore && venuesContainerRef.current) {
        const scrollHeight = document.documentElement.scrollHeight
        const scrollTop = window.innerHeight + window.scrollY
        const threshold = 500 // Load when 500px from bottom
        
        if (scrollTop >= scrollHeight - threshold) {
          setLoadingMoreVenues(true)
          setVenuesPage(prev => {
            const nextPage = prev + 1
            fetchVenues(nextPage, false)
            return nextPage
          })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMoreVenues, venuesHasMore, fetchVenues])

  // Create friend avatar markers (like Snapchat Bitmojis) - Circular profile pictures
  const friendMarkers = useMemo(() => {
    if (!showFriends || !mapsLoaded || typeof google === 'undefined' || !google.maps) return []
    
    return friends
      .filter((friend) => friend.location?.latitude && friend.location?.longitude && friend.location?.isVisible)
      .map((friend) => {
        const friendId = friend._id?.toString() || friend.id?.toString() || ''
        const circularAvatar = circularFriendAvatars.get(friendId)
        
        // Use preloaded circular avatar if available, otherwise create fallback
        let iconUrl = circularAvatar
        
        if (!iconUrl) {
          // Create fallback initials circle
          const canvas = document.createElement('canvas')
          canvas.width = 50
          canvas.height = 50
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const initials = `${friend.firstName?.[0] || ''}${friend.lastName?.[0] || ''}`.toUpperCase() || '?'
            ctx.beginPath()
            ctx.arc(25, 25, 22, 0, 2 * Math.PI)
            ctx.fillStyle = '#D4AF37'
            ctx.fill()
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 3
            ctx.stroke()
            ctx.fillStyle = '#000000'
            ctx.font = 'bold 20px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(initials, 25, 25)
            iconUrl = canvas.toDataURL()
          }
        }
        
        return {
          id: `friend-${friendId}`,
          position: {
            lat: friend.location.latitude,
            lng: friend.location.longitude
          },
          title: `${friend.firstName} ${friend.lastName}`,
          icon: iconUrl ? {
            url: iconUrl,
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 25)
          } : undefined,
          onClick: () => setSelectedFriend(friend)
        }
      })
      .filter((marker) => marker.icon !== undefined)
  }, [friends, showFriends, mapsLoaded, circularFriendAvatars])

  // Memoize venue markers for map with enhanced styling
  const venueMarkers = useMemo(() => {
    // Don't build markers until Google Maps is ready — google.maps.SymbolPath requires the library
    if (!mapsLoaded || typeof google === 'undefined' || !google.maps) return []

    const isActivePromotion = (venue: any) => {
      return (venue.promotions || []).some((p: any) => {
        if (!p.isActive) return false
        const now = new Date()
        const dayOfWeek = now.getDay()
        if (p.schedule && Array.isArray(p.schedule)) {
          const todaySchedule = p.schedule.find((s: any) => {
            const scheduleDays = s.days?.toLowerCase() || ''
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            return scheduleDays.includes(dayNames[dayOfWeek])
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
    }

    return getFilteredVenues
      .filter((venue) => {
        if (!venue.location?.latitude || !venue.location?.longitude) return false
        const hasActive = isActivePromotion(venue)
        if (hasActive && !showActiveVenues) return false
        if (!hasActive && !showRegularVenues) return false
        return true
      })
      .map((venue) => {
        const hasActive = isActivePromotion(venue)
        const markerIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: hasActive ? 10 : 8,
          fillColor: hasActive ? '#D4AF37' : '#B8945A',
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
          label: hasActive ? {
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
  }, [getFilteredVenues, showActiveVenues, showRegularVenues, mapsLoaded])

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
    } finally {
      setTimeout(() => {
        setRefreshing(false)
      }, 1000)
    }
  }, [fetchVenues, fetchTrendingVenues, fetchFriends, getCurrentLocation])

  return (
    <div className="min-h-screen pb-14 bg-black max-w-4xl mx-auto pt-16">
      {/* Unified header — same controls for list & map */}
      <div className="bg-black/95 backdrop-blur-md border-b border-primary-500/10 sticky top-16 z-20 px-4 py-2">
        {/* Top row: title + context + view toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-bold text-primary-500 tracking-tight">Venues</h1>
            {currentCity && (
              <span className="text-[10px] text-primary-400/40 truncate">{currentCity}</span>
            )}
            {temperature !== null && (
              <span className="text-[10px] text-orange-400/60 flex-shrink-0">{temperature}°F</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 text-primary-400/60 hover:text-primary-500 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {/* View toggle */}
            <div className="flex bg-black/60 border border-primary-500/15 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-[10px] font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-primary-500 text-black' : 'text-primary-400/60 hover:text-primary-400'
                }`}
              >
                <List className="w-3 h-3" />
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-2 py-1 text-[10px] font-semibold transition-all flex items-center gap-1 ${
                  viewMode === 'map' ? 'bg-primary-500 text-black' : 'text-primary-400/60 hover:text-primary-400'
                }`}
              >
                <MapIcon className="w-3 h-3" />
                Map
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-2">
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
            placeholder="Search venues..."
            className="w-full"
          />
        </div>

        {/* Row 1: Category filters */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1.5 -mx-4 px-4 scroll-smooth">
          {([
            { id: 'all', label: 'All', icon: null },
            { id: 'for-you', label: 'For You', icon: Sparkles },
            { id: 'favorites', label: 'Favorites', icon: Heart },
            { id: 'tonight', label: 'Tonight', icon: Moon },
            { id: 'trending', label: 'Trending', icon: TrendingUp },
            { id: 'happy-hour', label: 'Happy Hour', icon: Martini },
            { id: 'specials', label: 'Specials', icon: Tag },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilter(id as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === id
                  ? 'bg-primary-500 text-black shadow-lg'
                  : 'bg-black/60 border border-primary-500/20 text-primary-400/70 hover:border-primary-500/40'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* Row 2: Vibe toggles + sort */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pt-1 -mx-4 px-4 scroll-smooth">
          {([
            { key: 'happyHour',      label: '🍻' },
            { key: 'liveMusic',      label: '🎸' },
            { key: 'karaoke',        label: '🎤' },
            { key: 'sportsTv',       label: '🏈' },
            { key: 'danceFloor',     label: '🕺' },
            { key: 'trivia',         label: '🧠' },
            { key: 'poolTables',     label: '🎱' },
            { key: 'outdoorSeating', label: '🌅' },
            { key: 'hasFood',        label: '🍕' },
            { key: 'dogFriendly',    label: '🐕' },
            { key: 'kidsFriendly',   label: '👶' },
            { key: 'arcade',         label: '🎮' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleAmenityFilter(key)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                amenityFilters.has(key)
                  ? 'bg-primary-500/20 border border-primary-500/50 shadow-sm shadow-primary-500/10'
                  : 'bg-black/40 border border-primary-500/10 opacity-60 hover:opacity-100'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="w-px h-5 bg-primary-500/15 flex-shrink-0 mx-1" />

          {(['smart', 'nearest', 'az'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                sortMode === mode
                  ? 'bg-primary-500/20 border border-primary-500/40 text-primary-400'
                  : 'bg-black/40 border border-primary-500/10 text-primary-400/40 hover:text-primary-400/70'
              }`}
            >
              {mode === 'smart' ? '✨ Smart' : mode === 'nearest' ? '📍 Near' : '🔤 A-Z'}
            </button>
          ))}

          {amenityFilters.size > 0 && (
            <>
              <div className="w-px h-5 bg-primary-500/15 flex-shrink-0 mx-1" />
              <button
                onClick={() => { setAmenityFilters(new Set()); try { localStorage.removeItem('som-amenity-filters') } catch {} }}
                className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold text-red-400/70 bg-red-500/10 border border-red-500/20 hover:text-red-400"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Active filter summary */}
        {(filter !== 'all' || amenityFilters.size > 0) && (
          <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-primary-500/5">
            <span className="text-[9px] text-primary-400/30">Showing:</span>
            {filter !== 'all' && (
              <span className="text-[9px] bg-primary-500/10 text-primary-400/60 px-1.5 py-0.5 rounded">{filter === 'for-you' ? 'For You' : filter === 'happy-hour' ? 'Happy Hour' : filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
            )}
            {amenityFilters.size > 0 && (
              <span className="text-[9px] bg-primary-500/10 text-primary-400/60 px-1.5 py-0.5 rounded">{amenityFilters.size} vibe{amenityFilters.size > 1 ? 's' : ''}</span>
            )}
            <span className="text-[9px] text-primary-400/20">· {getFilteredVenues.length} venue{getFilteredVenues.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

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
        <div className="h-[calc(100vh-12rem)] sm:h-[calc(100vh-13rem)] relative">
          {!mapsLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center text-primary-400">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-500" />
                <p className="text-lg font-semibold">Loading map...</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full" data-map-container>
            <GoogleMapComponent
                center={userLocation || (venueMarkers[0]?.position ? { lat: venueMarkers[0].position.lat, lng: venueMarkers[0].position.lng } : { lat: 39.7684, lng: -86.1581 })}
                zoom={userLocation || venueMarkers.length > 0 ? 13 : 11}
              markers={[...venueMarkers, ...(showFriends ? friendMarkers : [])]}
              mapContainerStyle={{ width: '100%', height: '100%' }}
            />
              {/* Compact Map Legend - Interactive with Minimize/Expand */}
              {showLegend && (venueMarkers.length > 0 || friends.length > 0) && (
                <div className="absolute top-4 right-4 bg-black/95 backdrop-blur-xl border border-primary-500/40 rounded-xl shadow-2xl z-10 max-w-[140px] sm:max-w-[150px]">
                  <div className="flex items-center justify-between p-2.5">
                    <h3 className="text-[10px] sm:text-xs font-bold text-primary-500">Legend</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setLegendMinimized(!legendMinimized)
                        }}
                        className="p-0.5 hover:bg-primary-500/20 rounded transition-all"
                        title={legendMinimized ? "Expand legend" : "Minimize legend"}
                      >
                        {legendMinimized ? (
                          <ChevronUp className="w-3 h-3 text-primary-400 hover:text-primary-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-primary-400 hover:text-primary-500" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setShowLegend(false)
                        }}
                        className="p-0.5 hover:bg-primary-500/20 rounded transition-all"
                        title="Hide legend"
                      >
                        <X className="w-3 h-3 text-primary-400 hover:text-primary-500" />
                      </button>
                    </div>
                  </div>
                  {!legendMinimized && (
                    <div className="px-2.5 pb-2.5 space-y-2">
                    {venueMarkers.length > 0 && (
                      <div className="space-y-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setShowActiveVenues(!showActiveVenues)
                          }}
                          className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
                            showActiveVenues
                              ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/5 border-primary-500/30'
                              : 'bg-black/40 border-primary-500/10 opacity-50'
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 border border-black shadow-md"></div>
                            {showActiveVenues && (
                              <>
                                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary-500 rounded-full border border-black animate-pulse"></div>
                                <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping"></div>
                              </>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="text-[10px] font-bold text-primary-400 block leading-tight">Active</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setShowRegularVenues(!showRegularVenues)
                          }}
                          className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
                            showRegularVenues
                              ? 'bg-black/40 border-primary-500/20'
                              : 'bg-black/20 border-primary-500/10 opacity-50'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-400/70 to-primary-500/50 border border-black flex-shrink-0"></div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="text-[10px] font-semibold text-primary-400 block leading-tight">Regular</span>
                          </div>
                        </button>
                      </div>
                    )}
                    {friends.length > 0 && (
                      <>
                        {venueMarkers.length > 0 && (
                          <div className="border-t border-primary-500/20 my-1.5"></div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setShowFriends(!showFriends)
                          }}
                          className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
                            showFriends
                              ? 'bg-gradient-to-r from-green-500/20 to-green-500/5 border-green-500/40'
                              : 'bg-black/40 border-green-500/20 opacity-50'
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border border-primary-500 shadow-md"></div>
                            {showFriends && (
                              <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="text-[10px] font-bold text-green-400 block leading-tight">Friends</span>
                          </div>
                        </button>
                      </>
                    )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Show Legend Button - When Hidden */}
              {!showLegend && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setShowLegend(true)
                    setLegendMinimized(false) // Reset to expanded when showing
                  }}
                  className="absolute top-4 right-4 bg-black/95 backdrop-blur-xl border border-primary-500/40 rounded-xl p-2 shadow-2xl z-10 hover:bg-black hover:border-primary-500/60 transition-all"
                  title="Show legend"
                >
                  <MapPin className="w-4 h-4 text-primary-500" />
                </button>
              )}
              
              {/* Quick Action Buttons - Floating on Map - Next-Level Interactive */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 sm:gap-3 z-10">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-black/95 backdrop-blur-xl border-2 border-primary-500/50 rounded-full p-3 shadow-2xl hover:bg-black hover:border-primary-500/70 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                  title="Refresh map"
                >
                  <RefreshCw className={`w-5 h-5 text-primary-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    if (userLocation) {
                      // Trigger map recenter via custom event
                      window.dispatchEvent(new CustomEvent('center-map', { detail: userLocation }))
                    } else {
                      getCurrentLocation()
                    }
                  }}
                  className="bg-gradient-to-br from-primary-500 to-primary-600 text-black rounded-full p-3 shadow-2xl hover:from-primary-400 hover:to-primary-500 hover:scale-110 active:scale-95 transition-all font-bold ring-2 ring-primary-500/50"
                  title="Center on my location"
                >
                  <Navigation className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="bg-black/95 backdrop-blur-xl border-2 border-primary-500/50 rounded-full px-3 sm:px-4 py-3 shadow-2xl hover:bg-black hover:border-primary-500/70 hover:scale-110 active:scale-95 transition-all flex items-center gap-2"
                  title="Switch to list view"
                >
                  <List className="w-5 h-5 text-primary-500" />
                  <span className="text-xs sm:text-sm font-bold text-primary-500 hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View - Compact Style */}
      {viewMode === 'list' && (
      <div className="p-3">

          {/* Saved Places — same grid/card style as SOM venues */}
          {savedGoogleVenuesProp.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2.5">
                {savedGoogleVenuesProp.map(venue => {
                  const openUrl = venue.website || venue.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`
                  return (
                    <div
                      key={venue.placeId}
                      onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
                      className="bg-black/40 border-2 border-primary-500/20 rounded-2xl overflow-hidden backdrop-blur-sm cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-500/20 transition-all relative group"
                    >
                      {/* Image */}
                      <div className="relative h-32 bg-gradient-to-br from-primary-500/10 to-black/40 overflow-hidden">
                        {venue.coverPhoto ? (
                          <img src={venue.coverPhoto} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/15 to-primary-500/5">
                            <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center border border-primary-500/30">
                              <span className="text-2xl font-bold text-primary-500">{venue.name?.[0]?.toUpperCase() || 'V'}</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        {/* Unsave button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnsaveVenue(venue.placeId) }}
                          className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-all shadow-lg"
                        >
                          <Star className="w-4 h-4 fill-primary-500 text-primary-500" />
                        </button>
                        {/* Name on image */}
                        <div className="absolute bottom-2 left-2 right-2 z-10">
                          <h3 className="font-bold text-white text-sm leading-tight line-clamp-1 drop-shadow-lg">{venue.name}</h3>
                          {(venue.address?.city || venue.address?.state) && (
                            <span className="text-[10px] text-white/60">{[venue.address?.city, venue.address?.state].filter(Boolean).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        {venue.rating && (
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-3 h-3 fill-primary-500 text-primary-500" />
                            <span className="text-[11px] font-bold text-primary-500">{typeof venue.rating === 'number' ? venue.rating.toFixed(1) : venue.rating}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-primary-400/25 text-center py-0.5">Saved spot — tap to open</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-b border-primary-500/10 mt-2.5 mb-2" />
            </div>
          )}

          {/* "For You" hint — only when no recommendations and filter is for-you */}
          {filter === 'for-you' && getFilteredVenues.length === 0 && !loading && (
            loadingRecs ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto mb-2" />
                <p className="text-primary-400/60 text-sm">Finding venues for you...</p>
              </div>
            ) : (
              <div className="text-center py-8 text-primary-400/60">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary-500/30" />
                <p className="text-sm font-medium">Set your vibe preferences in Profile</p>
                <p className="text-xs mt-1 text-primary-400/40">We'll match you with venues you'll love</p>
              </div>
            )
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-3" />
                <p className="text-primary-400 text-sm">Loading venues...</p>
          </div>
            </div>
          ) : getFilteredVenues.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-primary-500/30" />
              <p className="text-base font-semibold text-primary-400 mb-2">
              {searchQuery ? `No venues found matching "${searchQuery}"` : 'No venues found'}
            </p>
              <p className="text-xs text-primary-400/70 mb-3">
              {searchQuery ? 'Try a different search term' : 'Tap & pay venues appear here — more joining every week.'}
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
            <>
            <div ref={venuesContainerRef} className="grid grid-cols-2 gap-2.5">
            {getFilteredVenues.map((venue: any) => {
              if (!venue || !venue._id) return null
              // Don't show Google venues already in the saved section above
              if (venue.isGooglePlace && savedPlaceIds.has(venue.placeId || '')) return null
              
              const activePromos = getActivePromotions(venue)
              const hasActivePromotions = activePromos.length > 0
              const isFavorite = favoriteVenueIds.has(venue._id?.toString())
              const distance = userLocation && venue.location?.latitude && venue.location?.longitude
                ? calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    venue.location.latitude,
                    venue.location.longitude
                  )
                : null
              
              // Check if venue is trending
              const isTrending = trendingVenues.some(tv => tv._id?.toString() === venue._id?.toString())
              const venueBadge = getVenueBadge(venue)
              const venueRating = formatRating(venue.rating)
              const venueOpenStatus = isVenueOpen(venue)
              
              // Count friends at venue (within 0.05 miles / ~260 feet)
              const friendsAtVenue = friends.filter(friend => {
                if (!friend.location?.latitude || !friend.location?.longitude || !venue.location?.latitude || !venue.location?.longitude) return false
                const friendDistance = calculateDistance(
                  venue.location.latitude,
                  venue.location.longitude,
                  friend.location.latitude,
                  friend.location.longitude
                )
                return friendDistance <= 0.05 // ~260 feet - considered "at venue"
              }).length

              // Determine color coding based on promotion status
              let cardBorderColor = 'border-primary-500/20'
              let cardBgGradient = 'bg-black/40'
              let statusBadge = null
              let statusColor = ''
              
              if (hasActivePromotions && activePromos.length > 0) {
                const promo = activePromos[0]
                const now = new Date()
                const endTime = new Date(promo.endTime || promo.flashDealEndsAt || promo.validUntil || Date.now() + 86400000)
                const hoursUntilEnd = (endTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                
                if (promo.type === 'happy-hour') {
                  cardBorderColor = 'border-primary-500/60'
                  cardBgGradient = 'bg-gradient-to-br from-primary-500/20 to-black/40'
                  statusBadge = 'Happy Hour'
                  statusColor = 'primary'
                } else if (hoursUntilEnd > 0 && hoursUntilEnd <= 4) {
                  // Expiring soon (within 4 hours)
                  cardBorderColor = 'border-red-500/60'
                  cardBgGradient = 'bg-gradient-to-br from-red-500/20 to-black/40'
                  statusBadge = 'Expiring Soon'
                  statusColor = 'red'
                } else if (promo.type === 'special' || promo.type === 'flash-deal') {
                  cardBorderColor = 'border-primary-500/60'
                  cardBgGradient = 'bg-gradient-to-br from-primary-500/20 to-black/40'
                  statusBadge = promo.type === 'flash-deal' ? 'Flash Deal' : 'Special'
                  statusColor = 'primary'
                } else {
                  cardBorderColor = 'border-emerald-500/60'
                  cardBgGradient = 'bg-gradient-to-br from-emerald-500/20 to-black/40'
                  statusBadge = 'Active'
                  statusColor = 'emerald'
                }
              }

              const isGoogleOnly = !!venue.isGooglePlace
              const alreadySaved = isGoogleOnly && savedPlaceIds.has(venue.placeId || '')
              const justSaved = isGoogleOnly && justSavedPlaceId === venue.placeId

              return (
                <div
                  key={venue._id}
                  onClick={() => {
                    if (!isGoogleOnly && venue._id) {
                      setViewingVenueId(venue._id)
                    } else if (isGoogleOnly) {
                      // Open Google Maps or website externally
                      const url = venue.website ||
                        (venue.location?.latitude && venue.location?.longitude
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}&query_place_id=${venue.placeId}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + (venue.address?.city || ''))}`)
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  className={`${cardBgGradient} border-2 ${isGoogleOnly ? 'border-blue-500/40' : cardBorderColor} rounded-2xl overflow-hidden backdrop-blur-sm cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-500/20 transition-all relative group`}
                >
                  {/* Image Area */}
                  <div className="relative h-32 bg-gradient-to-br from-primary-500/10 to-black/40 overflow-hidden">
                    {venue.coverPhoto || venue.image || venue.logo ? (
                      <img
                        src={venue.coverPhoto || venue.image || venue.logo}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/15 to-primary-500/5">
                        <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center border border-primary-500/30">
                          <span className="text-2xl font-bold text-primary-500">
                            {venue.name?.[0]?.toUpperCase() || 'V'}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-start justify-between">
                      <div className="flex items-center gap-1 flex-wrap">
                        {isTrending && (
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-lg">
                            <Flame className="w-2.5 h-2.5" /> Hot
                          </div>
                        )}
                        {statusBadge && (
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm ${
                            statusColor === 'red' ? 'bg-red-500/90 text-white' :
                            statusColor === 'primary' ? 'bg-primary-500/90 text-black' :
                            'bg-emerald-500/90 text-black'
                          }`}>
                            {statusBadge}
                          </div>
                        )}
                        {isGoogleOnly && (
                          <div className="bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-bold text-white flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" /> Google
                          </div>
                        )}
                      </div>
                      {/* Favorite / Save */}
                      {isGoogleOnly ? (
                        <button
                          onClick={(e) => handleSaveGoogleVenue(venue, e)}
                          className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-lg transition-all flex items-center gap-1 ${
                            alreadySaved ? 'bg-primary-500/30 text-primary-400' : justSaved ? 'bg-primary-500 text-black' : 'bg-black/60 backdrop-blur-sm text-primary-400 hover:bg-primary-500 hover:text-black'
                          }`}
                          disabled={alreadySaved}
                        >
                          {justSaved ? '✓ Saved' : alreadySaved ? '✓ Saved' : '+ Save'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => toggleFavorite(venue._id?.toString() || '', e)}
                          className="p-1.5 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-all shadow-lg"
                        >
                          <Star className={`w-4 h-4 transition-all ${isFavorite ? 'fill-primary-500 text-primary-500' : 'text-white/50 hover:text-primary-500'}`} />
                        </button>
                      )}
                    </div>

                    {/* Bottom-left: venue name overlay on image */}
                    <div className="absolute bottom-2 left-2 right-2 z-10">
                      <h3 className="font-bold text-white text-sm leading-tight line-clamp-1 drop-shadow-lg">{venue.name || 'Unknown Venue'}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(venue.address?.city || venue.address?.state) && (
                          <span className="text-[10px] text-white/60">{[venue.address?.city, venue.address?.state].filter(Boolean).join(', ')}</span>
                        )}
                        {distance !== null && (
                          <span className="text-[10px] text-white/50">· {distance < 0.1 ? `${Math.round(distance * 5280)}ft` : `${distance.toFixed(1)}mi`}</span>
                        )}
                      </div>
                    </div>

                    {/* Friends indicator */}
                    {friendsAtVenue > 0 && (
                      <div className="absolute top-10 right-2 z-10 bg-green-500/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-lg">
                        <Activity className="w-3 h-3" />
                        {friendsAtVenue} here
                      </div>
                    )}
                  </div>

                  {/* Venue Info */}
                  <div className="p-2.5">
                    {/* Rating + Open status row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {venueRating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary-500 text-primary-500" />
                          <span className="text-[11px] font-bold text-primary-500">{venueRating.rating}</span>
                        </div>
                      )}
                      {venueOpenStatus !== null && (
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${venueOpenStatus ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                          <span className={`text-[10px] font-semibold ${venueOpenStatus ? 'text-green-400' : 'text-gray-500'}`}>
                            {venueOpenStatus ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      )}
                      {activePromos.length > 1 && (
                        <span className="text-[10px] font-bold text-primary-500 bg-primary-500/15 px-1.5 py-0.5 rounded-full">{activePromos.length} deals</span>
                      )}
                    </div>

                    {/* Active Promotion */}
                    {activePromos.length > 0 ? (
                      <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg px-2.5 py-2">
                        <p className="text-[11px] text-white font-semibold line-clamp-1">{activePromos[0].title}</p>
                        {formatPromotionDate(activePromos[0]) && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-primary-500 flex-shrink-0" />
                            <p className="text-[10px] text-primary-500 font-medium leading-tight">{formatPromotionDate(activePromos[0])}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-primary-400/25 text-center py-1">Tap to explore</p>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
            {/* Loading More Indicator */}
            {loadingMoreVenues && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                <span className="ml-3 text-primary-400">Loading more venues...</span>
              </div>
            )}
            {/* End of List Indicator */}
            {!venuesHasMore && getFilteredVenues.length > 0 && (
              <div className="text-center py-8 text-primary-400/50 text-sm">
                No more venues
              </div>
            )}
            </>
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

      {/* Quick Send Sheet — opens on top of friend modal */}
      {selectedFriend && (
        <QuickSendDrinkSheet
          recipientId={selectedFriend._id || selectedFriend.id || ''}
          recipientName={`${selectedFriend.firstName || ''} ${selectedFriend.lastName || ''}`.trim()}
          recipientFirstName={selectedFriend.firstName}
          recipientAvatar={selectedFriend.profilePicture}
          isOpen={showSendSheet}
          onClose={() => setShowSendSheet(false)}
          onSuccess={() => {
            setShowSendSheet(false)
            setSelectedFriend(null)
          }}
        />
      )}

      {/* Friend Profile Modal — bottom sheet */}
      {selectedFriend && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setSelectedFriend(null)}
        >
          <div
            className="bg-black/95 border border-primary-500/30 rounded-t-3xl p-6 w-full max-w-sm shadow-2xl shadow-primary-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-primary-500/30 rounded-full mx-auto mb-5" />

            {/* Avatar + name */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-3">
                {selectedFriend.profilePicture ? (
                  <img
                    src={selectedFriend.profilePicture}
                    alt={`${selectedFriend.firstName} ${selectedFriend.lastName}`}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-500 shadow-xl shadow-primary-500/30"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-500/20 border-4 border-primary-500 flex items-center justify-center shadow-xl shadow-primary-500/20">
                    <span className="text-primary-500 font-bold text-3xl">
                      {selectedFriend.firstName?.[0]}{selectedFriend.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black" />
              </div>
              <h3 className="text-xl font-bold text-white">{selectedFriend.firstName} {selectedFriend.lastName}</h3>
              {selectedFriend.distance && (
                <p className="text-primary-400/60 text-sm mt-0.5">{selectedFriend.distance} away</p>
              )}
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => setShowSendSheet(true)}
              className="w-full bg-primary-500 text-black py-4 rounded-2xl font-bold text-base mb-3 hover:bg-primary-400 active:scale-95 transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              <Martini className="w-5 h-5" />
              Send a Shot
            </button>

            {/* Secondary actions */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (selectedFriend.location) {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedFriend.location.latitude},${selectedFriend.location.longitude}`
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }
                }}
                className="flex-1 bg-black/40 border border-primary-500/20 text-primary-400 py-3 rounded-2xl font-semibold hover:bg-primary-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-sm"
              >
                <Navigation className="w-4 h-4" />
                Directions
              </button>
              <button
                onClick={() => {
                  if (onViewProfile && selectedFriend) {
                    onViewProfile(selectedFriend._id || selectedFriend.id)
                  }
                  setSelectedFriend(null)
                }}
                className="flex-1 bg-black/40 border border-primary-500/20 text-primary-400 py-3 rounded-2xl font-semibold hover:bg-primary-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-sm"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
            </div>

            <button
              onClick={() => setSelectedFriend(null)}
              className="w-full py-2 text-primary-400/40 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
