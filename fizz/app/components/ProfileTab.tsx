'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  Gift, MapPin, PlusCircle, Sparkles, Shield,
  Share2, Settings, UserPlus, ChevronRight, Wallet, Rss,
  Pencil, Camera, X, Check,
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
  const { user, token, logout, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editFirst, setEditFirst] = useState('')
  const [editLast, setEditLast] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPic, setEditPic] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editUploading, setEditUploading] = useState(false)
  const editFileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [histRes, meRes] = await Promise.allSettled([
        axios.get(`${API_URL}/shots/history`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (histRes.status === 'fulfilled') setHistory((histRes.value.data.shots || histRes.value.data || []).slice(0, 20))
      if (meRes.status === 'fulfilled') setPoints(meRes.value.data.user?.points || meRes.value.data.points || 0)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchData() }, [fetchData])

  const openEdit = () => {
    const fp = (user as any)?.fizzProfile || {}
    // Strictly Fizz profile fields only — never inherit from SOM account
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
      const res = await axios.post(`${API_URL}/fizz/upload`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      })
      setEditPic(res.data.url)
    } catch { /* ignore */ } finally {
      setEditUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    setEditSaving(true)
    try {
      await axios.put(`${API_URL}/fizz/profile`, {
        firstName: editFirst,
        lastName: editLast,
        username: editUsername,
        bio: editBio,
        profilePicture: editPic,
      }, { headers: { Authorization: `Bearer ${token}` } })
      await updateUser({})
      setShowEditProfile(false)
    } catch { /* ignore */ } finally {
      setEditSaving(false)
    }
  }

  const userId = user?.id || (user as any)?._id
  const totalSent = history.filter(s => s.sender?.id === userId || s.sender?._id === userId).length
  const totalReceived = history.filter(s => s.recipient?.id === userId || s.recipient?._id === userId).length

  const quickLinks = [
    { icon: <Wallet className="w-4 h-4" style={{ color: '#00D4FF' }} />, label: 'Wallet', sub: 'Balance, history & Tap & Pay', onPress: onOpenWallet },
    { icon: <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />, label: 'Rewards', sub: `${points} pts · 100 pts = $5`, onPress: onOpenRewards },
    { icon: <Rss className="w-4 h-4" style={{ color: '#FF9A57' }} />, label: 'Fizz Feed', sub: 'See what friends are sharing', onPress: onOpenFeed },
    { icon: <Share2 className="w-4 h-4" style={{ color: '#C8F135' }} />, label: 'Invite Friends', sub: 'Earn rewards for referrals', onPress: onOpenReferrals },
    { icon: <Shield className="w-4 h-4" style={{ color: '#FF5F57' }} />, label: 'Crews', sub: 'Compete with your friends', onPress: onOpenCrews },
    { icon: <UserPlus className="w-4 h-4" style={{ color: '#FF9A57' }} />, label: 'Find Friends', sub: 'Grow your Fizz circle', onPress: onOpenFindFriends },
    { icon: <Settings className="w-4 h-4 text-white/50" />, label: 'Settings', sub: 'Notifications, privacy & more', onPress: onOpenSettings },
  ]

  const fp = (user as any)?.fizzProfile || {}
  // Strictly Fizz profile — no SOM field fallbacks
  const displayFirst = fp.firstName || ''
  const displayLast = fp.lastName || ''
  const displayUsername = fp.username || ''
  const displayPic = fp.profilePicture || ''
  const fizzProfileIncomplete = !displayFirst && !displayUsername

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
              {/* Avatar */}
              <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhoto} />
              <div className="flex flex-col items-center mb-6">
                <button onClick={() => editFileRef.current?.click()} className="relative">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border-2" style={{ borderColor: 'rgba(200,241,53,0.4)' }}>
                    {editPic
                      ? <img src={editPic} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>{editFirst[0]}</div>
                    }
                  </div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#C8F135' }}>
                    {editUploading ? <div className="w-3 h-3 border-2 border-black/40 border-t-black rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-black" />}
                  </div>
                </button>
                <p className="text-xs text-white/30 mt-2">Tap to change photo</p>
              </div>
              {/* Fields */}
              {[
                { label: 'First Name', value: editFirst, set: setEditFirst },
                { label: 'Last Name', value: editLast, set: setEditLast },
                { label: 'Username', value: editUsername, set: setEditUsername },
              ].map(f => (
                <div key={f.label} className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.label}</p>
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
                    style={{ background: '#252540' }}
                  />
                </div>
              ))}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Bio</p>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value.slice(0, 160))}
                  rows={3}
                  placeholder="Tell your Fizz friends about yourself..."
                  className="w-full px-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz resize-none"
                  style={{ background: '#252540' }}
                />
                <p className="text-right text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{editBio.length}/160</p>
              </div>
              <button onClick={handleSaveProfile} disabled={editSaving} className="fizz-btn-primary w-full py-4 gap-2 disabled:opacity-40">
                {editSaving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        </>
      )}


      {/* Profile hero */}
      <div className="px-4 pt-5 pb-4">
        <div className="fizz-card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#C8F135', transform: 'translate(20%,-20%)' }} />

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden border-2" style={{ borderColor: 'rgba(200,241,53,0.3)' }}>
              {displayPic
                ? <img src={displayPic} alt="" className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>
                    {displayFirst ? displayFirst[0] : '🫧'}
                  </div>
                )
              }
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {displayFirst || displayLast ? `${displayFirst} ${displayLast}`.trim() : 'Your Fizz Name'}
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
              {fp.bio && <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{fp.bio}</p>}
              <div className="flex items-center gap-1 mt-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#C8F135' }} />
                <span className="text-xs font-bold" style={{ color: '#C8F135' }}>{points} pts</span>
              </div>
            </div>
          </div>

          {/* Onboarding nudge — shown only when Fizz profile not set up */}
          {fizzProfileIncomplete && (
            <button
              onClick={openEdit}
              className="w-full mt-4 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 relative z-10"
              style={{ background: 'rgba(200,241,53,0.12)', border: '1px dashed rgba(200,241,53,0.35)', color: '#C8F135' }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Set up your Fizz profile — separate from Shot On Me
            </button>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 relative z-10">
            <div className="text-center py-3 rounded-xl" style={{ background: 'rgba(200,241,53,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#C8F135' }}>${(user?.fizzWallet?.balance ?? user?.wallet?.balance ?? 0).toFixed(2)}</p>
              <p className="text-xs text-white/35 mt-0.5">Balance</p>
            </div>
            <div className="text-center py-3 rounded-xl" style={{ background: 'rgba(0,212,255,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#00D4FF' }}>{totalSent}</p>
              <p className="text-xs text-white/35 mt-0.5">Sent</p>
            </div>
            <div className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,95,87,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#FF5F57' }}>{totalReceived}</p>
              <p className="text-xs text-white/35 mt-0.5">Received</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add funds */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowAddFunds(true)}
          className="w-full fizz-btn-primary py-3.5 gap-2 text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Add Funds to Wallet
        </button>
      </div>

      {/* Quick links */}
      <div className="px-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.30)' }}>Explore</p>
        <div className="fizz-card overflow-hidden">
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
                <p className="text-xs text-white/35 mt-0.5">{link.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </button>
          ))}
        </div>
      </div>

      {/* Fizz History */}
      <div className="px-4 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4" style={{ color: '#C8F135' }} />
          <h2 className="font-bold text-white text-base">Fizz History</h2>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => <div key={i} className="rounded-2xl animate-pulse h-16" style={{ background: '#1C1C32' }} />)}
          </div>
        ) : history.length === 0 ? (
          <div className="fizz-card py-12 text-center">
            <p className="text-3xl mb-3">🫧</p>
            <p className="text-white/40 font-medium">No Fizz history yet</p>
            <p className="text-white/25 text-sm mt-1">Send your first Fizz!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((shot: any, idx) => {
              const isSent = shot.sender?.id === userId || shot.sender?._id === userId
              const other = isSent ? shot.recipient : shot.sender
              const otherName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim() || 'Someone'
              const dateStr = shot.createdAt ? new Date(shot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

              return (
                <div key={shot._id || idx} className="fizz-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
                    style={{ background: isSent ? 'rgba(200,241,53,0.15)' : 'rgba(0,212,255,0.15)', color: isSent ? '#C8F135' : '#00D4FF' }}>
                    {other?.firstName?.[0]}{other?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {isSent ? `Sent to ${otherName}` : `Received from ${otherName}`}
                    </p>
                    {shot.venue?.name && (
                      <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {shot.venue.name}
                      </p>
                    )}
                    {dateStr && <p className="text-xs text-white/20 mt-0.5">{dateStr}</p>}
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
      </div>
    </div>
  )
}
