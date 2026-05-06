'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { MapPin, Search, Star, List, Map, Check, ExternalLink, Loader } from 'lucide-react'
import {
  Venue, VenueCategory,
  FIZZ_CATEGORIES,
  FIZZ_PLACES_TYPES, FIZZ_PLACES_KEYWORDS,
  CATEGORY_ICONS, CATEGORY_COLORS, EXCLUDED_CATEGORIES,
} from '../types'

// Fizz map style — dark with lime-green accents
const FIZZ_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#1A1A2E' }] },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#C8F135' }] },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#1A1A2E' }] },
  { featureType: 'all', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#252540' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2e2e50' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#252540' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2a1a' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#C8F13530' }] },
]

interface PlaceResult {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  totalRatings?: number
  photo?: string
  isOpen?: boolean
  types?: string[]
}

interface SavedVenue {
  placeId: string
  name: string
  address?: { street?: string; city?: string; state?: string }
  website?: string
  googleMapsUrl?: string
  rating?: number
  coverPhoto?: string
}

interface VenueDiscoveryProps {
  onSendFizz?: (venueId?: string) => void
  savedGoogleVenues?: SavedVenue[]
  onSavedVenuesChange?: () => void
  initialCategory?: string
  onCategoryConsumed?: () => void
}

function isFizzVenue(venue: Venue): boolean {
  if (!venue.category) return false
  const cat = venue.category.toLowerCase()
  return (
    FIZZ_CATEGORIES.some(c => cat.includes(c.toLowerCase())) &&
    !EXCLUDED_CATEGORIES.some(ex => cat.includes(ex.toLowerCase()))
  )
}

// Default fallback center (Indianapolis) — used only if geolocation fails
const DEFAULT_CENTER = { lat: 39.7684, lng: -86.1581 }

