'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { MapPin, Zap, ChevronRight, TrendingUp, Gift } from 'lucide-react'
import { Venue, FIZZ_CATEGORIES, FIZZ_CITIES, CATEGORY_ICONS, CATEGORY_COLORS, EXCLUDED_CATEGORIES } from '../types'

interface HomeTabProps {
  onSendFizz?: (venueId?: string) => void
  onDiscover?: () => void
}

function isFizzVenue(venue: Venue): boolean {
  if (!venue.category) return false
  const cat = venue.category.toLowerCase()
  return (
    FIZZ_CATEGORIES.some(c => cat.includes(c.toLowerCase())) &&
    !EXCLUDED_CATEGORIES.some(ex => cat.includes(ex.toLowerCase()))
  )
}

export default function HomeTab({ onSendFizz, onDiscover }: HomeTabProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()

  const [selectedCity, setSelectedCity] = useState(FIZZ_CITIES[0])
  const [venues, setVenues] = useState<Venue[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [venuesRes, promoRes] = await Promise.allSettled([
        axios.get(`${API_URL}/venues`, {
          params: { city: selectedCity, limit: 10 },
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/venues/promotions/active`, {
          params: { city: selectedCity },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (venuesRes.status === 'fulfilled') {
        const all = venuesRes.value.data.venues || venuesRes.value.data || []
        setVenues(all.filter(isFizzVenue).slice(0, 8))
      }
      if (promoRes.status === 'fulfilled') {
        const promos = promoRes.value.data.promotions || promoRes.value.data || []
        setPromotions(promos.slice(0, 4))
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token, selectedCity])

  useEffect(() => { fetchData() }, [fetchData])

  const VenueCard = ({ venue }: { venue: Venue }) => {
    const catKey = Object.keys(CATEGORY_ICONS).find(k => venue.category?.toLowerCase().includes(k.toLowerCase())) || 'Cafe'
    const icon = CATEGORY_ICONS[catKey] || '🏠'
    const colorClass = CATEGORY_COLORS[catKey] || 'bg-white/10 text-white/70'

    return (
      <div
        className="flex-shrink-0 fizz-card overflow-hidden cursor-pointer hover:border-lime-fizz/30 transition-all"
        style={{ width: 180 }}
        onClick={() => onSendFizz?.(venue._id)}
      >
        {/* Image */}
        <div className="w-full h-28 relative overflow-hidden" style={{ background: '#2E2E50' }}>
          {venue.photos?.[0] || venue.imageUrl ? (
            <img src={venue.photos?.[0] || venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              {icon}
            </div>
          )}
          {venue.isFizzing && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold fizzing-badge">
              Fizzing Now
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-bold text-white text-sm leading-tight truncate">{venue.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <span className={`category-badge text-xs ${colorClass}`}>{icon} {catKey}</span>
          </div>
          {venue.neighborhood && (
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3 text-white/30" />
              <span className="text-xs text-white/40 truncate">{venue.neighborhood}</span>
            </div>
          )}
          <button
            className="mt-2 w-full py-1.5 rounded-xl text-xs font-bold text-center"
            style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}
          >
            Send a Fizz
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#1A1A2E' }}>
      {/* Hero greeting */}
      <div className="px-5 pt-4 pb-6">
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #252540 0%, #2E2E50 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{ background: '#C8F135', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-15 blur-2xl" style={{ background: '#FF5F57', transform: 'translate(-30%, 30%)' }} />
          <p className="text-sm text-white/50 mb-1 relative z-10">Good day,</p>
          <h2 className="text-2xl font-black text-white relative z-10" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {user?.firstName}! 🫧
          </h2>
          <p className="text-sm text-white/50 mt-1 relative z-10">What moment will you send today?</p>
          <button
            onClick={() => onSendFizz?.()}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 relative z-10"
            style={{ background: '#C8F135', color: '#1A1A2E' }}
          >
            <Gift className="w-4 h-4" />
            Send a Fizz
          </button>
        </div>
      </div>

      {/* City tabs */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FIZZ_CITIES.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
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

      {/* Trending venues */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-5 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#C8F135' }} />
            <h2 className="font-bold text-white text-base">Trending in {selectedCity}</h2>
          </div>
          <button onClick={onDiscover} className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C8F135' }}>
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-3 px-5 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 rounded-2xl animate-pulse" style={{ width: 180, height: 200, background: '#252540' }} />
            ))}
          </div>
        ) : venues.length > 0 ? (
          <div className="flex gap-3 px-5 overflow-x-auto pb-2">
            {venues.map(v => <VenueCard key={v._id} venue={v} />)}
          </div>
        ) : (
          <div className="mx-5 py-8 text-center fizz-card">
            <p className="text-3xl mb-2">🫧</p>
            <p className="text-white/40 text-sm">No venues yet in {selectedCity}</p>
            <p className="text-white/25 text-xs mt-1">Check back soon or try another city</p>
          </div>
        )}
      </section>

      {/* What's Happening */}
      {promotions.length > 0 && (
        <section className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: '#FF5F57' }} />
            <h2 className="font-bold text-white text-base">What&apos;s Happening</h2>
          </div>
          <div className="flex flex-col gap-3">
            {promotions.map((promo: any) => (
              <div key={promo._id} className="fizz-card p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(255,95,87,0.15)' }}>
                  🎉
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm">{promo.title}</h3>
                  <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{promo.description}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: '#00D4FF' }}>{promo.venueName}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick categories */}
      <section className="px-5 mb-6">
        <h2 className="font-bold text-white text-base mb-3">Browse by Category</h2>
        <div className="grid grid-cols-3 gap-3">
          {FIZZ_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={onDiscover}
              className="fizz-card p-3 flex flex-col items-center gap-2 hover:border-lime-fizz/30 transition-all"
            >
              <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
              <span className="text-xs font-semibold text-white/70 text-center leading-tight">{cat}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
