'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, Send, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const REACTION_EMOJIS = ['\u2764\uFE0F', '\uD83D\uDD25', '\uD83D\uDE02', '\uD83D\uDC4F', '\uD83D\uDE2E', '\uD83C\uDF89'] as const

interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
}

interface Comment {
  _id: string
  user: { _id: string; firstName?: string; lastName?: string; name?: string; profilePicture?: string; fizzProfile?: any }
  content: string
  createdAt: string
  reactions?: Reaction[]
  replyTo?: string
  replies?: Comment[]
}

interface CommentsSheetProps {
  postId: string
  onClose: () => void
  onCommentAdded?: () => void
}

export default function CommentsSheet({ postId, onClose, onCommentAdded }: CommentsSheetProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const myId = user?.id || (user as any)?._id
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/fizz/feed/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComments(res.data.comments || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token, postId])

  useEffect(() => {
    fetchComments()
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [fetchComments])

  // Close picker when tapping outside
  useEffect(() => {
    if (!pickerOpen) return
    const handler = () => setPickerOpen(null)
    const timer = setTimeout(() => document.addEventListener('click', handler, { once: true }), 50)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [pickerOpen])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    const currentReplyTo = replyTo
    setReplyTo(null)
    try {
      const body: any = { content: text }
      if (currentReplyTo) body.replyTo = currentReplyTo.id
      const res = await axios.post(
        `${API_URL}/fizz/feed/${postId}/comment`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setComments(res.data.comments || [])
      onCommentAdded?.()
      // Auto-expand replies for the parent we just replied to
      if (currentReplyTo) {
        setExpandedReplies(prev => new Set(prev).add(currentReplyTo.id))
      }
    } catch {
      setInput(text)
      setReplyTo(currentReplyTo)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await axios.delete(`${API_URL}/fizz/feed/${postId}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComments(prev => prev.filter(c => c._id !== commentId))
    } catch { /* ignore */ }
  }

  const handleReaction = async (commentId: string, emoji: string) => {
    setPickerOpen(null)
    // Optimistic update
    setComments(prev => updateReactionOptimistic(prev, commentId, emoji))
    try {
      await axios.post(
        `${API_URL}/fizz/feed/${postId}/comments/${commentId}/reaction`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch {
      // Revert on failure
      fetchComments()
    }
  }

  const updateReactionOptimistic = (items: Comment[], commentId: string, emoji: string): Comment[] => {
    return items.map(c => {
      if (c._id === commentId) {
        const reactions = [...(c.reactions || [])]
        const idx = reactions.findIndex(r => r.emoji === emoji)
        if (idx >= 0) {
          if (reactions[idx].userReacted) {
            reactions[idx] = { ...reactions[idx], count: Math.max(0, reactions[idx].count - 1), userReacted: false }
            if (reactions[idx].count === 0) reactions.splice(idx, 1)
          } else {
            reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, userReacted: true }
          }
        } else {
          reactions.push({ emoji, count: 1, userReacted: true })
        }
        return { ...c, reactions }
      }
      if (c.replies?.length) {
        return { ...c, replies: updateReactionOptimistic(c.replies, commentId, emoji) }
      }
      return c
    })
  }

  const handleReactionTap = (commentId: string) => {
    const now = Date.now()
    const last = lastTapRef.current
    // Double-tap detection: open picker
    if (last && last.id === commentId && now - last.time < 350) {
      lastTapRef.current = null
      setPickerOpen(prev => prev === commentId ? null : commentId)
      return
    }
    lastTapRef.current = { id: commentId, time: now }
    // Single tap: toggle heart
    handleReaction(commentId, '\u2764\uFE0F')
  }

  const handleReactionPointerDown = (commentId: string) => {
    longPressTimer.current = setTimeout(() => {
      setPickerOpen(prev => prev === commentId ? null : commentId)
    }, 500)
  }

  const handleReactionPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleReply = (comment: Comment) => {
    setReplyTo({ id: comment._id, name: getName(comment) })
    inputRef.current?.focus()
  }

  const cancelReply = () => setReplyTo(null)

  const toggleExpand = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      next.has(commentId) ? next.delete(commentId) : next.add(commentId)
      return next
    })
  }

  const getName = (c: Comment) => {
    const fp = c.user?.fizzProfile
    return `${fp?.firstName || c.user?.firstName || c.user?.name?.split(' ')[0] || ''} ${fp?.lastName || c.user?.lastName || ''}`.trim() || 'User'
  }

  // Organize comments into threads: top-level + nested replies
  const threadedComments = (() => {
    const topLevel: Comment[] = []
    const replyMap = new Map<string, Comment[]>()
    for (const c of comments) {
      if (c.replyTo) {
        const list = replyMap.get(c.replyTo) || []
        list.push(c)
        replyMap.set(c.replyTo, list)
      } else {
        topLevel.push(c)
      }
    }
    // If server already nests replies, use c.replies; otherwise build from flat list
    return topLevel.map(c => ({
      ...c,
      replies: c.replies?.length ? c.replies : (replyMap.get(c._id) || [])
    }))
  })()

  const renderComment = (c: Comment, isReply = false) => {
    const isOwn = c.user?._id?.toString() === myId?.toString()
    const reactions = c.reactions || []
    return (
      <div key={c._id} className="flex items-start gap-3 group">
        <div
          className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,#C8F135,#00D4FF)',
            color: '#1A1A2E',
            ...(isReply ? { width: 24, height: 24, fontSize: 9 } : {})
          }}
        >
          {c.user?.profilePicture || c.user?.fizzProfile?.profilePicture
            ? <img src={c.user?.fizzProfile?.profilePicture || c.user?.profilePicture} alt="" className="w-full h-full object-cover" />
            : getName(c)[0]
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-white">{getName(c)}</span>
            <span className="text-[10px] text-white/25">
              {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}
            </span>
          </div>
          <p className="text-sm text-white/75 leading-relaxed mt-0.5">{c.content}</p>

          {/* Reaction counts + action row */}
          <div className="flex items-center gap-3 mt-1 relative">
            {/* Reaction counts */}
            {reactions.length > 0 && (
              <div className="flex items-center gap-1.5">
                {reactions.map(r => (
                  <button
                    key={r.emoji}
                    onClick={() => handleReaction(c._id, r.emoji)}
                    className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-colors"
                    style={{
                      background: r.userReacted ? 'rgba(200,241,53,0.15)' : 'rgba(255,255,255,0.05)',
                      fontSize: 10,
                      lineHeight: '14px'
                    }}
                  >
                    <span>{r.emoji}</span>
                    <span className={r.userReacted ? 'text-lime-400' : 'text-white/40'}>{r.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* React button */}
            <button
              onClick={() => handleReactionTap(c._id)}
              onPointerDown={() => handleReactionPointerDown(c._id)}
              onPointerUp={handleReactionPointerUp}
              onPointerLeave={handleReactionPointerUp}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors select-none"
            >
              {'\u2764\uFE0F'}
            </button>

            {/* Reply button */}
            {!isReply && (
              <button
                onClick={() => handleReply(c)}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                Reply
              </button>
            )}

            {/* Emoji picker */}
            {pickerOpen === c._id && (
              <div
                className="absolute left-0 bottom-full mb-1 flex items-center gap-1 px-2 py-1.5 rounded-xl z-10 shadow-lg"
                style={{ background: '#252540', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={e => e.stopPropagation()}
              >
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(c._id, emoji)}
                    className="text-base hover:scale-125 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {isOwn && (
          <button
            onClick={() => handleDelete(c._id)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5"
          >
            <Trash2 className="w-3.5 h-3.5 text-white/30" />
          </button>
        )}
      </div>
    )
  }

  const renderThread = (parent: Comment) => {
    const replies = parent.replies || []
    const isExpanded = expandedReplies.has(parent._id)
    const visibleReplies = isExpanded ? replies : replies.slice(0, 3)
    const hiddenCount = replies.length - 3

    return (
      <div key={parent._id}>
        {renderComment(parent)}
        {replies.length > 0 && (
          <div
            className="ml-5 mt-1.5 pl-3 flex flex-col gap-2.5"
            style={{ borderLeft: '2px solid rgba(200,241,53,0.3)' }}
          >
            {visibleReplies.map(r => renderComment(r, true))}
            {hiddenCount > 0 && !isExpanded && (
              <button
                onClick={() => toggleExpand(parent._id)}
                className="text-[11px] text-lime-400/70 hover:text-lime-400 transition-colors text-left pl-1"
              >
                Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
            {isExpanded && hiddenCount > 0 && (
              <button
                onClick={() => toggleExpand(parent._id)}
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors text-left pl-1"
              >
                Hide replies
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col animate-slide-up"
        style={{ background: '#1A1A2E', maxHeight: '80vh' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-white">Comments</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-2xl animate-pulse" style={{ background: '#252540' }} />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">{'\uD83D\uDCAC'}</p>
              <p className="text-white/40 text-sm">No comments yet. Be the first!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {threadedComments.map(c => renderThread(c))}
            </div>
          )}
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div
            className="px-4 py-2 flex items-center justify-between flex-shrink-0"
            style={{ background: '#252540', borderTop: '1px solid rgba(200,241,53,0.15)' }}
          >
            <span className="text-xs text-white/50">
              Replying to <span className="text-lime-400/80 font-medium">@{replyTo.name}</span>
            </span>
            <button onClick={cancelReply} className="p-1 rounded-lg hover:bg-white/5">
              <X className="w-3.5 h-3.5 text-white/30" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={replyTo ? `Reply to @${replyTo.name}...` : 'Add a comment...'}
            maxLength={500}
            className="flex-1 py-2.5 px-4 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz transition-colors"
            style={{ background: '#252540', color: 'white' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: '#C8F135' }}
          >
            <Send className="w-4 h-4" style={{ color: '#1A1A2E' }} />
          </button>
        </div>
      </div>
    </>
  )
}
