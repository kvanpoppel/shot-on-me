'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Plus, X, Heart, ArrowLeft, ArrowRight, Camera, Video, Image as ImageIcon } from 'lucide-react'
import { useApiUrl } from '../utils/api'

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
}

interface StoryGroup {
  author: {
    _id: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  stories: Story[]
}

interface StoriesTabProps {
  onViewProfile?: (userId: string) => void
}

export default function StoriesTab({ onViewProfile }: StoriesTabProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (token) {
      fetchStories()
    }
  }, [token])

  useEffect(() => {
    // Auto-advance story after 5 seconds
    if (selectedStoryGroup && selectedStoryGroup.stories.length > 0) {
      const timer = setTimeout(() => {
        handleNextStory()
      }, 5000)

      // Progress bar animation
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 0
          return prev + 2 // 2% every 100ms = 5 seconds total
        })
      }, 100)

      return () => {
        clearTimeout(timer)
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
    }
  }, [selectedStoryGroup, currentStoryIndex])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/stories`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStoryGroups(response.data.stories || [])
    } catch (error: any) {
      console.error('Error fetching stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStoryClick = (group: StoryGroup) => {
    setSelectedStoryGroup(group)
    setCurrentStoryIndex(0)
    setProgress(0)
    markStoryAsViewed(group.stories[0]._id)
  }

  const handleNextStory = () => {
    if (!selectedStoryGroup) return

    if (currentStoryIndex < selectedStoryGroup.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1
      setCurrentStoryIndex(nextIndex)
      setProgress(0)
      markStoryAsViewed(selectedStoryGroup.stories[nextIndex]._id)
    } else {
      // Move to next user's stories
      const currentGroupIndex = storyGroups.findIndex(
        g => g.author._id === selectedStoryGroup.author._id
      )
      if (currentGroupIndex < storyGroups.length - 1) {
        const nextGroup = storyGroups[currentGroupIndex + 1]
        setSelectedStoryGroup(nextGroup)
        setCurrentStoryIndex(0)
        setProgress(0)
        markStoryAsViewed(nextGroup.stories[0]._id)
      } else {
        // Close viewer
        closeStoryViewer()
      }
    }
  }

  const handlePrevStory = () => {
    if (!selectedStoryGroup) return

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1)
      setProgress(0)
    } else {
      // Move to previous user's stories
      const currentGroupIndex = storyGroups.findIndex(
        g => g.author._id === selectedStoryGroup.author._id
      )
      if (currentGroupIndex > 0) {
        const prevGroup = storyGroups[currentGroupIndex - 1]
        setSelectedStoryGroup(prevGroup)
        setCurrentStoryIndex(prevGroup.stories.length - 1)
        setProgress(0)
        markStoryAsViewed(prevGroup.stories[prevGroup.stories.length - 1]._id)
      }
    }
  }

  const closeStoryViewer = () => {
    setSelectedStoryGroup(null)
    setCurrentStoryIndex(0)
    setProgress(0)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
  }

  const markStoryAsViewed = async (storyId: string) => {
    try {
      await axios.post(`${API_URL}/stories/${storyId}/view`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Refresh stories to update view counts
      fetchStories()
    } catch (error) {
      console.error('Error marking story as viewed:', error)
    }
  }

  const handleReaction = async (storyId: string) => {
    try {
      await axios.post(`${API_URL}/stories/${storyId}/reaction`, { emoji: '❤️' }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchStories()
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleCreateStory = async () => {
    if (!selectedFile) return

    try {
      setCreating(true)
      const formData = new FormData()
      formData.append('media', selectedFile)
      formData.append('caption', caption)
      formData.append('mediaType', selectedFile.type.startsWith('video/') ? 'video' : 'image')

      await axios.post(`${API_URL}/stories`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      // Reset form
      setSelectedFile(null)
      setPreviewUrl(null)
      setCaption('')
      setShowCreateStory(false)
      
      // Refresh stories
      fetchStories()
    } catch (error: any) {
      console.error('Error creating story:', error)
      alert(error.response?.data?.message || 'Failed to create story')
    } finally {
      setCreating(false)
    }
  }

  const currentStory = selectedStoryGroup?.stories[currentStoryIndex]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading stories...</div>
      </div>
    )
  }

  // Story Viewer
  if (selectedStoryGroup && currentStory) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
          {selectedStoryGroup.stories.map((story, index) => (
            <div key={story._id} className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  index < currentStoryIndex
                    ? 'bg-white'
                    : index === currentStoryIndex
                    ? 'bg-white'
                    : 'bg-gray-600'
                }`}
                style={{
                  width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Story content */}
        <div className="relative h-full flex items-center justify-center">
          {currentStory.media.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media.url}
              className="max-w-full max-h-full object-contain"
              autoPlay
              loop={false}
              playsInline
            />
          ) : (
            <img
              src={currentStory.media.url}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          )}

          {/* Navigation buttons */}
          <button
            onClick={handlePrevStory}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={handleNextStory}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <ArrowRight size={24} />
          </button>

          {/* Story info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={currentStory.author.profilePicture || '/default-avatar.png'}
                alt={currentStory.author.firstName}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <div className="flex-1">
                <div className="text-white font-semibold">
                  {currentStory.author.firstName} {currentStory.author.lastName}
                </div>
                <div className="text-gray-300 text-sm">
                  {currentStory.viewCount} views • {currentStory.reactionCount} reactions
                </div>
              </div>
              <button
                onClick={() => handleReaction(currentStory._id)}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
              >
                <Heart size={24} fill="currentColor" />
              </button>
            </div>
            {currentStory.caption && (
              <p className="text-white text-sm">{currentStory.caption}</p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={closeStoryViewer}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
          >
            <X size={24} />
          </button>
        </div>
      </div>
    )
  }

  // Create Story Modal
  if (showCreateStory) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <button
            onClick={() => {
              setShowCreateStory(false)
              setSelectedFile(null)
              setPreviewUrl(null)
              setCaption('')
            }}
            className="text-white"
          >
            <X size={24} />
          </button>
          <h2 className="text-white font-semibold">Create Story</h2>
          <button
            onClick={handleCreateStory}
            disabled={!selectedFile || creating}
            className="text-blue-500 font-semibold disabled:opacity-50"
          >
            {creating ? 'Posting...' : 'Share'}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {previewUrl ? (
            <>
              {selectedFile?.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  className="max-w-full max-h-96 rounded-lg"
                  controls
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-96 rounded-lg object-contain"
                />
              )}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full mt-4 p-3 bg-gray-800 text-white rounded-lg resize-none"
                rows={3}
              />
            </>
          ) : (
            <div className="text-center">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="story-file-input"
              />
              <label
                htmlFor="story-file-input"
                className="inline-flex flex-col items-center gap-4 p-8 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                  <Camera size={32} className="text-gray-400" />
                </div>
                <div className="text-white font-semibold">Select Photo or Video</div>
                <div className="text-gray-400 text-sm">Choose from your gallery</div>
              </label>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Stories List
  return (
    <div className="h-full bg-gray-900 text-white overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold">Stories</h2>
          <button
            onClick={() => setShowCreateStory(true)}
            className="ml-auto w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        {storyGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No stories yet</div>
            <button
              onClick={() => setShowCreateStory(true)}
              className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Story
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {storyGroups.map((group) => (
              <div
                key={group.author._id}
                onClick={() => handleStoryClick(group)}
                className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <div className="relative">
                  <img
                    src={group.author.profilePicture || '/default-avatar.png'}
                    alt={group.author.firstName}
                    className="w-16 h-16 rounded-full border-2 border-blue-500"
                  />
                  {group.stories.some(s => !s.hasViewed) && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-gray-900" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {group.author.firstName} {group.author.lastName}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {group.stories.length} {group.stories.length === 1 ? 'story' : 'stories'}
                  </div>
                </div>
                <div className="text-gray-400">
                  {group.stories[0].media.type === 'video' ? (
                    <Video size={20} />
                  ) : (
                    <ImageIcon size={20} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

