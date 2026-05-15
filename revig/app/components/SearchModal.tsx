'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Search, X, MapPin, Users } from 'lucide-react'
import { REVIG_CATEGORIES, EXCLUDED_CATEGORIES } from '../types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onViewProfile?: (userId: string) => void
  onSendRevig?: (venueId?: string) => void
}

function isRevigVenue(cat?: string) {
  if (!cat) return true
  const c = cat.toLowerCase()
  return REVIG_CATEGORIES.some(f => c.includes(f.toLowerCase())) &&
    !EXCLUDED_CATEGORIES.some(ex => c.includes(ex.toLowerCase()))
}

export default function SearchModal({ isOpen, onClose, onViewProfile, onSendRevig }: SearchModalProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
    else { setQuery(''); setUsers([]); setVenues([]) }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setUsers([]); setVenues([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const [userRes, venueRes] = await Promise.allSettled([
          axios.get(`${API_URL}/revig/users/search`, { params: { q: query }, headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/venues`, { params: { search: query, limit: 10 }, headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (userRes.status === 'fulfilled') setUsers(userRes.value.data.users || [])
        if (venueRes.status === 'fulfilled') {
          const all = venueRes.value.data.venues || venueRes.value.data || []
          setVenues(all.filter((v: any) => isRevigVenue(v.category)).slice(0, 5))
        }
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, API_URL, token])

  if (!isOpen) return null

  const hasResults = users.length > 0 || venues.length > 0

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col" style={{ background: '#1A1A2E', maxHeight: '80vh', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        {/* Search bar */}
        <div className="flex items-center gap-3 px-5 py-4 safe-top">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search people, venues..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-revig"
              style={{ background: '#252540' }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-white/30" />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-sm font-semibold flex-shrink-0" style={{ color: '#C8F135' }}>Cancel</button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i*0.15}s` }} />)}</div>
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div className="py-12 text-center">
              <p className="text-white/40 text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {!loading && !query && (
            <div className="py-10 text-center">
              <Search className="w-10 h-10 mx-auto mb-3 text-white/15" />
              <p className="text-white/30 text-sm">Search for people or Revig spots</p>
            </div>
          )}

          {/* People */}
          {users.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-white/30" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30">People</p>
              </div>
              <div className="flex flex-col gap-2">
                {users.map(u => {
                  const name = `${u.firstName} ${u.lastName}`.trim()
                  return (
                    <button
                      key={u._id}
                      onClick={() => { onViewProfile?.(u._id || u.id); onClose() }}
                      className="flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-white/5 transition-colors"
                      style={{ background: '#1C1C32' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>
                        {u.profilePicture
                          ? <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
                          : <>{u.firstName?.[0]}{u.lastName?.[0]}</>
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{name}</p>
                        {u.username && <p className="text-xs text-white/35">@{u.username}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Venues */}
          {venues.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-white/30" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30">Spots</p>
              </div>
              <div className="flex flex-col gap-2">
                {venues.map((v: any) => (
                  <button
                    key={v._id}
                    onClick={() => { onSendRevig?.(v._id); onClose() }}
                    className="flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-white/5 transition-colors"
                    style={{ background: '#1C1C32' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl" style={{ background: '#252540' }}>
                      {v.category?.toLowerCase().includes('coffee') ? '☕' :
                       v.category?.toLowerCase().includes('soda') ? '🧋' :
                       v.category?.toLowerCase().includes('juice') ? '🥤' : '🏪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{v.name}</p>
                      <p className="text-xs text-white/35 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {v.neighborhood || v.city || v.category}
                      </p>
                    </div>
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: '#C8F135' }}>Send Revig</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
