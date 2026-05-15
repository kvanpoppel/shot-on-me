'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface StoryGroup {
  author: { id: string; firstName: string; lastName: string; profilePicture?: string; username?: string }
  stories: any[]
  hasUnviewed: boolean
}

export default function StoriesRow() {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [viewing, setViewing] = useState<{ groupIdx: number; storyIdx: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [progress, setProgress] = useState(0)

  const userId = user?.id || (user as any)?._id

  const fetchStories = useCallback(async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/revig/stories`, { headers: { Authorization: `Bearer ${token}` } })
      setGroups(res.data.groups || [])
    } catch { /* ignore */ }
  }, [API_URL, token])

  useEffect(() => { fetchStories() }, [fetchStories])

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const uploadRes = await axios.post(`${API_URL}/revig/upload`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      })
      await axios.post(`${API_URL}/revig/stories`, {
        url: uploadRes.data.url,
        publicId: uploadRes.data.publicId,
      }, { headers: { Authorization: `Bearer ${token}` } })
      fetchStories()
    } catch { /* ignore */ } finally {
      setUploading(false)
    }
  }

  const openStory = (groupIdx: number) => {
    setViewing({ groupIdx, storyIdx: 0 })
    setProgress(0)
    markViewed(groups[groupIdx].stories[0]._id)
  }

  const markViewed = async (storyId: string) => {
    try {
      await axios.post(`${API_URL}/revig/stories/${storyId}/view`, {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch { /* ignore */ }
  }

  // Auto-advance stories
  useEffect(() => {
    if (!viewing) { if (progressRef.current) clearInterval(progressRef.current); return }
    setProgress(0)
    if (progressRef.current) clearInterval(progressRef.current)
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          advanceStory()
          return 0
        }
        return p + 2 // 50 steps * 100ms = 5000ms per story
      })
    }, 100)
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [viewing?.groupIdx, viewing?.storyIdx])

  const advanceStory = () => {
    if (!viewing) return
    const group = groups[viewing.groupIdx]
    if (viewing.storyIdx < group.stories.length - 1) {
      const next = viewing.storyIdx + 1
      setViewing({ ...viewing, storyIdx: next })
      markViewed(group.stories[next]._id)
    } else if (viewing.groupIdx < groups.length - 1) {
      const nextGroup = viewing.groupIdx + 1
      setViewing({ groupIdx: nextGroup, storyIdx: 0 })
      markViewed(groups[nextGroup].stories[0]._id)
    } else {
      setViewing(null)
    }
  }

  const retreatStory = () => {
    if (!viewing) return
    if (viewing.storyIdx > 0) {
      setViewing({ ...viewing, storyIdx: viewing.storyIdx - 1 })
    } else if (viewing.groupIdx > 0) {
      const prevGroup = viewing.groupIdx - 1
      setViewing({ groupIdx: prevGroup, storyIdx: 0 })
    }
  }

  const currentStory = viewing ? groups[viewing.groupIdx]?.stories[viewing.storyIdx] : null
  const currentAuthor = viewing ? groups[viewing.groupIdx]?.author : null

  return (
    <>
      {/* Story bubbles row */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-none">
        {/* Add story */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
          disabled={uploading}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)' }}>
            {user?.profilePicture || (user as any)?.revigProfile?.profilePicture ? (
              <img src={(user as any)?.revigProfile?.profilePicture || user?.profilePicture} alt="" className="w-full h-full rounded-2xl object-cover opacity-60" />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center">
              {uploading
                ? <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                : <Plus className="w-5 h-5 text-black" />
              }
            </div>
          </div>
          <span className="text-[10px] text-white/40">Your story</span>
        </button>

        {/* Friend stories */}
        {groups.map((group, i) => {
          const isOwn = group.author.id === userId?.toString()
          if (isOwn) return null
          const name = group.author.firstName || ''
          return (
            <button key={group.author.id} onClick={() => openStory(i)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className="w-14 h-14 rounded-2xl overflow-hidden"
                style={{ padding: 2, background: group.hasUnviewed ? 'linear-gradient(135deg,#C8F135,#FF5F57)' : 'rgba(255,255,255,0.1)' }}
              >
                <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#1A1A2E,#252540)', color: 'white' }}>
                  {group.author.profilePicture
                    ? <img src={group.author.profilePicture} alt="" className="w-full h-full object-cover" />
                    : name[0]
                  }
                </div>
              </div>
              <span className="text-[10px] text-white/40 max-w-[56px] truncate">{name}</span>
            </button>
          )
        })}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAddStory} />

      {/* Story viewer */}
      {viewing && currentStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Progress bars */}
          <div className="flex gap-1 px-4 pt-10 pb-3 flex-shrink-0">
            {groups[viewing.groupIdx].stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: 'white',
                    width: i < viewing.storyIdx ? '100%' : i === viewing.storyIdx ? `${progress}%` : '0%',
                    transition: i === viewing.storyIdx ? 'none' : 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author */}
          <div className="flex items-center gap-3 px-4 pb-4 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}>
              {currentAuthor?.profilePicture
                ? <img src={currentAuthor.profilePicture} alt="" className="w-full h-full object-cover" />
                : currentAuthor?.firstName?.[0]
              }
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{currentAuthor?.firstName} {currentAuthor?.lastName}</p>
              <p className="text-xs text-white/40">Just now</p>
            </div>
            <button onClick={() => setViewing(null)} className="p-2">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Media */}
          <div className="flex-1 relative">
            <img src={currentStory.media?.url} alt="" className="w-full h-full object-contain" />

            {/* Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-8 left-0 right-0 px-6">
                <p className="text-white text-center text-sm font-medium" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
                  {currentStory.caption}
                </p>
              </div>
            )}

            {/* Tap zones */}
            <button className="absolute left-0 top-0 w-1/3 h-full" onClick={retreatStory} />
            <button className="absolute right-0 top-0 w-1/3 h-full" onClick={advanceStory} />
          </div>
        </div>
      )}
    </>
  )
}
