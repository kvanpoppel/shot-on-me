'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { MapPin, Star, Users, Sparkles, Loader, X, ExternalLink, Globe, Navigation, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
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

interface MyVenuesTabProps {
  initialOpenVenueId?: string | null
  onVenueOpened?: () => void
}

export default function MyVenuesTab({ initialOpenVenueId, onVenueOpened }: MyVenuesTabProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()

  // SOM followed venues
  const [followedVenues, setFollowedVenues] = useState<any[]>([])
  const [loadingFollowed, setLoadingFollowed] = useState(true)
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(initialOpenVenueId || null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'with-promotions'>('all')

  // Google saved venues (backend)
  const [savedVenues, setSavedVenues] = useState<SavedGoogleVenue[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)

  // Edit / reorder mode
  const [editMode, setEditMode] = useState(false)

  // Auto-open venue passed from search
  useEffect(() => {
    if (initialOpenVenueId) {
      setSelectedVenueId(initialOpenVenueId)
      onVenueOpened?.()
    }
  }, [initialOpenVenueId])

  useEffect(() => {
    if (token) {
      fetchFollowedVenues()
      fetchSavedVenues()
    }
  }, [token])

  const fetchFollowedVenues = async () => {
    try {
      setLoadingFollowed(true)
      const res = await axios.get(`${API_URL}/venue-follows/following`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      const normalized = (res.data?.followedVenues || []).map((venue: any) => {
        if (venue.rating && typeof venue.rating === 'object' && 'average' in venue.rating) {
          venue.rating = typeof venue.rating.average === 'number' ? venue.rating.average : null
        }
        return venue
      })
      setFollowedVenues(normalized)
    } catch {
      setFollowedVenues([])
    } finally {
      setLoadingFollowed(false)
    }
  }

  const fetchSavedVenues = async () => {
    try {
      setLoadingSaved(true)
      const res = await axios.get(`${API_URL}/saved-venues`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      setSavedVenues(res.data?.venues || [])
    } catch {
      setSavedVenues([])
    } finally {
      setLoadingSaved(false)
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRemove = async (placeId: string) => {
    setSavedVenues(prev => prev.filter(v => v.placeId !== placeId))
    try {
      await axios.delete(`${API_URL}/saved-venues/${placeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch { /* optimistic — ignore */ }
  }

  const handleToggleFavorite = async (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSavedVenues(prev => prev.map(v => v.placeId === placeId ? { ...v, isFavorite: !v.isFavorite } : v))
    try {
      await axios.patch(`${API_URL}/saved-venues/${placeId}/favorite`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch { /* optimistic */ }
  }

  const moveVenue = useCallback(async (placeId: string, direction: 'left' | 'right') => {
    setSavedVenues(prev => {
      const idx = prev.findIndex(v => v.placeId === placeId)
      if (idx === -1) return prev
      const newIdx = direction === 'left' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      // Persist order to backend
      const placeIds = next.map(v => v.placeId)
      axios.patch(`${API_URL}/saved-venues/reorder`, { placeIds }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {})
      return next
    })
  }, [API_URL, token])

  const openVenue = (venue: SavedGoogleVenue) => {
    if (editMode) return
    const url = venue.website || venue.googleMapsUrl
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Filtered followed venues
  const filteredFollowed = activeFilter === 'with-promotions'
    ? followedVenues.filter(v => (v.promotions?.filter((p: any) => p.isActive) || []).length > 0)
    : followedVenues

  // ── Show VenueProfilePage ─────────────────────────────────────────────────
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

      {/* ── Saved Google Venues ─────────────────────────────────────────── */}
      {(loadingSaved || savedVenues.length > 0) && (
        <div className="border-b border-primary-500/10">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-primary-500 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Saved Venues
              {savedVenues.length > 0 && (
                <span className="text-xs text-primary-400/50 font-normal">{savedVenues.length}</span>
              )}
            </h2>
            {savedVenues.length > 1 && (
              <button
                onClick={() => setEditMode(e => !e)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                  editMode
                    ? 'bg-primary-500 text-black'
                    : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                }`}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            )}
          </div>

          {loadingSaved ? (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-5 h-5 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide">
              {savedVenues.map((venue, idx) => {
                const hasWebsite = !!venue.website
                return (
                  <div
                    key={venue.placeId}
                    onClick={() => openVenue(venue)}
                    className={`flex-shrink-0 w-44 bg-black/60 border rounded-2xl overflow-hidden transition-all relative ${
                      editMode
                        ? 'border-primary-500/40 cursor-default'
                        : 'border-primary-500/20 cursor-pointer hover:border-primary-500/50 hover:bg-primary-500/5'
                    }`}
                  >
                    {/* Cover */}
                    <div className="h-20 bg-primary-500/10 flex items-center justify-center overflow-hidden relative">
                      {venue.coverPhoto ? (
                        <img src={venue.coverPhoto} alt={venue.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                          <span className="text-xl font-bold text-primary-500">{venue.name[0]?.toUpperCase()}</span>
                        </div>
                      )}

                      {/* Link type badge */}
                      {!editMode && (
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5 text-primary-400" />
                          <span className="text-[9px] text-primary-400 font-medium">{hasWebsite ? 'Website' : 'Maps'}</span>
                        </div>
                      )}

                      {/* Favorite + Remove (always visible) */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <button
                          onClick={(e) => handleToggleFavorite(venue.placeId, e)}
                          className="w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/90 transition-all"
                        >
                          <Star className={`w-3 h-3 ${venue.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-primary-400/60'}`} />
                        </button>
                        {editMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemove(venue.placeId) }}
                            className="w-6 h-6 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500 transition-all"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <p className="font-semibold text-primary-500 text-xs line-clamp-1 mb-0.5">{venue.name}</p>
                      {(venue.address?.city || venue.address?.state) && (
                        <p className="text-[10px] text-primary-400/60 line-clamp-1 flex items-center gap-1 mb-1">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          {[venue.address.city, venue.address.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {venue.rating && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-[10px] font-semibold text-primary-400">{venue.rating.toFixed(1)}</span>
                          <span className="text-[9px] text-primary-400/40">Google</span>
                        </div>
                      )}

                      {/* Edit mode: reorder arrows */}
                      {editMode ? (
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveVenue(venue.placeId, 'left') }}
                            disabled={idx === 0}
                            className="flex-1 flex items-center justify-center py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 disabled:opacity-30 hover:bg-primary-500/20 transition-all"
                          >
                            <ChevronLeft className="w-4 h-4 text-primary-400" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveVenue(venue.placeId, 'right') }}
                            disabled={idx === savedVenues.length - 1}
                            className="flex-1 flex items-center justify-center py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 disabled:opacity-30 hover:bg-primary-500/20 transition-all"
                          >
                            <ChevronRight className="w-4 h-4 text-primary-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-primary-500 bg-primary-500/10 border border-primary-500/20 rounded-lg px-2 py-1">
                          {hasWebsite ? <Globe className="w-3 h-3 flex-shrink-0" /> : <Navigation className="w-3 h-3 flex-shrink-0" />}
                          <span className="text-[10px] font-semibold truncate">{hasWebsite ? 'Visit Website' : 'Open in Maps'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SOM Followed Venues ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-primary-500/20">
        <h1 className="text-2xl font-semibold text-primary-500 mb-4">My Venues</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'all' ? 'bg-primary-500 text-black' : 'bg-black/40 text-primary-400 border border-primary-500/20'
            }`}
          >
            All ({followedVenues.length})
          </button>
          <button
            onClick={() => setActiveFilter('with-promotions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'with-promotions' ? 'bg-primary-500 text-black' : 'bg-black/40 text-primary-400 border border-primary-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            With Promotions
          </button>
        </div>
      </div>

      {loadingFollowed ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredFollowed.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-primary-500/40 mx-auto mb-4" />
              <p className="text-primary-400 text-lg mb-2">
                {activeFilter === 'with-promotions' ? 'No venues with active promotions' : 'No followed venues yet'}
              </p>
              <p className="text-primary-400/60 text-sm">
                {activeFilter === 'with-promotions'
                  ? 'Follow venues to see their promotions here'
                  : 'Search for a venue and save it, or follow a venue to see it here'}
              </p>
            </div>
          ) : (
            filteredFollowed.map((venue) => {
              const activePromos = venue.promotions?.filter((p: any) => p.isActive) || []
              return (
                <div
                  key={venue._id}
                  onClick={() => setSelectedVenueId(venue._id)}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-4 cursor-pointer hover:bg-primary-500/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary-500 mb-1">{venue.name}</h3>
                      {venue.address && (
                        <div className="flex items-center gap-1 text-primary-400 text-sm mb-2">
                          <MapPin className="w-4 h-4" />
                          <span>{venue.address.city}{venue.address.state && `, ${venue.address.state}`}</span>
                        </div>
                      )}
                    </div>
                    {venue.rating && typeof venue.rating === 'number' && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-primary-500 font-semibold text-sm">{venue.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
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
                  {activePromos.length > 0 && (
                    <div className="space-y-2">
                      {activePromos.slice(0, 2).map((promo: any, idx: number) => (
                        <div key={idx} className="bg-primary-500/10 border border-primary-500/20 rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-primary-500 font-medium text-sm">{promo.title}</span>
                            {promo.discount && <span className="text-green-500 font-bold text-sm">{promo.discount}% OFF</span>}
                          </div>
                          {promo.description && <p className="text-primary-400 text-xs mt-1 line-clamp-1">{promo.description}</p>}
                        </div>
                      ))}
                      {activePromos.length > 2 && (
                        <p className="text-primary-400/60 text-xs">+{activePromos.length - 2} more</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