export default function VenueDiscovery({ onSendFizz, savedGoogleVenues = [], onSavedVenuesChange, initialCategory, onCategoryConsumed }: VenueDiscoveryProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const { isLoaded } = useGoogleMaps()

  const [view, setView] = useState<'list' | 'map'>('list')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<VenueCategory | null>(null)

  // DB venues (Shot On Me platform venues)
  const [dbVenues, setDbVenues] = useState<Venue[]>([])
  // Google Places results (when category tapped)
  const [places, setPlaces] = useState<PlaceResult[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)

  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Map state
  const mapRef = useRef<google.maps.Map | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [selectedPin, setSelectedPin] = useState<PlaceResult | null>(null)

  // Watch user location — results follow the user as they move
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setMapCenter(loc)
      },
      () => { /* keep default center */ },
      { enableHighAccuracy: true, maximumAge: 30000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    setSavedIds(new Set(savedGoogleVenues.map(v => v.placeId)))
  }, [savedGoogleVenues])

  // Load SOM DB venues
  const fetchDbVenues = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 50, platform: 'fizz' }
      if (userLocation) {
        params.lat = userLocation.lat
        params.lng = userLocation.lng
        params.radius = 25 // miles
      }
      const res = await axios.get(`${API_URL}/venues`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      })
      const all = res.data.venues || res.data || []
      setDbVenues(all.filter(isFizzVenue))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token, userLocation])

  useEffect(() => { fetchDbVenues() }, [fetchDbVenues])

  // Apply initial category from Home tab navigation
  useEffect(() => {
    if (initialCategory && isLoaded) {
      const cat = initialCategory as VenueCategory
      if (FIZZ_CATEGORIES.includes(cat)) {
        setSelectedCategory(cat)
        searchPlaces(cat, userLocation || mapCenter)
      }
      onCategoryConsumed?.()
    }
  }, [initialCategory, isLoaded])

  // Google Places search using the new Place class (searchNearby)
  const searchPlaces = useCallback(async (category: VenueCategory, center: { lat: number; lng: number }) => {
    if (!isLoaded) return
    setPlacesLoading(true)
    setPlaces([])

    try {
      // Use the new google.maps.places.Place API if available, fall back to PlacesService
      if (typeof google !== 'undefined' && google.maps?.places?.Place?.searchNearby) {
        const { places: results } = await google.maps.places.Place.searchNearby({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos', 'businessStatus'],
          locationRestriction: {
            center: { lat: center.lat, lng: center.lng },
            radius: 8000,
          },
          includedPrimaryTypes: [FIZZ_PLACES_TYPES[category]],
          maxResultCount: 20,
        } as any)

        const mapped: PlaceResult[] = (results || []).map((r: any) => ({
          placeId: r.id || '',
          name: r.displayName?.text || r.displayName || '',
          address: r.formattedAddress || '',
          lat: r.location?.lat() ?? center.lat,
          lng: r.location?.lng() ?? center.lng,
          rating: r.rating,
          totalRatings: r.userRatingCount,
          photo: r.photos?.[0]?.getURI?.({ maxWidth: 400 }) || undefined,
          isOpen: r.businessStatus === 'OPERATIONAL',
        }))
        setPlaces(mapped)
        if (mapped.length > 0) setView('map')
      } else {
        // Fallback: use legacy PlacesService if new API not available
        const svc = new google.maps.places.PlacesService(document.createElement('div'))
        svc.nearbySearch({
          location: new google.maps.LatLng(center.lat, center.lng),
          radius: 8000,
          type: FIZZ_PLACES_TYPES[category] as any,
          keyword: FIZZ_PLACES_KEYWORDS[category],
        }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const mapped: PlaceResult[] = results.slice(0, 20).map(r => ({
              placeId: r.place_id || '',
              name: r.name || '',
              address: r.vicinity || '',
              lat: r.geometry?.location?.lat() || center.lat,
              lng: r.geometry?.location?.lng() || center.lng,
              rating: r.rating,
              totalRatings: r.user_ratings_total,
              photo: r.photos?.[0]?.getUrl({ maxWidth: 400 }),
              isOpen: r.opening_hours?.isOpen(),
            }))
            setPlaces(mapped)
            if (mapped.length > 0) setView('map')
          }
          setPlacesLoading(false)
        })
        return // early return — callback handles setPlacesLoading
      }
    } catch (err) {
      console.error('Places search failed:', err)
    }
    setPlacesLoading(false)
  }, [isLoaded])

  const handleCategorySelect = (cat: VenueCategory) => {
    if (cat === selectedCategory) {
      setSelectedCategory(null)
      setPlaces([])
      return
    }
    setSelectedCategory(cat)
    searchPlaces(cat, userLocation || mapCenter)
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  // Derived list — combine DB venues + Places results, deduped
  const displayList = selectedCategory
    ? places
    : dbVenues.filter(v => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return v.name?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)
      })

  const handleSavePlace = async (place: PlaceResult, e: React.MouseEvent) => {
    e.stopPropagation()
    if (savedIds.has(place.placeId)) {
      setSavedIds(prev => { const n = new Set(prev); n.delete(place.placeId); return n })
      try { await axios.delete(`${API_URL}/saved-venues/${place.placeId}`, { headers: { Authorization: `Bearer ${token}` } }); onSavedVenuesChange?.() } catch {}
    } else {
      setSavedIds(prev => new Set(Array.from(prev).concat(place.placeId)))
      try {
        await axios.post(`${API_URL}/saved-venues`, {
          placeId: place.placeId,
          name: place.name,
          address: { street: place.address },
          googleMapsUrl: `https://maps.google.com/?place_id=${place.placeId}`,
          rating: place.rating || 0,
          coverPhoto: place.photo || '',
        }, { headers: { Authorization: `Bearer ${token}` } })
        onSavedVenuesChange?.()
      } catch {}
    }
  }

  const handleSaveDbVenue = async (venue: Venue, e: React.MouseEvent) => {
    e.stopPropagation()
    if (savedIds.has(venue._id)) {
      setSavedIds(prev => { const n = new Set(prev); n.delete(venue._id); return n })
      try { await axios.delete(`${API_URL}/saved-venues/${venue._id}`, { headers: { Authorization: `Bearer ${token}` } }); onSavedVenuesChange?.() } catch {}
    } else {
      setSavedIds(prev => new Set(Array.from(prev).concat(venue._id)))
      try {
        await axios.post(`${API_URL}/saved-venues`, {
          placeId: venue._id, name: venue.name, address: venue.address || {},
          rating: typeof venue.rating === 'number' ? venue.rating : 0,
          coverPhoto: venue.photos?.[0] || venue.imageUrl || '',
        }, { headers: { Authorization: `Bearer ${token}` } })
        onSavedVenuesChange?.()
      } catch {}
    }
  }

  const catIcon = selectedCategory ? CATEGORY_ICONS[selectedCategory] || '🫧' : ''

  return (
    <div style={{ background: '#1A1A2E', minHeight: '100%' }}>
      <div className="max-w-2xl mx-auto">

        {/* Search + view toggle */}
        <div className="px-4 pt-4 pb-3 sticky top-0 z-10 flex gap-2" style={{ background: '#1A1A2E' }}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search venues..."
              className="w-full py-3 pl-10 pr-4 rounded-2xl text-sm border border-white/10 focus:border-lime-400 transition-colors"
              style={{ background: '#252540', color: '#fff' }}
            />
          </div>
          {/* Map / List toggle */}
          <div className="flex rounded-2xl overflow-hidden border border-white/10" style={{ background: '#252540' }}>
            <button
              onClick={() => setView('list')}
              className="px-3 py-2 transition-all"
              style={view === 'list' ? { background: '#C8F135', color: '#1A1A2E' } : { color: 'rgba(255,255,255,0.4)' }}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('map')}
              className="px-3 py-2 transition-all"
              style={view === 'map' ? { background: '#C8F135', color: '#1A1A2E' } : { color: 'rgba(255,255,255,0.4)' }}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category tabs — tap to search Google Places */}
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => { setSelectedCategory(null); setPlaces([]) }}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={selectedCategory === null
                ? { background: 'rgba(200,241,53,0.2)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.4)' }
                : { background: '#252540', color: 'rgba(255,255,255,0.5)' }}
            >
              All
            </button>
            {FIZZ_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                style={selectedCategory === cat
                  ? { background: 'rgba(200,241,53,0.2)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.4)' }
                  : { background: '#252540', color: 'rgba(255,255,255,0.5)' }}
              >
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
          {selectedCategory && (
            <p className="text-[10px] mt-1.5 ml-1" style={{ color: 'rgba(200,241,53,0.5)' }}>
              {placesLoading ? `Searching for ${catIcon} ${selectedCategory} near you...` : `${catIcon} ${selectedCategory} near you`}
            </p>
          )}
        </div>

        {/* ── MAP VIEW ── */}
        {view === 'map' && (
          <div className="px-4 mb-4">
            <div className="rounded-2xl overflow-hidden" style={{ height: 380, border: '1px solid rgba(200,241,53,0.15)' }}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={13}
                  onLoad={onMapLoad}
                  options={{
                    styles: FIZZ_MAP_STYLES,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'greedy',
                    backgroundColor: '#1A1A2E',
                  }}
                >
                  {/* Places pins */}
                  {places.map(place => (
                    <Marker
                      key={place.placeId}
                      position={{ lat: place.lat, lng: place.lng }}
                      title={place.name}
                      onClick={() => setSelectedPin(place)}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#C8F135',
                        fillOpacity: 1,
                        strokeColor: '#1A1A2E',
                        strokeWeight: 2,
                      }}
                    />
                  ))}

                  {/* DB venue pins */}
                  {!selectedCategory && dbVenues.map(v => {
                    const loc = (v as any).location
                    if (!loc?.latitude || !loc?.longitude) return null
                    return (
                      <Marker
                        key={v._id}
                        position={{ lat: loc.latitude, lng: loc.longitude }}
                        title={v.name}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: '#00D4FF',
                          fillOpacity: 1,
                          strokeColor: '#1A1A2E',
                          strokeWeight: 2,
                        }}
                        onClick={() => onSendFizz?.(v._id)}
                      />
                    )
                  })}

                  {/* Info window for selected Places pin */}
                  {selectedPin && (
                    <InfoWindow
                      position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
                      onCloseClick={() => setSelectedPin(null)}
                    >
                      <div style={{ background: '#252540', color: '#fff', padding: '8px', borderRadius: '8px', maxWidth: '200px' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{selectedPin.name}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{selectedPin.address}</p>
                        {selectedPin.rating && (
                          <p style={{ fontSize: '11px', color: '#C8F135' }}>★ {selectedPin.rating.toFixed(1)}</p>
                        )}
                        <a
                          href={`https://maps.google.com/?place_id=${selectedPin.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: '#C8F135', fontWeight: 600 }}
                        >
                          Open in Maps →
                        </a>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: '#252540' }}>
                  <Loader className="w-6 h-6 animate-spin" style={{ color: '#C8F135' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {/* Saved venues (from profile) */}
            {savedGoogleVenues.length > 0 && (
              <div className="px-4 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(200,241,53,0.4)' }}>Your Saved Spots</p>
                <div className="flex flex-col gap-3">
                  {savedGoogleVenues.map(venue => {
                    const openUrl = venue.website || venue.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`
                    return (
                      <div
                        key={venue.placeId}
                        className="fizz-card overflow-hidden cursor-pointer"
                        onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <div className="w-full h-32 relative overflow-hidden" style={{ background: '#2E2E50' }}>
                          {venue.coverPhoto
                            ? <img src={venue.coverPhoto} alt={venue.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-4xl">🏠</div>
                          }
                          <button
                            className="absolute top-2 right-2 p-1.5 rounded-full transition-all"
                            style={{ background: 'rgba(0,0,0,0.6)' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSavedIds(prev => { const n = new Set(prev); n.delete(venue.placeId); return n })
                              axios.delete(`${API_URL}/saved-venues/${venue.placeId}`, { headers: { Authorization: `Bearer ${token}` } })
                                .then(() => onSavedVenuesChange?.())
                                .catch(() => {})
                            }}
                          >
                            <Star className="w-4 h-4 fill-current" style={{ color: '#C8F135' }} />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="font-bold text-white text-sm">{venue.name}</p>
                          {(venue.address?.city || venue.address?.state) && (
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {[venue.address?.city, venue.address?.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="border-b mt-4 mb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              </div>
            )}

            {/* Places results (Google) */}
            {selectedCategory && (
              <div className="px-4 mb-4 flex flex-col gap-4 pb-6">
                {placesLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl animate-pulse" style={{ height: 240, background: '#252540' }} />
                  ))
                ) : places.length > 0 ? (
                  places.map(place => (
                    <div key={place.placeId} className="fizz-card overflow-hidden">
                      <div className="w-full h-36 relative overflow-hidden" style={{ background: '#2E2E50' }}>
                        {place.photo
                          ? <img src={place.photo} alt={place.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-5xl">{catIcon}</div>
                        }
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.3)' }}>
                            {catIcon} {selectedCategory}
                          </span>
                        </div>
                        <button
                          onClick={e => handleSavePlace(place, e)}
                          className="absolute top-2 right-2 p-1.5 rounded-full transition-all"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <Star className={`w-4 h-4 transition-all ${savedIds.has(place.placeId) ? 'fill-current' : ''}`} style={{ color: savedIds.has(place.placeId) ? '#C8F135' : 'rgba(255,255,255,0.4)' }} />
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-white text-base leading-tight">{place.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-white/30" />
                            <span className="text-xs text-white/40">{place.address}</span>
                          </div>
                          {place.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" style={{ color: '#C8F135' }} />
                              <span className="text-xs text-white/60">{place.rating.toFixed(1)} ({place.totalRatings?.toLocaleString()})</span>
                            </div>
                          )}
                        </div>
                        {place.isOpen !== undefined && (
                          <p className={`text-xs mt-1 font-semibold ${place.isOpen ? 'text-emerald-400' : 'text-red-400/70'}`}>
                            {place.isOpen ? 'Open now' : 'Closed'}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => onSendFizz?.()}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                            style={{ background: '#C8F135', color: '#1A1A2E' }}
                          >
                            Send a Fizz here
                          </button>
                          <a
                            href={`https://maps.google.com/?place_id=${place.placeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-4xl mb-3">{catIcon}</p>
                    <p className="text-white/40 font-medium">No {selectedCategory} found nearby</p>
                    <p className="text-white/25 text-sm mt-1">Try a different category</p>
                  </div>
                )}
              </div>
            )}

            {/* SOM DB venues (when no category selected) */}
            {!selectedCategory && (
              <>
                <div className="px-4 mb-3">
                  <p className="text-xs text-white/30 font-medium">
                    {loading ? 'Finding venues...' : `${(displayList as Venue[]).length} venue${(displayList as Venue[]).length !== 1 ? 's' : ''} near you`}
                  </p>
                </div>
                <div className="px-4 flex flex-col gap-4 pb-6">
                  {loading ? (
                    [1, 2, 3].map(i => (
                      <div key={i} className="rounded-2xl animate-pulse" style={{ height: 280, background: '#252540' }} />
                    ))
                  ) : (displayList as Venue[]).length > 0 ? (
                    (displayList as Venue[]).map(venue => {
                      const catKey = Object.keys(CATEGORY_ICONS).find(k => venue.category?.toLowerCase().includes(k.toLowerCase())) || 'Cafe'
                      const icon = CATEGORY_ICONS[catKey] || '🏠'
                      const colorClass = CATEGORY_COLORS[catKey] || 'bg-white/10 text-white/70'
                      const now = new Date()
                      const hasPromos = venue.promotions?.some((p: any) => {
                        const expiry = (p.isFlashDeal && p.flashDealEndsAt) ? new Date(p.flashDealEndsAt) : (p.endTime ? new Date(p.endTime) : null)
                        return !expiry || now < expiry
                      })
                      const isSaved = savedIds.has(venue._id)
                      return (
                        <div key={venue._id} className="fizz-card overflow-hidden" onClick={() => onSendFizz?.(venue._id)}>
                          <div className="w-full h-40 relative overflow-hidden" style={{ background: '#2E2E50' }}>
                            {venue.photos?.[0] || venue.imageUrl
                              ? <img src={venue.photos?.[0] || venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-5xl">{icon}</div>
                            }
                            <div className="absolute top-3 left-3">
                              <span className={`category-badge text-xs ${colorClass}`}>{icon} {catKey}</span>
                            </div>
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              {hasPromos && <div className="px-2 py-0.5 rounded-full text-xs font-bold fizzing-badge">Fizzing Now</div>}
                              <button onClick={e => handleSaveDbVenue(venue, e)} className="p-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>
                                <Star className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} style={{ color: isSaved ? '#C8F135' : 'rgba(255,255,255,0.5)' }} />
                              </button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold text-white text-base">{venue.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5">
                              {venue.neighborhood && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-white/30" /><span className="text-xs text-white/40">{venue.neighborhood}</span></div>}
                              {venue.rating && <div className="flex items-center gap-1"><Star className="w-3 h-3 fill-current" style={{ color: '#C8F135' }} /><span className="text-xs text-white/60">{venue.rating.toFixed(1)}</span></div>}
                            </div>
                            {venue.description && <p className="text-sm text-white/40 mt-2 line-clamp-2">{venue.description}</p>}
                            <div className="flex gap-2 mt-3">
                              <button onClick={e => { e.stopPropagation(); onSendFizz?.(venue._id) }} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#C8F135', color: '#1A1A2E' }}>
                                Send a Fizz
                              </button>
                              <button
                                onClick={async e => {
                                  e.stopPropagation()
                                  if (checkedIn.has(venue._id)) return
                                  try {
                                    await axios.post(`${API_URL}/fizz/checkins`, { venueId: venue._id, venueName: venue.name }, { headers: { Authorization: `Bearer ${token}` } })
                                    setCheckedIn(prev => new Set(Array.from(prev).concat(venue._id)))
                                  } catch {}
                                }}
                                disabled={checkedIn.has(venue._id)}
                                className="px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1"
                                style={checkedIn.has(venue._id) ? { background: 'rgba(0,212,255,0.15)', color: '#00D4FF' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                              >
                                {checkedIn.has(venue._id) ? <><Check className="w-3.5 h-3.5" /> In</> : <><MapPin className="w-3.5 h-3.5" /> Check in</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-4xl mb-3">🔍</p>
                      <p className="text-white/40 font-medium">No venues found</p>
                      <p className="text-white/25 text-sm mt-1">Try tapping a category above to find places via Google</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
