'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { MapPin, Search, Star, Filter, Check, ExternalLink, X } from 'lucide-react'
import { Venue, FIZZ_CATEGORIES, FIZZ_CITIES, CATEGORY_ICONS, CATEGORY_COLORS, EXCLUDED_CATEGORIES } from '../types'

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
}

function isFizzVenue(venue: Venue): boolean {
  if (!venue.category) return false
  const cat = venue.category.toLowerCase()
  return (
    FIZZ_CATEGORIES.some(c => cat.includes(c.toLowerCase())) &&
    !EXCLUDED_CATEGORIES.some(ex => cat.includes(ex.toLowerCase()))
  )
}

export default function VenueDiscovery({ onSendFizz, savedGoogleVenues = [], onSavedVenuesChange }: VenueDiscoveryProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()

  const [search, setSearch] = useState('')
  const [selectedCity, setSelectedCity] = useState(FIZZ_CITIES[0])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set())
  const [filtered, setFiltered] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  // Keep savedIds in sync with parent prop
  useEffect(() => {
    setSavedIds(new Set(savedGoogleVenues.map(v => v.placeId)))
  }, [savedGoogleVenues])

  const handleSaveVenue = async (venue: Venue, e: React.MouseEvent) => {
    e.stopPropagation()
    const placeId = venue._id
    if (savedIds.has(placeId)) {
      // Unsave
      setSavedIds(prev => { const n = new Set(prev); n.delete(placeId); return n })
      try {
        await axios.delete(`${API_URL}/saved-venues/${placeId}`, { headers: { Authorization: `Bearer ${token}` } })
        onSavedVenuesChange?.()
      } catch {}
    } else {
      // Save
      setSavedIds(prev => new Set(Array.from(prev).concat(placeId)))
      try {
        await axios.post(`${API_URL}/saved-venues`, {
          placeId,
          name: venue.name,
          address: venue.address || {},
          website: (venue as any).website || '',
          googleMapsUrl: '',
          rating: typeof venue.rating === 'number' ? venue.rating : 0,
          coverPhoto: venue.photos?.[0] || venue.imageUrl || '',
        }, { headers: { Authorization: `Bearer ${token}` } })
        onSavedVenuesChange?.()
      } catch {}
    }
  }

  const handleUnsaveSaved = async (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSavedIds(prev => { const n = new Set(prev); n.delete(placeId); return n })
    try {
      await axios.delete(`${API_URL}/saved-venues/${placeId}`, { headers: { Authorization: `Bearer ${token}` } })
      onSavedVenuesChange?.()
    } catch {}
  }

  const fetchVenues = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/venues`, {
        params: { city: selectedCity, limit: 50 },
        headers: { Authorization: `Bearer ${token}` },
      })
      const all = res.data.venues || res.data || []
      setVenues(all.filter(isFizzVenue))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token, selectedCity])

  useEffect(() => { fetchVenues() }, [fetchVenues])

  useEffect(() => {
    let list = [...venues]
    if (selectedCategory) {
      list = list.filter(v => v.category?.toLowerCase().includes(selectedCategory.toLowerCase()))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.name?.toLowerCase().includes(q) ||
        v.neighborhood?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [venues, selectedCategory, search])

  const VenueCard = ({ venue }: { venue: Venue }) => {
    const catKey = Object.keys(CATEGORY_ICONS).find(k => venue.category?.toLowerCase().includes(k.toLowerCase())) || 'Cafe'
    const icon = CATEGORY_ICONS[catKey] || '🏠'
    const colorClass = CATEGORY_COLORS[catKey] || 'bg-white/10 text-white/70'
    const hasPromos = venue.promotions && venue.promotions.length > 0
    const isSaved = savedIds.has(venue._id)

    return (
      <div className="fizz-card overflow-hidden" onClick={() => onSendFizz?.(venue._id)}>
        {/* Image */}
        <div className="w-full h-40 relative overflow-hidden" style={{ background: '#2E2E50' }}>
          {venue.photos?.[0] || venue.imageUrl ? (
            <img src={venue.photos?.[0] || venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {icon}
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className={`category-badge text-xs ${colorClass}`}>{icon} {catKey}</span>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {hasPromos && (
              <div className="px-2 py-0.5 rounded-full text-xs font-bold fizzing-badge">
                Fizzing Now
              </div>
            )}
            <button
              onClick={(e) => handleSaveVenue(venue, e)}
              className="p-1.5 rounded-full transition-all"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <Star className={`w-4 h-4 transition-all ${isSaved ? 'fill-current text-lime-400' : 'text-white/50'}`} style={isSaved ? { color: '#C8F135' } : {}} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-bold text-white text-base leading-tight">{venue.name}</h3>

          <div className="flex items-center gap-3 mt-1.5">
            {venue.neighborhood && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-white/30" />
                <span className="text-xs text-white/40">{venue.neighborhood}</span>
              </div>
            )}
            {venue.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" style={{ color: '#C8F135' }} />
                <span className="text-xs text-white/60">{venue.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {venue.description && (
            <p className="text-sm text-white/40 mt-2 line-clamp-2">{venue.description}</p>
          )}

          {/* Active promotions */}
          {hasPromos && (
            <div className="mt-3 p-2.5 rounded-xl" style={{ background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.15)', border: '1px solid' }}>
              <p className="text-xs font-bold" style={{ color: '#00D4FF' }}>🎉 {venue.promotions![0].title}</p>
              <p className="text-xs text-white/40 mt-0.5">{venue.promotions![0].description}</p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); onSendFizz?.(venue._id) }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: '#C8F135', color: '#1A1A2E' }}
            >
              Send a Fizz
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                if (checkedIn.has(venue._id)) return
                try {
                  await axios.post(`${API_URL}/fizz/checkins`, {
                    venueId: venue._id, venueName: venue.name,
                    latitude: (venue as any).location?.latitude,
                    longitude: (venue as any).location?.longitude,
                  }, { headers: { Authorization: `Bearer ${token}` } })
                  setCheckedIn(prev => new Set(Array.from(prev).concat(venue._id)))
                } catch { /* ignore */ }
              }}
              disabled={checkedIn.has(venue._id)}
              className="px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1 transition-all"
              style={checkedIn.has(venue._id)
                ? { background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }
                : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
              }
            >
              {checkedIn.has(venue._id) ? <><Check className="w-3.5 h-3.5" /> In</> : <><MapPin className="w-3.5 h-3.5" /> Check in</>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#1A1A2E', minHeight: '100%' }}>
      <div className="max-w-2xl mx-auto">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-3 sticky top-0 z-10" style={{ background: '#1A1A2E' }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search venues, neighborhoods..."
            className="w-full py-3 pl-10 pr-4 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz transition-colors"
            style={{ background: '#252540' }}
          />
        </div>
      </div>

      {/* City tabs */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FIZZ_CITIES.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={selectedCity === city
                ? { background: '#C8F135', color: '#1A1A2E' }
                : { background: '#252540', color: 'rgba(255,255,255,0.5)' }
              }
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={selectedCategory === null
              ? { background: 'rgba(200,241,53,0.2)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.4)' }
              : { background: '#252540', color: 'rgba(255,255,255,0.5)' }
            }
          >
            All
          </button>
          {FIZZ_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
              style={selectedCategory === cat
                ? { background: 'rgba(200,241,53,0.2)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.4)' }
                : { background: '#252540', color: 'rgba(255,255,255,0.5)' }
              }
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Venues Section */}
      {savedGoogleVenues.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex flex-col gap-3">
            {savedGoogleVenues.map(venue => {
              const openUrl = venue.website || venue.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`
              return (
                <div
                  key={venue.placeId}
                  className="fizz-card overflow-hidden cursor-pointer"
                  onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
                >
                  <div className="w-full h-40 relative overflow-hidden" style={{ background: '#2E2E50' }}>
                    {venue.coverPhoto ? (
                      <img src={venue.coverPhoto} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        🏠
                      </div>
                    )}
                    <button
                      onClick={(e) => handleUnsaveSaved(venue.placeId, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-full transition-all"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      <Star className="w-4 h-4 fill-current" style={{ color: '#C8F135' }} />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-base leading-tight">{venue.name}</h3>
                    {(venue.address?.city || venue.address?.state) && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="w-3 h-3 text-white/30" />
                        <span className="text-xs text-white/40">{[venue.address?.city, venue.address?.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {venue.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-current" style={{ color: '#C8F135' }} />
                        <span className="text-xs text-white/60">{typeof venue.rating === 'number' ? venue.rating.toFixed(1) : venue.rating}</span>
                      </div>
                    )}
                    <p className="text-xs mt-2" style={{ color: 'rgba(200,241,53,0.5)' }}>Tap to open</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-b mt-4 mb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
        </div>
      )}

      {/* Results count */}
      <div className="px-4 mb-4">
        <p className="text-xs text-white/30 font-medium">
          {loading ? 'Finding venues...' : `${filtered.length} venue${filtered.length !== 1 ? 's' : ''} in ${selectedCity}`}
        </p>
      </div>

      {/* Venue grid */}
      <div className="px-4 flex flex-col gap-4 pb-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 280, background: '#252540' }} />
          ))
        ) : filtered.length > 0 ? (
          filtered.map(v => <VenueCard key={v._id} venue={v} />)
        ) : (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-white/40 font-medium">No venues found</p>
            <p className="text-white/25 text-sm mt-1">Try a different city or category</p>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
