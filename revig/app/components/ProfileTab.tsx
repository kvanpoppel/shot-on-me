'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  Gift, MapPin, PlusCircle, Sparkles, Shield,
  Share2, Settings, ChevronRight, Wallet, Rss,
  Pencil, Camera, X, Check, Star, Users, Trophy, Flame,
} from 'lucide-react'
import AddFundsModal from './AddFundsModal'

interface ProfileTabProps {
  onOpenRewards?: () => void
  onOpenReferrals?: () => void
  onOpenCrews?: () => void
  onOpenSettings?: () => void
  onOpenFindFriends?: () => void
  onOpenWallet?: () => void
  onOpenFeed?: () => void
}

export default function ProfileTab({
  onOpenRewards,
  onOpenReferrals,
  onOpenCrews,
  onOpenSettings,
  onOpenFindFriends,
  onOpenWallet,
  onOpenFeed,
}: ProfileTabProps) {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ points: 0, totalSent: 0, totalReceived: 0, friendsCount: 0, checkInStreak: 0, venuesVisited: 0, savedVenues: 0 })
  const [savedVenues, setSavedVenues] = useState<any[]>([])
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editFirst, setEditFirst] = useState('')
  const [editLast, setEditLast] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPic, setEditPic] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editUploading, setEditUploading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const [activeView, setActiveView] = useState<'activity' | 'saved' | 'more'>('activity')

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [histRes, statsRes, savedRes] = await Promise.allSettled([
        axios.get(`${API_URL}/payments/history`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }),
        axios.get(`${API_URL}/gamification/stats`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }),
        axios.get(`${API_URL}/saved-venues`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }),
      ])
      if (histRes.status === 'fulfilled') setHistory((histRes.value.data.payments || histRes.value.data.shots || histRes.value.data || []).slice(0, 30))
      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.data
        setStats({
          points: s.points || 0,
          totalSent: s.totalSent || 0,
          totalReceived: s.totalReceived || 0,
          friendsCount: s.friendsCount || 0,
          checkInStreak: s.checkInStreak?.current || 0,
          venuesVisited: s.venuesVisited || 0,
          savedVenues: 0,
        })
      }
      if (savedRes.status === 'fulfilled') {
        const sv = savedRes.value.data?.venues || []
        setSavedVenues(sv)
        setStats(prev => ({ ...prev, savedVenues: sv.length }))
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchData() }, [fetchData])

  const openEdit = () => {
    const fp = (user as any)?.revigProfile || {}
    setEditFirst(fp.firstName || '')
    setEditLast(fp.lastName || '')
    setEditUsername(fp.username || '')
    setEditBio(fp.bio || '')
    setEditPic(fp.profilePicture || '')
    setShowEditProfile(true)
  }

  const handleEditPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await axios.post(`${API_URL}/revig/upload`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      })
      setEditPic(res.data.url)
    } catch {
      setEditError('Photo upload failed. Try a smaller image.')
    } finally {
      setEditUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    setEditSaving(true)
    setEditError(null)
    try {
      await axios.put(`${API_URL}/revig/profile`, {
        firstName: editFirst, lastName: editLast, username: editUsername, bio: editBio, profilePicture: editPic,
      }, { headers: { Authorization: `Bearer ${token}` } })
      await updateUser({})
      setShowEditProfile(false)
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Failed to save profile.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleUnsaveVenue = async (placeId: string) => {
    setSavedVenues(prev => prev.filter(v => v.placeId !== placeId))
    try {
      await axios.delete(`${API_URL}/saved-venues/${placeId}`, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
  }

  const userId = user?.id || (user as any)?._id
  const fp = (user as any)?.revigProfile || {}
  const displayFirst = fp.firstName || ''
  const displayLast = fp.lastName || ''
  const displayUsername = fp.username || ''
  const displayPic = fp.profilePicture || ''
  const revigProfileIncomplete = !displayFirst && !displayUsername

  const quickLinks = [
    { icon: <Wallet className="w-4 h-4" style={{ color: '#00D4FF' }} />, label: 'Wallet', sub: 'Balance & Tap-to-Pay', onPress: onOpenWallet },
    { icon: <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />, label: 'Rewards', sub: `${stats.points} pts`, onPress: onOpenRewards },
    { icon: <Rss className="w-4 h-4" style={{ color: '#FF9A57' }} />, label: 'Revig Feed', sub: 'See what friends share', onPress: onOpenFeed },
    { icon: <Share2 className="w-4 h-4" style={{ color: '#C8F135' }} />, label: 'Invite Friends', sub: 'Earn rewards', onPress: onOpenReferrals },
    { icon: <Shield className="w-4 h-4" style={{ color: '#FF5F57' }} />, label: 'Crews', sub: 'Compete with friends', onPress: onOpenCrews },
    { icon: <Users className="w-4 h-4" style={{ color: '#FF9A57' }} />, label: 'Find Friends', sub: 'Grow your circle', onPress: onOpenFindFriends },
    { icon: <Settings className="w-4 h-4 text-white/50" />, label: 'Settings', sub: 'Notifications & privacy', onPress: onOpenSettings },
  ]

  return (
    <div style={{ background: '#0F0F1E', minHeight: '100%' }}>
      <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} onSuccess={() => updateUser({})} />
      <div className="max-w-2xl mx-auto">

      {/* Edit Profile Sheet */}
      {showEditProfile && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditProfile(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col animate-slide-up" style={{ background: '#1A1A2E', maxHeight: '90vh' }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Edit Profile</h2>
              <button onClick={() => setShowEditProfile(false)}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 pb-8">
              <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhoto} />
              <div className="flex flex-col items-center mb-6">
                <button onClick={() => editFileRef.current?.click()} className="relative">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border-2" style={{ borderColor: 'rgba(200,241,53,0.4)' }}>
                    {editPic
                      ? <img src={editPic} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>{editFirst[0] || '🧋'}</div>
                    }
                  </div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#C8F135' }}>
                    {editUploading ? <div className="w-3 h-3 border-2 border-black/40 border-t-black rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-black" />}
                  </div>
                </button>
                <p className="text-xs text-white/30 mt-2">Tap to change photo</p>
              </div>
              {[
                { label: 'First Name', value: editFirst, set: setEditFirst },
                { label: 'Last Name', value: editLast, set: setEditLast },
                { label: 'Username', value: editUsername, set: setEditUsername },
              ].map(f => (
                <div key={f.label} className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.label}</p>
                  <input type="text" value={f.value} onChange={e => f.set(e.target.value)} className="w-full px-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-revig" style={{ background: '#252540' }} />
                </div>
              ))}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Bio</p>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value.slice(0, 160))} rows={3} placeholder="Tell your Revig friends about yourself..." className="w-full px-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-revig resize-none" style={{ background: '#252540' }} />
                <p className="text-right text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{editBio.length}/160</p>
              </div>
              {editError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
                  <X className="w-4 h-4 flex-shrink-0" /><span>{editError}</span>
                </div>
              )}
              <button onClick={handleSaveProfile} disabled={editSaving} className="revig-btn-primary w-full py-4 gap-2 disabled:opacity-40">
                {editSaving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Profile Hero */}
      <div className="px-4 pt-5 pb-4">
        <div className="revig-card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#C8F135', transform: 'translate(20%,-20%)' }} />

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden border-2" style={{ borderColor: 'rgba(200,241,53,0.3)' }}>
              {displayPic
                ? <img src={displayPic} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>{displayFirst ? displayFirst[0] : '🧋'}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {displayFirst || displayLast ? `${displayFirst} ${displayLast}`.trim() : 'Your Revig Name'}
                  </h2>
                  {displayUsername
                    ? <p className="text-sm text-white/40">@{displayUsername}</p>
                    : <p className="text-sm text-white/25 italic">No username set</p>
                  }
                </div>
                <button onClick={openEdit} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,241,53,0.1)' }}>
                  <Pencil className="w-4 h-4" style={{ color: '#C8F135' }} />
                </button>
              </div>
              {fp.bio && <p className="text-xs text-white/40 mt-1.5 leading-relaxed line-clamp-2">{fp.bio}</p>}
            </div>
          </div>

          {revigProfileIncomplete && (
            <button onClick={openEdit} className="w-full mt-4 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 relative z-10" style={{ background: 'rgba(200,241,53,0.12)', border: '1px dashed rgba(200,241,53,0.35)', color: '#C8F135' }}>
              <Pencil className="w-3.5 h-3.5" /> Set up your Revig profile
            </button>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-4 relative z-10">
            <div className="text-center py-2.5 rounded-xl" style={{ background: 'rgba(200,241,53,0.08)' }}>
              <p className="text-base font-black" style={{ color: '#C8F135' }}>${(user?.revigWallet?.balance ?? user?.wallet?.balance ?? 0).toFixed(0)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Balance</p>
            </div>
            <div className="text-center py-2.5 rounded-xl" style={{ background: 'rgba(0,212,255,0.08)' }}>
              <p className="text-base font-black" style={{ color: '#00D4FF' }}>{stats.totalSent}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Sent</p>
            </div>
            <div className="text-center py-2.5 rounded-xl" style={{ background: 'rgba(255,95,87,0.08)' }}>
              <p className="text-base font-black" style={{ color: '#FF5F57' }}>{stats.totalReceived}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Received</p>
            </div>
            <div className="text-center py-2.5 rounded-xl" style={{ background: 'rgba(255,215,0,0.08)' }}>
              <p className="text-base font-black" style={{ color: '#FFD700' }}>{stats.points}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Points</p>
            </div>
          </div>

          {/* Highlights */}
          {(stats.checkInStreak > 0 || stats.friendsCount > 0 || savedVenues.length > 0) && (
            <div className="flex gap-2 mt-3 relative z-10 overflow-x-auto no-scrollbar">
              {stats.checkInStreak > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,150,50,0.1)', border: '1px solid rgba(255,150,50,0.2)' }}>
                  <Flame className="w-3 h-3" style={{ color: '#FF9632' }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#FF9632' }}>{stats.checkInStreak} day streak</span>
                </div>
              )}
              {stats.friendsCount > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.15)' }}>
                  <Users className="w-3 h-3" style={{ color: '#C8F135' }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#C8F135' }}>{stats.friendsCount} friends</span>
                </div>
              )}
              {savedVenues.length > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.15)' }}>
                  <Star className="w-3 h-3" style={{ color: '#C8F135' }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#C8F135' }}>{savedVenues.length} saved</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add funds */}
      <div className="px-4 mb-4">
        <button onClick={() => setShowAddFunds(true)} className="w-full revig-btn-primary py-3 gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> Add Funds to Wallet
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {([
          { key: 'activity' as const, icon: Gift, label: 'History' },
          { key: 'saved' as const, icon: Star, label: 'Saved' },
          { key: 'more' as const, icon: Settings, label: 'More' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className="flex-1 py-3 text-sm font-medium transition-all"
            style={activeView === key
              ? { color: '#C8F135', borderBottom: '2px solid #C8F135' }
              : { color: 'rgba(255,255,255,0.35)' }
            }
          >
            <Icon className="w-4 h-4 inline mr-1.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* ── HISTORY TAB ── */}
        {activeView === 'activity' && (
          <div>
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1,2,3].map(i => <div key={i} className="rounded-2xl animate-pulse h-16" style={{ background: '#1C1C32' }} />)}
              </div>
            ) : history.length === 0 ? (
              <div className="revig-card py-12 text-center">
                <p className="text-3xl mb-3">🧋</p>
                <p className="text-white/40 font-medium">No Revig history yet</p>
                <p className="text-white/25 text-sm mt-1">Send your first Revig!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((shot: any, idx) => {
                  const isSent = shot.sender?.id === userId || shot.sender?._id === userId
                  const other = isSent ? shot.recipient : shot.sender
                  const otherName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim() || 'Someone'
                  const dateStr = shot.createdAt ? new Date(shot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
                  return (
                    <div key={shot._id || idx} className="revig-card p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
                        style={{ background: isSent ? 'rgba(200,241,53,0.15)' : 'rgba(0,212,255,0.15)', color: isSent ? '#C8F135' : '#00D4FF' }}>
                        {other?.firstName?.[0]}{other?.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{isSent ? `Sent to ${otherName}` : `Received from ${otherName}`}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {shot.venue?.name && (
                            <span className="text-[10px] text-white/30 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{shot.venue.name}</span>
                          )}
                          {dateStr && <span className="text-[10px] text-white/20">{dateStr}</span>}
                        </div>
                      </div>
                      <p className="font-black text-base flex-shrink-0" style={{ color: isSent ? '#FF5F57' : '#C8F135' }}>
                        {isSent ? '-' : '+'}${shot.amount?.toFixed(2)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SAVED TAB ── */}
        {activeView === 'saved' && (
          <div>
            {savedVenues.length === 0 ? (
              <div className="revig-card py-12 text-center">
                <Star className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(200,241,53,0.2)' }} />
                <p className="text-white/40 font-medium">No saved spots yet</p>
                <p className="text-white/25 text-sm mt-1">Save venues from the Sips tab to find them here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {savedVenues.map(venue => {
                  const openUrl = venue.website || venue.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`
                  return (
                    <div key={venue.placeId} className="revig-card overflow-hidden">
                      <div className="w-full h-28 relative overflow-hidden" style={{ background: '#2E2E50' }}>
                        {venue.coverPhoto
                          ? <img src={venue.coverPhoto} alt={venue.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🏠</div>
                        }
                        <button
                          onClick={() => handleUnsaveVenue(venue.placeId)}
                          className="absolute top-2 right-2 p-1.5 rounded-full transition-all"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <Star className="w-4 h-4 fill-current" style={{ color: '#C8F135' }} />
                        </button>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-sm truncate">{venue.name}</p>
                          {(venue.address?.city || venue.address?.state) && (
                            <p className="text-xs text-white/30 mt-0.5">{[venue.address?.city, venue.address?.state].filter(Boolean).join(', ')}</p>
                          )}
                        </div>
                        <a
                          href={openUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}
                        >
                          Open
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MORE TAB ── */}
        {activeView === 'more' && (
          <div className="revig-card overflow-hidden">
            {quickLinks.map((link, i) => (
              <button
                key={link.label}
                onClick={link.onPress}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
                style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {link.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{link.label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{link.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/15" />
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
