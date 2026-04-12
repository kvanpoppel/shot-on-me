'use client'

import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, Image as ImageIcon, Sparkles, Send } from 'lucide-react'
import { OCCASION_TAGS } from '../types'

interface PostComposerProps {
  isOpen: boolean
  onClose: () => void
  onPosted?: () => void
}

export default function PostComposer({ isOpen, onClose, onPosted }: PostComposerProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [content, setContent] = useState('')
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handlePost = async () => {
    if (!content.trim() && !selectedOccasion) return
    setError('')
    setLoading(true)
    const body = selectedOccasion
      ? `${selectedOccasion} ${content}`.trim()
      : content.trim()
    try {
      await axios.post(`${API_URL}/feed`, { content: body }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setContent('')
      setSelectedOccasion(null)
      onPosted?.()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not post. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setContent('')
    setSelectedOccasion(null)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  const canPost = (content.trim().length > 0 || selectedOccasion !== null) && !loading

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col animate-slide-up"
        style={{ background: '#1A1A2E', maxHeight: '80vh' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Share a Moment</h2>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-6 safe-bottom">
          {/* Occasion tags */}
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            What&apos;s the vibe?
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {OCCASION_TAGS.map(tag => (
              <button
                key={tag.label}
                onClick={() => setSelectedOccasion(tag.label === selectedOccasion ? null : tag.label)}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1 transition-all"
                style={selectedOccasion === tag.label
                  ? { background: '#C8F135', color: '#1A1A2E' }
                  : { background: '#252540', color: 'rgba(255,255,255,0.55)' }
                }
              >
                {tag.emoji} {tag.label}
              </button>
            ))}
          </div>

          {/* Text */}
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What&apos;s your Fizz moment? ✨"
              rows={4}
              maxLength={280}
              autoFocus
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz resize-none leading-relaxed"
              style={{ background: '#252540' }}
            />
            <span className="absolute bottom-3 right-4 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {content.length}/280
            </span>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
              {error}
            </div>
          )}

          <button
            onClick={handlePost}
            disabled={!canPost}
            className="fizz-btn-primary w-full py-4 text-base gap-2 disabled:opacity-30"
          >
            {loading
              ? 'Posting...'
              : <><Sparkles className="w-4 h-4" /> Share</>
            }
          </button>
        </div>
      </div>
    </>
  )
}
