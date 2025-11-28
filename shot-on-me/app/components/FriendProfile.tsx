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
  Camera,
  CheckCircle2,
  Clock,
  ArrowLeft,
  UserPlus,
  Navigation,
  Share2
} from 'lucide-react'

import { useApiUrl } from '../utils/api'

interface FriendProfileProps {
  userId: string
  onClose: () => void
  onSendShot?: (userId: string) => void
}

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

export default function FriendProfile({ userId, onClose, onSendShot }: FriendProfileProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [friend, setFriend] = useState<any>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [mutualFriends, setMutualFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'posts' | 'checkins'>('posts')
  const [isFriend, setIsFriend] = useState(false)
  const [addingFriend, setAddingFriend] = useState(false)
  const [removingFriend, setRemovingFriend] = useState(false)

  useEffect(() => {
    if (token && userId) {
      fetchFriendProfile()
    }
  }, [token, userId])

  const fetchFriendProfile = async () => {
    if (!token || !userId) return
    setLoading(true)

    try {
      // Fetch friend details
      const friendResponse = await axios.get(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const friendData = friendResponse.data.user
      setFriend(friendData)

      // Check if already friends
      const currentUserResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const currentUser = currentUserResponse.data.user
      setIsFriend(currentUser.friends?.includes(userId) || false)

      // Calculate mutual friends
      if (friendData.friends && currentUser.friends) {
        const mutualIds = friendData.friends.filter((f: string) => 
          currentUser.friends.includes(f)
        )
        if (mutualIds.length > 0) {
          const mutualPromises = mutualIds.slice(0, 6).map((id: string) =>
            axios.get(`${API_URL}/users/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => null)
          )
          const mutualResponses = await Promise.all(mutualPromises)
          const mutualList = mutualResponses
            .filter(r => r !== null)
            .map(r => r?.data?.user)
            .filter(Boolean)
          setMutualFriends(mutualList)
        }
      }

      // Fetch friend's posts
      const feedResponse = await axios.get(`${API_URL}/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const allPosts = feedResponse.data.posts || []
      
      // Filter to only friend's posts
      const friendPosts = allPosts.filter((post: FeedPost) => {
        const postAuthorId = post.author._id || post.author.id
        return postAuthorId === userId
      })
      
      setPosts(friendPosts)
    } catch (error) {
      console.error('Failed to fetch friend profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async () => {
    if (!token || !userId) return
    setAddingFriend(true)
    try {
      await axios.post(
        `${API_URL}/users/friends/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setIsFriend(true)
      alert('Friend added!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add friend')
    } finally {
      setAddingFriend(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!token || !userId) return
    if (!confirm('Remove this friend?')) return
    setRemovingFriend(true)
    try {
      await axios.delete(
        `${API_URL}/users/friends/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setIsFriend(false)
      alert('Friend removed')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove friend')
    } finally {
      setRemovingFriend(false)
    }
  }

  const handleGetDirections = () => {
    if (!friend?.location) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${friend.location.latitude},${friend.location.longitude}`
    window.open(url, '_blank')
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!friend) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-400 mb-4">User not found</p>
          <button
            onClick={onClose}
            className="bg-primary-500 text-black px-6 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const userPosts = posts.filter(p => !p.checkIn)
  const checkIns = posts.filter(p => p.checkIn)

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-primary-500/10 z-10 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="p-2 text-primary-400/70 hover:text-primary-500 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-primary-500 tracking-tight">Profile</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Profile Header - Instagram Style */}
      <div className="px-4 py-6 border-b border-primary-500/10">
        <div className="flex items-center space-x-6 mb-4">
          {/* Profile Picture */}
          <div className="w-20 h-20 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
            {friend.profilePicture ? (
              <img 
                src={friend.profilePicture} 
                alt={friend.firstName} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                <span className="text-2xl text-primary-500 font-semibold">
                  {friend.firstName?.[0]}{friend.lastName?.[0]}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 flex justify-around">
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{userPosts.length}</p>
              <p className="text-xs text-primary-400/70 font-light">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{friend.friends?.length || 0}</p>
              <p className="text-xs text-primary-400/70 font-light">Friends</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-500">{checkIns.length}</p>
              <p className="text-xs text-primary-400/70 font-light">Check-ins</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-primary-500 tracking-tight mb-1">
            {friend.firstName} {friend.lastName}
          </h2>
          {friend.username && (
            <p className="text-sm text-primary-400/80 font-light">@{friend.username}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {isFriend ? (
            <>
              {friend.location && friend.location.isVisible && (
                <button
                  onClick={handleGetDirections}
                  className="flex-1 bg-primary-500/10 border border-primary-500/20 text-primary-500 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Directions</span>
                </button>
              )}
              {onSendShot && (
                <button
                  onClick={() => onSendShot(userId)}
                  className="flex-1 bg-primary-500 text-black py-2 rounded-lg font-medium hover:bg-primary-600 transition-all"
                >
                  Send Shot
                </button>
              )}
              <button
                onClick={handleRemoveFriend}
                disabled={removingFriend}
                className="bg-black/40 border border-primary-500/20 text-primary-500/70 py-2 px-3 rounded-lg font-medium hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                title="Remove friend"
              >
                Unfriend
              </button>
            </>
          ) : (
            <button
              onClick={handleAddFriend}
              disabled={addingFriend}
              className="flex-1 bg-primary-500 text-black py-2 rounded-lg font-medium hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{addingFriend ? 'Adding...' : 'Add Friend'}</span>
            </button>
          )}
        </div>

        {/* Mutual Friends */}
        {mutualFriends.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-primary-400/70 font-light mb-2">
              {mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? 's' : ''}
            </p>
            <div className="flex -space-x-2">
              {mutualFriends.map((mutual) => (
                <div
                  key={mutual._id || mutual.id}
                  className="w-8 h-8 border-2 border-black rounded-full overflow-hidden"
                >
                  {mutual.profilePicture ? (
                    <img
                      src={mutual.profilePicture}
                      alt={mutual.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                      <span className="text-primary-500 font-medium text-xs">
                        {mutual.firstName?.[0]}{mutual.lastName?.[0]}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Status */}
        {friend.location && friend.location.isVisible && (
          <div className="mt-3 flex items-center space-x-2 text-xs text-primary-400/70">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-light">Location shared</span>
          </div>
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
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeView === 'posts' && (
          <div>
            {userPosts.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map((post) => (
                  <div
                    key={post._id}
                    className="aspect-square bg-black/40 border border-primary-500/10 rounded overflow-hidden relative group"
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
      </div>
    </div>
  )
}

