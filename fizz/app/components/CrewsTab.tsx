'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  Shield, Trophy, MapPin, Users, Plus, Crown, LogOut,
  Flame, Loader2, X, Zap,
} from 'lucide-react'

interface CrewsTabProps {
  onClose: () => void
}

const EMOJIS = ['🫧', '⚡', '🏆', '🧋', '🦋', '🌊', '🚀', '☕', '🌸', '💚']

export default function CrewsTab({ onClose }: CrewsTabProps) {
  const { user, token } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()

  const [mySquad, setMySquad] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lbType, setLbType] = useState<'weekly' | 'alltime'>('weekly')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🫧')
  const [newCity, setNewCity] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [squadRes, lbRes] = await Promise.all([
        axios.get(`${API_URL}/squads/mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/squads/leaderboard?type=${lbType}&limit=20`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      setMySquad(squadRes.data.squad)
      setLeaderboard(lbRes.data.leaderboard || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [token, API_URL, lbType])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!socket) return
    const handle = (data: any) => setPendingInvites(prev => [...prev, data])
    socket.on('squad:invited', handle)
    return () => { socket.off('squad:invited', handle) }
  }, [socket])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      await axios.post(`${API_URL}/squads`,
        { name: newName.trim(), emoji: newEmoji, city: newCity.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowCreate(false)
      setNewName('')
      setNewEmoji('🫧')
      setNewCity('')
      fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create crew')
    } finally {
      setCreating(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave your crew?')) return
    try {
      await axios.post(`${API_URL}/squads/leave`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setMySquad(null)
      fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not leave')
    }
  }

  const handleInviteResponse = async (squadId: string, accept: boolean) => {
    try {
      await axios.post(`${API_URL}/squads/invite/respond`,
        { squadId, accept },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPendingInvites(prev => prev.filter(i => i.squadId !== squadId))
      if (accept) fetchAll()
    } catch { /* ignore */ }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="rounded-3xl p-6 w-full max-w-sm" style={{ background: '#1C1C32', border: '1px solid rgba(200,241,53,0.2)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Create Crew</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-white/40" /></button>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Crew Emoji</p>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewEmoji(e)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                    style={newEmoji === e
                      ? { background: 'rgba(200,241,53,0.2)', border: '2px solid #C8F135' }
                      : { background: '#252540', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Crew Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value.slice(0, 40))}
                placeholder="e.g. Soda Crew"
                maxLength={40}
                className="w-full px-4 py-3 rounded-xl text-sm border border-white/10 focus:border-lime-fizz"
                style={{ background: '#252540' }}
              />
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">City (optional)</label>
              <input
                value={newCity}
                onChange={e => setNewCity(e.target.value)}
                placeholder="e.g. Salt Lake City"
                className="w-full px-4 py-3 rounded-xl text-sm border border-white/10 focus:border-lime-fizz"
                style={{ background: '#252540' }}
              />
            </div>

            {error && <p className="text-xs mb-3" style={{ color: '#FF5F57' }}>{error}</p>}

            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="fizz-btn-primary w-full py-3.5 gap-2 disabled:opacity-40"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {creating ? 'Creating...' : `Create ${newEmoji} ${newName || 'Crew'}`}
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0F0F1E' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1A1A2E' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#C8F135' }} />
            <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Crews</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-10">

          {/* Pending invites */}
          {pendingInvites.map(inv => (
            <div key={inv.squadId} className="fizz-card p-4 mb-4" style={{ border: '1px solid rgba(200,241,53,0.25)' }}>
              <p className="font-bold text-white text-sm mb-3">
                {inv.squadEmoji} You&apos;re invited to &quot;{inv.squadName}&quot;!
              </p>
              <div className="flex gap-3">
                <button onClick={() => handleInviteResponse(inv.squadId, true)} className="flex-1 fizz-btn-primary py-2.5 text-sm">Join</button>
                <button onClick={() => handleInviteResponse(inv.squadId, false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#252540', color: 'rgba(255,255,255,0.5)' }}>Decline</button>
              </div>
            </div>
          ))}

          {error && !showCreate && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.12)', color: '#FF5F57' }}>
              <span>{error}</span>
              <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C8F135' }} />
            </div>
          ) : (
            <>
              {/* My Crew */}
              {mySquad ? (
                <div className="fizz-card p-5 mb-5" style={{ border: '1px solid rgba(200,241,53,0.2)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{mySquad.emoji}</span>
                      <div>
                        <h3 className="text-lg font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{mySquad.name}</h3>
                        {mySquad.city && (
                          <p className="text-xs text-white/35 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {mySquad.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={handleLeave} className="text-xs text-white/25 hover:text-red-400 transition-colors flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5" /> Leave
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="py-3 rounded-2xl text-center" style={{ background: 'rgba(200,241,53,0.08)' }}>
                      <p className="text-xs text-white/35 flex items-center justify-center gap-1 mb-1"><Flame className="w-3 h-3" /> This Week</p>
                      <p className="text-2xl font-black" style={{ color: '#C8F135' }}>{mySquad.weeklyPoints?.toLocaleString() || 0}</p>
                      <p className="text-xs text-white/25">pts</p>
                    </div>
                    <div className="py-3 rounded-2xl text-center" style={{ background: 'rgba(0,212,255,0.08)' }}>
                      <p className="text-xs text-white/35 flex items-center justify-center gap-1 mb-1"><Trophy className="w-3 h-3" /> All Time</p>
                      <p className="text-2xl font-black" style={{ color: '#00D4FF' }}>{mySquad.totalPoints?.toLocaleString() || 0}</p>
                      <p className="text-xs text-white/25">pts</p>
                    </div>
                  </div>

                  <p className="text-xs text-white/35 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Members ({mySquad.members?.length || 0}/{mySquad.maxMembers || 10})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(mySquad.members || []).map((m: any) => (
                      <div key={m._id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#252540' }}>
                        {mySquad.leader?._id === m._id && <Crown className="w-3 h-3" style={{ color: '#FFD700' }} />}
                        <span className="text-xs font-semibold text-white/60 max-w-[80px] truncate">
                          {m.name?.split(' ')[0] || m.firstName || 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="fizz-card p-6 text-center mb-5" style={{ border: '2px dashed rgba(200,241,53,0.2)' }}>
                  <Shield className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p className="font-semibold text-white/40 mb-1">You&apos;re not in a crew</p>
                  <p className="text-xs text-white/25 mb-4">Create one to compete for the most Fizzes in your city</p>
                  <button onClick={() => setShowCreate(true)} className="fizz-btn-primary px-6 py-2.5 text-sm gap-2">
                    <Plus className="w-4 h-4" /> Create Crew
                  </button>
                </div>
              )}

              {/* Leaderboard */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4" style={{ color: '#C8F135' }} /> Leaderboard
                  </h3>
                  <div className="flex p-0.5 rounded-xl gap-0.5" style={{ background: '#252540' }}>
                    {(['weekly', 'alltime'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setLbType(t)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                        style={lbType === t ? { background: '#C8F135', color: '#1A1A2E' } : { color: 'rgba(255,255,255,0.4)' }}
                      >
                        {t === 'weekly' ? 'Week' : 'All Time'}
                      </button>
                    ))}
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <p className="text-center text-white/25 text-sm py-8">No crews yet — be the first!</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {leaderboard.map((squad, i) => {
                      const isMe = mySquad?._id === squad._id
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
                      return (
                        <div
                          key={squad._id}
                          className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                          style={isMe
                            ? { background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.25)' }
                            : { background: '#1C1C32', border: '1px solid rgba(255,255,255,0.05)' }
                          }
                        >
                          <span className="w-8 text-center text-sm font-bold" style={{ color: i < 3 ? '#C8F135' : 'rgba(255,255,255,0.2)' }}>
                            {medal}
                          </span>
                          <span className="text-xl">{squad.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm truncate">
                              {squad.name} {isMe && <span className="text-xs text-white/30">(you)</span>}
                            </p>
                            <p className="text-xs text-white/30">
                              {squad.memberCount} members{squad.city ? ` · ${squad.city}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-sm" style={{ color: '#C8F135' }}>
                              {(lbType === 'weekly' ? squad.weeklyPoints : squad.totalPoints)?.toLocaleString() || 0}
                            </p>
                            <p className="text-xs text-white/25">pts</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
