'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, UserPlus, UserMinus, Gift, MapPin, Heart, MessageCircle, Grid3x3, ShieldOff, Flag, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FriendProfileProps {
  userId: string
  onClose: () => void
  onSendRevig?: (venueId?: string) => void
  onSendRevigToFriend?: (friend: { id: string; firstName?: string; lastName?: string; username?: string; profilePicture?: string }) => void
}

export default function FriendProfile({ userId, onClose, onSendRevig, onSendRevigToFriend }: FriendProfileProps) {
  const { user: me, token } = useAuth()
  const API_URL = useApiUrl()
  const [friend, setFriend] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFriend, setIsFriend] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDone, setReportDone] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [profileRes, postsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/revig/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/revig/feed?authorId=${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
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
        await axios.delete(`${API_URL}/revig/friends/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
        setIsFriend(false)
      } else {
        await axios.post(`${API_URL}/revig/friends/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } })
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
      {showReport && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={() => setShowReport(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl p-5 animate-slide-up" style={{ background: '#1A1A2E' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            {reportDone ? (
              <div className="py-8 text-center">
                <p className="text-3xl mb-3">✅</p>
                <p className="font-bold text-white">Report submitted</p>
                <p className="text-sm text-white/40 mt-1">Thank you. We'll review this shortly.</p>
                <button onClick={() => { setShowReport(false); setReportDone(false) }} className="mt-5 revig-btn-ghost px-6 py-2.5 text-sm">Close</button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-white mb-4">Report {name || 'User'}</h3>
                <div className="flex flex-col gap-2 mb-4">
                  {['Spam or fake account', 'Harassment or bullying', 'Inappropriate content', 'Impersonation', 'Other'].map(r => (
                    <button
                      key={r}
                      onClick={() => setReportReason(r)}
                      className="px-4 py-3 rounded-2xl text-sm text-left transition-all"
                      style={reportReason === r
                        ? { background: 'rgba(255,154,87,0.2)', color: '#FF9A57', border: '1px solid rgba(255,154,87,0.4)' }
                        : { background: '#252540', color: 'rgba(255,255,255,0.6)' }
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  disabled={!reportReason}
                  onClick={async () => {
                    try {
                      await axios.post(`${API_URL}/revig/users/${userId}/report`, { reason: reportReason }, { headers: { Authorization: `Bearer ${token}` } })
                    } catch { /* ignore */ } finally {
                      setReportDone(true)
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40 transition-all"
                  style={{ background: '#FF9A57', color: '#1A1A2E' }}
                >
                  Submit Report
                </button>
              </>
            )}
          </div>
        </>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col animate-slide-up"
        style={{ background: '#1A1A2E', maxHeight: '90vh' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Close + More */}
        <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-white/5">
          <X className="w-5 h-5 text-white/40" />
        </button>
        <div className="absolute top-4 right-4">
          <button onClick={() => setShowMore(!showMore)} className="p-2 rounded-xl hover:bg-white/5">
            <MoreVertical className="w-5 h-5 text-white/40" />
          </button>
          {showMore && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className="absolute right-0 top-10 z-50 rounded-2xl border border-white/10 py-1 shadow-2xl" style={{ background: '#252540', minWidth: 160 }}>
                <button
                  onClick={() => { setShowMore(false); setShowReport(true) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5"
                >
                  <Flag className="w-3.5 h-3.5" /> Report User
                </button>
                <button
                  onClick={async () => {
                    await axios.post(`${API_URL}/revig/block/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } })
                    setShowMore(false)
                    onClose()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5"
                  style={{ color: '#FF5F57', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <ShieldOff className="w-3.5 h-3.5" /> Block & Remove
                </button>
              </div>
            </>
          )}
        </div>

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
              <div className="revig-card py-3 text-center">
                <p className="text-lg font-black" style={{ color: '#C8F135' }}>{totalSent}</p>
                <p className="text-xs text-white/35 mt-0.5">Reviges Sent</p>
              </div>
              <div className="revig-card py-3 text-center">
                <p className="text-lg font-black" style={{ color: '#00D4FF' }}>{totalReceived}</p>
                <p className="text-xs text-white/35 mt-0.5">Received</p>
              </div>
              <div className="revig-card py-3 text-center">
                <p className="text-lg font-black" style={{ color: '#FF5F57' }}>{friend.friendsCount ?? friend.friends?.length ?? 0}</p>
                <p className="text-xs text-white/35 mt-0.5">Friends</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => {
                  if (onSendRevigToFriend && friend) {
                    onSendRevigToFriend({ id: friend.id || friend._id, firstName: friend.firstName, lastName: friend.lastName, username: friend.username, profilePicture: friend.profilePicture })
                  } else {
                    onSendRevig?.()
                  }
                  onClose()
                }}
                className="flex-1 revig-btn-primary py-3 gap-2 text-sm"
              >
                <Gift className="w-4 h-4" /> Send Revig
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
                    <div key={post._id} className="revig-card p-4">
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
