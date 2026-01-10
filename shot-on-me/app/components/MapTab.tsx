'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { MapPin, Clock, Tag, Star, Share2, Navigation, Martini, Users, Search, X, List, Map as MapIcon, ChevronDown, ChevronUp, TrendingUp, Moon, Loader2, AlertCircle, RefreshCw, Settings, User, ThermometerSun, Heart, Calendar, Phone, Coffee, UtensilsCrossed, Music, Flame, Award, Activity, ArrowLeft } from 'lucide-react'
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
  const [filter, setFilter] = useState<'all' | 'favorites' | 'happy-hour' | 'specials' | 'weekend' | 'trending' | 'tonight'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list') // Default to list view to show venues
  const [isMounted, setIsMounted] = useState(false)
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<Set<string>>(new Set())
  
  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Don't auto-switch to map - let user choose their preferred view
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
  const [temperature, setTemperature] = useState<number | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [legendMinimized, setLegendMinimized] = useState(false)
  const [showActiveVenues, setShowActiveVenues] = useState(true)
  const [showRegularVenues, setShowRegularVenues] = useState(true)
  const [circularFriendAvatars, setCircularFriendAvatars] = useState<Map<string, string>>(new Map())

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
      console.error('Failed to fetch friends:', error)
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
      console.error('Error fetching weather:', error)
      // Fallback temperature
      const month = new Date().getMonth()
      const isSummer = month >= 5 && month <= 8
      const estimatedTemp = isSummer ? 75 + Math.floor(Math.random() * 15) : 45 + Math.floor(Math.random() * 20)
      setTemperature(estimatedTemp)
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  const getCurrentLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not available in this browser')
      // Fetch weather for default location
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
      console.warn('Location permission denied. Please enable it in Settings → Device Permissions.')
      fetchWeatherData(39.7684, -86.1581) // Default to Indianapolis
      return
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          
          // Reverse geocode to get city name
          if (mapsLoaded && typeof google !== 'undefined' && google.maps) {
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const city = results[0].address_components?.find(c => c.types.includes('locality'))?.long_name
                if (city) setCurrentCity(city)
              }
            })
          }
          
          // Fetch weather data for current location
          fetchWeatherData(latitude, longitude)
        },
        (error) => {
          console.warn('Geolocation error:', error.message || error)
          if (error.code === error.PERMISSION_DENIED) {
            console.warn('Location permission denied. Please enable it in Settings → Device Permissions.')
          } else if (error.code === error.TIMEOUT) {
            console.warn('Location request timed out. This is normal if location services are slow.')
          }
          // Fetch weather for default location on error
          fetchWeatherData(39.7684, -86.1581)
        },
        {
          enableHighAccuracy: false, // Use less accurate but faster location
          timeout: 15000, // Increased to 15 seconds
          maximumAge: 300000 // Accept cached location up to 5 minutes old
        }
      )
    } catch (error) {
      console.warn('Geolocation request failed:', error)
      // Fetch weather for default location on error
      fetchWeatherData(39.7684, -86.1581)
    }
  }, [mapsLoaded, fetchWeatherData])

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
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Returns distance in miles
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

    // Apply promotion filter
    if (filter === 'all') return filtered
    if (filter === 'favorites') {
      return filtered.filter(venue => favoriteVenueIds.has(venue._id?.toString()))
    }
    if (filter === 'trending') {
      const trendingIds = new Set(trendingVenues.map(v => v._id?.toString()))
      return filtered.filter(venue => trendingIds.has(venue._id?.toString()))
    }
    if (filter === 'weekend') {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
      
      return filtered.filter((venue) => {
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
      })
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
  }, [venues, filter, searchQuery, googlePlace, trendingVenues, calculateDistance, favoriteVenueIds])

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
      console.error('Failed to fetch favorite venues:', error)
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
      console.error('Failed to toggle favorite:', error)
    }
  }, [token, API_URL])

  // Fetch data on mount
  useEffect(() => {
    if (token && API_URL) {
      fetchVenues()
      fetchTrendingVenues()
      fetchFriends()
      fetchFavoriteVenues()
      getCurrentLocation()
    } else if (!token) {
      // Still fetch weather even if not logged in
      fetchWeatherData(39.7684, -86.1581) // Default to Indianapolis
    }
  }, [token, API_URL, fetchVenues, fetchTrendingVenues, fetchFriends, fetchFavoriteVenues, getCurrentLocation, fetchWeatherData])

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
    return getFilteredVenues
      .filter((venue) => {
        if (!venue.location?.latitude || !venue.location?.longitude) return false
        
        // Check if venue has active promotions
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
        
        // Filter based on visibility toggles
        if (hasActivePromotions && !showActiveVenues) return false
        if (!hasActivePromotions && !showRegularVenues) return false
        
        return true
      })
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
  }, [getFilteredVenues, showActiveVenues, showRegularVenues])

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
    <div className="min-h-screen pb-14 bg-black max-w-4xl mx-auto pt-16">
      {/* Header - Optimized Compact Design */}
      {viewMode === 'map' ? (
        <div className="bg-black/95 backdrop-blur-md border-b border-primary-500/10 sticky top-16 z-20 p-2 sm:p-2.5">
          {/* Top Row: Back Button, Location, Temperature, Settings - Compact */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
            {/* Back Button */}
            <button
              onClick={() => setActiveTab?.('home')}
              className="flex-shrink-0 p-1.5 sm:p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all active:scale-95"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Location Bar - Compact */}
            <div className="flex-1 min-w-0 bg-white rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black flex-shrink-0" />
              <span className="text-black font-bold text-xs sm:text-sm truncate">{currentCity}</span>
            </div>
            
            {/* Temperature Display - Compact */}
            <button
              onClick={() => {
                let weatherUrl = 'https://weather.com/weather/today/l/'
                if (userLocation) {
                  weatherUrl = `https://weather.com/weather/today/l/${userLocation.lat},${userLocation.lng}`
                } else if (currentCity) {
                  weatherUrl = `https://weather.com/weather/today/l/${encodeURIComponent(currentCity)}`
                } else {
                  weatherUrl = 'https://weather.com'
                }
                window.open(weatherUrl, '_blank', 'noopener,noreferrer')
              }}
              className="flex-shrink-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg sm:rounded-full px-2 sm:px-3 py-1.5 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 shadow-md hover:from-orange-500/30 hover:to-red-500/30 hover:border-orange-500/50 active:scale-95 transition-all"
              title="Open Weather.com"
            >
              <ThermometerSun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400" />
              {weatherLoading ? (
                <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-400 animate-spin" />
              ) : temperature !== null ? (
                <span className="text-[10px] sm:text-xs font-bold text-orange-400">{temperature}°F</span>
              ) : (
                <span className="text-[10px] sm:text-xs font-bold text-orange-400/70">--°F</span>
              )}
            </button>
            
            {/* Settings Icon */}
            <button
              onClick={() => onOpenSettings?.()}
              className="flex-shrink-0 p-1.5 sm:p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all active:scale-95"
              title="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          
          {/* Bottom Row: View Toggle - Compact */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50 flex items-center gap-1 active:scale-95"
            >
              <List className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all bg-primary-500 text-black shadow-lg flex items-center gap-1 active:scale-95"
            >
              <MapIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-black/95 backdrop-blur-md border-b border-primary-500/10 sticky top-16 z-20 px-4 py-2">
          <div className="flex items-center justify-center relative mb-2">
            <h1 className="text-xl font-bold text-primary-500 tracking-tight text-center">Venues</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="absolute right-0 p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all disabled:opacity-50"
              title="Refresh venues"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Search Bar - Only for List View */}
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
              placeholder="Search venues by name, city, or address..."
              className="w-full"
            />
          </div>
          
          {/* Horizontal Scrollable Filter Tabs - Chase Offers Style */}
          <div className="mb-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              <button
                onClick={() => setFilter('all')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'favorites'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${filter === 'favorites' ? 'fill-black' : ''}`} />
                Favorites
              </button>
              <button
                onClick={() => setFilter('happy-hour')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'happy-hour'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <Martini className="w-3.5 h-3.5" />
                Happy Hour
              </button>
              <button
                onClick={() => setFilter('specials')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'specials'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Current Specials
              </button>
              <button
                onClick={() => setFilter('weekend')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'weekend'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Weekend
              </button>
              <button
                onClick={() => setFilter('trending')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'trending'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Trending
              </button>
              <button
                onClick={() => setFilter('tonight')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'tonight'
                    ? 'bg-primary-500 text-black shadow-lg'
                    : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Tonight
              </button>
            </div>
          </div>
          
          {/* View Toggle - Compact */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-primary-500 text-black shadow-lg'
                  : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
              }`}
            >
              <List className="w-3.5 h-3.5 inline mr-1" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                (viewMode as string) === 'map'
                  ? 'bg-primary-500 text-black shadow-lg'
                  : 'bg-black/60 border border-primary-500/30 text-primary-400 hover:text-primary-500 hover:border-primary-500/50'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 inline mr-1" />
              Map
            </button>
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
        <div className="h-[calc(100vh-12rem)] sm:h-[calc(100vh-13rem)] relative">
          {!mapsLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center text-primary-400">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-500" />
                <p className="text-lg font-semibold">Loading map...</p>
              </div>
            </div>
          ) : userLocation || (venueMarkers.length > 0 && venueMarkers[0]?.position) ? (
            <div className="relative w-full h-full" data-map-container>
            <GoogleMapComponent
                center={userLocation || {
                  lat: venueMarkers[0]?.position?.lat || 39.7684,
                  lng: venueMarkers[0]?.position?.lng || -86.1581
                }}
                zoom={venueMarkers.length > 0 ? 13 : 12}
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
                                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full border border-black animate-pulse"></div>
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

      {/* List View - Compact Style */}
      {viewMode === 'list' && (
      <div className="p-3">
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
            <div className="grid grid-cols-2 gap-2.5">
            {getFilteredVenues.map((venue: any) => {
              if (!venue || !venue._id) return null
              
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
              const isFeatured = venue.isFeatured === true
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
                  cardBorderColor = 'border-yellow-500/60'
                  cardBgGradient = 'bg-gradient-to-br from-yellow-500/20 to-black/40'
                  statusBadge = 'Happy Hour'
                  statusColor = 'yellow'
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

              return (
                <div
                  key={venue._id}
                  onClick={() => {
                      if (!venue.isGooglePlace && venue._id) {
                        setViewingVenueId(venue._id)
                    }
                  }}
                  className={`${cardBgGradient} border-2 ${cardBorderColor} rounded-2xl overflow-hidden backdrop-blur-sm cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-500/20 transition-all relative group`}
                >
                  {/* Badges Row - Top */}
                  <div className="absolute top-2 left-2 right-2 z-10 flex items-start justify-between gap-2">
                    {/* Left Side - Trending/Featured/Multiple Promos */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isTrending && (
                        <div className="bg-gradient-to-r from-orange-500/90 to-red-500/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-lg">
                          <Flame className="w-2.5 h-2.5" />
                          Trending
                        </div>
                      )}
                      {isFeatured && (
                        <div className="bg-gradient-to-r from-purple-500/90 to-pink-500/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-lg">
                          <Award className="w-2.5 h-2.5" />
                          Featured
                        </div>
                      )}
                      {activePromos.length > 1 && (
                        <div className="bg-primary-500/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-black shadow-lg">
                          +{activePromos.length - 1} more
                        </div>
                      )}
                    </div>
                    
                    {/* Right Side - Favorite Star */}
                    <button
                      onClick={(e) => toggleFavorite(venue._id?.toString() || '', e)}
                      className="p-1.5 bg-black/70 backdrop-blur-sm rounded-full hover:bg-black/90 transition-all shadow-lg"
                    >
                      <Star 
                        className={`w-4 h-4 transition-all ${
                          isFavorite 
                            ? 'fill-yellow-500 text-yellow-500' 
                            : 'text-primary-400/60 hover:text-yellow-500'
                        }`} 
                      />
                    </button>
                  </div>

                  {/* Friends at Venue Indicator - Top Right Below Badges */}
                  {friendsAtVenue > 0 && (
                    <div className="absolute top-12 right-2 z-10 bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-lg animate-pulse">
                      <Activity className="w-3 h-3" />
                      {friendsAtVenue} friend{friendsAtVenue > 1 ? 's' : ''} here
                    </div>
                  )}
                  
                  {/* Multiple Promotions Indicator - Bottom Right on Image */}
                  {activePromos.length > 1 && (
                    <div className="absolute bottom-2 right-2 z-10 bg-primary-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold text-black shadow-lg flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {activePromos.length} deals
                    </div>
                  )}

                  {/* Business Icon/Logo Area - Reduced height */}
                  <div className="relative h-24 bg-gradient-to-br from-primary-500/10 to-black/40 overflow-hidden group/image">
                    {venue.image || venue.logo ? (
                      <img 
                        src={venue.image || venue.logo} 
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover/image:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 bg-primary-500/20 rounded-xl flex items-center justify-center border-2 border-primary-500/30 group-hover/image:scale-110 transition-transform duration-300">
                          <span className="text-2xl font-bold text-primary-500">
                            {venue.name?.[0]?.toUpperCase() || 'V'}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Gradient Overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Open/Closed Status Badge - Bottom Left */}
                    {venueOpenStatus !== null && (
                      <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold shadow-lg backdrop-blur-sm flex items-center gap-1 ${
                        venueOpenStatus 
                          ? 'bg-green-500/90 text-white' 
                          : 'bg-gray-700/90 text-gray-300'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${venueOpenStatus ? 'bg-green-300 animate-pulse' : 'bg-gray-400'}`}></div>
                        {venueOpenStatus ? 'Open Now' : 'Closed'}
                      </div>
                    )}
                    
                    {/* Status Badge Overlay - Bottom Right (or left if no open status) */}
                    {statusBadge && (
                      <div className={`absolute ${venueOpenStatus !== null ? 'bottom-2 right-2' : 'bottom-2 left-2'} px-2 py-1 rounded-lg text-xs font-bold shadow-lg backdrop-blur-sm ${
                        statusColor === 'yellow' ? 'bg-yellow-500/90 text-black' :
                        statusColor === 'red' ? 'bg-red-500/90 text-white' :
                        statusColor === 'primary' ? 'bg-primary-500/90 text-black' :
                        'bg-emerald-500/90 text-black'
                      }`}>
                        {statusBadge}
                      </div>
                    )}
                  </div>

                  {/* Venue Info - Compact */}
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="text-primary-500/70 flex-shrink-0">
                            {getCategoryIcon(venue.category)}
                          </div>
                          <h3 className="font-bold text-primary-500 text-sm line-clamp-1">{venue.name || 'Unknown Venue'}</h3>
                        </div>
                        {/* Address/City */}
                        {(venue.address?.city || venue.address?.state) && (
                          <p className="text-[10px] text-primary-400/60 mb-1.5 line-clamp-1">
                            {[venue.address?.city, venue.address?.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      {/* Rating */}
                      {venueRating && (
                        <div className="flex items-center gap-1 flex-shrink-0 bg-black/40 px-1.5 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          <span className="text-[10px] font-bold text-yellow-500">{venueRating.rating}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Distance & Social Info Row - Compact */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {distance !== null && (
                        <p className="text-[10px] text-primary-400/70 font-medium">
                          {distance < 0.1 ? `${Math.round(distance * 5280)}ft` : `${distance.toFixed(1)}mi`}
                        </p>
                      )}
                      {friendsAtVenue > 0 && (
                        <div className="flex items-center gap-1 text-[9px] text-green-400 font-medium">
                          <Users className="w-2.5 h-2.5" />
                          <span>{friendsAtVenue}</span>
                        </div>
                      )}
                    </div>

                    {/* Active Promotion - Compact */}
                    {activePromos.length > 0 ? (
                      <div className="mt-1 pt-1.5 border-t border-primary-500/10">
                        <p className="text-[10px] text-primary-400/90 line-clamp-1 font-semibold mb-1">
                          {activePromos[0].title}
                        </p>
                        {/* Compact Date & Time Display */}
                        {formatPromotionDate(activePromos[0]) && (
                          <div className="bg-primary-500/15 border border-primary-500/30 rounded-lg p-1.5 mb-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-primary-500 flex-shrink-0" />
                              <p className="text-[9px] font-bold text-primary-500 leading-tight break-words">
                                {formatPromotionDate(activePromos[0])}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null

                    {/* Quick Actions - Always visible but compact */}
                    <div className="mt-1.5 pt-1.5 border-t border-primary-500/10 flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (venue.location?.latitude && venue.location?.longitude) {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.location.latitude},${venue.location.longitude}`
                            window.open(url, '_blank')
                          }
                        }}
                        className="flex-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 px-1.5 py-1 rounded-lg text-[9px] font-semibold transition-all flex items-center justify-center gap-1"
                      >
                        <Navigation className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Directions</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (navigator.share && venue.name) {
                            navigator.share({
                              title: venue.name,
                              text: `Check out ${venue.name} on Shot On Me!`,
                              url: window.location.href
                            }).catch(() => {})
                          }
                        }}
                        className="flex-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 px-1.5 py-1 rounded-lg text-[9px] font-semibold transition-all flex items-center justify-center gap-1"
                      >
                        <Share2 className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
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
