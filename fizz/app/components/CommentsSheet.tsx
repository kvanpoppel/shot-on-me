'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, Send, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  _id: string
  user: { _id: string; firstName?: string; lastName?: string; name?: string; profilePicture?: string; fizzProfile?: any }
  content: string
  createdAt: string
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
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const res = await axios.post(
        `${API_URL}/fizz/feed/${postId}/comment`,
        { content: text },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setComments(res.data.comments || [])
      onCommentAdded?.()
    } catch { setInput(text) } finally {
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

  const getName = (c: Comment) => {
    const fp = c.user?.fizzProfile
    return `${fp?.firstName || c.user?.firstName || c.user?.name?.split(' ')[0] || ''} ${fp?.lastName || c.user?.lastName || ''}`.trim() || 'User'
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
              <p className="text-3xl mb-2">💬</p>
              <p className="text-white/40 text-sm">No comments yet. Be the first!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map(c => {
                const isOwn = c.user?._id?.toString() === myId?.toString()
                return (
                  <div key={c._id} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs overflow-hidden"
                      style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>
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
              })}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Add a comment..."
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
