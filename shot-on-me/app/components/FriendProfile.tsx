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
  CheckCircle2,
  Clock,
  UserPlus,
  UserMinus,
  Loader2,
  Send,
} from 'lucide-react'
import BackButton from './BackButton'
import QuickSendDrinkSheet from './QuickSendDrinkSheet'
import { useApiUrl } from '../utils/api'

interface FriendProfileProps {
  userId: string
  onClose: () => void
  onSendShot?: (userId: string) => void
}

interface FeedPost {
  _id: string
  author: { _id?: string; id?: string; firstName: string; lastName: string; profilePicture?: string }
  content: string
  media: Array<{ type: string; url: string; thumbnail?: string }>
  likes: Array<{ user: string | { _id: string } }>
  comments: Array<any>
  checkIn?: { venue?: { _id: string; name: string }; checkedInAt: string }
  location?: { venue?: { _id: string; name: string } }
  createdAt: string
}

export default function FriendProfile({ userId, onClose, onSendShot }: FriendProfileProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [friend, setFriend] = useState<any>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [mutualFriends, setMutualFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFriend, setIsFriend] = useState(false)
  const [addingFriend, setAddingFriend] = useState(false)
  const [removingFriend, setRemovingFriend] = useState(false)
  const [showSendDrink, setShowSendDrink] = useState(false)
  const [stats, setStats] = useState({ postsCount: 0, friendsCount: 0, checkInsCount: 0, venuesVisited: 0, points: 0 })

  useEffect(() => {
    if (token && userId) fetchFriendProfile()
  }, [token, userId])

  const fetchFriendProfile = async () => {
    if (!token || !userId) return
    setLoading(true)
    try {
      const [friendRes, meRes, feedRes] = await Promise.allSettled([
        axios.get(`${API_URL}/users/${userId}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }),
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }),
        axios.get(`${API_URL}/feed`, { headers: { Authorization: `Bearer ${token}` }, params: { userId, limit: 30 }, timeout: 10000 }),
      ])

      if (friendRes.status === 'fulfilled') {
        const friendData = friendRes.value.data.user
        setFriend(friendData)
        setStats({
          postsCount: friendData.stats?.postsCount || 0,
          friendsCount: friendData.friends?.length || friendData.stats?.friendsCount || 0,
          checkInsCount: friendData.stats?.totalCheckIns || 0,
          venuesVisited: friendData.stats?.venuesVisited || 0,
          points: friendData.points || 0,
        })

        // Check mutual friends
        if (meRes.status === 'fulfilled') {
          const currentUser = meRes.value.data.user
          setIsFriend(currentUser.friends?.includes(userId) || false)

          if (friendData.friends && currentUser.friends) {
            const mutualIds = friendData.friends.filter((f: string) => currentUser.friends.includes(f))
            if (mutualIds.length > 0) {
              try {
                const batchRes = await axios.get(`${API_URL}/users/batch`, {
                  headers: { Authorization: `Bearer ${token}` },
                  params: { ids: mutualIds.slice(0, 6).join(',') }
                })
                setMutualFriends(batchRes.data.users || [])
              } catch { setMutualFriends([]) }
            }
          }
        }
      }

      if (feedRes.status === 'fulfilled') {
        const allPosts = feedRes.value.data.posts || []
        const friendPosts = allPosts.filter((p: FeedPost) => (p.author._id || p.author.id) === userId)
        setPosts(friendPosts)
        // Update posts count from actual data if stats didn't have it
        if (friendPosts.length > 0) {
          setStats(prev => ({ ...prev, postsCount: prev.postsCount || friendPosts.length }))
        }
      }
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
      await axios.post(`${API_URL}/users/friends/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setIsFriend(true)
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
      await axios.delete(`${API_URL}/users/friends/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      setIsFriend(false)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove friend')
    } finally {
      setRemovingFriend(false)
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-[70] flex flex-col">
        <div className="p-4"><BackButton onClick={onClose} label="Back" /></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    )
  }

  if (!friend) {
    return (
      <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-400 mb-4">User not found</p>
          <button onClick={onClose} className="bg-primary-500 text-black px-6 py-2 rounded-lg font-medium">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-[70] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-primary-500/10 z-10 px-4 py-3">
        <div className="flex items-center justify-between">
          <BackButton onClick={onClose} label="Back" />
          <h1 className="text-base font-bold text-primary-500">{friend.firstName}'s Profile</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Profile Header */}
      <div className="px-4 pt-5 pb-4">
        {/* Avatar + name + actions */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
            {friend.profilePicture ? (
              <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                <span className="text-2xl text-primary-500 font-semibold">{friend.firstName?.[0]}{friend.lastName?.[0]}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">{friend.firstName} {friend.lastName}</h2>
            {friend.username && <p className="text-sm text-primary-400/60">@{friend.username}</p>}
            {friend.bio && <p className="text-sm text-primary-400/50 mt-1 leading-snug line-clamp-2">{friend.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { value: stats.postsCount, label: 'Posts' },
            { value: stats.friendsCount, label: 'Friends' },
            { value: stats.checkInsCount, label: 'Check-ins' },
            { value: stats.venuesVisited, label: 'Venues' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center py-2.5 rounded-xl bg-primary-500/5 border border-primary-500/10">
              <p className="text-lg font-bold text-primary-500">{value}</p>
              <p className="text-[10px] text-primary-400/50 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          {isFriend ? (
            <>
              <button
                onClick={() => setShowSendDrink(true)}
                className="flex-1 bg-primary-500 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 transition-all active:scale-[0.98]"
              >
                <Send className="w-4 h-4" /> Send a Shot
              </button>
              <button
                onClick={handleRemoveFriend}
                disabled={removingFriend}
                className="px-4 py-3 rounded-xl border border-primary-500/20 text-primary-400/60 text-sm font-medium hover:border-red-500/30 hover:text-red-400 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {removingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <button
              onClick={handleAddFriend}
              disabled={addingFriend}
              className="flex-1 bg-primary-500 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {addingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {addingFriend ? 'Adding...' : 'Add Friend'}
            </button>
          )}
        </div>

        {/* Mutual friends */}
        {mutualFriends.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {mutualFriends.slice(0, 4).map((m) => (
                <div key={m._id || m.id} className="w-7 h-7 border-2 border-black rounded-full overflow-hidden">
                  {m.profilePicture ? (
                    <img src={m.profilePicture} alt={m.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                      <span className="text-primary-500 font-medium text-[8px]">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-primary-400/50">{mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {/* Activity header */}
      <div className="flex items-center border-b border-primary-500/10 px-4 py-3">
        <Grid3x3 className="w-4 h-4 text-primary-500 mr-2" />
        <span className="text-sm font-medium text-primary-500">Activity</span>
      </div>

      {/* Activity feed */}
      <div className="p-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Grid3x3 className="w-10 h-10 text-primary-500/20 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No activity yet</p>
            <p className="text-primary-400/40 text-sm">{friend.firstName} hasn't posted or checked in yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => {
              const isCheckIn = !!post.checkIn
              const venueName = post.checkIn?.venue?.name || post.location?.venue?.name
              return (
                <div key={post._id} className="bg-black/40 border border-primary-500/10 rounded-xl overflow-hidden">
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
        )}
      </div>

      {friend && showSendDrink && (
        <QuickSendDrinkSheet
          recipientId={userId}
          recipientName={`${friend.firstName} ${friend.lastName || ''}`.trim()}
          recipientFirstName={friend.firstName}
          recipientAvatar={friend.profilePicture}
          isOpen={showSendDrink}
          onClose={() => setShowSendDrink(false)}
          onSuccess={() => setShowSendDrink(false)}
        />
      )}
    </div>
  )
}
