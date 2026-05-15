'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { MapPin, Zap, ChevronRight, TrendingUp, Gift, Clock, Users } from 'lucide-react'
import { Venue, REVIG_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS, EXCLUDED_CATEGORIES } from '../types'

interface HomeTabProps {
  onSendRevig?: (venueId?: string) => void
  onDiscover?: (category?: string) => void
  onFindFriends?: () => void
}

const REVIG_TYPE_LABEL: Record<string, { label: string; color: string }> = {
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

function isRevigVenue(venue: Venue): boolean {
  if (!venue.category) return false
  const cat = venue.category.toLowerCase()
  return (
    REVIG_CATEGORIES.some(c => cat.includes(c.toLowerCase())) &&
    !EXCLUDED_CATEGORIES.some(ex => cat.includes(ex.toLowerCase()))
  )
}

export default function HomeTab({ onSendRevig, onDiscover, onFindFriends }: HomeTabProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()

  const [venues, setVenues] = useState<Venue[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [detectedCity, setDetectedCity] = useState('Your Area')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [venuesRes, promoRes] = await Promise.allSettled([
        axios.get(`${API_URL}/venues`, {
          params: { limit: 10 },
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/venues/promotions/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (venuesRes.status === 'fulfilled') {
        const all = venuesRes.value.data.venues || venuesRes.value.data || []
        const filtered = all.filter(isRevigVenue)
        setVenues(filtered.slice(0, 8))
        // Detect city from venue data
        const firstCity = filtered.find((v: any) => v.city || v.address?.city)
        if (firstCity) setDetectedCity((firstCity as any).city || (firstCity as any).address?.city)
      }
      if (promoRes.status === 'fulfilled') {
        const raw = promoRes.value.data.promotions || promoRes.value.data || []
        // API returns venue objects with nested promotions — flatten to individual promo items
        const flattened: any[] = []
        raw.forEach((item: any) => {
          if (item.promotions && Array.isArray(item.promotions)) {
            // Venue object with nested promotions
            item.promotions.forEach((p: any) => {
              flattened.push({ ...p, venueId: item._id, venueName: item.name })
            })
          } else {
            // Already a flat promotion object
            flattened.push(item)
          }
        })
        setPromotions(flattened.slice(0, 4))
      }
    } catch {
      setError('Could not load venues. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchData() }, [fetchData])

  const VenueCard = ({ venue }: { venue: Venue }) => {
    const catKey = Object.keys(CATEGORY_ICONS).find(k => venue.category?.toLowerCase().includes(k.toLowerCase())) || 'Cafe'
    const icon = CATEGORY_ICONS[catKey] || '🏠'
    const colorClass = CATEGORY_COLORS[catKey] || 'bg-white/10 text-white/70'

    return (
      <div
        className="flex-shrink-0 overflow-hidden cursor-pointer transition-all"
        style={{ width: 156, background: '#1C1C32', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}
        onClick={() => onSendRevig?.(venue._id)}
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
          {venue.isReviging && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold revig-badge">
              Reviging Now
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
            Send a Revig
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
          <h2 className="revig-wordmark text-[28px] text-white relative z-10 leading-tight">
            {user?.firstName} <span style={{ color: '#C8F135' }}>👋</span>
          </h2>
          <p className="text-[13px] mt-1 mb-4 relative z-10" style={{ color: 'rgba(255,255,255,0.45)' }}>What moment will you send today?</p>
          <button
            onClick={() => onSendRevig?.()}
            className="revig-btn-primary px-5 py-2.5 text-[13px] gap-2 relative z-10"
          >
            <Gift className="w-4 h-4" />
            Send a Revig
          </button>
        </div>
      </div>

      {/* Invite Friends */}
      <div className="px-4 mb-4">
        <button
          onClick={onFindFriends}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: 'rgba(200,241,53,0.10)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.12)' }}
        >
          <Users className="w-4 h-4" />
          Invite Friends to Revig
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-4 flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
          <span>{error}</span>
          <button onClick={() => { setError(null); fetchData() }} className="font-bold text-xs ml-3 flex-shrink-0" style={{ color: '#C8F135' }}>Retry</button>
        </div>
      )}

      {/* Trending venues */}
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#C8F135' }} />
            <h2 className="font-bold text-white text-base">Trending in {detectedCity}</h2>
          </div>
          <button onClick={() => onDiscover?.()} className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C8F135' }}>
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
          <div className="mx-4 py-6 text-center revig-card">
            <p className="text-3xl mb-2">🫧</p>
            <p className="text-white/40 text-sm">No venues yet in {detectedCity}</p>
            <p className="text-white/25 text-xs mt-1">Check back soon — new spots are added daily</p>
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
              const typeInfo = REVIG_TYPE_LABEL[promo.type]
              const timeLeft = getTimeLeft(promo)
              return (
                <div key={promo._id} className="revig-card p-4 flex items-start gap-3 cursor-pointer hover:border-lime-revig/20 transition-all active:scale-[0.98]" onClick={() => onSendRevig?.(promo.venueId || promo._id)}>
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
      <section className="px-4 pb-4">
        <h2 className="font-bold text-white text-sm mb-3">Browse by Category</h2>
        <div className="grid grid-cols-4 gap-2">
          {REVIG_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onDiscover?.(cat)}
              className="hover:border-lime-revig/30 transition-all flex flex-col items-center gap-1.5 p-2"
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
