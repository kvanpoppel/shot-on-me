'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { MapPin, Zap, ChevronRight, TrendingUp, Gift, Flame, Clock } from 'lucide-react'
import { Venue, FIZZ_CATEGORIES, FIZZ_CITIES, CATEGORY_ICONS, CATEGORY_COLORS, EXCLUDED_CATEGORIES } from '../types'

interface HomeTabProps {
  onSendFizz?: (venueId?: string) => void
  onDiscover?: () => void
}

const FIZZ_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  'happy-hour': { label: 'Happy Hour',  color: '#FFB347' },
  'flash-deal': { label: 'Flash Deal',  color: '#FF5F57' },
  'special':    { label: 'Special',     color: '#00D4FF' },
  'exclusive':  { label: 'VIP',         color: '#C8F135' },
  'event':      { label: 'Event',       color: '#A78BFA' },
  'happy_hour': { label: 'Happy Hour',  color: '#FFB347' },
  'flash_deal': { label: 'Flash Deal',  color: '#FF5F57' },
}

function getTimeLeft(promo: any): string {
  const expiry = (promo.isFlashDeal && promo.flashDealEndsAt)
    ? new Date(promo.flashDealEndsAt)
    : (promo.endTime ? new Date(promo.endTime) : null)
  if (!expiry) return ''
  const diff = expiry.getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
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
        className="flex-shrink-0 overflow-hidden cursor-pointer transition-all"
        style={{ width: 156, background: '#1C1C32', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}
        onClick={() => onSendFizz?.(venue._id)}
      >
        {/* Image */}
        <div className="w-full h-24 relative overflow-hidden" style={{ background: '#2E2E50' }}>
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
            className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold text-center"
            style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}
          >
            Send a Fizz
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto" style={{ background: '#0F0F1E', minHeight: '100%' }}>
      <div className="max-w-2xl mx-auto">
      {/* Hero greeting */}
      <div className="px-4 pt-4 pb-4">
        <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1C1C32,#23233A)', border: '1px solid rgba(200,241,53,0.10)' }}>
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full opacity-15 blur-3xl" style={{ background: '#C8F135', transform: 'translate(30%,-30%)' }} />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-10 blur-3xl" style={{ background: '#FF5F57', transform: 'translate(-30%,30%)' }} />
          <p className="text-[13px] mb-0.5 relative z-10" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Poppins,sans-serif' }}>Hey there,</p>
          <h2 className="fizz-wordmark text-[28px] text-white relative z-10 leading-tight">
            {user?.firstName} <span style={{ color: '#C8F135' }}>👋</span>
          </h2>
          <p className="text-[13px] mt-1 mb-4 relative z-10" style={{ color: 'rgba(255,255,255,0.45)' }}>What moment will you send today?</p>
          <button
            onClick={() => onSendFizz?.()}
            className="fizz-btn-primary px-5 py-2.5 text-[13px] gap-2 relative z-10"
          >
            <Gift className="w-4 h-4" />
            Send a Fizz
          </button>
        </div>
      </div>

      {/* Dirty Soda featured strip */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden cursor-pointer" style={{ background: 'linear-gradient(90deg,#231C18,#1C1810)', border: '1px solid rgba(255,95,87,0.22)' }} onClick={() => onDiscover?.()}>
          <div className="absolute right-0 top-0 bottom-0 flex items-center opacity-20 text-7xl pr-3 pointer-events-none select-none">🧋</div>
          <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: 'rgba(255,95,87,0.15)' }}>🧋</div>
          <div className="flex-1 min-w-0 relative z-10">
            <div className="dirty-soda-badge inline-block mb-1" style={{ fontSize: 10, padding: '2px 8px' }}>VIRAL TREND</div>
            <p className="font-bold text-white text-[14px] leading-tight">Dirty Soda Shops Near You</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Soda + cream + your fave flavors</p>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0 relative z-10" style={{ color: 'rgba(255,154,87,0.70)' }} />
        </div>
      </div>

      {/* City tabs */}
      <div className="px-4 mb-4">
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
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#C8F135' }} />
            <h2 className="font-bold text-white text-base">Trending in {selectedCity}</h2>
          </div>
          <button onClick={onDiscover} className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C8F135' }}>
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-3 px-4 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 rounded-xl animate-pulse" style={{ width: 156, height: 180, background: '#252540' }} />
            ))}
          </div>
        ) : venues.length > 0 ? (
          <div className="flex gap-3 px-4 overflow-x-auto pb-2">
            {venues.map(v => <VenueCard key={v._id} venue={v} />)}
          </div>
        ) : (
          <div className="mx-4 py-6 text-center fizz-card">
            <p className="text-3xl mb-2">🫧</p>
            <p className="text-white/40 text-sm">No venues yet in {selectedCity}</p>
            <p className="text-white/25 text-xs mt-1">Check back soon or try another city</p>
          </div>
        )}
      </section>

      {/* What's Happening */}
      {promotions.length > 0 && (
        <section className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: '#FF5F57' }} />
            <h2 className="font-bold text-white text-base">What&apos;s Happening</h2>
          </div>
          <div className="flex flex-col gap-3">
            {promotions.map((promo: any) => {
              const typeInfo = FIZZ_TYPE_LABEL[promo.type]
              const timeLeft = getTimeLeft(promo)
              return (
                <div key={promo._id} className="fizz-card p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(255,95,87,0.15)' }}>
                    🎉
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white text-sm">{promo.title}</h3>
                      {typeInfo && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${typeInfo.color}22`, color: typeInfo.color, border: `1px solid ${typeInfo.color}44` }}>
                          {typeInfo.label}
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{promo.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs font-semibold" style={{ color: '#00D4FF' }}>{promo.venueName}</p>
                      {timeLeft && timeLeft !== 'Ended' && (
                        <span className="flex items-center gap-1 text-[10px] text-white/40">
                          <Clock className="w-3 h-3" />{timeLeft}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Quick categories */}
      <section className="px-4 mb-6">
        <h2 className="font-bold text-white text-sm mb-3">Browse by Category</h2>
        <div className="grid grid-cols-4 gap-2">
          {FIZZ_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={onDiscover}
              className="hover:border-lime-fizz/30 transition-all flex flex-col items-center gap-1.5 p-2"
              style={{ background: '#1C1C32', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}
            >
              <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
              <span className="text-[10px] font-semibold text-white/60 text-center leading-tight">{cat.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>
      </div>
    </div>
  )
}
