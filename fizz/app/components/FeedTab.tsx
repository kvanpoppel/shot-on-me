'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { MessageCircle, MapPin, Sparkles, MoreHorizontal, Pencil, Trash2, X, Check, Share2, Flag, SmilePlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import PostComposer from './PostComposer'
import StoriesRow from './StoriesRow'
import CommentsSheet from './CommentsSheet'

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '😮', '🎉'] as const
type ReactionEmoji = typeof REACTION_EMOJIS[number]

interface ReactionCounts {
  [emoji: string]: number
}

interface FeedTabProps {
  onSendFizz?: () => void
}

export default function FeedTab({ onSendFizz }: FeedTabProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const userId = user?.id || (user as any)?._id
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [menuPostId, setMenuPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 20

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    setHasMore(true)
    setError(null)
    try {
      const res = await axios.get(`${API_URL}/fizz/feed`, {
        params: { skip: 0, limit: PAGE_SIZE },
        headers: { Authorization: `Bearer ${token}` }
      })
      const fetched = res.data.posts || res.data || []
      setPosts(fetched)
      if (fetched.length < PAGE_SIZE) setHasMore(false)
    } catch {
      setError('Could not load your feed. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await axios.get(`${API_URL}/fizz/feed`, {
        params: { skip: posts.length, limit: PAGE_SIZE },
        headers: { Authorization: `Bearer ${token}` }
      })
      const more = res.data.posts || []
      if (more.length < PAGE_SIZE) setHasMore(false)
      setPosts(prev => [...prev, ...more])
    } catch {
      setError('Could not load more posts.')
    } finally {
      setLoadingMore(false)
    }
  }, [API_URL, token, posts.length, loadingMore, hasMore])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  // Infinite scroll observer
  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore() }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const handleReaction = async (postId: string, emoji: ReactionEmoji) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if ((p._id || p.id) !== postId) return p
      const currentCounts: ReactionCounts = { ...(p.reactionCounts || {}) }
      const currentUserReactions: string[] = [...(p.userReactions || [])]
      const alreadyReacted = currentUserReactions.includes(emoji)
      if (alreadyReacted) {
        currentCounts[emoji] = Math.max((currentCounts[emoji] || 1) - 1, 0)
        if (currentCounts[emoji] === 0) delete currentCounts[emoji]
        const idx = currentUserReactions.indexOf(emoji)
        if (idx > -1) currentUserReactions.splice(idx, 1)
      } else {
        currentCounts[emoji] = (currentCounts[emoji] || 0) + 1
        currentUserReactions.push(emoji)
      }
      // Backward compat: keep likes in sync for heart
      const likedByMe = currentUserReactions.includes('❤️')
      const likes = currentCounts['❤️'] || 0
      return { ...p, reactionCounts: currentCounts, userReactions: currentUserReactions, likedByMe, likes }
    }))

    try {
      const res = await axios.post(`${API_URL}/fizz/feed/${postId}/reaction`, { emoji }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Reconcile with server response if it has the fields
      if (res.data.reactionCounts || res.data.userReactions) {
        setPosts(prev => prev.map(p =>
          (p._id === postId || p.id === postId)
            ? { ...p, reactionCounts: res.data.reactionCounts ?? p.reactionCounts, userReactions: res.data.userReactions ?? p.userReactions }
            : p
        ))
      }
    } catch {
      // Revert on error by re-fetching — simple approach
      setError('Could not react to this post.')
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      await axios.delete(`${API_URL}/fizz/feed/${postId}`, { headers: { Authorization: `Bearer ${token}` } })
      setPosts(prev => prev.filter(p => (p._id || p.id) !== postId))
    } catch {
      setError('Could not delete post. Try again.')
    }
    setMenuPostId(null)
  }

  const handleEditPost = async (postId: string) => {
    if (!editContent.trim()) return
    try {
      await axios.put(`${API_URL}/fizz/feed/${postId}`, { content: editContent }, { headers: { Authorization: `Bearer ${token}` } })
      setPosts(prev => prev.map(p => (p._id || p.id) === postId ? { ...p, content: editContent } : p))
      setEditingPostId(null)
    } catch {
      setError('Could not save edit. Try again.')
    }
  }

  const handleShare = async (postId: string) => {
    setMenuPostId(null)
    try {
      await axios.post(`${API_URL}/fizz/feed/${postId}/share`, {}, { headers: { Authorization: `Bearer ${token}` } })
      // Native share fallback
      if (navigator.share) {
        await navigator.share({ title: 'Check out this Fizz!', url: window.location.href }).catch(() => {})
      }
    } catch {
      setError('Could not share post.')
    }
  }

  const handleReportPost = async (postId: string) => {
    if (!reportReason.trim()) return
    try {
      await axios.post(`${API_URL}/fizz/feed/${postId}/report`, { reason: reportReason }, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      setError('Could not submit report. Try again.')
    } finally {
      setReportingPostId(null)
      setReportReason('')
    }
  }

  const [pickerPostId, setPickerPostId] = useState<string | null>(null)

  const PostCard = ({ post }: { post: any }) => {
    const authorName = `${post.author?.firstName || post.user?.firstName || ''} ${post.author?.lastName || post.user?.lastName || ''}`.trim() || 'A friend'
    const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ''
    const isGift = post.type === 'shot' || post.type === 'gift'
    const postId = post._id || post.id
    const authorId = post.author?.id || post.author?._id
    const isOwn = authorId && userId && (authorId.toString() === userId.toString())
    const isEditing = editingPostId === postId

    // Reaction data with backward compat
    const reactionCounts: ReactionCounts = post.reactionCounts || {}
    const userReactions: string[] = post.userReactions || []
    const hasReactionCounts = post.reactionCounts && Object.keys(post.reactionCounts).length > 0
    // Backward compat: if no reactionCounts, show likes as heart
    const displayCounts: ReactionCounts = hasReactionCounts
      ? reactionCounts
      : (post.likes ? { '❤️': post.likes } : {})
    const displayUserReactions: string[] = hasReactionCounts
      ? userReactions
      : (post.likedByMe ? ['❤️'] : [])

    const showPicker = pickerPostId === postId

    return (
      <div className="overflow-hidden" style={{ background: '#1C1C32', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
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
          <div className="relative">
            <button onClick={() => setMenuPostId(menuPostId === postId ? null : postId)} className="p-1 rounded-lg hover:bg-white/5">
              <MoreHorizontal className="w-4 h-4 text-white/30" />
            </button>
            {menuPostId === postId && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuPostId(null)} />
                <div className="absolute right-0 top-8 z-50 rounded-2xl border border-white/10 py-1 shadow-2xl" style={{ background: '#252540', minWidth: 150 }}>
                  <button onClick={() => handleShare(postId)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  {isOwn ? (
                    <>
                      <button onClick={() => { setEditingPostId(postId); setEditContent(post.content || ''); setMenuPostId(null) }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDeletePost(postId)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5" style={{ color: '#FF5F57', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setReportingPostId(postId); setMenuPostId(null) }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5" style={{ color: '#FF9A57', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <Flag className="w-3.5 h-3.5" /> Report
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content / inline edit */}
        {isEditing ? (
          <div className="px-4 pb-3">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              maxLength={1000}
              autoFocus
              className="w-full px-3 py-2 rounded-xl text-sm border border-white/10 focus:border-lime-fizz resize-none"
              style={{ background: '#252540' }}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleEditPost(postId)} className="fizz-btn-primary px-4 py-2 text-xs gap-1"><Check className="w-3 h-3" /> Save</button>
              <button onClick={() => setEditingPostId(null)} className="fizz-btn-ghost px-4 py-2 text-xs gap-1"><X className="w-3 h-3" /> Cancel</button>
            </div>
          </div>
        ) : post.content && (
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

        {/* Images */}
        {post.media?.length > 0 && (
          <div className={`grid gap-1 ${post.media.length > 1 ? 'grid-cols-2' : ''}`}>
            {post.media.slice(0, 4).map((m: any, i: number) => (
              <img key={i} src={m.url} alt="" className="w-full object-cover" style={{ maxHeight: post.media.length === 1 ? 280 : 180, borderRadius: post.media.length === 1 ? 0 : 4 }} />
            ))}
          </div>
        )}
        {/* Legacy imageUrl */}
        {!post.media?.length && post.imageUrl && (
          <img src={post.imageUrl} alt="" className="w-full max-h-64 object-cover" />
        )}

        {/* Reaction counts display */}
        {Object.keys(displayCounts).length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1.5 flex-wrap">
            {Object.entries(displayCounts)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([emoji, count]) => {
                const isActive = displayUserReactions.includes(emoji)
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(postId, emoji as ReactionEmoji)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all"
                    style={{
                      background: isActive ? 'rgba(200,241,53,0.12)' : 'rgba(255,255,255,0.05)',
                      border: isActive ? '1px solid #C8F135' : '1px solid rgba(255,255,255,0.08)',
                      color: isActive ? '#C8F135' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                )
              })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-white/5 relative">
          {/* Reaction picker floating pill */}
          {showPicker && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPickerPostId(null)} />
              <div
                className="absolute bottom-full left-3 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-full shadow-xl z-40"
                style={{ background: '#252540', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {REACTION_EMOJIS.map(emoji => {
                  const isActive = displayUserReactions.includes(emoji)
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleReaction(postId, emoji)
                        setPickerPostId(null)
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-lg transition-all hover:scale-125"
                      style={{
                        background: isActive ? 'rgba(200,241,53,0.2)' : 'transparent',
                        border: isActive ? '1.5px solid #C8F135' : '1.5px solid transparent',
                      }}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <button
            onClick={() => setPickerPostId(showPicker ? null : postId)}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: displayUserReactions.length > 0 ? '#C8F135' : 'rgba(255,255,255,0.4)' }}
          >
            <SmilePlus className="w-4 h-4" />
            <span className="text-xs">React</span>
          </button>
          <button
            onClick={() => setCommentsPostId(postId)}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentCount || 0}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto px-4 pt-4 pb-6 max-w-2xl mx-auto w-full" style={{ background: '#1A1A2E', minHeight: '100%' }}>
      <PostComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        onPosted={fetchFeed}
      />

      {commentsPostId && (
        <CommentsSheet
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
          onCommentAdded={() => setPosts(prev => prev.map(p => (p._id || p.id) === commentsPostId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))}
        />
      )}

      {reportingPostId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setReportingPostId(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 animate-slide-up" style={{ background: '#1A1A2E' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <h3 className="font-bold text-white mb-4">Report Post</h3>
            <div className="flex flex-col gap-2 mb-4">
              {['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'].map(r => (
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
              onClick={() => handleReportPost(reportingPostId)}
              disabled={!reportReason}
              className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40 transition-all"
              style={{ background: '#FF9A57', color: '#1A1A2E' }}
            >
              Submit Report
            </button>
          </div>
        </>
      )}

      {/* Stories */}
      <div className="-mx-4 mb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <StoriesRow />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-3 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
          <X className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

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
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-lg animate-pulse" style={{ height: 120, background: '#252540' }} />
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
        <div className="flex flex-col gap-3">
          {posts.map((post: any) => <PostCard key={post._id || post.id} post={post} />)}
          {/* Infinite scroll sentinel */}
          <div ref={bottomRef} className="h-4" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i*0.15}s` }} />)}</div>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>You're all caught up ✨</p>
          )}
        </div>
      )}
    </div>
  )
}
