'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Heart, MessageCircle, Share2, Camera, Video, MapPin, Users, UserPlus, TrendingUp, Sparkles, CheckCircle2, Clock, X } from 'lucide-react'

import { useApiUrl } from '../utils/api'

interface FeedPost {
  _id: string
  author: {
    _id?: string
    id?: string
    firstName: string
    lastName: string
    profilePicture?: string
    username?: string
  }
  content: string
  media: Array<{ type: string; url: string; thumbnail?: string }>
  likes: Array<{ user: string | { _id: string; firstName: string; profilePicture?: string } }>
  reactions?: Array<{ user: { _id: string; firstName: string; profilePicture?: string }; emoji: string }>
  reactionCounts?: { [emoji: string]: { count: number; users: any[] } }
  userReaction?: string | null
  totalReactions?: number
  comments: Array<{ user: { firstName: string; profilePicture?: string }; content: string; createdAt: string }>
  location?: {
    venue?: { _id: string; name: string }
    coordinates?: { latitude: number; longitude: number }
  }
  checkIn?: {
    venue?: { _id: string; name: string }
    checkedInAt: string
  }
  createdAt: string
}

interface FriendActivity {
  userId: string
  name: string
  profilePicture?: string
  action: 'checked-in' | 'posted' | 'liked'
  venue?: string
  time: string
}

interface FeedTabProps {
  onViewProfile?: (userId: string) => void
}

