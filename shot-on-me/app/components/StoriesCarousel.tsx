'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Plus, Camera } from 'lucide-react'
import { useApiUrl } from '../utils/api'
import StatusIndicator from './StatusIndicator'

interface Story {
  _id: string
  author: {
    _id: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  media: {
    url: string
    type: 'image' | 'video'
  }
  caption?: string
  viewCount: number
  hasViewed: boolean
  reactionCount: number
  createdAt: string
  expiresAt: string
  venue?: {
    _id: string
    name: string
  }
  isCheckIn?: boolean
}

interface StoryGroup {
  author: {
    _id: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  stories: Story[]
  hasUnviewed: boolean
}

interface StoriesCarouselProps {
  onStoryClick: (group: StoryGroup) => void
  onCreateStory: () => void
  onViewProfile?: (userId: string) => void
}

export default function StoriesCarousel({ 
  onStoryClick, 
  onCreateStory,
  onViewProfile 
}: StoriesCarouselProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (token) {
      fetchStories()
    }
    
    // Listen for story creation events to refresh
    const handleStoryCreated = () => {
      fetchStories()
    }
    window.addEventListener('story-created', handleStoryCreated)
    
    return () => {
      window.removeEventListener('story-created', handleStoryCreated)
    }
  }, [token])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/stories`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Group stories by author and mark unviewed
      const groups: StoryGroup[] = (response.data.stories || []).map((group: any) => ({
        ...group,
        hasUnviewed: group.stories.some((s: Story) => !s.hasViewed)
      }))
      
      // Sort: unviewed first, then check-in stories, then by recency
      groups.sort((a, b) => {
        if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1
        const aHasCheckIn = a.stories.some(s => s.isCheckIn)
        const bHasCheckIn = b.stories.some(s => s.isCheckIn)
        if (aHasCheckIn !== bHasCheckIn) return aHasCheckIn ? -1 : 1
        return new Date(b.stories[0].createdAt).getTime() - new Date(a.stories[0].createdAt).getTime()
      })
      
      setStoryGroups(groups)
    } catch (error: any) {
      console.error('Error fetching stories:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Don't show carousel if no stories (except user's own)
  const hasStories = storyGroups.length > 0 || user

  if (!hasStories) return null

  return (
    <div className="w-full bg-black/40 border-b border-primary-500/10 py-3 px-4">
      <div 
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Create Story Button */}
        {user && (
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onCreateStory}
              className="relative w-16 h-16 rounded-full border-2 border-dashed border-primary-500/40 hover:border-primary-500/60 transition-colors flex items-center justify-center bg-black/20 hover:bg-black/40"
            >
              <Plus className="w-6 h-6 text-primary-500" />
            </button>
            <span className="text-xs text-primary-400/70 text-center max-w-[64px] truncate">
              Your Story
            </span>
          </div>
        )}

        {/* Story Circles */}
        {storyGroups.slice(0, 10).map((group) => {
          const latestStory = group.stories[0]
          const isCheckIn = latestStory.isCheckIn
          
          return (
            <div
              key={group.author._id}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
              onClick={() => onStoryClick(group)}
            >
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                    group.hasUnviewed
                      ? 'border-primary-500 ring-2 ring-primary-500/30'
                      : 'border-primary-500/30'
                  } ${isCheckIn ? 'ring-2 ring-yellow-500/40' : ''}`}
                >
                  {latestStory.media?.url ? (
                    <img
                      src={latestStory.media.url}
                      alt={group.author.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : group.author.profilePicture ? (
                    <img
                      src={group.author.profilePicture}
                      alt={group.author.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                      <span className="text-primary-500 font-semibold text-lg">
                        {group.author.firstName[0]}
                      </span>
                    </div>
                  )}
                </div>
                {/* Status indicator for friends */}
                {user && group.author._id !== (user.id || (user as any)?._id) && (
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusIndicator userId={group.author._id} size="sm" />
                  </div>
                )}
                {/* Check-in badge */}
                {isCheckIn && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full border-2 border-black flex items-center justify-center">
                    <span className="text-[10px]">📍</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-primary-400/70 text-center max-w-[64px] truncate">
                {group.author.firstName}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

