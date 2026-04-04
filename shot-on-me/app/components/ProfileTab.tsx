'use client'

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
  Send,
  UserPlus
} from 'lucide-react'

import { useApiUrl } from '../utils/api'

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
}

export default function ProfileTab({ onViewProfile, setActiveTab }: ProfileTabProps) {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [postsPage, setPostsPage] = useState(1)
  const [postsHasMore, setPostsHasMore] = useState(true)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const postsContainerRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [activeView, setActiveView] = useState<'posts' | 'checkins' | 'friends'>('posts')
  const [stats, setStats] = useState({
    postsCount: 0,
    checkInsCount: 0,
    friendsCount: 0,
    venuesVisited: 0
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB'); return }

    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('profilePicture', file)
      const res = await axios.put(`${API_URL}/users/me/profile-picture`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      if (updateUser) await updateUser({})
    } catch (err) {
      console.error('Photo upload failed', err)
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const fetchPosts = useCallback(async (pageNum: number = 1, reset: boolean = true) => {
    if (!token || !user || !API_URL) return
    
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMorePosts(true)
      }
      
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
        // Filter out duplicates when appending posts
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p._id))
          const uniqueNewPosts = fetchedPosts.filter((p: FeedPost) => !existingIds.has(p._id))
          return [...prev, ...uniqueNewPosts]
        })
      }
      
      setPostsHasMore(feedResponse.data.hasMore !== false && fetchedPosts.length === limit)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      if (reset || pageNum === 1) {
        setPosts([])
      }
    } finally {
      setLoading(false)
      setLoadingMorePosts(false)
    }
  }, [token, user, API_URL])

  useEffect(() => {
    if (token && user) {
      setPostsPage(1)
      setPostsHasMore(true)
      fetchPosts(1, true)
      fetchProfileData()
    }
  }, [token, user, fetchPosts])

  // Infinite scroll for posts
  useEffect(() => {
    const handleScroll = () => {
      if (!loadingMorePosts && postsHasMore && postsContainerRef.current) {
        const scrollHeight = document.documentElement.scrollHeight
        const scrollTop = window.innerHeight + window.scrollY
        const threshold = 500
        
        if (scrollTop >= scrollHeight - threshold) {
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

  // Update stats when posts change
  useEffect(() => {
    const checkIns = posts.filter((p: FeedPost) => p.checkIn)
    const uniqueVenues = new Set(
      posts
        .filter((p: FeedPost) => p.checkIn?.venue?._id || p.location?.venue?._id)
        .map((p: FeedPost) => p.checkIn?.venue?._id || p.location?.venue?._id)
    )

    setStats({
      postsCount: posts.length,
      checkInsCount: checkIns.length,
      friendsCount: (user as any)?.friends?.length || 0,
      venuesVisited: uniqueVenues.size
    })
  }, [posts, user])

  const fetchProfileData = async () => {
    if (!token || !user) return

    try {
      // Fetch the current user's friend list
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const userData = userResponse.data.user

      if (userData.friends && userData.friends.length > 0) {
        const friendIds = userData.friends.slice(0, 50) // cap at 50

        // FIX: Single batch request instead of N individual requests.
        // Previously this made up to 20 individual axios.get(`/users/${friendId}`)
        // calls — one per friend. Now it's a single query using $in on the backend.
        const batchResponse = await axios.get(`${API_URL}/users/batch`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { ids: friendIds.join(',') }
        })
        setFriends(batchResponse.data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    }
  }

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

  const userPosts = posts.filter(p => !p.checkIn)
  const checkIns = posts.filter(p => p.checkIn)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-14 bg-black max-w-2xl mx-auto pt-16">
      {/* Hidden file input for photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Profile Header */}
      <div className="px-4 py-6 border-b border-primary-500/10">
        <div className="flex items-center space-x-6 mb-4">
          {/* Profile Picture — tappable to upload */}
          <button
            onClick={() => photoInputRef.current?.click()}
            className="relative w-20 h-20 flex-shrink-0 group"
            disabled={uploadingPhoto}
          >
            <div className="w-20 h-20 border-2 border-primary-500/30 rounded-full overflow-hidden">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                  <span className="text-2xl text-primary-500 font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
            </div>
            {/* Camera overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPhoto
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Camera className="w-5 h-5 text-white" />
              }
            </div>
            {/* Add photo badge for new users */}
            {!user?.profilePicture && !uploadingPhoto && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center border-2 border-black">
                <Camera className="w-3 h-3 text-black" />
              </div>
            )}
          </button>

          {/* Stats */}
          <div className="flex-1 flex justify-around flex-wrap gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{stats.postsCount}</p>
              <p className="text-xs text-primary-400/70 font-light">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{stats.friendsCount}</p>
              <p className="text-xs text-primary-400/70 font-light">Friends</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{stats.checkInsCount}</p>
              <p className="text-xs text-primary-400/70 font-light">Check-ins</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{stats.venuesVisited}</p>
              <p className="text-xs text-primary-400/70 font-light">Venues</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-3">
          <h2 className="text-base font-semibold text-primary-500 tracking-tight mb-1">
            {user?.firstName} {user?.lastName}
          </h2>
          {user?.username && (
            <p className="text-sm text-primary-400/80 font-light">@{user.username}</p>
          )}
        </div>

        {/* Profile completeness nudge — shown only when no photo */}
        {!user?.profilePicture && (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-full mt-1 border border-primary-500/25 rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-left"
          >
            <Camera className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <div>
              <p className="text-primary-500 text-xs font-semibold">Add a profile photo</p>
              <p className="text-primary-400/50 text-[10px]">Friends and venues will recognize you faster</p>
            </div>
          </button>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-primary-500/10">
        <button
          onClick={() => setActiveView('posts')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            activeView === 'posts'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-primary-400/70 hover:text-primary-500'
          }`}
        >
          <Grid3x3 className="w-4 h-4 inline mr-1.5" />
          Posts
        </button>
        <button
          onClick={() => setActiveView('checkins')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            activeView === 'checkins'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-primary-400/70 hover:text-primary-500'
          }`}
        >
          <MapPin className="w-4 h-4 inline mr-1.5" />
          Check-ins
        </button>
        <button
          onClick={() => setActiveView('friends')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            activeView === 'friends'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-primary-400/70 hover:text-primary-500'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />
          Friends
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeView === 'posts' && (
          <div>
            {/* Create Post Button - Always Visible */}
            <button
              onClick={() => {
                if (setActiveTab) {
                  window.dispatchEvent(new CustomEvent('open-post-form'))
                  setActiveTab('feed')
                }
              }}
              className="w-full bg-primary-500 text-black py-4 rounded-xl font-bold hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 mb-4"
            >
              <Camera className="w-5 h-5" />
              <span>Create Post</span>
            </button>

            {userPosts.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Camera className="w-10 h-10 text-primary-500/30 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Nothing posted yet</p>
                <p className="text-primary-400/50 text-sm">Post a moment from your night out — check-ins, shots sent, good times.</p>
              </div>
            ) : (
              <>
              <div ref={postsContainerRef} className="grid grid-cols-3 gap-1">
                {userPosts.map((post) => (
                  <div
                    key={post._id}
                    className="aspect-square bg-black/40 border border-primary-500/10 rounded overflow-hidden relative group cursor-pointer"
                  >
                    {post.media && post.media.length > 0 ? (
                      <img
                        src={post.media[0].url || post.media[0].thumbnail}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-primary-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-1 text-primary-500">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm font-medium">{post.likes.length}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-primary-500">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{post.comments.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {loadingMorePosts && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  <span className="ml-3 text-primary-400">Loading more posts...</span>
                </div>
              )}
              {!postsHasMore && userPosts.length > 0 && (
                <div className="text-center py-8 text-primary-400/50 text-sm">
                  No more posts
                </div>
              )}
              </>
            )}
          </div>
        )}

        {activeView === 'checkins' && (
          <div>
            <button
              onClick={() => setActiveTab?.('map')}
              className="w-full bg-primary-500 text-black py-4 rounded-xl font-bold hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 mb-4"
            >
              <MapPin className="w-5 h-5" />
              <span>Check In</span>
            </button>

            {checkIns.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MapPin className="w-10 h-10 text-primary-500/30 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">No check-ins yet</p>
                <p className="text-primary-400/50 text-sm">Head to a tap & pay venue and check in — your history builds here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {checkIns.map((checkIn) => (
                  <div
                    key={checkIn._id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-4 backdrop-blur-sm cursor-pointer hover:bg-black/50 hover:border-primary-500/30 transition-all"
                    onClick={() => setActiveTab?.('map')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-2 flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          <h3 className="font-semibold text-primary-500 text-sm tracking-tight truncate">
                            {checkIn.checkIn?.venue?.name || checkIn.location?.venue?.name || 'Unknown Venue'}
                          </h3>
                        </div>
                        {checkIn.content && (
                          <p className="text-primary-400/80 text-sm font-light mb-2 line-clamp-2">{checkIn.content}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-primary-400/70 font-light">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(checkIn.checkIn?.checkedInAt || checkIn.createdAt)}</span>
                          </div>
                          {checkIn.likes.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Heart className="w-3 h-3" />
                              <span>{checkIn.likes.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'friends' && (
          <div>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-find-friends'))
              }}
              className="w-full bg-primary-500 text-black py-4 rounded-xl font-bold hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 mb-4"
            >
              <Users className="w-5 h-5" />
              <span>Find Friends</span>
            </button>

            {friends.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Users className="w-10 h-10 text-primary-500/30 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">No friends yet</p>
                <p className="text-primary-400/50 text-sm">Find the people you go out with — see where they are and buy them a round.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {friends.map((friend) => (
                  <div
                    key={friend._id || friend.id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-4 backdrop-blur-sm cursor-pointer hover:bg-black/50 hover:border-primary-500/30 transition-all"
                    onClick={() => onViewProfile?.(friend._id || friend.id)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0 mb-3">
                        {friend.profilePicture ? (
                          <img
                            src={friend.profilePicture}
                            alt={friend.firstName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                            <span className="text-primary-500 font-semibold text-lg">
                              {friend.firstName?.[0]}{friend.lastName?.[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-primary-500 text-sm tracking-tight mb-1">
                        {friend.firstName} {friend.lastName}
                      </p>
                      {friend.username && (
                        <p className="text-xs text-primary-400/70 font-light">@{friend.username}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
