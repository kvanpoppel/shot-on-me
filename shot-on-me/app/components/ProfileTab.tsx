'use client'

import { showToast } from '../utils/toast'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import {
  Grid3x3,
  MapPin,
  Users,
  Heart,
  MessageCircle,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  Settings,
  Pencil,
  X,
  Check,
  Sparkles,
  Flame,
  Trophy,
  Send,
} from 'lucide-react'

import { useApiUrl } from '../utils/api'
import SpinnerS from './SpinnerS'

interface FeedPost {
  _id: string
  author: {
    _id?: string
    id?: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  content: string
  media: Array<{ type: string; url: string; thumbnail?: string }>
  likes: Array<{ user: string | { _id: string } }>
  comments: Array<any>
  checkIn?: {
    venue?: { _id: string; name: string }
    checkedInAt: string
  }
  location?: {
    venue?: { _id: string; name: string }
  }
  createdAt: string
}

interface ProfileTabProps {
  onViewProfile?: (userId: string) => void
  setActiveTab?: (tab: 'feed' | 'home' | 'map' | 'wallet' | 'profile') => void
  onOpenSettings?: () => void
}

export default function ProfileTab({ onViewProfile, setActiveTab, onOpenSettings }: ProfileTabProps) {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', username: '', dateOfBirth: '', showProfileDetails: true })
  const [saving, setSaving] = useState(false)
  const [postsPage, setPostsPage] = useState(1)
  const [postsHasMore, setPostsHasMore] = useState(true)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const postsContainerRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [activeView, setActiveView] = useState<'activity' | 'friends' | 'vibe'>('activity')
  const [venuePrefs, setVenuePrefs] = useState({
    kidsFriendly: false, dogFriendly: false, hasFood: false, byob: false,
    trivia: false, liveMusic: false, outdoorSeating: false, happyHour: false,
    poolTables: false, danceFloor: false, sportsTv: false, karaoke: false,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [stats, setStats] = useState({
    postsCount: 0,
    totalCheckIns: 0,
    friendsCount: 0,
    venuesVisited: 0,
    points: 0,
    checkInStreak: 0,
    totalSent: 0,
    totalReceived: 0,
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!token) { showToast('Not logged in — please refresh', 'error'); return }
    setUploadingPhoto(true)
    showToast('Resizing & uploading…')
    try {
      // Resize client-side to keep uploads small and fast on mobile
      const resized = await new Promise<Blob>((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          let w = img.width, h = img.height
          const max = 800
          if (w > max || h > max) {
            const r = Math.min(max / w, max / h)
            w = Math.round(w * r)
            h = Math.round(h * r)
          }
          const c = document.createElement('canvas')
          c.width = w; c.height = h
          c.getContext('2d')!.drawImage(img, 0, 0, w, h)
          c.toBlob(b => b ? resolve(b) : reject(new Error('Canvas failed')), 'image/jpeg', 0.85)
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
        img.src = url
      })

      const formData = new FormData()
      formData.append('profilePicture', resized, 'photo.jpg')
      const response = await fetch(`${API_URL}/users/me/profile-picture`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || `Server error ${response.status}`)
      if (updateUser) {
        if (data.user) await updateUser(data.user)
        else if (data.profilePicture) await updateUser({ profilePicture: data.profilePicture })
        else await updateUser({})
      }
      showToast('Photo updated!', 'success')
    } catch (err: any) {
      console.error('Photo upload failed:', err)
      showToast(`Upload failed: ${err.message}`, 'error', 8000)
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const prefs = (user as any)?.venuePreferences
    if (prefs) setVenuePrefs(p => ({ ...p, ...prefs }))
  }, [user])

  const saveVenuePrefs = async () => {
    if (!token) return
    setSavingPrefs(true)
    try {
      await axios.put(`${API_URL}/users/me`, { venuePreferences: venuePrefs }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (updateUser) await updateUser({})
    } catch (e) {
      console.error('Failed to save preferences', e)
    } finally {
      setSavingPrefs(false)
    }
  }

  const openEdit = () => {
    const dob = (user as any)?.dateOfBirth
    setEditForm({
      firstName: user?.firstName || (user as any)?.name?.split(' ')[0] || '',
      lastName: user?.lastName || (user as any)?.name?.split(' ').slice(1).join(' ') || '',
      username: user?.username || '',
      dateOfBirth: dob ? new Date(dob).toISOString().split('T')[0] : '',
      showProfileDetails: (user as any)?.showProfileDetails !== false,
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!token) return
    setSaving(true)
    try {
      await axios.put(`${API_URL}/users/me`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (updateUser) await updateUser({})
      setEditing(false)
    } catch (err) {
      console.error('Profile update failed', err)
    } finally {
      setSaving(false)
    }
  }

  const fetchPosts = useCallback(async (pageNum: number = 1, reset: boolean = true) => {
    if (!token || !user || !API_URL) return
    try {
      if (reset) setLoading(true)
      else setLoadingMorePosts(true)
      const limit = 20
      const skip = (pageNum - 1) * limit
      const userId = user.id || (user as any)._id
      const feedResponse = await axios.get(`${API_URL}/feed`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { skip, limit, userId },
        timeout: 10000
      })
      const fetchedPosts = feedResponse.data.posts || []
      if (reset || pageNum === 1) {
        setPosts(fetchedPosts)
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p._id))
          const uniqueNewPosts = fetchedPosts.filter((p: FeedPost) => !existingIds.has(p._id))
          return [...prev, ...uniqueNewPosts]
        })
      }
      setPostsHasMore(feedResponse.data.hasMore !== false && fetchedPosts.length === limit)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      if (reset || pageNum === 1) setPosts([])
    } finally {
      setLoading(false)
      setLoadingMorePosts(false)
    }
  }, [token, user, API_URL])

  // Fetch real stats from /gamification/stats + friends from /users/batch
  const fetchProfileData = useCallback(async () => {
    if (!token || !user) return
    try {
      const [statsRes, userRes] = await Promise.allSettled([
        axios.get(`${API_URL}/gamification/stats`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }),
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }),
      ])

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.data
        setStats({
          postsCount: s.postsCount || 0,
          totalCheckIns: s.totalCheckIns || 0,
          friendsCount: s.friendsCount || 0,
          venuesVisited: s.venuesVisited || 0,
          points: s.points || 0,
          checkInStreak: s.checkInStreak?.current || 0,
          totalSent: s.totalSent || 0,
          totalReceived: s.totalReceived || 0,
        })
      }

