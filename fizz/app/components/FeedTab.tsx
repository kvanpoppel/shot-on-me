'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Heart, MessageCircle, MapPin, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import PostComposer from './PostComposer'

interface FeedTabProps {
  onSendFizz?: () => void
}

export default function FeedTab({ onSendFizz }: FeedTabProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPosts(res.data.posts || res.data || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  const handleLike = async (postId: string) => {
    try {
      await axios.post(`${API_URL}/feed/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPosts(prev => prev.map(p =>
        (p._id === postId || p.id === postId)
          ? { ...p, likes: (p.likes || 0) + 1, likedByMe: true }
          : p
      ))
    } catch { /* ignore */ }
  }

  const PostCard = ({ post }: { post: any }) => {
    const authorName = `${post.author?.firstName || post.user?.firstName || ''} ${post.author?.lastName || post.user?.lastName || ''}`.trim() || 'A friend'
    const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ''
    const isGift = post.type === 'shot' || post.type === 'gift'

    return (
      <div className="fizz-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            {post.author?.profilePicture || post.user?.profilePicture ? (
              <img src={post.author?.profilePicture || post.user?.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm" style={{ color: '#1A1A2E' }}>
                {authorName[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">{authorName}</p>
            <p className="text-xs text-white/30">{timeAgo}</p>
          </div>
          {isGift && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold" style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}>
              <Sparkles className="w-3 h-3" />
              Fizz
            </div>
          )}
        </div>

        {/* Content */}
        {post.content && (
          <p className="px-4 pb-3 text-sm text-white/80 leading-relaxed">{post.content}</p>
        )}

        {/* Gift details */}
        {isGift && post.amount && (
          <div className="mx-4 mb-3 p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(200,241,53,0.08), rgba(0,212,255,0.08))' }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🫧</span>
              <div>
                <p className="text-sm font-bold text-white">Sent ${post.amount?.toFixed(2)}</p>
                {post.venue?.name && (
                  <p className="text-xs text-white/40 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {post.venue.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image */}
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="w-full max-h-64 object-cover" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-white/5">
          <button
            onClick={() => handleLike(post._id || post.id)}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={post.likedByMe ? { color: '#FF5F57' } : { color: 'rgba(255,255,255,0.4)' }}
          >
            <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-current' : ''}`} />
            <span>{post.likes || 0}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-white/40">
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentCount || 0}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4" style={{ background: '#1A1A2E' }}>
      <PostComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        onPosted={fetchFeed}
      />

      {/* CTA */}
      <button
        onClick={() => setShowComposer(true)}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold mb-5"
        style={{ background: '#252540', color: 'rgba(255,255,255,0.5)' }}
      >
        <span className="text-lg">🫧</span>
        Share a Fizz moment with friends...
      </button>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 140, background: '#252540' }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="fizz-card py-16 text-center">
          <p className="text-4xl mb-3">✨</p>
          <p className="text-white/40 font-medium">Your feed is empty</p>
          <p className="text-white/25 text-sm mt-1">Send a Fizz or share a moment to get started!</p>
          <div className="flex gap-3 justify-center mt-5">
            <button onClick={onSendFizz} className="fizz-btn-primary px-5 py-2.5 text-sm">
              Send a Fizz
            </button>
            <button onClick={() => setShowComposer(true)} className="fizz-btn-ghost px-5 py-2.5 text-sm">
              Share a moment
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post: any) => <PostCard key={post._id || post.id} post={post} />)}
        </div>
      )}
    </div>
  )
}
