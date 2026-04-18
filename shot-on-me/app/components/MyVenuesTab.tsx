'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { MapPin, Star, Users, Sparkles, Loader, X, ExternalLink, Globe, Navigation, ChevronLeft, ChevronRight } from 'lucide-react'
import VenueProfilePage from './VenueProfilePage'

// ── Shared types (used by MapTab to save) ──────────────────────────────────
export interface SavedGoogleVenue {
  placeId: string
  name: string
  address: { street?: string; city?: string; state?: string }
  website?: string
  googleMapsUrl: string
  rating?: number
  lat?: number
  lng?: number
  coverPhoto?: string
  isFavorite?: boolean
  order?: number
  savedAt?: string
}

type UnifiedVenue =
  | (SavedGoogleVenue & { _type: 'google' })
  | (any & { _type: 'som' })

interface MyVenuesTabProps {
  initialOpenVenueId?: string | null
  onVenueOpened?: () => void
}

export default function MyVenuesTab({ initialOpenVenueId, onVenueOpened }: MyVenuesTabProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()

  const [followedVenues, setFollowedVenues] = useState<any[]>([])
  const [savedVenues, setSavedVenues] = useState<SavedGoogleVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(initialOpenVenueId || null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'saved' | 'following' | 'promotions'>('all')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (initialOpenVenueId) {
      setSelectedVenueId(initialOpenVenueId)
      onVenueOpened?.()
    }
  }, [initialOpenVenueId])

  useEffect(() => {
    if (!token) return
    // Fetch immediately, then once more after 1.5s to handle race condition
    // where user navigates here before a just-saved venue's POST completes
    fetchAll()
    const retry = setTimeout(fetchAll, 1500)
    return () => clearTimeout(retry)
  }, [token])

  const fetchAll = async () => {
    console.log('[MyVenues] fetchAll called, API_URL:', API_URL, '| token present:', !!token)
    setLoading(true)
    setFetchError(null)
    try {
      const [savedRes, followedRes] = await Promise.allSettled([
        axios.get(`${API_URL}/saved-venues`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000
        }),
        axios.get(`${API_URL}/venue-follows/following`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000
        })
      ])

      if (savedRes.status === 'fulfilled') {
        const venues = savedRes.value.data?.venues || []
        console.log('[MyVenues] Saved venues fetched:', venues.length, venues.map((v: any) => v.name))
        setSavedVenues(venues)
      } else {
        console.error('[MyVenues] Failed to fetch saved venues:', savedRes.reason?.response?.status, savedRes.reason?.message)
      }

      if (followedRes.status === 'fulfilled') {
        const normalized = (followedRes.value.data?.followedVenues || []).map((v: any) => {
          if (v.rating && typeof v.rating === 'object' && 'average' in v.rating) {
            v.rating = typeof v.rating.average === 'number' ? v.rating.average : null
          }
          return v
        })
        setFollowedVenues(normalized)
      } else {
        console.error('Failed to fetch followed venues:', followedRes.reason)
      }

      if (savedRes.status === 'rejected' && followedRes.status === 'rejected') {
        setFetchError('Could not load venues. Check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRemove = async (placeId: string) => {
    setSavedVenues(prev => prev.filter(v => v.placeId !== placeId))
    try {
      await axios.delete(`${API_URL}/saved-venues/${placeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Failed to remove saved venue:', err)
    }
  }

  const handleToggleFavorite = async (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSavedVenues(prev => prev.map(v => v.placeId === placeId ? { ...v, isFavorite: !v.isFavorite } : v))
    try {
      await axios.patch(`${API_URL}/saved-venues/${placeId}/favorite`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const moveVenue = useCallback(async (placeId: string, direction: 'left' | 'right') => {
    setSavedVenues(prev => {
      const idx = prev.findIndex(v => v.placeId === placeId)
      if (idx === -1) return prev
      const newIdx = direction === 'left' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      const placeIds = next.map(v => v.placeId)
      axios.patch(`${API_URL}/saved-venues/reorder`, { placeIds }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch((err) => console.error('Failed to reorder:', err))
      return next
    })
  }, [API_URL, token])

  // ── Unified list ─────────────────────────────────────────────────────────
  const googleItems: UnifiedVenue[] = savedVenues.map(v => ({ ...v, _type: 'google' as const }))
  const somItems: UnifiedVenue[] = followedVenues.map(v => ({ ...v, _type: 'som' as const }))

  const allItems: UnifiedVenue[] = [...googleItems, ...somItems]

  const filteredItems = allItems.filter(v => {
    if (activeFilter === 'saved') return v._type === 'google'
    if (activeFilter === 'following') return v._type === 'som'
    if (activeFilter === 'promotions') {
      if (v._type === 'som') {
        const activePromos = v.promotions?.filter((p: any) => p.isActive) || []
        return activePromos.length > 0
      }
      return false
    }
    return true
  })

  const googleCount = savedVenues.length
  const somCount = followedVenues.length

  // ── VenueProfilePage overlay ──────────────────────────────────────────────
  if (selectedVenueId) {
    return (
      <VenueProfilePage
        venueId={selectedVenueId}
        onClose={() => setSelectedVenueId(null)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-black">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-primary-500/20 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-500">My Venues</h1>
          {allItems.length > 0 && (
            <p className="text-xs text-primary-400/50 mt-0.5">{allItems.length} venue{allItems.length !== 1 ? 's' : ''} saved</p>
          )}
        </div>
        {googleCount > 1 && (
          <button
            onClick={() => setEditMode(e => !e)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              editMode
                ? 'bg-primary-500 text-black'
                : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
            }`}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-primary-500/10">
        {([
          ['all', `All (${allItems.length})`],
          ['saved', `Saved (${googleCount})`],
          ['following', `Following (${somCount})`],
          ['promotions', '✦ Promos'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeFilter === key
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 text-primary-400 border border-primary-500/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <p className="text-primary-400/60 text-sm">{fetchError}</p>
          <button
            onClick={fetchAll}
            className="px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-400 text-sm"
          >
            Retry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 px-6 text-center">
          <MapPin className="w-16 h-16 text-primary-500/30" />
          <p className="text-primary-400 text-lg">
            {activeFilter === 'all' ? 'No venues saved yet' :
             activeFilter === 'saved' ? 'No saved venues' :
             activeFilter === 'following' ? 'Not following any venues' :
             'No venues with active promotions'}
          </p>
          <p className="text-primary-400/50 text-sm">
            Search for a venue on the map and tap + Save
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.map((venue, idx) => {
            const isGoogle = venue._type === 'google'
            const googleVenue = isGoogle ? (venue as SavedGoogleVenue & { _type: 'google' }) : null
            const activePromos = !isGoogle ? (venue.promotions?.filter((p: any) => p.isActive) || []) : []
            const googleIdx = isGoogle ? savedVenues.findIndex(v => v.placeId === googleVenue!.placeId) : -1

            return (
              <div
                key={isGoogle ? googleVenue!.placeId : venue._id}
                onClick={() => {
                  if (editMode) return
                  if (isGoogle) {
                    const url = googleVenue!.website || googleVenue!.googleMapsUrl
                    if (url) window.open(url, '_blank', 'noopener,noreferrer')
                  } else {
                    setSelectedVenueId(venue._id)
                  }
                }}
                className={`bg-black/40 border rounded-xl overflow-hidden transition-all ${
                  editMode
                    ? 'border-primary-500/40 cursor-default'
                    : 'border-primary-500/20 cursor-pointer hover:bg-primary-500/5 hover:border-primary-500/40'
                }`}
              >
                {/* Cover photo (Google venues only) */}
                {isGoogle && googleVenue!.coverPhoto && (
                  <div className="h-28 overflow-hidden relative">
                    <img src={googleVenue!.coverPhoto} alt={googleVenue!.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Badge */}
                      <div className="flex items-center gap-2 mb-1">
                        {isGoogle ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" />
                            Google
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
                            SOM
                          </span>
                        )}
                        {!isGoogle && activePromos.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-500 border border-primary-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            {activePromos.length} promo{activePromos.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-primary-500 truncate">{venue.name}</h3>

                      {(venue.address?.city || venue.address?.state) && (
                        <div className="flex items-center gap-1 text-primary-400/60 text-xs mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span>{[venue.address.city, venue.address.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}

                      {venue.rating && typeof venue.rating === 'number' && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold text-primary-400">{venue.rating.toFixed(1)}</span>
                        </div>
                      )}

                      {!isGoogle && venue.followerCount > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-primary-400/60">
                          <Users className="w-3 h-3" />
                          <span>{venue.followerCount} followers</span>
                        </div>
                      )}
                    </div>

                    {/* Right actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {isGoogle && (
                        <button
                          onClick={(e) => handleToggleFavorite(googleVenue!.placeId, e)}
                          className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
                        >
                          <Star className={`w-4 h-4 ${googleVenue!.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-primary-400/40'}`} />
                        </button>
                      )}
                      {isGoogle && editMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(googleVenue!.placeId) }}
                          className="w-8 h-8 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      )}
                      {!isGoogle && !editMode && (
                        <div className="text-primary-400/40 text-xs">tap to view</div>
                      )}
                    </div>
                  </div>

                  {/* Promotions preview (SOM venues) */}
                  {!isGoogle && activePromos.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {activePromos.slice(0, 2).map((promo: any, i: number) => (
                        <div key={i} className="bg-primary-500/10 border border-primary-500/20 rounded-lg px-3 py-1.5 flex items-center justify-between">
                          <span className="text-primary-500 font-medium text-xs">{promo.title}</span>
                          {promo.discount && <span className="text-green-400 font-bold text-xs">{promo.discount}% OFF</span>}
                        </div>
                      ))}
                      {activePromos.length > 2 && (
                        <p className="text-primary-400/40 text-xs pl-1">+{activePromos.length - 2} more</p>
                      )}
                    </div>
                  )}

                  {/* Google venue: open button + reorder in edit mode */}
                  {isGoogle && (
                    <div className="mt-3">
                      {editMode ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveVenue(googleVenue!.placeId, 'left') }}
                            disabled={googleIdx <= 0}
                            className="flex-1 flex items-center justify-center py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 disabled:opacity-30 hover:bg-primary-500/20 transition-all"
                          >
                            <ChevronLeft className="w-4 h-4 text-primary-400" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveVenue(googleVenue!.placeId, 'right') }}
                            disabled={googleIdx >= savedVenues.length - 1}
                            className="flex-1 flex items-center justify-center py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 disabled:opacity-30 hover:bg-primary-500/20 transition-all"
                          >
                            <ChevronRight className="w-4 h-4 text-primary-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-primary-500 bg-primary-500/10 border border-primary-500/20 rounded-lg px-3 py-1.5 w-fit">
                          {googleVenue!.website
                            ? <><Globe className="w-3 h-3 flex-shrink-0" /><span className="text-xs font-semibold">Visit Website</span></>
                            : <><Navigation className="w-3 h-3 flex-shrink-0" /><span className="text-xs font-semibold">Open in Maps</span></>
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
