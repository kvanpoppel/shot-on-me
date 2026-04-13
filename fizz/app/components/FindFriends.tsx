'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, Search, UserPlus, Check, Users, UserCheck, UserX } from 'lucide-react'

interface FindFriendsProps {
  onClose: () => void
  onViewProfile?: (userId: string) => void
}

interface SearchUser {
  _id: string; id?: string; firstName: string; lastName: string
  username?: string; profilePicture?: string; isFriend?: boolean
  mutualFriends?: number
}

function Avatar({ u }: { u: SearchUser }) {
  const init = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`
  return (
    <div className="w-11 h-11 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>
      {u.profilePicture
        ? <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
        : init
      }
    </div>
  )
}

export default function FindFriends({ onClose, onViewProfile }: FindFriendsProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [suggestions, setSuggestions] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/fizz/friends/suggestions`, { headers: { Authorization: `Bearer ${token}` } })
      setSuggestions(res.data.users || [])
    } catch { /* ignore */ }
  }, [API_URL, token])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  const fetchPendingRequests = useCallback(async () => {
    if (!token) return
    setRequestsLoading(true)
    try {
      const res = await axios.get(`${API_URL}/fizz/friends/requests/pending`, { headers: { Authorization: `Bearer ${token}` } })
      setPendingRequests(res.data.requests || [])
    } catch { /* ignore */ } finally {
      setRequestsLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchPendingRequests() }, [fetchPendingRequests])

  const handleAccept = async (requestId: string) => {
    try {
      await axios.post(`${API_URL}/fizz/friends/requests/${requestId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setPendingRequests(prev => prev.filter(r => r._id !== requestId))
    } catch { /* ignore */ }
  }

  const handleDecline = async (requestId: string) => {
    try {
      await axios.post(`${API_URL}/fizz/friends/requests/${requestId}/decline`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setPendingRequests(prev => prev.filter(r => r._id !== requestId))
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await axios.get(`${API_URL}/fizz/users/search`, {
          params: { q: query },
          headers: { Authorization: `Bearer ${token}` },
        })
        setResults(res.data.users || [])
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, API_URL, token])

  const handleAdd = async (user: SearchUser) => {
    const uid = user._id || user.id || ''
    try {
      await axios.post(`${API_URL}/fizz/friends/${uid}`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setAdded(prev => { const next = new Set(prev); next.add(uid); return next })
    } catch { /* ignore */ }
  }

  const displayList = query.trim().length >= 2 ? results : suggestions

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0F0F1E' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1A1A2E' }}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, username, email..."
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540' }}
            />
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 flex-shrink-0">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10">
          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#C8F135' }}>
                <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: '#C8F135', color: '#1A1A2E' }}>{pendingRequests.length}</span>
                Friend Requests
              </p>
              <div className="flex flex-col gap-2">
                {pendingRequests.map(req => {
                  const name = `${req.from?.firstName || ''} ${req.from?.lastName || ''}`.trim()
                  return (
                    <div key={req._id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.15)' }}>
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>
                        {req.from?.profilePicture ? <img src={req.from.profilePicture} alt="" className="w-full h-full object-cover" /> : `${req.from?.firstName?.[0] || ''}${req.from?.lastName?.[0] || ''}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{name}</p>
                        {req.from?.username && <p className="text-xs text-white/35">@{req.from.username}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(req._id)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,241,53,0.2)' }}>
                          <UserCheck className="w-4 h-4" style={{ color: '#C8F135' }} />
                        </button>
                        <button onClick={() => handleDecline(req._id)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,95,87,0.15)' }}>
                          <UserX className="w-4 h-4" style={{ color: '#FF5F57' }} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!query && (
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Your Fizz Friends
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i*0.15}s` }} />)}</div>
            </div>
          )}

          {!loading && displayList.length === 0 && query.length >= 2 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">No users found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {!loading && displayList.length === 0 && !query && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm">Search for friends above</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {displayList.map(u => {
              const uid = u._id || u.id || ''
              const name = `${u.firstName} ${u.lastName}`.trim()
              const isAdded = added.has(uid) || u.isFriend
              return (
                <div
                  key={uid}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: '#1C1C32', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <button onClick={() => { onViewProfile?.(uid); onClose() }} className="flex-shrink-0">
                    <Avatar u={u} />
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => { onViewProfile?.(uid); onClose() }}>
                    <p className="font-semibold text-white text-sm">{name}</p>
                    {u.username && <p className="text-xs text-white/35">@{u.username}</p>}
                    {u.mutualFriends ? (
                      <p className="text-xs text-white/25">{u.mutualFriends} mutual friend{u.mutualFriends !== 1 ? 's' : ''}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => !isAdded && handleAdd(u)}
                    disabled={isAdded}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                    style={isAdded
                      ? { background: 'rgba(200,241,53,0.15)', color: '#C8F135' }
                      : { background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }
                    }
                  >
                    {isAdded ? <><Check className="w-3 h-3" /> {u.isFriend ? 'Friends' : 'Requested'}</> : <><UserPlus className="w-3 h-3" /> Add</>}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
