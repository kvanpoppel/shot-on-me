'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import {
  Shield, Trophy, MapPin, Users, Plus, Crown, Swords,
  UserPlus, LogOut, Flame, Star, Loader2, X, ChevronRight
} from 'lucide-react'

export default function SquadsTab() {
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
  const [newEmoji, setNewEmoji] = useState('🔥')
  const [newCity, setNewCity] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [squadRes, lbRes] = await Promise.all([
        axios.get(`${API_URL}/squads/mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/squads/leaderboard?type=${lbType}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setMySquad(squadRes.data.squad)
      setLeaderboard(lbRes.data.leaderboard || [])
    } catch (err) {
      console.error('Failed to fetch squads:', err)
    } finally {
      setLoading(false)
    }
  }, [token, API_URL, lbType])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Listen for squad invites
  useEffect(() => {
    if (!socket) return
    const handleInvite = (data: any) => {
      setPendingInvites(prev => [...prev, data])
    }
    socket.on('squad:invited', handleInvite)
    return () => { socket.off('squad:invited', handleInvite) }
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
      setNewEmoji('🔥')
      setNewCity('')
      fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create squad')
    } finally {
      setCreating(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave your squad?')) return
    try {
      await axios.post(`${API_URL}/squads/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMySquad(null)
      fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to leave squad')
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to respond to invite')
    }
  }

  const EMOJIS = ['🔥', '⚡', '🏆', '💥', '🦅', '🐺', '👑', '🎯', '🌊', '🚀']

  return (
    <div className="pb-24 pt-2 px-4 space-y-5">

      {/* Pending invites */}
      {pendingInvites.map(invite => (
        <div key={invite.squadId} className="bg-primary-500/10 border-2 border-primary-500/40 rounded-xl p-4">
          <p className="text-primary-500 font-bold text-sm mb-3">
            {invite.squadEmoji} You're invited to join "{invite.squadName}"!
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleInviteResponse(invite.squadId, true)}
              className="flex-1 bg-primary-500 text-black font-bold py-2 rounded-xl text-sm"
            >
              Join Squad
            </button>
            <button
              onClick={() => handleInviteResponse(invite.squadId, false)}
              className="flex-1 bg-black/40 border border-primary-500/20 text-primary-400 py-2 rounded-xl text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      ))}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* My Squad */}
          {mySquad ? (
            <div className="bg-black/50 border-2 border-primary-500/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{mySquad.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-primary-500">{mySquad.name}</h2>
                    {mySquad.city && (
                      <p className="text-primary-400/60 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{mySquad.city}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLeave}
                  className="text-xs text-primary-400/40 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Leave
                </button>
              </div>

              {/* Points */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 text-center">
                  <p className="text-primary-400/60 text-xs mb-1 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3" /> This Week
                  </p>
                  <p className="text-2xl font-bold text-primary-500">{mySquad.weeklyPoints?.toLocaleString() || 0}</p>
                  <p className="text-primary-400/40 text-xs">pts</p>
                </div>
                <div className="bg-black/40 border border-primary-500/10 rounded-xl p-3 text-center">
                  <p className="text-primary-400/60 text-xs mb-1 flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3" /> All Time
                  </p>
                  <p className="text-2xl font-bold text-primary-400">{mySquad.totalPoints?.toLocaleString() || 0}</p>
                  <p className="text-primary-400/40 text-xs">pts</p>
                </div>
              </div>

              {/* Members */}
              <div>
                <p className="text-primary-400/60 text-xs uppercase tracking-widest font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Members ({mySquad.members?.length || 0}/{mySquad.maxMembers || 10})
                </p>
                <div className="flex flex-wrap gap-2">
                  {(mySquad.members || []).map((m: any) => (
                    <div key={m._id} className="flex items-center gap-2 bg-black/40 border border-primary-500/10 rounded-lg px-3 py-1.5">
                      {mySquad.leader?._id === m._id && (
                        <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      )}
                      <span className="text-primary-400 text-xs font-medium truncate max-w-20">
                        {m.name?.split(' ')[0] || 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top territory venues */}
              {mySquad.territory?.length > 0 && (
                <div className="mt-4 border-t border-primary-500/10 pt-4">
                  <p className="text-primary-400/60 text-xs uppercase tracking-widest font-semibold mb-2 flex items-center gap-2">
                    <Swords className="w-3.5 h-3.5" />
                    Territory Control
                  </p>
                  <div className="space-y-1.5">
                    {mySquad.territory
                      .sort((a: any, b: any) => b.points - a.points)
                      .slice(0, 3)
                      .map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-primary-400/40 text-xs w-4">{i + 1}</span>
                            <span className="text-primary-400 text-xs">{t.venueName || 'Venue'}</span>
                          </div>
                          <span className="text-primary-500 text-xs font-bold">{t.points} pts</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black/40 border-2 border-dashed border-primary-500/20 rounded-2xl p-6 text-center">
              <Shield className="w-12 h-12 text-primary-500/30 mx-auto mb-3" />
              <p className="text-primary-400/60 text-sm mb-1">You're not in a squad</p>
              <p className="text-primary-400/40 text-xs mb-4">Create one or get invited to compete for venue territory</p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-primary-500 text-black font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Squad
              </button>
            </div>
          )}

          {/* Create Squad Modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-black border-2 border-primary-500/40 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-primary-500">Create Squad</h2>
                  <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-primary-400" /></button>
                </div>

                <div className="mb-4">
                  <label className="block text-primary-400 text-sm font-semibold mb-2">Squad Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => setNewEmoji(e)}
                        className={`text-2xl p-2 rounded-lg border transition-all ${
                          newEmoji === e ? 'border-primary-500 bg-primary-500/10' : 'border-primary-500/20 bg-black/40'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-primary-400 text-sm font-semibold mb-2">Squad Name *</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value.slice(0, 40))}
                    placeholder="e.g. Downtown Wolves"
                    maxLength={40}
                    className="w-full bg-black/60 border border-primary-500/30 text-primary-400 placeholder-primary-400/30 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-primary-400 text-sm font-semibold mb-2">City (optional)</label>
                  <input
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    placeholder="e.g. Chicago"
                    className="w-full bg-black/60 border border-primary-500/30 text-primary-400 placeholder-primary-400/30 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="w-full bg-primary-500 text-black font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {creating ? 'Creating...' : `Create ${newEmoji} ${newName || 'Squad'}`}
                </button>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-primary-500 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Leaderboard
              </h3>
              <div className="flex bg-black/40 border border-primary-500/20 rounded-lg p-0.5 gap-0.5">
                {(['weekly', 'alltime'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setLbType(t)}
                    className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                      lbType === t ? 'bg-primary-500 text-black' : 'text-primary-400'
                    }`}
                  >
                    {t === 'weekly' ? 'Week' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-10 text-primary-400/40 text-sm">No squads yet — be the first!</div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((squad, i) => {
                  const isMe = mySquad?._id === squad._id
                  return (
                    <div
                      key={squad._id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isMe
                          ? 'bg-primary-500/10 border-primary-500/40'
                          : 'bg-black/40 border-primary-500/10'
                      }`}
                    >
                      <span className={`w-8 text-center font-bold text-sm ${
                        i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-primary-400/40'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <span className="text-xl">{squad.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary-500 font-bold text-sm truncate">
                          {squad.name} {isMe && <span className="text-primary-400/50 text-xs">(you)</span>}
                        </p>
                        <p className="text-primary-400/40 text-xs">{squad.memberCount} members{squad.city ? ` · ${squad.city}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary-500 font-bold text-sm">
                          {(lbType === 'weekly' ? squad.weeklyPoints : squad.totalPoints)?.toLocaleString() || 0}
                        </p>
                        <p className="text-primary-400/40 text-xs">pts</p>
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
  )
}
