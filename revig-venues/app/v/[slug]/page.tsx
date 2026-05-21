'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getApiUrl } from '../../utils/api'
import { MapPin, Clock, Phone, Globe, Users, Star, ChevronDown, ChevronUp, Sparkles, Zap } from 'lucide-react'

interface VenueData {
  id: string
  name: string
  slug: string
  description: string
  coverPhoto: string
  category: string
  address: { street?: string; city?: string; state?: string; zipCode?: string }
  phone: string
  website: string
  branding: { logoUrl?: string; tagline?: string; frameColor?: string }
  schedule: Record<string, { open?: string; close?: string; closed?: boolean }>
  followerCount: number
  rating: { average?: number; count?: number }
  platform: string
  amenities: string[]
  activeDeals: {
    title: string; description: string; type: string; discount: number
    pricePoint?: { originalPrice: number; specialPrice: number }
    startTime?: string; endTime?: string; isFlashDeal?: boolean
  }[]
  menus: Record<string, any>
}

const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
  kidsFriendly: { label: 'Kid Friendly', icon: '👶' },
  dogFriendly: { label: 'Dog Friendly', icon: '🐕' },
  hasFood: { label: 'Food', icon: '🍽️' },
  byob: { label: 'BYOB', icon: '🍾' },
  trivia: { label: 'Trivia', icon: '🧠' },
  liveMusic: { label: 'Live Music', icon: '🎵' },
  outdoorSeating: { label: 'Outdoor', icon: '🌿' },
  happyHour: { label: 'Happy Hour', icon: '🧋' },
  poolTables: { label: 'Pool', icon: '🎱' },
  danceFloor: { label: 'Dance Floor', icon: '💃' },
  sportsTv: { label: 'Sports TV', icon: '📺' },
  karaoke: { label: 'Karaoke', icon: '🎤' },
  arcade: { label: 'Arcade', icon: '🕹️' },
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }
const DEAL_EMOJI: Record<string, string> = { 'happy-hour': '🧋', 'flash-deal': '⚡', 'special': '🎉', 'exclusive': '👑', 'event': '🎪' }

const ACCENT = '#C8F135'

export default function VenuePublicPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hoursOpen, setHoursOpen] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`${getApiUrl()}/venues/slug/${encodeURIComponent(slug)}/public`)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then(data => setVenue(data.venue))
      .catch(() => setError('Venue not found'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F1E' }}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: ACCENT }} />
    </div>
  )

  if (error || !venue) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0F0F1E' }}>
      <div className="text-center">
        <p className="text-2xl font-bold text-white mb-2">Venue not found</p>
        <p className="text-white/40 text-sm">This link may be expired or incorrect.</p>
      </div>
    </div>
  )

  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const todaySchedule = venue.schedule?.[todayKey]
  const isOpenNow = todaySchedule && !todaySchedule.closed && todaySchedule.open && todaySchedule.close
  const cityState = [venue.address?.city, venue.address?.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen text-white" style={{ background: '#0F0F1E' }}>
      {/* Hero */}
      <div className="relative">
        {venue.coverPhoto ? (
          <div className="h-56 sm:h-72 relative">
            <img src={venue.coverPhoto} alt={venue.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0F0F1E, rgba(15,15,30,0.4), transparent)' }} />
          </div>
        ) : (
          <div className="h-40" style={{ background: 'linear-gradient(135deg, #252540, #1A1A2E)' }} />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="flex items-end gap-3">
            {venue.branding?.logoUrl && (
              <img src={venue.branding.logoUrl} alt="" className="w-14 h-14 rounded-xl border-2 object-cover flex-shrink-0" style={{ borderColor: 'rgba(200,241,53,0.3)' }} />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{venue.name}</h1>
              {venue.branding?.tagline && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(200,241,53,0.7)' }}>{venue.branding.tagline}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-20 space-y-5 mt-4">
        {/* Quick info */}
        <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap">
          {cityState && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{cityState}</span>}
          {venue.category && <span className="capitalize">{venue.category}</span>}
          {venue.followerCount > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{venue.followerCount} followers</span>}
          {venue.rating?.average ? <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" style={{ color: ACCENT }} />{venue.rating.average.toFixed(1)}</span> : null}
          {isOpenNow && <span className="font-semibold" style={{ color: ACCENT }}>Open Now</span>}
        </div>

        {venue.description && <p className="text-sm text-white/60 leading-relaxed">{venue.description}</p>}

        {/* Active Deals */}
        {venue.activeDeals.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'rgba(200,241,53,0.5)' }}>
              <Sparkles className="w-3.5 h-3.5" /> Live Deals
            </h2>
            <div className="space-y-2">
              {venue.activeDeals.map((deal, i) => (
                <div key={i} className="rounded-xl p-3.5 flex items-start gap-3" style={{ background: 'rgba(200,241,53,0.04)', border: '1px solid rgba(200,241,53,0.12)' }}>
                  <span className="text-xl mt-0.5">{DEAL_EMOJI[deal.type] || '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{deal.title}</p>
                    {deal.description && <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2">{deal.description}</p>}
                    {deal.pricePoint && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-white/30 line-through">${deal.pricePoint.originalPrice}</span>
                        <span className="text-sm font-bold" style={{ color: ACCENT }}>${deal.pricePoint.specialPrice}</span>
                      </div>
                    )}
                    {deal.isFlashDeal && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-1" style={{ color: '#FF9A57' }}>
                        <Zap className="w-3 h-3" /> Flash Deal
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Hours */}
        {venue.schedule && Object.keys(venue.schedule).length > 0 && (
          <section>
            <button onClick={() => setHoursOpen(!hoursOpen)}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider w-full" style={{ color: 'rgba(200,241,53,0.5)' }}>
              <Clock className="w-3.5 h-3.5" /> Hours
              {hoursOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>
            {hoursOpen && (
              <div className="mt-2 rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                {DAY_ORDER.map(day => {
                  const s = venue.schedule?.[day]
                  const isToday = day === todayKey
                  return (
                    <div key={day} className="flex justify-between text-xs" style={{ color: isToday ? ACCENT : 'rgba(255,255,255,0.3)', fontWeight: isToday ? 600 : 400 }}>
                      <span>{DAY_SHORT[day]}</span>
                      <span>{s?.closed ? 'Closed' : s?.open && s?.close ? `${s.open} – ${s.close}` : '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* Amenities */}
        {venue.amenities.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'rgba(200,241,53,0.5)' }}>Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {venue.amenities.map(a => {
                const info = AMENITY_LABELS[a]
                if (!info) return null
                return (
                  <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-white/50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {info.icon} {info.label}
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {/* Contact */}
        {(venue.phone || venue.website) && (
          <section className="flex gap-3">
            {venue.phone && (
              <a href={`tel:${venue.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-white/50 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
            )}
            {venue.website && (
              <a href={venue.website} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-white/50 hover:text-white/70 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <Globe className="w-3.5 h-3.5" /> Website
              </a>
            )}
          </section>
        )}

        {/* CTA */}
        <div className="pt-2">
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(200,241,53,0.04)', border: '1px solid rgba(200,241,53,0.15)' }}>
            <p className="text-sm font-semibold text-white mb-1">Follow {venue.name} on Revig</p>
            <p className="text-[11px] text-white/35 mb-3">Get notified about deals and specials</p>
            <a href="https://revig.vercel.app"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ background: ACCENT, color: '#0F0F1E' }}>
              Open Revig
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