export default function FeedTab({ onViewProfile }: FeedTabProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [friendActivity, setFriendActivity] = useState<FriendActivity[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([])
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [showPostForm, setShowPostForm] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null)
  const [showFriendInvite, setShowFriendInvite] = useState(false)
  const [invitePhone, setInvitePhone] = useState('')
  const [inviting, setInviting] = useState(false)
  const [friendSuggestions, setFriendSuggestions] = useState<any[]>([])
  // Load showSuggestions preference from localStorage
  const [showSuggestions, setShowSuggestions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showFriendSuggestions')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])

  useEffect(() => {
    if (token) {
      fetchFeed()
      fetchFriendActivity()
      fetchNearbyFriends()
      fetchTrendingVenues()
      fetchFriendSuggestions()
    }
  }, [token])

  // Real-time updates
  useEffect(() => {
    if (!socket) return

    const handleNewPost = (data: any) => {
      fetchFeed()
      fetchFriendActivity()
    }

    const handlePostUpdate = (data: { postId: string; likes: number }) => {
      setPosts(prev => prev.map(post => 
        post._id === data.postId 
          ? { ...post, likes: Array(data.likes).fill({}) as any }
          : post
      ))
    }

    const handleNewComment = (data: { postId: string; comment: any }) => {
      fetchFeed()
    }

    socket.on('new-post', handleNewPost)
    socket.on('post-updated', handlePostUpdate)
    socket.on('new-comment', handleNewComment)

    return () => {
      socket.off('new-post', handleNewPost)
      socket.off('post-updated', handlePostUpdate)
      socket.off('new-comment', handleNewComment)
    }
  }, [socket])

  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_URL}/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPosts(response.data.posts || [])
    } catch (error) {
      console.error('Failed to fetch feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFriendActivity = async () => {
    try {
      // Get recent friend activity from feed
      const response = await axios.get(`${API_URL}/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const posts = response.data.posts || []
      
      // Create activity feed from recent posts
      const activity: FriendActivity[] = posts
        .filter((post: FeedPost) => post.author._id !== user?.id && post.author.id !== user?.id)
        .slice(0, 5)
        .map((post: FeedPost) => ({
          userId: post.author._id || post.author.id || '',
          name: `${post.author.firstName} ${post.author.lastName}`,
          profilePicture: post.author.profilePicture,
          action: post.checkIn ? 'checked-in' : 'posted',
          venue: post.checkIn?.venue?.name || post.location?.venue?.name,
          time: post.createdAt
        }))
      
      setFriendActivity(activity)
    } catch (error) {
      console.error('Failed to fetch friend activity:', error)
    }
  }

  const fetchNearbyFriends = async () => {
    try {
      const response = await axios.get(`${API_URL}/location/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNearbyFriends(response.data.friends || [])
    } catch (error) {
      console.error('Failed to fetch nearby friends:', error)
    }
  }

  const fetchTrendingVenues = async () => {
    try {
      const response = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Sort by follower count or activity
      const venues = (response.data.venues || [])
        .filter((v: any) => v.followerCount > 0)
        .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
        .slice(0, 5)
      setTrendingVenues(venues)
    } catch (error) {
      console.error('Failed to fetch trending venues:', error)
    }
  }

  const fetchFriendSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriendSuggestions(response.data.suggestions || [])
    } catch (error) {
      console.error('Failed to fetch friend suggestions:', error)
    }
  }

  const handleAddFriend = async (friendId: string) => {
    if (!token) {
      alert('Please log in to add friends')
      return
    }

    if (!friendId) {
      console.error('Invalid friendId:', friendId)
      alert('Invalid user ID. Please try again.')
      return
    }

    console.log('Adding friend:', friendId)
    console.log('API URL:', API_URL)

    // Optimistically remove from suggestions for instant feedback
    const previousSuggestions = [...friendSuggestions]
    const addedUser = friendSuggestions.find(s => (s._id || s.id) === friendId)
    
    if (!addedUser) {
      console.error('User not found in suggestions:', friendId, friendSuggestions)
      alert('User not found. Please refresh and try again.')
      return
    }

    setFriendSuggestions(prev => prev.filter(s => (s._id || s.id) !== friendId))

    try {
      console.log('Making API call to:', `${API_URL}/users/friends/${friendId}`)
      
      const response = await axios.post(
        `${API_URL}/users/friends/${friendId}`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      )
      
      console.log('Friend added successfully:', response.data)
      
      // Success - refresh data
      await Promise.all([
        fetchFriendSuggestions(),
        fetchFeed()
      ])
      
      // Show success feedback
      console.log(`✅ Added ${addedUser.firstName} as a friend!`)
    } catch (error: any) {
      console.error('❌ Error adding friend:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error config:', error.config)
      
      // Revert optimistic update on error
      setFriendSuggestions(previousSuggestions)
      
      let errorMessage = 'Failed to add friend'
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage
        console.error('Server error:', errorMessage)
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your internet connection.'
        console.error('No response received:', error.request)
      } else {
        // Error in request setup
        errorMessage = error.message || 'Failed to add friend'
        console.error('Request setup error:', error.message)
      }
      
      // Don't show alert for "already a friend" - just refresh
      if (error.response?.status === 400 && (errorMessage.includes('already') || errorMessage.includes('Already'))) {
        await Promise.all([
          fetchFriendSuggestions(),
          fetchFeed()
        ])
        return
      }
      
      // Show user-friendly error message
      alert(errorMessage)
    }
  }

  const handleCheckIn = async (venueId: string, venueName: string) => {
    if (!token) return
    try {
      // Create a check-in post
      await axios.post(
        `${API_URL}/feed`,
        { 
          content: `Checked in at ${venueName} 🍻`,
          venueId,
          checkIn: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchFeed()
      fetchFriendActivity()
      setSelectedVenue(null)
    } catch (error) {
      console.error('Failed to check in:', error)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      await axios.post(
        `${API_URL}/feed/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchFeed()
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  const handleReaction = async (postId: string, emoji: string) => {
    if (!token) {
      alert('Please log in to react to posts')
      return
    }

    // Optimistically update UI immediately for instant feedback
    const previousPosts = [...posts]
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        const wasReacted = post.userReaction === emoji
        const newReactionCounts = { ...(post.reactionCounts || {}) }
        
        if (wasReacted) {
          // Remove reaction
          if (newReactionCounts[emoji]) {
            newReactionCounts[emoji] = {
              ...newReactionCounts[emoji],
              count: Math.max(0, newReactionCounts[emoji].count - 1)
            }
            if (newReactionCounts[emoji].count === 0) {
              delete newReactionCounts[emoji]
            }
          }
          return { ...post, userReaction: null, reactionCounts: newReactionCounts }
        } else {
          // Add reaction - remove old reaction first
          Object.keys(newReactionCounts).forEach(e => {
            if (newReactionCounts[e] && newReactionCounts[e].count > 0) {
              newReactionCounts[e] = {
                ...newReactionCounts[e],
                count: Math.max(0, newReactionCounts[e].count - 1)
              }
            }
          })
          
          if (!newReactionCounts[emoji]) {
            newReactionCounts[emoji] = { count: 0, users: [] }
          }
          newReactionCounts[emoji] = {
            ...newReactionCounts[emoji],
            count: (newReactionCounts[emoji].count || 0) + 1
          }
          
          return { ...post, userReaction: emoji, reactionCounts: newReactionCounts }
        }
      }
      return post
    }))

    try {
      const response = await axios.post(
        `${API_URL}/feed/${postId}/reaction`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Refresh to get accurate data from server
      fetchFeed()
    } catch (error: any) {
      console.error('Failed to react to post:', error)
      
      // Revert optimistic update on error
      setPosts(previousPosts)
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to react. Please try again.'
      if (error.response?.status !== 401) { // Don't alert on auth errors
        alert(errorMessage)
      }
      // Refresh feed to get correct state
      fetchFeed()
    }
  }

  const handleComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) {
      alert('Please enter a comment')
      return
    }

    try {
      const response = await axios.post(
        `${API_URL}/feed/${postId}/comment`,
        { content: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Optimistically update UI
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: [
              ...post.comments,
              {
                user: {
                  firstName: user?.firstName || '',
                  lastName: user?.lastName || '',
                  profilePicture: user?.profilePicture
                },
                content: commentText.trim(),
                createdAt: new Date().toISOString()
              }
            ]
          }
        }
        return post
      }))
      
      setCommentText('')
      // Keep comment section open to see the new comment
      fetchFeed()
    } catch (error: any) {
      console.error('Failed to comment:', error)
      const errorMessage = error.response?.data?.message || 'Failed to post comment. Please try again.'
      alert(errorMessage)
      // Refresh to get correct state
      fetchFeed()
    }
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim() && !selectedVenue && selectedMedia.length === 0) {
      alert('Please add some content, media, or select a venue to post')
      return
    }
    setPosting(true)

    try {
      const formData = new FormData()
      formData.append('content', newPostContent)
      
      if (selectedVenue) {
        formData.append('venueId', selectedVenue._id || selectedVenue.id)
      }
      
      // Add media files with validation
      selectedMedia.forEach((file, index) => {
        // Validate file size before upload
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File "${file.name || `File ${index + 1}`}" is too large. Maximum size is 50MB.`)
        }
        formData.append('media', file)
      })
      
      const response = await axios.post(
        `${API_URL}/feed`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 120000, // 2 minute timeout for large video uploads
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              console.log(`Upload progress: ${percentCompleted}%`)
            }
          }
        }
      )
      // Reset form
      setNewPostContent('')
      setSelectedVenue(null)
      setSelectedMedia([])
      setMediaPreviews([])
      setShowPostForm(false)
      
      // Refresh feed to show new post
      fetchFeed()
      fetchFriendActivity()
      
      // Scroll to top to see new post
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error: any) {
      console.error('Failed to create post:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create post. Please try again.'
      alert(errorMessage)
    } finally {
      setPosting(false)
    }
  }

  const handleShare = async (postId: string) => {
    try {
      const post = posts.find(p => p._id === postId)
      if (!post) return
      
      const shareUrl = `${window.location.origin}/feed/${postId}`
      const shareText = post.content ? `${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}` : 'Check this out on Shot On Me!'
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${post.author.firstName} ${post.author.lastName} on Shot On Me`,
            text: shareText,
            url: shareUrl,
          })
        } catch (shareError: any) {
          // User cancelled share, fallback to copy
          if (shareError.name !== 'AbortError') {
            throw shareError
          }
        }
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard! Share it with your friends!')
      }
    } catch (error: any) {
      // If clipboard API fails, try fallback
      if (error.name === 'AbortError') {
        return // User cancelled, do nothing
      }
      
      try {
        const post = posts.find(p => p._id === postId)
        const shareUrl = `${window.location.origin}/feed/${postId}`
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Link copied! Share it with your friends!')
      } catch (fallbackError) {
        console.error('Failed to share:', error)
        alert('Unable to share. Please copy the link manually.')
      }
    }
  }

  const handleInviteFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitePhone.trim()) return
    setInviting(true)

    try {
      // In production, this would send an SMS invite
      const inviteLink = `${window.location.origin}?ref=${user?.id}`
      alert(`Invite link: ${inviteLink}\n\nShare this with your friend!`)
      setInvitePhone('')
      setShowFriendInvite(false)
    } catch (error) {
      console.error('Failed to invite friend:', error)
    } finally {
      setInviting(false)
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const isLiked = (post: FeedPost) => {
    return post.likes.some((like: any) => {
      const likeUserId = typeof like.user === 'string' ? like.user : (like.user as any)?._id || (like.user as any)?.id
      const currentUserId = user?.id || (user as any)?._id
      return likeUserId === currentUserId
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400">Loading your feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 bg-black max-w-2xl mx-auto">
      {/* Header with Friend Activity */}
      <div className="bg-black border-b border-primary-500/10 sticky top-16 z-10 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-semibold text-primary-500 tracking-tight mb-1">Feed</h1>
              {nearbyFriends.length > 0 && (
                <p className="text-xs text-primary-400/70 font-light">
                  {nearbyFriends.length} friend{nearbyFriends.length !== 1 ? 's' : ''} nearby
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFriendInvite(true)}
                className="bg-primary-500/10 border border-primary-500/20 text-primary-500 px-3 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span className="text-sm">Invite</span>
              </button>
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="bg-primary-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-primary-600 transition-all"
              >
                Post
              </button>
            </div>
          </div>

          {/* Friend Activity Bar */}
          {friendActivity.length > 0 && (
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {friendActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 bg-black/40 border border-primary-500/15 rounded-full px-3 py-1.5 flex-shrink-0 backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-all"
                  onClick={() => onViewProfile?.(activity.userId)}
                >
                  <div className="w-6 h-6 border border-primary-500/30 rounded-full overflow-hidden">
                    {activity.profilePicture ? (
                      <img src={activity.profilePicture} alt={activity.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                        <span className="text-primary-500 text-xs font-medium">{activity.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs">
                    <span className="text-primary-500 font-semibold">{activity.name.split(' ')[0]}</span>
                    <span className="text-primary-400/80 ml-1 font-light">
                      {activity.action === 'checked-in' ? 'checked in' : 'posted'}
                      {activity.venue && ` at ${activity.venue}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nearby Friends Quick View */}
          {nearbyFriends.length > 0 && (
            <div className="mt-3 flex items-center space-x-2 text-xs text-primary-400">
              <Users className="w-4 h-4" />
              <span>
                {nearbyFriends.slice(0, 3).map(f => f.firstName).join(', ')}
                {nearbyFriends.length > 3 && ` +${nearbyFriends.length - 3} more`} nearby
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Show "Show Suggestions" button if hidden */}
      {!showSuggestions && friendSuggestions.length > 0 && (
        <div className="p-4 border-b border-primary-500/10">
          <button
            onClick={() => {
              setShowSuggestions(true)
              localStorage.setItem('showFriendSuggestions', 'true')
            }}
            className="w-full bg-primary-500/10 border border-primary-500/20 text-primary-500 px-4 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all flex items-center justify-center"
          >
            <Users className="w-4 h-4 mr-2" />
            Show Friend Suggestions
          </button>
        </div>
      )}

      {/* Friend Suggestions */}
      {showSuggestions && friendSuggestions.length > 0 && (
        <div className="p-4 border-b border-primary-500/10 bg-gradient-to-r from-primary-500/5 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-primary-500" />
              <h2 className="text-sm font-semibold text-primary-500">People You May Know</h2>
            </div>
            <button
              onClick={() => {
                setShowSuggestions(false)
                localStorage.setItem('showFriendSuggestions', 'false')
              }}
              className="text-primary-400 hover:text-primary-500 text-xs"
            >
              Hide
            </button>
          </div>
          <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-2">
                {friendSuggestions.slice(0, 5).map((suggestion) => (
                  <div
                    key={suggestion._id || suggestion.id}
                    className="flex flex-col items-center space-y-2 bg-black/40 border border-primary-500/15 rounded-lg p-3 flex-shrink-0 min-w-[100px] backdrop-blur-sm"
                  >
                    <div 
                      className="w-12 h-12 border-2 border-primary-500/30 rounded-full overflow-hidden cursor-pointer hover:border-primary-500 transition-all"
                      onClick={() => onViewProfile?.(suggestion._id || suggestion.id)}
                    >
                      {suggestion.profilePicture ? (
                        <img src={suggestion.profilePicture} alt={suggestion.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                          <span className="text-primary-500 font-medium">
                            {suggestion.firstName?.[0]}{suggestion.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <p 
                      className="text-xs font-semibold text-primary-500 text-center cursor-pointer hover:text-primary-400 transition-all"
                      onClick={() => onViewProfile?.(suggestion._id || suggestion.id)}
                    >
                      {suggestion.firstName}
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const friendId = suggestion._id || suggestion.id
                        if (friendId) {
                          handleAddFriend(friendId)
                        } else {
                          console.error('No friend ID found for suggestion:', suggestion)
                          alert('Unable to add friend - missing user ID')
                        }
                      }}
                      className="bg-primary-500 text-black px-3 py-1 rounded-full text-xs font-medium hover:bg-primary-600 transition-all w-full flex items-center justify-center"
                    >
                      <UserPlus className="w-3 h-3 inline mr-1" />
                      Add
                    </button>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* Trending Venues */}
      {trendingVenues.length > 0 && (
        <div className="p-4 border-b border-primary-500/10">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-primary-500">Trending Venues</h2>
          </div>
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {trendingVenues.map((venue) => (
              <button
                key={venue._id}
                onClick={() => {
                  setSelectedVenue(venue)
                  setShowPostForm(true)
                }}
                className="flex items-center space-x-2 bg-black/50 border border-primary-500/20 rounded-lg px-3 py-2 flex-shrink-0 hover:border-primary-500/50 transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary-500" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-primary-500">{venue.name}</p>
                  <p className="text-xs text-primary-400">{venue.followerCount || 0} followers</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Friend Invite Modal */}
      {showFriendInvite && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-500">Invite Friends</h2>
              <button
                onClick={() => setShowFriendInvite(false)}
                className="text-primary-400 hover:text-primary-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleInviteFriend} className="space-y-4">
              <div>
                <label className="block text-primary-500 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const inviteLink = `${window.location.origin}?ref=${user?.id}`
                    navigator.clipboard.writeText(inviteLink)
                    alert('Invite link copied! Share it anywhere!')
                  }}
                  className="flex-1 bg-primary-500/20 border border-primary-500 text-primary-500 py-3 rounded-lg font-semibold hover:bg-primary-500/30"
                >
                  Copy Link
                </button>
                <button
                  type="submit"
                  disabled={inviting || !invitePhone.trim()}
                  className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Post Form */}
      {showPostForm && (
        <form onSubmit={handlePost} className="bg-black border-b border-primary-500/20 p-4">
          <div className="mb-3">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's happening? Share your moment..."
              className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg mb-3 text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
            {selectedVenue && (
              <div className="flex items-center space-x-2 bg-primary-500/10 border border-primary-500/30 rounded-lg p-2 mb-3">
                <MapPin className="w-4 h-4 text-primary-500" />
                <span className="text-primary-500 text-sm font-semibold">{selectedVenue.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedVenue(null)}
                  className="ml-auto text-primary-400 hover:text-primary-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {mediaPreviews.map((preview, idx) => (
                  <div key={idx} className="relative">
                    {selectedMedia[idx]?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-32 object-cover rounded-lg" controls />
                    ) : (
                      <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMedia(selectedMedia.filter((_, i) => i !== idx))
                        setMediaPreviews(mediaPreviews.filter((_, i) => i !== idx))
                      }}
                      className="absolute top-1 right-1 bg-black/70 text-primary-500 rounded-full p-1 hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              type="button"
              onClick={async () => {
                // Request camera permission first
                try {
                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                    stream.getTracks().forEach(track => track.stop())
                  }
                  
                  // Permission granted, open file picker
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.capture = 'environment' // Use back camera on mobile
                  input.onchange = (e: any) => {
                    const file = e.target.files[0]
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) { // 10MB limit
                        alert('Image size must be less than 10MB')
                        return
                      }
                      setSelectedMedia([...selectedMedia, file])
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setMediaPreviews([...mediaPreviews, event.target.result as string])
                        }
                      }
                      reader.readAsDataURL(file)
                    }
                  }
                  input.click()
                } catch (error: any) {
                  if (error.name === 'NotAllowedError') {
                    alert('Camera permission denied. Please enable camera access in Settings → App Permissions.')
                  } else {
                    // Fallback to file picker without camera
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) { // 10MB limit
                          alert('Image size must be less than 10MB')
                          return
                        }
                        setSelectedMedia([...selectedMedia, file])
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setMediaPreviews([...mediaPreviews, event.target.result as string])
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                    }
                    input.click()
                  }
                }
              }}
              className="flex-1 bg-primary-500/20 border border-primary-500 text-primary-500 py-2 rounded-lg font-semibold hover:bg-primary-500/30 flex items-center justify-center"
            >
              <Camera className="w-4 h-4 mr-2" />
              Photo
            </button>
            <button 
              type="button"
              onClick={async () => {
                try {
                  // Open file picker directly - no need to request camera permission first
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'video/*,video/mp4,video/quicktime,video/x-msvideo'
                  input.multiple = false
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    // Validate file type
                    if (!file.type.startsWith('video/')) {
                      alert('Please select a valid video file')
                      return
                    }
                    
                    // Check file size (50MB limit)
                    const maxSize = 50 * 1024 * 1024
                    if (file.size > maxSize) {
                      alert(`Video size must be less than 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`)
                      return
                    }
                    
                    // Add to selected media
                    setSelectedMedia(prev => [...prev, file])
                    
                    // Create preview
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const result = event.target?.result
                      if (result) {
                        setMediaPreviews(prev => [...prev, result as string])
                      }
                    }
                    reader.onerror = () => {
                      alert('Failed to load video preview')
                    }
                    reader.readAsDataURL(file)
                  }
                  input.click()
                } catch (error: any) {
                  console.error('Error selecting video:', error)
                  alert('Failed to select video. Please try again.')
                }
              }}
              className="flex-1 bg-primary-500/20 border border-primary-500 text-primary-500 py-2 rounded-lg font-semibold hover:bg-primary-500/30 flex items-center justify-center"
            >
              <Video className="w-4 h-4 mr-2" />
              Video
            </button>
            <button 
              type="submit"
              disabled={posting || (!newPostContent.trim() && !selectedVenue && selectedMedia.length === 0)}
              className="flex-1 bg-primary-500 text-black py-2 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Posts */}
      <div className="space-y-4 p-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-primary-500/50 mx-auto mb-4" />
            <p className="text-lg text-primary-400 mb-2">Your feed is empty</p>
            <p className="text-sm text-primary-500/70 mb-6">Start following friends and venues to see posts!</p>
            <button
              onClick={() => setShowFriendInvite(true)}
              className="bg-primary-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-primary-600"
            >
              <UserPlus className="w-5 h-5 inline mr-2" />
              Invite Friends
            </button>
          </div>
        ) : (
          posts.map((post) => {
            const authorId = post.author._id || post.author.id
            const isFriend = (user as any)?.friends?.includes(authorId) || authorId === user?.id
            const liked = post.userReaction === '❤️' || isLiked(post)
            
            return (
              <div key={post._id} className="bg-gradient-to-b from-black via-black to-black/80 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 transition-all shadow-lg">
                {/* Author Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary-500/70 transition-all"
                      onClick={() => {
                        const authorId = post.author._id || post.author.id
                        if (authorId && authorId !== user?.id && authorId !== (user as any)?._id) {
                          onViewProfile?.(authorId)
                        }
                      }}
                    >
                      {post.author.profilePicture ? (
                        <img
                          src={post.author.profilePicture}
                          alt={post.author.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                          <span className="text-primary-500 font-semibold">
                            {post.author.firstName[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p 
                          className="font-semibold text-primary-500 tracking-tight cursor-pointer hover:text-primary-400 transition-all"
                          onClick={() => {
                            const authorId = post.author._id || post.author.id
                            if (authorId && authorId !== user?.id && authorId !== (user as any)?._id) {
                              onViewProfile?.(authorId)
                            }
                          }}
                        >
                          {post.author.firstName} {post.author.lastName}
                        </p>
                        {isFriend && (
                          <span className="text-xs bg-primary-500/10 border border-primary-500/20 text-primary-500 px-2 py-0.5 rounded-full font-medium">
                            Friend
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-primary-400/70 font-light mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{getTimeAgo(post.createdAt)}</span>
                        {post.checkIn?.venue && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Checked in
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Venue/Location Badge */}
                {(post.checkIn?.venue || post.location?.venue) && (
                  <div className="mb-3 flex items-center space-x-2 bg-primary-500/5 border border-primary-500/15 rounded-lg p-2.5">
                    <MapPin className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-primary-500 font-medium text-sm tracking-tight">
                      {post.checkIn?.venue?.name || post.location?.venue?.name}
                    </span>
                    {nearbyFriends.some(f => f.firstName === post.author.firstName) && (
                      <span className="ml-auto text-xs bg-primary-500/10 border border-primary-500/20 text-primary-400 px-2 py-0.5 rounded font-medium">
                        Friend nearby
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                {post.content && (
                  <p className="text-primary-400/90 mb-3 leading-relaxed font-light">{post.content}</p>
                )}

                {/* Media */}
                {post.media && post.media.length > 0 && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    {post.media.map((media, idx) => (
                      <div key={idx} className="mb-2">
                        {media.type === 'image' && (
                          <img
                            src={media.url}
                            alt="Post media"
                            className="w-full rounded-lg max-h-96 object-cover"
                          />
                        )}
                        {media.type === 'video' && (
                          <video
                            src={media.url}
                            controls
                            className="w-full rounded-lg max-h-96"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reactions Display */}
                {post.reactionCounts && Object.keys(post.reactionCounts).length > 0 && (
                  <div className="flex items-center gap-2 pt-2 pb-1 flex-wrap">
                    {Object.entries(post.reactionCounts).map(([emoji, data]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(post._id, emoji)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all ${
                          post.userReaction === emoji
                            ? 'bg-primary-500/20 border border-primary-500/50'
                            : 'bg-primary-500/5 border border-primary-500/10 hover:bg-primary-500/10'
                        }`}
                      >
                        <span className="text-base">{emoji}</span>
                        <span className="text-primary-400 font-medium">{data.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-primary-500/20">
                  <div className="flex items-center space-x-4">
                    {/* Quick Reaction Buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleReaction(post._id, '❤️')}
                        className={`p-2 rounded-full transition-all ${
                          post.userReaction === '❤️'
                            ? 'bg-primary-500/20 text-primary-500'
                            : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                        }`}
                        title="Love"
                      >
                        <span className="text-xl">❤️</span>
                      </button>
                      <button
                        onClick={() => handleReaction(post._id, '👍')}
                        className={`p-2 rounded-full transition-all ${
                          post.userReaction === '👍'
                            ? 'bg-primary-500/20 text-primary-500'
                            : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                        }`}
                        title="Like"
                      >
                        <span className="text-xl">👍</span>
                      </button>
                      <button
                        onClick={() => handleReaction(post._id, '😂')}
                        className={`p-2 rounded-full transition-all ${
                          post.userReaction === '😂'
                            ? 'bg-primary-500/20 text-primary-500'
                            : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                        }`}
                        title="Laugh"
                      >
                        <span className="text-xl">😂</span>
                      </button>
                      <button
                        onClick={() => handleReaction(post._id, '🔥')}
                        className={`p-2 rounded-full transition-all ${
                          post.userReaction === '🔥'
                            ? 'bg-primary-500/20 text-primary-500'
                            : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                        }`}
                        title="Fire"
                      >
                        <span className="text-xl">🔥</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => setSelectedPostId(selectedPostId === post._id ? null : post._id)}
                      className="flex items-center space-x-2 text-primary-400 hover:text-primary-500 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">{post.comments.length}</span>
                    </button>
                    <button 
                      onClick={() => handleShare(post._id)}
                      className="flex items-center space-x-2 text-primary-400 hover:text-primary-500 transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                  {post.checkIn && (
                    <button
                      onClick={() => handleCheckIn(
                        post.checkIn!.venue!._id,
                        post.checkIn!.venue!.name
                      )}
                      className="text-xs bg-primary-500/10 border border-primary-500/20 text-primary-500 px-3 py-1 rounded-full hover:bg-primary-500/20 font-medium"
                    >
                      Check in too
                    </button>
                  )}
                </div>

                {/* Comment Form */}
                {selectedPostId === post._id && (
                  <form onSubmit={(e) => handleComment(post._id, e)} className="mt-3 pt-3 border-t border-primary-500/20">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50"
                      >
                        Post
                      </button>
                    </div>
                  </form>
                )}

                {/* Comments */}
                {post.comments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-primary-500/20 space-y-2">
                    {post.comments.slice(0, 3).map((comment, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <div className="w-6 h-6 border border-primary-500 rounded-full overflow-hidden flex-shrink-0">
                          {comment.user.profilePicture ? (
                            <img src={comment.user.profilePicture} alt={comment.user.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-500/20">
                              <span className="text-primary-500 text-xs font-bold">{comment.user.firstName[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold text-primary-500 text-sm">
                            {comment.user.firstName}
                          </span>
                          <span className="text-primary-300 text-sm ml-2">{comment.content}</span>
                        </div>
                      </div>
                    ))}
                    {post.comments.length > 3 && (
                      <button className="text-xs text-primary-400 hover:text-primary-500">
                        View all {post.comments.length} comments
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
