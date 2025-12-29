'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { 
  Grid3x3, 
  MapPin, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2,
  Camera,
  CheckCircle2,
  Clock,
  TrendingUp,
  Flame,
  Sparkles
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
}

export default function ProfileTab({ onViewProfile }: ProfileTabProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'posts' | 'checkins' | 'friends'>('posts')
  const [stats, setStats] = useState({
    postsCount: 0,
    checkInsCount: 0,
    friendsCount: 0,
    venuesVisited: 0
  })
  const [gamificationStats, setGamificationStats] = useState({
    points: 0,
    checkInStreak: { current: 0, longest: 0 },
    loginStreak: { current: 0, longest: 0 },
    badgesUnlocked: 0
  })

  useEffect(() => {
    if (token && user) {
      fetchProfileData()
    }
  }, [token, user])

  const fetchProfileData = async () => {
    if (!token || !user) return
    setLoading(true)

    try {
      // Fetch user's posts
      const feedResponse = await axios.get(`${API_URL}/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const allPosts = feedResponse.data.posts || []
      
      // Filter to only user's posts
      const userId = user.id || (user as any)._id
      const userPosts = allPosts.filter((post: FeedPost) => {
        const postAuthorId = post.author._id || post.author.id
        return postAuthorId === userId
      })
      
      setPosts(userPosts)
      
      // Calculate stats
      const checkIns = userPosts.filter((p: FeedPost) => p.checkIn)
      const uniqueVenues = new Set(
        userPosts
          .filter((p: FeedPost) => p.checkIn?.venue?._id || p.location?.venue?._id)
          .map((p: FeedPost) => p.checkIn?.venue?._id || p.location?.venue?._id)
      )

      setStats({
        postsCount: userPosts.length,
        checkInsCount: checkIns.length,
        friendsCount: (user as any).friends?.length || 0,
        venuesVisited: uniqueVenues.size
      })

      // Fetch gamification stats
      try {
        const gamificationResponse = await axios.get(`${API_URL}/gamification/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setGamificationStats(gamificationResponse.data)
      } catch (error) {
        console.error('Failed to fetch gamification stats:', error)
      }

      // Fetch friends
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const userData = userResponse.data.user
      
      if (userData.friends && userData.friends.length > 0) {
        // Fetch friend details
        const friendPromises = userData.friends.slice(0, 20).map((friendId: string) =>
          axios.get(`${API_URL}/users/${friendId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null)
        )
        const friendResponses = await Promise.all(friendPromises)
        const friendList = friendResponses
          .filter(r => r !== null)
          .map(r => r?.data?.user)
          .filter(Boolean)
        setFriends(friendList)
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    } finally {
      setLoading(false)
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
    <div className="min-h-screen pb-20 bg-black max-w-2xl mx-auto">
      {/* Profile Header - Instagram Style */}
      <div className="px-4 py-6 border-b border-primary-500/10">
        <div className="flex items-center space-x-6 mb-4">
          {/* Profile Picture */}
          <div className="w-20 h-20 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
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
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <p className="text-lg font-semibold text-yellow-500">{gamificationStats.points}</p>
              </div>
              <p className="text-xs text-primary-400/70 font-light">Points</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <p className="text-lg font-semibold text-orange-500">{gamificationStats.checkInStreak.current}</p>
              </div>
              <p className="text-xs text-primary-400/70 font-light">Streak</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{gamificationStats.badgesUnlocked}</p>
              <p className="text-xs text-primary-400/70 font-light">Badges</p>
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
            {userPosts.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">No posts yet</p>
                <p className="text-primary-400/60 text-sm mt-1 font-light">Share your first moment!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
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
            )}
          </div>
        )}

        {activeView === 'checkins' && (
          <div>
            {checkIns.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">No check-ins yet</p>
                <p className="text-primary-400/60 text-sm mt-1 font-light">Check in at your favorite venues!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkIns.map((checkIn) => (
                  <div
                    key={checkIn._id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-2">
                        <CheckCircle2 className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary-500" />
                          <h3 className="font-semibold text-primary-500 text-sm tracking-tight">
                            {checkIn.checkIn?.venue?.name || checkIn.location?.venue?.name}
                          </h3>
                        </div>
                        {checkIn.content && (
                          <p className="text-primary-400/80 text-sm font-light mb-2">{checkIn.content}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-primary-400/70 font-light">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(checkIn.checkIn?.checkedInAt || checkIn.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="w-3 h-3" />
                            <span>{checkIn.likes.length} likes</span>
                          </div>
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
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">No friends yet</p>
                <p className="text-primary-400/60 text-sm mt-1 font-light">Start connecting with people!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {friends.map((friend) => (
                  <div
                    key={friend._id || friend.id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-all"
                    onClick={() => onViewProfile?.(friend._id || friend.id)}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 border border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                        {friend.profilePicture ? (
                          <img
                            src={friend.profilePicture}
                            alt={friend.firstName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                            <span className="text-primary-500 font-medium text-xs">
                              {friend.firstName?.[0]}{friend.lastName?.[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary-500 text-sm truncate tracking-tight">
                          {friend.firstName} {friend.lastName}
                        </p>
                        {friend.username && (
                          <p className="text-xs text-primary-400/70 font-light truncate">@{friend.username}</p>
                        )}
                      </div>
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
