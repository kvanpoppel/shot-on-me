'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  Users, TrendingUp, Sparkles, Calendar, MapPin, Clock, Zap, ChevronRight,
} from 'lucide-react'
import { FIZZ_CATEGORIES, EXCLUDED_CATEGORIES } from '../types'

interface FriendOut {
  user: { _id: string; firstName?: string; lastName?: string; name?: string; profilePicture?: string }
  venue: { _id: string; name: string }
  checkedInAt: string
}

interface TrendingVenue {
  _id: string; name: string; checkInsToday: number; category?: string; city?: string
}

interface Promo {
  _id?: string; title: string; description: string; isFlashDeal?: boolean; pointsReward?: number
  venue: { id: string; name: string }
}

interface VenueEvent {
  _id: string; title: string; description?: string; startTime: string; venue: { _id: string; name: string }; rsvpCount?: number
}

interface TonightData {
  friendsOut: FriendOut[]
  trendingVenues: TrendingVenue[]
  activePromotions: Promo[]
  eventsTonight: VenueEvent[]
}

function isFizzVenue(cat?: string) {
  if (!cat) return true
  const c = cat.toLowerCase()
  return FIZZ_CATEGORIES.some(f => c.includes(f.toLowerCase())) &&
    !EXCLUDED_CATEGORIES.some(ex => c.includes(ex.toLowerCase()))
}

function Avatar({ u }: { u: any }) {
  const first = u?.firstName || u?.name?.split(' ')[0] || '?'
  const last = u?.lastName || u?.name?.split(' ').slice(1).join(' ') || ''
  return (
    <div
      className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm"
      style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}
    >
      {u?.profilePicture
        ? <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
        : <>{first[0]}{last[0]}</>
      }
    </div>
  )
}

export default function TonightTab({ onSendFizz, onClose }: { onSendFizz?: (venueId?: string) => void; onClose?: () => void }) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [data, setData] = useState<TonightData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params: Record<string, string> = { radius: '10' }
      if (user?.location?.latitude) params.latitude = String(user.location.latitude)
      if (user?.location?.longitude) params.longitude = String(user.location.longitude)

      const res = await axios.get(`${API_URL}/tonight`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = res.data as TonightData
      // Filter to non-alcohol venues only
      d.trendingVenues = (d.trendingVenues || []).filter(v => isFizzVenue(v.category))
      setData(d)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token, user?.location])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Real-time: re-fetch immediately when promotions or check-ins happen
  useEffect(() => {
    if (!socket) return
    const refresh = () => { fetchData() }
    socket.on('new-promotion', refresh)
    socket.on('venue-checkin', refresh)
    return () => {
      socket.off('new-promotion', refresh)
      socket.off('venue-checkin', refresh)
    }
  }, [socket, fetchData])

  const isEmpty = !data || (
    !data.friendsOut?.length &&
    !data.trendingVenues?.length &&
    !data.activePromotions?.length &&
    !data.eventsTonight?.length
  )

  if (onClose) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: '#0F0F1E' }}>
          <TonightContent data={data} loading={loading} isEmpty={isEmpty} onSendFizz={onSendFizz} onClose={onClose} />
        </div>
      </>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#0F0F1E' }}>
      <TonightContent data={data} loading={loading} isEmpty={isEmpty} onSendFizz={onSendFizz} />
    </div>
  )
}

