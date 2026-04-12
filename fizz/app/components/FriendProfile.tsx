'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, UserPlus, UserMinus, Gift, MapPin, Heart, MessageCircle, Grid3x3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FriendProfileProps {
  userId: string
  onClose: () => void
  onSendFizz?: (venueId?: string) => void
  onSendFizzToFriend?: (friend: { id: string; firstName?: string; lastName?: string; username?: string; profilePicture?: string }) => void
}

export default function FriendProfile({ userId, onClose, onSendFizz, onSendFizzToFriend }: FriendProfileProps) {
  const { user: me, token } = useAuth()
  const API_URL = useApiUrl()
  const [friend, setFriend] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFriend, setIsFriend] = useState(false)
  const [toggling, setToggling] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [profileRes, postsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/fizz/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/fizz/feed?authorId=${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (profileRes.status === 'fulfilled') {
        const data = profileRes.value.data
        setFriend(data.user || data)
        setIsFriend(data.isFriend ?? false)
      }
      if (postsRes.status === 'fulfilled') {
        setPosts(postsRes.value.data.posts || [])
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token, userId, me])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleToggleFriend = async () => {
    setToggling(true)
    try {
      if (isFriend) {
        await axios.delete(`${API_URL}/fizz/friends/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
        setIsFriend(false)
      } else {
        await axios.post(`${API_URL}/fizz/friends/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } })
        setIsFriend(true)
      }
    } catch { /* ignore */ } finally {
      setToggling(false)
    }
  }

  const name = friend ? `${friend.firstName || friend.name?.split(' ')[0] || ''} ${friend.lastName || ''}`.trim() : ''
  const totalSent = friend?.stats?.shotsSent || friend?.totalShotsSent || 0
  const totalReceived = friend?.stats?.shotsReceived || friend?.totalShotsReceived || 0

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col animate-slide-up"
        style={{ background: '#1A1A2E', maxHeight: '90vh' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5">
          <X className="w-5 h-5 text-white/40" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i*0.15}s` }} />)}</div>
          </div>
        ) : !friend ? (
          <div className="py-16 text-center text-white/40">Profile not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-8 px-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center pt-6 pb-5 text-center">
              <div className="w-20 h-20 rounded-3xl overflow-hidden mb-3 border-2" style={{ borderColor: 'rgba(200,241,53,0.3)' }}>
                {friend.profilePicture
                  ? <img src={friend.profilePicture} alt="" className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>
                      {name[0]}
                    </div>
                  )
                }
              </div>
              <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{name}</h2>
              {friend.username && <p className="text-sm text-white/40">@{friend.username}</p>}
              {friend.bio && <p className="text-sm text-white/50 mt-2 max-w-xs">{friend.bio}</p>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="fizz-card py-3 text-center">
                <p className="text-lg font-black" style={{ color: '#C8F135' }}>{totalSent}</p>
                <p className="text-xs text-white/35 mt-0.5">Fizzes Sent</p>
              </div>
              <div className="fizz-card py-3 text-center">
                <p className="text-lg font-black" style={{ color: '#00D4FF' }}>{totalReceived}</p>
                <p className="text-xs text-white/35 mt-0.5">Received</p>
              </div>
              <div className="fizz-card py-3 text-center">
                <p className="text-lg font-black" style={{ color: '#FF5F57' }}>{friend.friendsCount ?? friend.friends?.length ?? 0}</p>
                <p className="text-xs text-white/35 mt-0.5">Friends</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => {
                  if (onSendFizzToFriend && friend) {
                    onSendFizzToFriend({ id: friend.id || friend._id, firstName: friend.firstName, lastName: friend.lastName, username: friend.username, profilePicture: friend.profilePicture })
                  } else {
                    onSendFizz?.()
                  }
                  onClose()
                }}
                className="flex-1 fizz-btn-primary py-3 gap-2 text-sm"
              >
                <Gift className="w-4 h-4" /> Send Fizz
              </button>
              <button
                onClick={handleToggleFriend}
                disabled={toggling}
                className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={isFriend
                  ? { background: 'rgba(255,95,87,0.15)', color: '#FF5F57', border: '1px solid rgba(255,95,87,0.3)' }
                  : { background: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.25)' }
                }
              >
                {isFriend ? <><UserMinus className="w-4 h-4" /> Unfriend</> : <><UserPlus className="w-4 h-4" /> Add Friend</>}
              </button>
            </div>

            {/* Posts */}
            {posts.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Grid3x3 className="w-4 h-4 text-white/40" />
                  <h3 className="font-bold text-white text-sm">Posts</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {posts.slice(0, 5).map((post: any) => (
                    <div key={post._id} className="fizz-card p-4">
                      {post.content && <p className="text-sm text-white/80 leading-relaxed mb-2">{post.content}</p>}
                      {post.venue?.name && (
                        <p className="text-xs text-white/35 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {post.venue.name}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-white/30">
                          <Heart className="w-3 h-3" /> {post.likes || 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/30">
                          <MessageCircle className="w-3 h-3" /> {post.commentCount || 0}
                        </span>
                        <span className="text-xs text-white/20 ml-auto">
                          {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