      if (userRes.status === 'fulfilled') {
        const userData = userRes.value.data.user
        const friendIds = (userData.friends || []).slice(0, 50)
        if (friendIds.length > 0) {
          try {
            const batchResponse = await axios.get(`${API_URL}/users/batch`, {
              headers: { Authorization: `Bearer ${token}` },
              params: { ids: friendIds.join(',') }
            })
            setFriends(batchResponse.data.users || [])
          } catch { setFriends([]) }
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    }
  }, [token, user, API_URL])

  useEffect(() => {
    if (token && user) {
      setPostsPage(1)
      setPostsHasMore(true)
      fetchPosts(1, true)
      fetchProfileData()
    }
  }, [token, user, fetchPosts, fetchProfileData])

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!loadingMorePosts && postsHasMore) {
        const scrollHeight = document.documentElement.scrollHeight
        const scrollTop = window.innerHeight + window.scrollY
        if (scrollTop >= scrollHeight - 500) {
          setLoadingMorePosts(true)
          setPostsPage(prev => {
            const nextPage = prev + 1
            fetchPosts(nextPage, false)
            return nextPage
          })
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMorePosts, postsHasMore, fetchPosts])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  // Vibe tags from saved preferences
  const activeVibes = Object.entries(venuePrefs).filter(([, v]) => v).map(([k]) => k)
  const VIBE_LABELS: Record<string, string> = {
    kidsFriendly: '👶 Kids', dogFriendly: '🐕 Dogs', hasFood: '🍕 Food', byob: '🥂 BYOB',
    trivia: '🎯 Trivia', liveMusic: '🎵 Music', outdoorSeating: '🌿 Patio', happyHour: '🍺 Happy Hr',
    poolTables: '🎱 Pool', danceFloor: '🕺 Dance', sportsTv: '📺 Sports', karaoke: '🎤 Karaoke',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerS />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-14 bg-black max-w-2xl mx-auto pt-16">
      <input ref={photoInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handlePhotoUpload} />

      {/* Profile Header */}
      <div className="px-4 pt-6 pb-4">
        {editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
              <button onClick={() => photoInputRef.current?.click()} className="relative w-20 h-20 flex-shrink-0" disabled={uploadingPhoto}>
                <div className="w-20 h-20 border-2 border-primary-500/30 rounded-full overflow-hidden">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                      <span className="text-2xl text-primary-500 font-semibold">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                    </div>
                  )}
                </div>
                {uploadingPhoto ? (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center border-2 border-black">
                    <Camera className="w-3.5 h-3.5 text-black" />
                  </div>
                )}
              </button>
              <div className="flex-1 text-sm text-primary-400/50">Tap photo to change</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" className="bg-black/60 border border-primary-500/30 rounded-xl px-3 py-2.5 text-sm text-primary-300 placeholder-primary-500/40 focus:outline-none focus:border-primary-500/60" />
              <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" className="bg-black/60 border border-primary-500/30 rounded-xl px-3 py-2.5 text-sm text-primary-300 placeholder-primary-500/40 focus:outline-none focus:border-primary-500/60" />
            </div>
            <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} placeholder="username" className="w-full bg-black/60 border border-primary-500/30 rounded-xl px-3 py-2.5 text-sm text-primary-300 placeholder-primary-500/40 focus:outline-none focus:border-primary-500/60" />
            <div>
              <label className="text-xs text-primary-400/50 mb-1 block">Date of Birth</label>
              <input type="date" value={editForm.dateOfBirth} onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="w-full bg-black/60 border border-primary-500/30 rounded-xl px-3 py-2.5 text-sm text-primary-300 focus:outline-none focus:border-primary-500/60" />
            </div>
            <label className="flex items-center gap-3 px-1 cursor-pointer">
              <input type="checkbox" checked={editForm.showProfileDetails} onChange={e => setEditForm(f => ({ ...f, showProfileDetails: e.target.checked }))} className="w-4 h-4 rounded border-primary-500/30 accent-primary-500" />
              <span className="text-sm text-primary-400">Show DOB & vibes on my profile</span>
            </label>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="flex-1 bg-primary-500 text-black font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-primary-400 transition-all disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
              </button>
              <button onClick={() => setEditing(false)} className="flex-1 border border-primary-500/30 text-primary-400 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Avatar + name + actions */}
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => photoInputRef.current?.click()} className="relative w-20 h-20 flex-shrink-0" disabled={uploadingPhoto}>
                <div className="w-20 h-20 border-2 border-primary-500/30 rounded-full overflow-hidden">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                      <span className="text-2xl text-primary-500 font-semibold">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                    </div>
                  )}
                </div>
                {uploadingPhoto ? (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center border-2 border-black">
                    <Camera className="w-3 h-3 text-black" />
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">{user?.firstName} {user?.lastName}</h2>
                {user?.username && <p className="text-sm text-primary-400/60">@{user.username}</p>}
                {(user as any)?.showProfileDetails !== false && (
                  <p className="text-sm text-primary-400/50 mt-1">
                    {[
                      (user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
                      ...activeVibes.slice(0, 3).map(v => VIBE_LABELS[v])
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={openEdit} className="p-2 rounded-xl border border-primary-500/20 text-primary-400 hover:text-primary-500 hover:border-primary-500/40 transition-all" title="Edit profile">
                  <Pencil className="w-4 h-4" />
                </button>
                {onOpenSettings && (
                  <button onClick={onOpenSettings} className="p-2 rounded-xl border border-primary-500/20 text-primary-400 hover:text-primary-500 hover:border-primary-500/40 transition-all" title="Settings">
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { value: stats.postsCount, label: 'Posts', color: 'text-primary-500' },
                { value: stats.friendsCount, label: 'Friends', color: 'text-primary-500' },
                { value: stats.totalCheckIns, label: 'Check-ins', color: 'text-primary-500' },
                { value: stats.venuesVisited, label: 'Venues', color: 'text-primary-500' },
              ].map(({ value, label, color }) => (
                <div key={label} className="text-center py-2.5 rounded-xl bg-primary-500/5 border border-primary-500/10">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-primary-400/50 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Highlights strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {stats.checkInStreak > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400">{stats.checkInStreak} day streak</span>
                </div>
              )}
              {stats.points > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400">{stats.points} pts</span>
                </div>
              )}
              {stats.totalSent > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
                  <Send className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-xs font-semibold text-primary-500">{stats.totalSent} sent</span>
                </div>
              )}
              {activeVibes.slice(0, 3).map(v => (
                <div key={v} className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary-500/5 border border-primary-500/10">
                  <span className="text-xs text-primary-400/60">{VIBE_LABELS[v]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-primary-500/10">
        {([
          { key: 'activity' as const, icon: Grid3x3, label: 'Activity' },
          { key: 'friends' as const, icon: Users, label: 'Friends' },
          { key: 'vibe' as const, icon: Sparkles, label: 'My Vibe' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeView === key
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-primary-400/50 hover:text-primary-500'
            }`}
          >
            <Icon className="w-4 h-4 inline mr-1.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* ── ACTIVITY TAB ── */}
        {activeView === 'activity' && (
          <div>
            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { window.dispatchEvent(new CustomEvent('open-post-form')); setActiveTab?.('feed') }}
                className="flex-1 bg-primary-500 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 transition-all active:scale-[0.98]"
              >
                <Camera className="w-4 h-4" /> Post
              </button>
              <button
                onClick={() => setActiveTab?.('map')}
                className="flex-1 border border-primary-500/30 text-primary-500 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all active:scale-[0.98]"
              >
                <MapPin className="w-4 h-4" /> Check In
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Camera className="w-10 h-10 text-primary-500/20 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">No activity yet</p>
                <p className="text-primary-400/40 text-sm">Post a moment or check in at a venue to get started.</p>
              </div>
            ) : (
              <>
                <div ref={postsContainerRef} className="flex flex-col gap-3">
                  {posts.map((post) => {
                    const isCheckIn = !!post.checkIn
                    const venueName = post.checkIn?.venue?.name || post.location?.venue?.name
                    return (
                      <div key={post._id} className="bg-black/40 border border-primary-500/10 rounded-xl overflow-hidden">
                        {/* Media */}
                        {post.media && post.media.length > 0 ? (
                          <img src={post.media[0].url || post.media[0].thumbnail} alt="Post" className="w-full h-48 object-cover" />
                        ) : isCheckIn ? (
                          <div className="w-full h-20 flex items-center justify-center bg-primary-500/5">
                            <CheckCircle2 className="w-6 h-6 text-primary-500/30" />
                          </div>
                        ) : null}
                        <div className="p-3">
                          {venueName && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary-500" />
                              <span className="text-xs font-semibold text-primary-500">{venueName}</span>
                            </div>
                          )}
                          {post.content && <p className="text-sm text-primary-400/70 leading-snug line-clamp-3">{post.content}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs text-primary-400/40">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes.length}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comments.length}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeAgo(post.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {loadingMorePosts && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  </div>
                )}
                {!postsHasMore && posts.length > 0 && (
                  <p className="text-center py-6 text-primary-400/30 text-xs">No more activity</p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── FRIENDS TAB ── */}
        {activeView === 'friends' && (
          <div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-find-friends'))}
              className="w-full bg-primary-500 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 transition-all active:scale-[0.98] mb-4"
            >
              <Users className="w-4 h-4" /> Find Friends
            </button>
            {friends.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="w-10 h-10 text-primary-500/20 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">No friends yet</p>
                <p className="text-primary-400/40 text-sm">Find people you go out with — see where they are and buy them a round.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {friends.map((friend) => (
                  <div
                    key={friend._id || friend.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-primary-500/10 cursor-pointer hover:border-primary-500/25 transition-all active:scale-[0.99]"
                    onClick={() => onViewProfile?.(friend._id || friend.id)}
                  >
                    <div className="w-12 h-12 border border-primary-500/20 rounded-full overflow-hidden flex-shrink-0">
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                          <span className="text-primary-500 font-semibold text-sm">{friend.firstName?.[0]}{friend.lastName?.[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{friend.firstName} {friend.lastName}</p>
                      {friend.username && <p className="text-xs text-primary-400/50">@{friend.username}</p>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveTab?.('wallet') }}
                      className="bg-primary-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-400 transition-all active:scale-[0.98] flex-shrink-0"
                    >
                      Send
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY VIBE TAB ── */}
        {activeView === 'vibe' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-primary-500 mb-0.5">My Vibe</p>
              <p className="text-xs text-primary-400/40 mb-4">Pick what you love — this powers your personalized venue recommendations.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { key: 'kidsFriendly',   label: '👶 Kids Friendly' },
                { key: 'dogFriendly',    label: '🐕 Dog Friendly' },
                { key: 'hasFood',        label: '🍕 Food Served' },
                { key: 'byob',           label: '🥂 BYOB' },
                { key: 'trivia',         label: '🎯 Trivia Night' },
                { key: 'liveMusic',      label: '🎵 Live Music' },
                { key: 'outdoorSeating', label: '🌿 Outdoor Seating' },
                { key: 'happyHour',      label: '🍺 Happy Hour' },
                { key: 'poolTables',     label: '🎱 Pool Tables' },
                { key: 'danceFloor',     label: '🕺 Dance Floor' },
                { key: 'sportsTv',       label: '📺 Sports TV' },
                { key: 'karaoke',        label: '🎤 Karaoke' },
              ] as const).map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none active:scale-[0.98] ${
                    venuePrefs[key]
                      ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                      : 'bg-black/30 border-primary-500/10 text-primary-400/40 hover:border-primary-500/25'
                  }`}
                >
                  <input type="checkbox" checked={venuePrefs[key]} onChange={(e) => setVenuePrefs({ ...venuePrefs, [key]: e.target.checked })} className="sr-only" />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${venuePrefs[key] ? 'bg-primary-500 border-primary-500' : 'border-primary-500/25'}`}>
                    {venuePrefs[key] && <span className="text-black text-xs font-bold leading-none">✓</span>}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={saveVenuePrefs}
              disabled={savingPrefs}
              className="w-full bg-primary-500 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 transition-all disabled:opacity-50"
            >
              {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {savingPrefs ? 'Saving...' : 'Save My Vibe'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