function TonightContent({ data, loading, isEmpty, onSendFizz, onClose }: {
  data: TonightData | null; loading: boolean; isEmpty: boolean
  onSendFizz?: (venueId?: string) => void; onClose?: () => void
}) {
  return (
    <div className={onClose ? 'flex-1 overflow-y-auto pb-10' : undefined} style={{ background: '#0F0F1E' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: '#C8F135' }} />
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              What's <span style={{ color: '#C8F135' }}>Fizzing</span>
            </h1>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
              <span className="text-white/40 text-xl">✕</span>
            </button>
          )}
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>See what's happening near you right now</p>
      </div>

      {loading ? (
        <div className="px-5 flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#1C1C32' }} />)}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-5">
          <p className="text-5xl mb-4">🫧</p>
          <p className="font-bold text-white/40 text-lg">Quiet out there</p>
          <p className="text-sm text-white/25 mt-1">Check back soon — good vibes are coming</p>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-6">

          {/* Friends out */}
          {!!data?.friendsOut?.length && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" style={{ color: '#C8F135' }} />
                <h2 className="font-bold text-white text-base">Friends Out ({data.friendsOut.length})</h2>
              </div>
              <div className="flex flex-col gap-2">
                {data.friendsOut.map((f, i) => {
                  const name = `${f.user?.firstName || f.user?.name?.split(' ')[0] || 'Friend'} ${f.user?.lastName || ''}`.trim()
                  return (
                    <div key={i} className="fizz-card p-3 flex items-center gap-3">
                      <Avatar u={f.user} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{name}</p>
                        <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {f.venue.name}
                        </p>
                      </div>
                      <button
                        onClick={() => onSendFizz?.(f.venue._id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}
                      >
                        Send Fizz
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Trending venues */}
          {!!data?.trendingVenues?.length && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" style={{ color: '#FF5F57' }} />
                <h2 className="font-bold text-white text-base">Trending Spots</h2>
              </div>
              <div className="flex flex-col gap-2">
                {data.trendingVenues.slice(0, 6).map((v, i) => (
                  <div key={v._id} className="fizz-card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: i === 0 ? 'rgba(255,215,0,0.2)' : i === 1 ? 'rgba(192,192,192,0.2)' : 'rgba(205,127,50,0.2)', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{v.name}</p>
                      {v.city && <p className="text-xs text-white/35">{v.city}</p>}
                    </div>
                    <div className="flex items-center gap-1" style={{ color: '#C8F135' }}>
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{v.checkInsToday}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active promos */}
          {!!data?.activePromotions?.length && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" style={{ color: '#00D4FF' }} />
                <h2 className="font-bold text-white text-base">Active Deals</h2>
              </div>
              <div className="flex flex-col gap-2">
                {data.activePromotions.slice(0, 5).map((p, i) => (
                  <div
                    key={p._id || i}
                    className="p-4 rounded-2xl"
                    style={p.isFlashDeal
                      ? { background: 'rgba(255,154,87,0.08)', border: '1px solid rgba(255,154,87,0.25)' }
                      : { background: '#1C1C32', border: '1px solid rgba(255,255,255,0.05)' }
                    }
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm">{p.title}</p>
                          {p.isFlashDeal && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,154,87,0.2)', color: '#FF9A57' }}>Flash Deal</span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">{p.description}</p>
                      </div>
                      {p.pointsReward ? (
                        <span className="text-xs font-bold" style={{ color: '#C8F135' }}>+{p.pointsReward} pts</span>
                      ) : null}
                    </div>
                    <p className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <MapPin className="w-3 h-3" /> {p.venue.name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Events */}
          {!!data?.eventsTonight?.length && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4" style={{ color: '#FF5F57' }} />
                <h2 className="font-bold text-white text-base">Events Tonight</h2>
              </div>
              <div className="flex flex-col gap-2">
                {data.eventsTonight.map(ev => (
                  <div key={ev._id} className="fizz-card p-4">
                    <p className="font-bold text-white text-sm mb-1">{ev.title}</p>
                    {ev.description && <p className="text-xs text-white/45 mb-2">{ev.description}</p>}
                    <div className="flex items-center justify-between">
                      <p className="text-xs flex items-center gap-1 text-white/35">
                        <MapPin className="w-3 h-3" /> {ev.venue.name}
                      </p>
                      <p className="text-xs flex items-center gap-1 text-white/35">
                        <Clock className="w-3 h-3" />
                        {new Date(ev.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    {ev.rsvpCount ? (
                      <p className="text-xs mt-1" style={{ color: '#C8F135' }}>{ev.rsvpCount} going</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
