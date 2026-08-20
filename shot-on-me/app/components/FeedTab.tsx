'use client'

import { showToast } from '../utils/toast'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Heart, MessageCircle, Share2, Camera, Video, MapPin, Users, UserPlus, TrendingUp, Sparkles, CheckCircle2, Clock, X, ArrowLeft, ArrowRight, Flame, Compass, UserCheck, MoreVertical, Flag, Trash2, ThumbsUp, Pencil, Check, Plus } from 'lucide-react'
import UserAvatarButton from './UserAvatarButton'
import StatusIndicator from './StatusIndicator'
import StoriesCarousel from './StoriesCarousel'
import StoryEditor from './StoryEditor'
import BackButton from './BackButton'
import { getInviteLink, shareInvite, getInviteMessage } from '../utils/invite'
import QuickSendDrinkSheet from './QuickSendDrinkSheet'
import RoundModeSheet from './RoundModeSheet'
import FindFriends from './FindFriends'

import { useApiUrl } from '../utils/api'

interface FeedPost {
  _id: string
  author?: {
    _id?: string
    id?: string
    firstName: string
    lastName: string
    profilePicture?: string
    username?: string
  } | null
  venueAuthor?: {
    _id: string
    name: string
    logo?: string
    city?: string
    state?: string
  } | null
  postType?: string
  drinkInfo?: {
    recipientId?: string
    recipientName?: string
    amount?: number
    emoji?: string
    message?: string
  }
  checkInInfo?: {
    venueId?: string
    venueName?: string
    latitude?: number
    longitude?: number
  }
  content: string
  media: Array<{ type: string; url: string; thumbnail?: string }>
  likes: Array<{ user: string | { _id: string; firstName: string; profilePicture?: string } }>
  reactions?: Array<{ user: { _id: string; firstName: string; profilePicture?: string }; emoji: string }>
  reactionCounts?: { [emoji: string]: { count: number; users: any[] } }
  userReaction?: string | null
  userReactions?: string[] // Array of all reactions from current user
  totalReactions?: number
  comments: Array<{ 
    _id?: string
    user: { 
      _id?: string
      firstName: string
      lastName?: string
      profilePicture?: string 
    }
    content: string
    createdAt: string
    replyTo?: string | null
    reactions?: Array<{
      user: { _id?: string; firstName?: string }
      emoji: string
      createdAt: string
    }>
    replies?: Array<{
      _id?: string
      user: { firstName: string; profilePicture?: string }
      content: string
      createdAt: string
      reactions?: Array<{
        user: { _id?: string; firstName?: string }
        emoji: string
        createdAt: string
      }>
    }>
  }>
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
  autoOpenPostForm?: boolean
  onPostFormOpened?: () => void
  onSendDrink?: (userId: string, name?: string) => void
}

export default function FeedTab({ onViewProfile, autoOpenPostForm = false, onPostFormOpened, onSendDrink }: FeedTabProps) {
  const { token, user } = useAuth()
  const aiEnabled = (user as any)?.notificationPreferences?.aiPersonalizationEnabled ?? true
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<any[]>([])
  const [trendingVenues, setTrendingVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [showPostForm, setShowPostForm] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchor, setMentionAnchor] = useState(0)
  const [friendsList, setFriendsList] = useState<any[]>([])
  const postTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentMedia, setCommentMedia] = useState<File | null>(null)
  const [commentMediaPreview, setCommentMediaPreview] = useState<string | null>(null)
  const [commentLocation, setCommentLocation] = useState<{ name: string; placeId: string } | null>(null)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [showLocationSearch, setShowLocationSearch] = useState(false)
  const commentFileRef = useRef<HTMLInputElement>(null)
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string; userName: string } | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [showingReactionPicker, setShowingReactionPicker] = useState<{ postId: string; commentId: string } | null>(null)
  const [posting, setPosting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null)
  const [sendDrinkTarget, setSendDrinkTarget] = useState<{ id: string; name: string; firstName: string; avatar?: string } | null>(null)
  const [showFriendInvite, setShowFriendInvite] = useState(false)
  const [showRoundMode, setShowRoundMode] = useState(false)
  const [invitePhone, setInvitePhone] = useState('')
  const [inviting, setInviting] = useState(false)
  const [friendSuggestions, setFriendSuggestions] = useState<any[]>([])
  const [friendsRow, setFriendsRow] = useState<any[]>([])
  const [friendsRowTab, setFriendsRowTab] = useState<'friends' | 'discover'>('friends')
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<any>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [storyFile, setStoryFile] = useState<File | null>(null)
  const [storyPreview, setStoryPreview] = useState<string | null>(null)
  const [storyCaption, setStoryCaption] = useState('')
  const [creatingStory, setCreatingStory] = useState(false)
  const [showStoryEditor, setShowStoryEditor] = useState(false)
  const storyProgressRef = useRef<NodeJS.Timeout | null>(null)
  const [storyProgress, setStoryProgress] = useState(0)
  const feedContainerRef = useRef<HTMLDivElement>(null)
  
  // Feed enhancement states
  const [feedFilter, setFeedFilter] = useState<'following' | 'trending' | 'nearby'>('following')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [aiSignals, setAiSignals] = useState<{ viewedProfileIds: string[]; addedFriendIds: string[] }>({
    viewedProfileIds: [],
    addedFriendIds: []
  })
  const [commentMenuOpen, setCommentMenuOpen] = useState<{ postId: string; commentId: string } | null>(null)
  const [activePostReactionPicker, setActivePostReactionPicker] = useState<string | null>(null)
  const commentMenuRef = useRef<HTMLDivElement | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null)

  // Auto-open post form when navigating from ProfileTab
  useEffect(() => {
    if (autoOpenPostForm) {
      setShowPostForm(true)
      if (onPostFormOpened) {
        onPostFormOpened()
      }
    }
  }, [autoOpenPostForm, onPostFormOpened])

  // Listen for custom event to open post form
  useEffect(() => {
    const handleOpenPostForm = () => {
      setShowPostForm(true)
    }
    window.addEventListener('open-post-form', handleOpenPostForm)
    return () => window.removeEventListener('open-post-form', handleOpenPostForm)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commentMenuOpen && commentMenuRef.current && !commentMenuRef.current.contains(event.target as Node)) {
        setCommentMenuOpen(null)
      }
      const target = event.target as HTMLElement
      if (activePostReactionPicker && !target.closest('[data-post-reaction-picker]')) {
        setActivePostReactionPicker(null)
      }
      if (postMenuOpen && !target.closest('[data-post-menu]')) {
        setPostMenuOpen(null)
      }
    }

    if (commentMenuOpen || activePostReactionPicker || postMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [commentMenuOpen, activePostReactionPicker, postMenuOpen])

  // Sentinel ref for IntersectionObserver infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)
  const feedFilterRef = useRef(feedFilter)
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { feedFilterRef.current = feedFilter }, [feedFilter])

  // IntersectionObserver — fires when sentinel div enters viewport, works on any scroll container
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMoreRef.current && hasMoreRef.current) {
          loadingMoreRef.current = true
          setLoadingMore(true)
          setPage(prev => {
            fetchFeed(prev + 1, feedFilterRef.current)
            return prev + 1
          })
        }
      },
      { rootMargin: '400px' }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (token) {
      // Fetch critical data first, then non-critical data
      // Show UI immediately - don't block on all data
      setLoading(true)
      setPage(1)
      setHasMore(true)
      
      // Fetch feed first (most important)
      fetchFeed(1, feedFilter)
      
      // Fetch non-critical data in parallel (don't block UI)
      Promise.all([
        fetchAISignals(),
        fetchNearbyFriends(),
        fetchTrendingVenues(),
        fetchFriendSuggestions(),
        axios.get(`${API_URL}/users/friends`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => setFriendsRow(res.data.friends || res.data || []))
          .catch(() => {})
      ]).catch(error => {
        /* silent */
      })
    }
  }, [token, feedFilter, aiEnabled])

  // Real-time updates with granular Socket.io events for optimal performance
  useEffect(() => {
    if (!socket) return

    const handleNewPost = (data: { post: any }) => {
      // Add new post to the top of the feed immediately
      if (data.post) {
        setPosts(prev => {
          // Check if post already exists (prevent duplicates)
          const exists = prev.some(p => p._id === data.post._id)
          if (exists) return prev
          return [data.post, ...prev]
        })
      }
    }

    const handlePostReactionUpdated = (data: { 
      postId: string
      reactionCounts: { [emoji: string]: { count: number; users: any[] } }
      userReaction: string | null
      userReactions?: string[] // Array of all user reactions
      totalReactions: number
    }) => {
      // Update only the specific post that changed - no full refresh needed
      setPosts(prev => prev.map(post => {
        if (post._id === data.postId) {
          return {
            ...post,
            reactionCounts: data.reactionCounts,
            userReaction: data.userReaction,
            userReactions: data.userReactions || (data.userReaction ? [data.userReaction] : []),
            totalReactions: data.totalReactions
          }
        }
        return post
      }))
    }

    const handlePostCommentAdded = (data: { 
      postId: string
      comment: any
      totalComments: number
    }) => {
      // Update only the specific post with the new comment - no full refresh needed
      setPosts(prev => prev.map(post => {
        if (post._id === data.postId) {
          // Check if comment already exists (prevent duplicates)
          const commentExists = post.comments.some(c => c._id === data.comment._id)
          if (commentExists) return post
          
          // If it's a reply, add to parent comment's replies, otherwise add to top level
          if (data.comment.replyTo) {
            return {
              ...post,
              comments: post.comments.map(comment => {
                if (comment._id === data.comment.replyTo) {
                  return {
                    ...comment,
                    replies: [...(comment.replies || []), data.comment]
                  }
                }
                return comment
              })
            }
          }
          
          return {
            ...post,
            comments: [...post.comments, data.comment],
          }
        }
        return post
      }))
    }

    const handleCommentReactionUpdated = (data: {
      postId: string
      commentId: string
      reactionCounts: { [emoji: string]: number }
      userReaction: string | null
      comment: any
    }) => {
      // Update only the specific comment that changed - no full refresh needed
      setPosts(prev => prev.map(post => {
        if (post._id === data.postId) {
          return {
            ...post,
            comments: post.comments.map(comment => {
              if (comment._id === data.commentId) {
                return {
                  ...comment,
                  reactions: data.comment.reactions || comment.reactions,
                  // Update reaction counts if needed
                }
              }
              // Also check nested replies
              if (comment.replies) {
                return {
                  ...comment,
                  replies: comment.replies.map((reply: any) => {
                    if (reply._id === data.commentId) {
                      return {
                        ...reply,
                        reactions: data.comment.reactions || reply.reactions,
                      }
                    }
                    return reply
                  })
                }
              }
              return comment
            })
          }
        }
        return post
      }))
    }

    socket.on('new-post', handleNewPost)
    socket.on('post-reaction-updated', handlePostReactionUpdated)
    socket.on('post-comment-added', handlePostCommentAdded)
    socket.on('comment-reaction-updated', handleCommentReactionUpdated)

    return () => {
      socket.off('new-post', handleNewPost)
      socket.off('post-reaction-updated', handlePostReactionUpdated)
      socket.off('post-comment-added', handlePostCommentAdded)
      socket.off('comment-reaction-updated', handleCommentReactionUpdated)
    }
  }, [socket])

  const fetchFeed = async (pageNum: number = 1, filter?: string) => {
    if (!token) return
    try {
      const currentFilter = filter || feedFilter
      const params: any = { page: pageNum, limit: 10 }
      
      // Add filter parameter
      if (currentFilter !== 'following') {
        params.filter = currentFilter
      }
      
      const response = await axios.get(`${API_URL}/feed`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout: 10000
      })
      
      let newPosts = response.data.posts || []

      // Client-side sort for trending: most reactions first
      if (currentFilter === 'trending') {
        newPosts = [...newPosts].sort((a: any, b: any) => {
          const aReactions = Number(a.totalReactions || 0) + (a.comments?.length || 0)
          const bReactions = Number(b.totalReactions || 0) + (b.comments?.length || 0)
          return bReactions - aReactions
        })
      }

      // AI ranking for "For You" feed
      if (aiEnabled && currentFilter === 'foryou') {
        const viewedSet = new Set(aiSignals.viewedProfileIds || [])
        const addedSet = new Set(aiSignals.addedFriendIds || [])
        const nearbyNames = new Set((nearbyFriends || []).map((f: any) => (f.firstName || '').toLowerCase()))

        const scorePost = (post: FeedPost) => {
          const authorId = (post.author?._id || post.author?.id || '').toString()
          let score = 0

          if (authorId && viewedSet.has(authorId)) score += 24
          if (authorId && addedSet.has(authorId)) score += 20
          if (nearbyNames.has((post.author?.firstName || '').toLowerCase())) score += 14
          if (post.checkIn?.venue?._id) score += 8
          if ((post.comments?.length || 0) > 0) score += Math.min(10, post.comments.length * 2)
          const totalReactions: number = Number(post.totalReactions || 0)
          if (totalReactions > 0) score += Math.min(12, totalReactions)

          // Slight recency boost
          const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60))
          score += Math.max(0, 10 - ageHours * 0.5)

          return score
        }

        newPosts = [...newPosts].sort((a, b) => scorePost(b) - scorePost(a))
      }
      
      if (pageNum === 1) {
        setPosts(newPosts)
      } else {
        // Filter out duplicates when appending posts
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p._id))
          const uniqueNewPosts = newPosts.filter((p: any) => !existingIds.has(p._id))
          return [...prev, ...uniqueNewPosts]
        })
      }
      
      setHasMore(newPosts.length === 10) // If we got 10 posts, there might be more
    } catch (error: any) {
      if (pageNum === 1) {
        setPosts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchNearbyFriends = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/location/friends`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      setNearbyFriends(response.data.friends || [])
    } catch (error) {
      setNearbyFriends([])
    }
  }

  const fetchTrendingVenues = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      // Show all venues, sort by follower count or activity (venues with 0 followers will show too)
      const venues = (response.data.venues || [])
        .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
        .slice(0, 10) // Show more venues
      setTrendingVenues(venues)
    } catch (error) {
      setTrendingVenues([])
    }
  }

  const fetchFriendSuggestions = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/users/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })
      setFriendSuggestions(response.data.suggestions || [])
    } catch (error) {
      setFriendSuggestions([])
    }
  }

  const fetchAISignals = async () => {
    if (!token || !aiEnabled) {
      setAiSignals({ viewedProfileIds: [], addedFriendIds: [] })
      return
    }
    try {
      const response = await axios.get(`${API_URL}/users/me/ai-signals`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      })
      const signals = response.data?.aiSignals || {}
      setAiSignals({
        viewedProfileIds: Array.isArray(signals.viewedProfileIds) ? signals.viewedProfileIds : [],
        addedFriendIds: Array.isArray(signals.addedFriendIds) ? signals.addedFriendIds : []
      })
    } catch (error) {
      /* silent */
    }
  }

  const persistAISignals = async (nextSignals: { viewedProfileIds: string[]; addedFriendIds: string[] }) => {
    if (!token || !aiEnabled) return
    try {
      await axios.put(
        `${API_URL}/users/me/ai-signals`,
        nextSignals,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      )
    } catch (error) {
      /* silent */
    }
  }

  const trackProfileViewForAI = (userId: string) => {
    if (!userId || !aiEnabled) return
    const nextSignals = {
      viewedProfileIds: [userId, ...aiSignals.viewedProfileIds.filter((id) => id !== userId)].slice(0, 30),
      addedFriendIds: aiSignals.addedFriendIds
    }
    setAiSignals(nextSignals)
    void persistAISignals(nextSignals)
  }

  const trackFriendAddForAI = (userId: string) => {
    if (!userId || !aiEnabled) return
    const nextSignals = {
      viewedProfileIds: aiSignals.viewedProfileIds,
      addedFriendIds: [userId, ...aiSignals.addedFriendIds.filter((id) => id !== userId)].slice(0, 30)
    }
    setAiSignals(nextSignals)
    void persistAISignals(nextSignals)
  }

  const handleAddFriend = async (friendId: string) => {
    if (!token) {
      showToast('Please log in to add friends')
      return
    }

    if (!friendId) {
      showToast('Invalid user ID. Please try again.')
      return
    }

    // Adding friend...

    // Optimistically remove from suggestions for instant feedback
    const previousSuggestions = [...friendSuggestions]
    const addedUser = friendSuggestions.find(s => (s._id || s.id) === friendId)
    
    if (!addedUser) {
      showToast('User not found. Please refresh and try again.')
      return
    }

    setFriendSuggestions(prev => prev.filter(s => (s._id || s.id) !== friendId))

    try {
      // Making API call to add friend
      
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
      
      trackFriendAddForAI(friendId)

      // Success - refresh suggestions
      await fetchFriendSuggestions()
    } catch (error: any) {
      // Revert optimistic update on error
      setFriendSuggestions(previousSuggestions)

      let errorMessage = 'Failed to add friend'

      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your internet connection.'
      } else {
        // Error in request setup
        errorMessage = error.message || 'Failed to add friend'
      }
      
      // Don't show alert for "already a friend" - just refresh suggestions
      if (error.response?.status === 400 && (errorMessage.includes('already') || errorMessage.includes('Already'))) {
        await fetchFriendSuggestions()
        return
      }
      
      // Show user-friendly error message
      showToast(errorMessage)
    }
  }

  const handleCheckIn = async (venueId: string, venueName: string) => {
    if (!token) return
    try {
      // Create a check-in post
      const response = await axios.post(
        `${API_URL}/feed`,
        {
          content: `Checked in at ${venueName} 🍻`,
          venueId,
          checkIn: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Prepend check-in post locally instead of refetching entire feed
      const newPost = response.data.post
      if (newPost) {
        setPosts(prev => [newPost, ...prev])
      }
      setSelectedVenue(null)
    } catch (error) {
      /* silent */
    }
  }

  const handleLike = async (postId: string) => {
    if (!token) return
    
    // Optimistic update for instant feedback
    const previousPosts = [...posts]
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        const isLiked = post.likes.some(like => {
          const likeUserId = typeof like.user === 'string' ? like.user : like.user?._id
          const currentUserId = user?.id || (user as any)?._id
          return likeUserId === currentUserId
        })
        
        if (isLiked) {
          // Unlike - remove user's like
          return {
            ...post,
            likes: post.likes.filter(like => {
              const likeUserId = typeof like.user === 'string' ? like.user : like.user?._id
              const currentUserId = user?.id || (user as any)?._id
              return likeUserId !== currentUserId
            })
          }
        } else {
          // Like - add user's like
          return {
            ...post,
            likes: [...post.likes, { user: user?.id || (user as any)?._id }]
          }
        }
      }
      return post
    }))
    
    try {
      await axios.post(
        `${API_URL}/feed/${postId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      )
      // Server syncs via socket — optimistic update already applied
    } catch (error) {
      // Revert optimistic update on error
      setPosts(previousPosts)
    }
  }

  const handleReaction = async (postId: string, emoji: string) => {
    if (!token) {
      showToast('Please log in to react to posts')
      return
    }

    // Optimistically update UI immediately for instant feedback
    // Support multiple reactions from same user
    const previousPosts = [...posts]
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        const userReactions = post.userReactions || (post.userReaction ? [post.userReaction] : [])
        const wasReacted = userReactions.includes(emoji)
        const newReactionCounts = { ...(post.reactionCounts || {}) }
        const newUserReactions = [...userReactions]
        
        if (wasReacted) {
          // Remove this specific reaction (toggle off)
          if (newReactionCounts[emoji]) {
            newReactionCounts[emoji] = {
              ...newReactionCounts[emoji],
              count: Math.max(0, newReactionCounts[emoji].count - 1)
            }
            if (newReactionCounts[emoji].count === 0) {
              delete newReactionCounts[emoji]
            }
          }
          const filteredReactions = newUserReactions.filter(r => r !== emoji)
          return { 
            ...post, 
            userReactions: filteredReactions,
            userReaction: filteredReactions.length > 0 ? filteredReactions[0] : null,
            reactionCounts: newReactionCounts 
          }
        } else {
          // Add new reaction (allow multiple reactions from same user)
          if (!newReactionCounts[emoji]) {
            newReactionCounts[emoji] = { count: 0, users: [] }
          }
          newReactionCounts[emoji] = {
            ...newReactionCounts[emoji],
            count: (newReactionCounts[emoji].count || 0) + 1
          }
          
          if (!newUserReactions.includes(emoji)) {
            newUserReactions.push(emoji)
          }
          
          return { 
            ...post, 
            userReactions: newUserReactions,
            userReaction: newUserReactions[0], // First for backward compatibility
            reactionCounts: newReactionCounts 
          }
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
      
      // Update with server response for accurate state
      if (response.data.reactionCounts) {
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            return {
              ...p,
              reactionCounts: response.data.reactionCounts,
              userReactions: response.data.userReactions || (response.data.userReaction ? [response.data.userReaction] : []),
              userReaction: response.data.userReaction,
              totalReactions: response.data.totalReactions || p.totalReactions
            }
          }
          return p
        }))
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setPosts(previousPosts)

      const errorMessage = error.response?.data?.message || error.message || 'Failed to react. Please try again.'
      if (error.response?.status !== 401) { // Don't alert on auth errors
        showToast(errorMessage)
      }
    }
  }

  const handleComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !token) {
      return
    }

    const commentContent = commentText.trim()
    const previousPosts = [...posts]
    
    // Optimistically update UI for instant feedback
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        const newComment = {
          _id: `temp-${Date.now()}`, // Temporary ID
          user: {
            _id: user?.id || (user as any)?._id,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            profilePicture: user?.profilePicture
          },
          content: commentContent,
          createdAt: new Date().toISOString(),
          replyTo: replyingTo?.commentId || null,
          reactions: [],
          replies: []
        }
        
        // If replying, add to parent comment's replies, otherwise add to top level
        if (replyingTo) {
          return {
            ...post,
            comments: post.comments.map(comment => {
              if (comment._id === replyingTo.commentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment]
                }
              }
              return comment
            })
          }
        }
        
        return {
          ...post,
          comments: [...post.comments, newComment]
        }
      }
      return post
    }))
    
    // Clear input immediately
    setCommentText('')
    const previousReplyingTo = replyingTo
    const prevMedia = commentMedia
    const prevLocation = commentLocation
    setReplyingTo(null)
    setCommentMedia(null)
    setCommentMediaPreview(null)
    setCommentLocation(null)
    setShowLocationSearch(false)

    try {
      const formData = new FormData()
      formData.append('content', commentContent)
      if (previousReplyingTo?.commentId) formData.append('replyTo', previousReplyingTo.commentId)
      if (prevMedia) formData.append('media', prevMedia)
      if (prevLocation) {
        formData.append('locationName', prevLocation.name)
        formData.append('locationPlaceId', prevLocation.placeId)
      }
      const response = await axios.post(
        `${API_URL}/feed/${postId}/comment`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          timeout: 30000
        }
      )
      
      // Update with server response - add the new comment properly
      if (response.data.comment) {
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            const newComment = response.data.comment;
            // Check if comment already exists
            const exists = p.comments.some(c => c._id === newComment._id);
            if (exists) return p;
            
            // If it's a reply, add to parent, otherwise add to top level
            if (newComment.replyTo) {
              return {
                ...p,
                comments: p.comments.map(comment => {
                  if (comment._id === newComment.replyTo || comment._id?.toString() === newComment.replyTo?.toString()) {
                    return {
                      ...comment,
                      replies: [...(comment.replies || []), newComment]
                    }
                  }
                  return comment
                })
              }
            }
            
            return {
              ...p,
              comments: [...p.comments, newComment]
            }
          }
          return p
        }))
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setPosts(previousPosts)
      setCommentText(commentContent)
      setReplyingTo(previousReplyingTo)
      
      const errorMessage = error.response?.data?.message || 'Failed to post comment. Please try again.'
      showToast(errorMessage)
    }
  }

  const toggleCommentsExpanded = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  const handleReply = (postId: string, commentId: string, userName: string) => {
    // Open comment section if not already open
    if (selectedPostId !== postId) {
      setSelectedPostId(postId)
    }
    setReplyingTo({ postId, commentId, userName })
    setCommentText(`@${userName} `)
    // Scroll to comment form
    setTimeout(() => {
      const commentForm = document.querySelector(`[data-post-id="${postId}"]`)
      if (commentForm) {
        commentForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 100)
  }

  const handleCommentReaction = async (postId: string, commentId: string, emoji: string) => {
    if (!token) return
    
    try {
      const response = await axios.post(
        `${API_URL}/feed/${postId}/comment/${commentId}/reaction`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Update the post with new reaction data
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: post.comments.map(comment => {
              if (comment._id === commentId) {
                return {
                  ...comment,
                  reactions: response.data.comment.reactions || [],
                  reactionCounts: response.data.reactionCounts,
                  userReaction: response.data.userReaction
                }
              }
              // Also update nested replies
              if (comment.replies) {
                return {
                  ...comment,
                  replies: comment.replies.map(reply => {
                    if (reply._id === commentId) {
                      return {
                        ...reply,
                        reactions: response.data.comment.reactions || [],
                        reactionCounts: response.data.reactionCounts,
                        userReaction: response.data.userReaction
                      }
                    }
                    return reply
                  })
                }
              }
              return comment
            })
          }
        }
        return post
      }))
      
      setShowingReactionPicker(null)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to react. Please try again.'
      showToast(errorMessage)
    }
  }

  const getCommentReactionCounts = (comment: any) => {
    if (!comment.reactions || comment.reactions.length === 0) {
      return { '❤️': 0, '👍': 0, '😂': 0, '😮': 0, '😢': 0, '🔥': 0, '👏': 0, '🎉': 0 }
    }
    const counts: { [key: string]: number } = { '❤️': 0, '👍': 0, '😂': 0, '😮': 0, '😢': 0, '🔥': 0, '👏': 0, '🎉': 0 }
    comment.reactions.forEach((r: any) => {
      if (counts.hasOwnProperty(r.emoji)) {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1
      }
    })
    return counts
  }

  const getUserCommentReaction = (comment: any) => {
    if (!comment.reactions) return null
    const userId = user?.id || (user as any)?._id
    const reaction = comment.reactions.find((r: any) => {
      const reactionUserId = r.user?._id || r.user?._id?.toString() || r.user?.toString()
      return reactionUserId === userId
    })
    return reaction?.emoji || null
  }

  // Load friends list for mention picker when post form opens
  useEffect(() => {
    if (!showPostForm || !token || friendsList.length > 0) return
    axios.get(`${API_URL}/users/friends`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setFriendsList(res.data.friends || res.data || []))
      .catch(() => {})
  }, [showPostForm, token, API_URL])

  const handlePostContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNewPostContent(val)
    const cursor = e.target.selectionStart ?? val.length
    // Detect any word being typed at cursor (no @ needed)
    const textBeforeCursor = val.slice(0, cursor)
    const wordMatch = textBeforeCursor.match(/(\w{2,})$/)
    if (wordMatch) {
      setMentionQuery(wordMatch[1])
      setMentionAnchor(cursor - wordMatch[1].length)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (friend: any) => {
    const firstName = friend.firstName || friend.name?.split(' ')[0] || ''
    const tag = `@${firstName} `
    const before = newPostContent.slice(0, mentionAnchor)
    const after = newPostContent.slice(mentionAnchor + (mentionQuery?.length ?? 0))
    const updated = before + tag + after
    setNewPostContent(updated)
    setMentionQuery(null)
    setTimeout(() => {
      if (postTextareaRef.current) {
        const pos = before.length + tag.length
        postTextareaRef.current.focus()
        postTextareaRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  const mentionResults = mentionQuery !== null && mentionQuery.length >= 2
    ? friendsList.filter(f => {
        const q = mentionQuery.toLowerCase()
        return (
          (f.firstName || '').toLowerCase().startsWith(q) ||
          (f.lastName || '').toLowerCase().startsWith(q) ||
          (f.name || '').toLowerCase().startsWith(q)
        )
      }).slice(0, 6)
    : []

  const handleCommentMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCommentMedia(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCommentMediaPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 2) { setLocationResults([]); return }
    try {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment&key=${key}`)
      const data = await res.json()
      setLocationResults(data.predictions?.slice(0, 5) || [])
    } catch { setLocationResults([]) }
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim() && !selectedVenue && selectedMedia.length === 0) {
      showToast('Please add some content, media, or select a venue to post')
      return
    }
    setPosting(true)
    setUploadProgress(0)

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
              setUploadProgress(percentCompleted)
            }
          }
        }
      )
      // Reset form
      setNewPostContent('')
      setSelectedVenue(null)
      setSelectedMedia([])
      setMediaPreviews([])
      setMentionQuery(null)
      setShowPostForm(false)

      // Prepend new post locally instead of refetching entire feed
      const newPost = response.data.post
      if (newPost) {
        setPosts(prev => [newPost, ...prev])
      }

      // Scroll to top to see new post
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create post. Please try again.'
      showToast(errorMessage)
    } finally {
      setPosting(false)
      setUploadProgress(0)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!token) {
      showToast('Please log in to delete posts')
      return
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    // Optimistically remove from UI
    const previousPosts = [...posts]
    setPosts(prev => prev.filter(p => p._id !== postId))

    try {
      await axios.delete(`${API_URL}/feed/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Show success feedback
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
      toast.textContent = 'Post deleted successfully'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (error: any) {
      // Revert optimistic update
      setPosts(previousPosts)
      showToast(error.response?.data?.message || 'Failed to delete post. Please try again.')
    }
  }

  const handleReportPost = async (postId: string) => {
    if (!token) {
      showToast('Please log in to report posts')
      return
    }

    const reason = prompt('Why are you reporting this post?\n\n1. Spam\n2. Harassment\n3. Inappropriate content\n4. Other\n\nPlease enter the number or reason:')
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await axios.post(
        `${API_URL}/feed/${postId}/report`,
        { reason: reason.trim(), details: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Show success feedback
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
      toast.textContent = 'Report submitted. Thank you for helping keep our community safe.'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 4000)
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to submit report. Please try again.')
    }
  }

  const handleEditPost = async (postId: string) => {
    if (!token || !editContent.trim()) return

    const previousPosts = [...posts]
    // Optimistic update
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, content: editContent.trim() } : p))
    setEditingPostId(null)

    try {
      await axios.put(`${API_URL}/feed/${postId}`, { content: editContent.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
      toast.textContent = 'Post updated'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (error: any) {
      setPosts(previousPosts)
      showToast(error.response?.data?.message || 'Failed to update post.')
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!token) {
      showToast('Please log in to delete comments')
      return
    }

    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return
    }

    // Optimistically remove from UI
    const previousPosts = [...posts]
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        return {
          ...post,
          comments: post.comments.filter(c => c._id !== commentId)
        }
      }
      return post
    }))

    try {
      await axios.delete(`${API_URL}/feed/${postId}/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Show success feedback
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
      toast.textContent = 'Comment deleted successfully'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (error: any) {
      // Revert optimistic update
      setPosts(previousPosts)
      showToast(error.response?.data?.message || 'Failed to delete comment. Please try again.')
    }
  }

  const handleReportComment = async (postId: string, commentId: string) => {
    if (!token) {
      showToast('Please log in to report comments')
      return
    }

    const reason = prompt('Why are you reporting this comment?\n\n1. Spam\n2. Harassment\n3. Inappropriate content\n4. Other\n\nPlease enter the number or reason:')
    if (!reason || !reason.trim()) {
      return
    }

    try {
      await axios.post(
        `${API_URL}/feed/${postId}/comment/${commentId}/report`,
        { reason: reason.trim(), details: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Show success feedback
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
      toast.textContent = 'Report submitted. Thank you for helping keep our community safe.'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 4000)
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to submit report. Please try again.')
    }
  }

  const handleShare = async (postId: string) => {
    try {
      const post = posts.find(p => p._id === postId)
      if (!post) {
        showToast('Unable to share: Post not found')
        return
      }
      
      const shareUrl = `${window.location.origin}/feed/${postId}`
      const shareText = post.content ? `${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}` : 'Check this out on Shot On Me!'
      
      // Try Web Share API first (works on mobile and modern browsers)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${post.venueAuthor?.name || `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim()} on Shot On Me`,
            text: shareText,
            url: shareUrl,
          })
          // Success - user shared via native share dialog
          return
        } catch (shareError: any) {
          // User cancelled share - this is fine, just return
          if (shareError.name === 'AbortError' || shareError.name === 'NotAllowedError') {
            return
          }
          // Other error - fall through to clipboard
          /* silent */
        }
      }
      
      // Fallback: Copy to clipboard
      try {
        // Check if clipboard API is available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl)
          // Show success feedback
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
          toast.textContent = 'Link copied to clipboard!'
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.remove()
          }, 3000)
        } else {
          // Fallback for older browsers - use textarea method
          const textarea = document.createElement('textarea')
          textarea.value = shareUrl
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          try {
            document.execCommand('copy')
            const toast = document.createElement('div')
            toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
            toast.textContent = 'Link copied to clipboard!'
            document.body.appendChild(toast)
            setTimeout(() => {
              toast.remove()
            }, 3000)
          } catch (err) {
            // Last resort: show the URL in a prompt
            prompt('Copy this link to share:', shareUrl)
          } finally {
            document.body.removeChild(textarea)
          }
        }
      } catch (clipboardError: any) {
        // Last resort: show the URL in a prompt
        prompt('Copy this link to share:', shareUrl)
      }
    } catch (error: any) {
      showToast('Unable to share. Please try again or copy the link manually.')
    }
  }

  const handleInviteFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitePhone.trim()) {
      showToast('Please enter a phone number')
      return
    }

    // Validate phone number format
    const cleanNumber = invitePhone.replace(/\D/g, '')
    if (cleanNumber.length < 10) {
      showToast('Please enter a valid phone number (at least 10 digits)')
      return
    }

    setInviting(true)

    try {
      const userId = user?.id || (user as any)?._id
      const inviteLink = await getInviteLink(userId)
      const userName = user?.firstName || user?.name || ''
      const message = getInviteMessage(userName)

      // Format phone number for SMS (ensure it has + prefix)
      let phoneNumber = invitePhone.trim()
      if (!phoneNumber.startsWith('+')) {
        // If it's a 10-digit number, assume US and add +1
        const digits = phoneNumber.replace(/\D/g, '')
        if (digits.length === 10) {
          phoneNumber = '+1' + digits
        } else {
          phoneNumber = '+' + digits
        }
      }

      // Send SMS invitation
      const result = await shareInvite(inviteLink, message, {
        method: 'sms',
        phoneNumber: phoneNumber
      })

      if (result.success) {
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-4 py-3 rounded-lg shadow-lg font-semibold text-sm max-w-[90vw] text-center'
        toast.textContent = 'Opening SMS app to send invitation...'
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.remove()
        }, 3000)

        setInvitePhone('')
        setShowFriendInvite(false)
      } else {
        showToast(result.error || 'Failed to send invitation. Please try again.')
      }
    } catch (error: any) {
      showToast('Failed to send invitation. Please try again or copy the link manually.')
    } finally {
      setInviting(false)
    }
  }

  // Memoized time formatting function for better performance
  const getTimeAgo = useCallback((date: string) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }, [])

  const isLiked = (post: FeedPost) => {
    return post.likes.some((like: any) => {
      const likeUserId = typeof like.user === 'string' ? like.user : (like.user as any)?._id || (like.user as any)?.id
      const currentUserId = user?.id || (user as any)?._id
      return likeUserId === currentUserId
    })
  }

  // Story viewer handlers
  const handleCloseStory = useCallback(() => {
    setSelectedStoryGroup(null)
    setCurrentStoryIndex(0)
    setStoryProgress(0)
    if (storyProgressRef.current) {
      clearInterval(storyProgressRef.current)
    }
  }, [])

  const handleStoryClick = (group: any) => {
    setSelectedStoryGroup(group)
    setCurrentStoryIndex(0)
    setStoryProgress(0)
  }

  const handlePrevStory = () => {
    if (!selectedStoryGroup) return
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1)
      setStoryProgress(0)
    }
  }

  // Story progress animation - MUST be before any early returns
  useEffect(() => {
    if (selectedStoryGroup) {
      storyProgressRef.current = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            // Move to next story
            setCurrentStoryIndex((currentIdx: number) => {
              if (currentIdx < selectedStoryGroup.stories.length - 1) {
                return currentIdx + 1
              } else {
                // Close viewer when done
                handleCloseStory()
                return 0
              }
            })
            setStoryProgress(0)
            return 0
          }
          return prev + 2 // 2% every 100ms = 5 seconds
        })
      }, 100)
      return () => {
        if (storyProgressRef.current) {
          clearInterval(storyProgressRef.current)
        }
      }
    }
  }, [selectedStoryGroup, handleCloseStory])

  const handleNextStory = () => {
    if (!selectedStoryGroup) return
    if (currentStoryIndex < selectedStoryGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1)
      setStoryProgress(0)
    } else {
      handleCloseStory()
    }
  }

  // Early return AFTER all hooks
  // Improved loading state with skeleton screens for better UX
  if (loading) {
    return (
      <div className="min-h-screen pb-14 bg-black max-w-2xl mx-auto pt-16">
        {/* Stories skeleton */}
        <div className="p-4 border-b border-primary-500/10">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary-500/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Posts skeleton */}
        <div className="p-4 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-black/40 border border-primary-500/10 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-500/10 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-primary-500/10 rounded animate-pulse mb-2" />
                  <div className="h-3 w-16 bg-primary-500/10 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-48 bg-primary-500/10 rounded-lg animate-pulse mb-4" />
              <div className="flex gap-4">
                <div className="h-6 w-16 bg-primary-500/10 rounded animate-pulse" />
                <div className="h-6 w-16 bg-primary-500/10 rounded animate-pulse" />
                <div className="h-6 w-16 bg-primary-500/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={feedContainerRef}
      className="min-h-screen pb-14 bg-black max-w-2xl mx-auto pt-16"
    >
      {/* Stories Carousel */}
      <StoriesCarousel
        onStoryClick={handleStoryClick}
        onCreateStory={() => setShowCreateStory(true)}
        onViewProfile={onViewProfile}
      />

      {/* Simplified Header - Filter banner + actions */}
      <div className="bg-black border-b border-primary-500/10 backdrop-blur-sm sticky top-0 z-30">
        <div className="p-3">
          <div className="flex justify-between items-center gap-2">
            {/* Horizontal scrollable filter banner */}
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-1 pt-0.5 flex-nowrap">
                {[
                  { id: 'following', label: 'Following', icon: UserCheck },
                  { id: 'trending', label: 'Trending', icon: Flame },
                  { id: 'nearby', label: 'Nearby', icon: Compass }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setFeedFilter(id as any)
                      setPage(1)
                      setHasMore(true)
                      setLoading(true)
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                      feedFilter === id
                        ? 'bg-primary-500 text-black'
                        : 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-find-friends'))}
                className="bg-primary-500/10 border border-primary-500/20 text-primary-500 p-2 rounded-lg hover:bg-primary-500/20 transition-all flex items-center gap-1.5 font-medium text-sm"
                title="Friends"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowRoundMode(true)}
                className="bg-primary-500/10 border border-primary-500/20 text-primary-500 px-2.5 py-2 rounded-lg hover:bg-primary-500/20 transition-all flex items-center gap-1.5 font-medium text-sm"
                title="Round Mode — send a drink to everyone"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Round</span>
              </button>
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="bg-primary-500 text-black px-3 py-2 rounded-lg font-medium hover:bg-primary-600 transition-all text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Friends / Discover Row */}
      {(friendsRow.length > 0 || friendSuggestions.length > 0) && (
        <div className="px-4 py-3 border-b border-primary-500/10">
          {/* Tab toggle + search */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFriendsRowTab('friends')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                  friendsRowTab === 'friends' ? 'bg-primary-500 text-black' : 'text-primary-400/50 hover:text-primary-400'
                }`}
              >Friends</button>
              <button
                onClick={() => setFriendsRowTab('discover')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                  friendsRowTab === 'discover' ? 'bg-primary-500 text-black' : 'text-primary-400/50 hover:text-primary-400'
                }`}
              >Discover</button>
            </div>
            <button onClick={() => setShowFindFriends(true)} className="flex items-center gap-1 text-xs text-primary-400/50 hover:text-primary-500 transition-colors">
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Friends row */}
          {friendsRowTab === 'friends' && friendsRow.length > 0 && (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {friendsRow.map((friend: any) => (
                <div
                  key={friend._id || friend.id}
                  onClick={() => onViewProfile?.(friend._id || friend.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer w-14"
                >
                  <div className="w-12 h-12 border-2 border-primary-500/30 rounded-full overflow-hidden">
                    {friend.profilePicture ? (
                      <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                        <span className="text-primary-500 font-medium text-xs">{friend.firstName?.[0]}{friend.lastName?.[0]}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-primary-400/70 font-medium text-center truncate w-full">{friend.firstName}</p>
                </div>
              ))}
            </div>
          )}
          {friendsRowTab === 'friends' && friendsRow.length === 0 && (
            <button onClick={() => setShowFindFriends(true)} className="w-full text-center py-3">
              <p className="text-xs text-primary-400/40">Find friends to get started</p>
            </button>
          )}

          {/* Discover row */}
          {friendsRowTab === 'discover' && friendSuggestions.length > 0 && (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {friendSuggestions.map((suggestion) => (
                <div
                  key={suggestion._id || suggestion.id}
                  className="flex-shrink-0 flex flex-col items-center gap-1 w-14"
                >
                  <div
                    className="w-12 h-12 border-2 border-primary-500/20 rounded-full overflow-hidden cursor-pointer"
                    onClick={() => onViewProfile?.(suggestion._id || suggestion.id)}
                  >
                    {suggestion.profilePicture ? (
                      <img src={suggestion.profilePicture} alt={suggestion.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                        <span className="text-primary-500 font-medium text-xs">{suggestion.firstName?.[0]}{suggestion.lastName?.[0]}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-primary-400/70 font-medium text-center truncate w-full">{suggestion.firstName}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddFriend(suggestion._id || suggestion.id)
                    }}
                    className="text-[9px] font-bold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full"
                  >Add</button>
                </div>
              ))}
            </div>
          )}
          {friendsRowTab === 'discover' && friendSuggestions.length === 0 && (
            <p className="text-xs text-primary-400/30 text-center py-2">No suggestions right now</p>
          )}
        </div>
      )}

      {/* Trending Venues section removed — use Trending filter tab instead */}

      {/* Round Mode Sheet */}
      <RoundModeSheet isOpen={showRoundMode} onClose={() => setShowRoundMode(false)} />

      {/* Find Friends Modal */}
      <FindFriends isOpen={showFindFriends} onClose={() => { setShowFindFriends(false); axios.get(`${API_URL}/users/friends`, { headers: { Authorization: `Bearer ${token}` } }).then(res => setFriendsRow(res.data.friends || res.data || [])).catch(() => {}) }} onViewProfile={onViewProfile} />

      {/* Friend Invite Modal */}
      {showFriendInvite && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <BackButton onClick={() => setShowFriendInvite(false)} label="Back" />
              <h2 className="text-xl font-bold text-primary-500 flex-1 text-center">Invite Friends</h2>
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
                  onChange={(e) => {
                    // Format phone number as user types
                    let value = e.target.value
                    
                    // If it already starts with +, preserve it and only allow digits after
                    if (value.startsWith('+')) {
                      // Keep the + and only allow digits after it
                      const digits = value.slice(1).replace(/\D/g, '')
                      value = '+' + digits
                    } else {
                      // Remove all non-digits
                      const digits = value.replace(/\D/g, '')
                      
                      // If it's a 10-digit number (US without country code), add +1
                      if (digits.length === 10) {
                        value = '+1' + digits
                      } else if (digits.length > 0) {
                        // For other lengths, just add + prefix
                        value = '+' + digits
                      } else {
                        value = ''
                      }
                    }
                    
                    setInvitePhone(value)
                  }}
                  placeholder="+1234567890"
                  className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const inviteLink = `${window.location.origin}?ref=${user?.id}`
                    navigator.clipboard.writeText(inviteLink)
                    showToast('Invite link copied! Share it anywhere!')
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
          <div className="mb-3 relative">
            <textarea
              ref={postTextareaRef}
              value={newPostContent}
              onChange={handlePostContentChange}
              placeholder="What's happening? Tag friends with @name..."
              className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg mb-1 text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
            {/* @ mention picker */}
            {mentionQuery !== null && mentionResults.length > 0 && (
              <div className="absolute left-0 right-0 bg-gray-950 border border-primary-500/40 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ bottom: 'calc(100% - 4px)' }}>
                <p className="text-xs text-primary-500/50 px-3 pt-2 pb-1 font-medium uppercase tracking-wide">Tag a friend</p>
                {mentionResults.map(friend => (
                  <button
                    key={friend._id || friend.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); insertMention(friend) }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-500/10 active:bg-primary-500/20 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-primary-500/30">
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/20">
                          <span className="text-primary-500 text-xs font-bold">{(friend.firstName || friend.name || '?')[0]}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-white font-semibold">{friend.firstName} {friend.lastName}</p>
                      {friend.username && <p className="text-xs text-primary-500/60">@{friend.username}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
                  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    // Camera not available, use file picker
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) { // 10MB limit
                          showToast('Image size must be less than 10MB')
                          return
                        }
                        setSelectedMedia([...selectedMedia, file])
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const result = event?.target?.result
                          if (result) {
                            setMediaPreviews([...mediaPreviews, result as string])
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                    }
                    input.click()
                    return
                  }

                  // Request camera access
                  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                  stream.getTracks().forEach(track => track.stop())
                  
                  // Permission granted, open file picker with camera option
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.capture = 'environment' // Use back camera on mobile
                  input.onchange = (e: any) => {
                    const file = e.target.files[0]
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) { // 10MB limit
                        showToast('Image size must be less than 10MB')
                        return
                      }
                      setSelectedMedia([...selectedMedia, file])
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        const result = event?.target?.result
                        if (result) {
                          setMediaPreviews([...mediaPreviews, result as string])
                        }
                      }
                      reader.readAsDataURL(file)
                    }
                  }
                  input.click()
                } catch (error: any) {
                  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    // Permission denied - fallback to file picker
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) { // 10MB limit
                          showToast('Image size must be less than 10MB')
                          return
                        }
                        setSelectedMedia([...selectedMedia, file])
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const result = event?.target?.result
                          if (result) {
                            setMediaPreviews([...mediaPreviews, result as string])
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                    }
                    input.click()
                  } else {
                    // Other error - still try file picker
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) { // 10MB limit
                          showToast('Image size must be less than 10MB')
                          return
                        }
                        setSelectedMedia([...selectedMedia, file])
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const result = event?.target?.result
                          if (result) {
                            setMediaPreviews([...mediaPreviews, result as string])
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
                      showToast('Please select a valid video file')
                      return
                    }
                    
                    // Check file size (50MB limit)
                    const maxSize = 50 * 1024 * 1024
                    if (file.size > maxSize) {
                      showToast(`Video size must be less than 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`)
                      return
                    }
                    
                    // Add to selected media
                    setSelectedMedia(prev => [...prev, file])
                    
                    // Create preview
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const result = event?.target?.result
                      if (result) {
                        setMediaPreviews(prev => [...prev, result as string])
                      }
                    }
                    reader.onerror = () => {
                      showToast('Failed to load video preview')
                    }
                    reader.readAsDataURL(file)
                  }
                  input.click()
                } catch (error: any) {
                  showToast('Failed to select video. Please try again.')
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
              {posting ? (uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Posting...') : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Posts */}
      <div className="space-y-4 p-4">
        {posts.length === 0 ? (
          feedFilter === 'following' ? (
            /* ── Following feed empty — new user onboarding ── */
            <div className="space-y-4 pt-2">
              <div className="text-center px-6 py-6">
                <p className="text-white font-bold text-lg mb-1">Your feed is wide open</p>
                <p className="text-primary-400/60 text-sm">Follow friends to see their shots, check-ins, and nights out — right here.</p>
              </div>

              {/* Discover CTA */}
              <div className="mx-4 bg-gradient-to-br from-primary-500/10 via-black/60 to-black/80 border border-primary-500/25 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-primary-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                    <Flame className="w-4 h-4 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">See what's trending now</p>
                    <p className="text-primary-400/50 text-xs">Shots being sent, venues popping off, live deals</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFeedFilter('trending')
                    setPage(1)
                    setHasMore(true)
                    setLoading(true)
                  }}
                  className="w-full bg-primary-500 text-black font-bold py-3 rounded-xl text-sm hover:bg-primary-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  Browse Trending Feed
                </button>
              </div>

              {/* Find Friends CTA */}
              <div className="mx-4 bg-black/40 border border-primary-500/15 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-primary-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Find people you know</p>
                    <p className="text-primary-400/50 text-xs">Follow them and their activity fills your feed</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-find-friends'))}
                    className="flex-1 border border-primary-500/40 text-primary-500 font-semibold py-2.5 rounded-xl text-sm hover:border-primary-500/60 hover:bg-primary-500/5 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    Find Friends
                  </button>
                  <button
                    onClick={() => setShowFriendInvite(true)}
                    className="flex-1 border border-primary-500/40 text-primary-500 font-semibold py-2.5 rounded-xl text-sm hover:border-primary-500/60 hover:bg-primary-500/5 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Friends
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Other filters empty ── */
            <div className="text-center py-16 px-6">
              <Compass className="w-12 h-12 text-primary-500/30 mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">Nothing here right now</p>
              <p className="text-primary-400/50 text-sm">Check back later or try a different filter</p>
            </div>
          )
        ) : (
          posts.map((post, index) => {
            const isVenuePost = !!post.venueAuthor
            const authorId = isVenuePost ? null : (post.author?._id || post.author?.id)
            const isFriend = !isVenuePost && ((user as any)?.friends?.includes(authorId) || authorId === user?.id)
            const liked = post.userReaction === '❤️' || isLiked(post)

            // Use a combination of post ID and index to ensure unique keys
            const uniqueKey = post._id ? `${post._id}-${index}` : `post-${index}`

            return (
              <div key={uniqueKey} className={`bg-gradient-to-b from-black via-black to-black/80 border rounded-xl p-4 hover:border-primary-500/40 transition-all shadow-lg ${isVenuePost ? 'border-primary-500/30' : 'border-primary-500/20'}`}>
                {/* Author Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {isVenuePost ? (
                      <div className="w-12 h-12 border-2 border-primary-500/50 rounded-full overflow-hidden flex-shrink-0">
                        {post.venueAuthor?.logo ? (
                          <img src={post.venueAuthor.logo} alt={post.venueAuthor.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                            <span className="text-primary-400 font-semibold">{post.venueAuthor?.name?.[0] || 'V'}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <UserAvatarButton
                        userId={authorId as string}
                        firstName={post.author?.firstName || ''}
                        lastName={post.author?.lastName}
                        profilePicture={post.author?.profilePicture}
                        size="lg"
                        isFriend={isFriend}
                        onViewProfile={onViewProfile}
                        onSendDrink={isFriend ? (uid, name) => { onSendDrink?.(uid, name) } : undefined}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p
                          className={`font-semibold tracking-tight ${isVenuePost ? 'text-primary-400 cursor-default' : 'text-primary-500 cursor-pointer hover:text-primary-400'} transition-all`}
                          onClick={() => {
                            if (!isVenuePost && authorId && authorId !== user?.id && authorId !== (user as any)?._id) {
                              onViewProfile?.(authorId)
                            }
                          }}
                        >
                          {isVenuePost ? post.venueAuthor?.name : `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim()}
                        </p>
                        {isVenuePost && (
                          <span className="text-xs bg-primary-500/10 border border-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full font-medium">
                            Venue
                          </span>
                        )}
                        {!isVenuePost && isFriend && authorId && (
                          <StatusIndicator
                            userId={authorId as string}
                            size="sm"
                          />
                        )}
                        {!isVenuePost && isFriend && (
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
                        {isVenuePost && post.venueAuthor?.city && (
                          <>
                            <span>•</span>
                            <span>{post.venueAuthor.city}{post.venueAuthor.state ? `, ${post.venueAuthor.state}` : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Post menu (edit/delete/report) */}
                  <div className="relative flex-shrink-0" data-post-menu>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPostMenuOpen(postMenuOpen === post._id ? null : post._id) }}
                      className="p-1.5 rounded-full text-primary-400/50 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {postMenuOpen === post._id && (
                      <div className="absolute right-0 top-full mt-1 bg-zinc-950 border border-primary-500/30 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[140px]">
                        {!isVenuePost && (authorId === user?.id || authorId === (user as any)?._id) && (
                          <>
                            <button
                              onClick={() => { setEditingPostId(post._id); setEditContent(post.content || ''); setPostMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary-400 hover:bg-primary-500/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => { handleDeletePost(post._id); setPostMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                        {(isVenuePost || authorId !== user?.id && authorId !== (user as any)?._id) && (
                          <button
                            onClick={() => { handleReportPost(post._id); setPostMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Flag className="w-3.5 h-3.5" /> Report
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Venue/Location Badge */}
                {(post.checkIn?.venue || post.location?.venue) && (
                  <div className="mb-3 flex items-center space-x-2 bg-primary-500/5 border border-primary-500/15 rounded-lg p-2.5">
                    <MapPin className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-primary-500 font-medium text-sm tracking-tight">
                      {post.checkIn?.venue?.name || post.location?.venue?.name}
                    </span>
                    {!isVenuePost && nearbyFriends.some(f => f.firstName === post.author?.firstName) && (
                      <span className="ml-auto text-xs bg-primary-500/10 border border-primary-500/20 text-primary-400 px-2 py-0.5 rounded font-medium">
                        Friend nearby
                      </span>
                    )}
                  </div>
                )}

                {/* Venue post type label */}
                {isVenuePost && post.postType && post.postType !== 'user' && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-primary-500/10 border-primary-500/30 text-primary-400">
                      {post.postType === 'venue_tonight' ? '🌙 Tonight' : post.postType === 'venue_special' ? '⭐ Special' : '📢 Update'}
                    </span>
                  </div>
                )}

                {/* Drink Receipt Card */}
                {post.postType === 'drink_sent' && post.drinkInfo ? (
                  <div className="mb-3 rounded-xl overflow-hidden glass">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-primary-500/10 bg-primary-500/5">
                      <span className="text-primary-400/70 text-[10px] font-bold uppercase tracking-widest">Drink Sent</span>
                      <span className="text-[10px] brand-wordmark">Shot On Me</span>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-4">
                      <span className="text-4xl leading-none">{post.drinkInfo.emoji || '🍺'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          To {post.drinkInfo.recipientName || 'a friend'}
                        </p>
                        {post.drinkInfo.message && (
                          <p className="text-primary-400/70 text-xs mt-0.5 italic truncate">"{post.drinkInfo.message}"</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-primary-400 font-bold text-lg">${post.drinkInfo.amount?.toFixed(2)}</p>
                        <p className="text-primary-400/50 text-[10px]">Cheers 🥂</p>
                      </div>
                    </div>
                  </div>
                ) : post.postType === 'checkin' && post.checkInInfo ? (
                  /* Check-in Card */
                  <div className="mb-3 rounded-xl overflow-hidden border border-primary-500/20 bg-gradient-to-br from-primary-500/5 to-black/40">
                    <div className="px-4 py-3 flex items-center gap-3">
                      <span className="text-3xl leading-none">📍</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">Checked in at</p>
                        <p className="text-primary-400 font-bold text-base truncate">{post.checkInInfo.venueName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Content — with inline edit mode */
                  editingPostId === post._id ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-black/60 border border-primary-500/40 rounded-lg p-3 text-primary-400/90 text-sm focus:outline-none focus:border-primary-500 resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleEditPost(post._id)}
                          disabled={!editContent.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-black text-xs font-bold rounded-lg hover:bg-primary-400 transition-all disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={() => setEditingPostId(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-500/30 text-primary-400 text-xs font-medium rounded-lg hover:bg-primary-500/10 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : post.content ? (
                    <p className="text-primary-400/90 mb-3 leading-relaxed font-light">
                      {post.content.split(/(@\w+)/g).map((part, i) =>
                        /^@\w+/.test(part) ? (
                          <span key={i} className="text-primary-400 font-semibold">{part}</span>
                        ) : part
                      )}
                    </p>
                  ) : null
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
                            loading="lazy"
                            onError={(e) => {
                              // Show placeholder on image load error
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23B8945A" width="400" height="300"/%3E%3Ctext fill="%23fff" font-family="Arial" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not available%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        )}
                        {media.type === 'video' && (
                          <video
                            src={media.url}
                            controls
                            className="w-full rounded-lg max-h-96"
                            preload="metadata"
                            onError={(e) => {
                              // Show error message for failed video loads
                              const video = e.currentTarget
                              video.style.display = 'none'
                              const parent = video.parentElement
                              if (parent) {
                                const errorDiv = document.createElement('div')
                                errorDiv.className = 'w-full h-48 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-400'
                                errorDiv.textContent = 'Video not available'
                                parent.appendChild(errorDiv)
                              }
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Cleaner UI: reaction breakdown shown in picker only */}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 pt-2.5 border-t border-primary-500/20">
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {/* Cleaner reaction action */}
                    <div
                      className="relative min-w-0"
                      data-post-reaction-picker={post._id}
                      onMouseEnter={() => setActivePostReactionPicker(post._id)}
                      onMouseLeave={() => setActivePostReactionPicker(null)}
                    >
                      {(() => {
                        const totalPostReactions = post.totalReactions
                          ?? (post.reactionCounts
                            ? Object.values(post.reactionCounts).reduce((sum, data) => sum + (data.count || 0), 0)
                            : 0)
                        return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActivePostReactionPicker(activePostReactionPicker === post._id ? null : post._id)
                        }}
                        className={`inline-flex items-center justify-start gap-1 px-2 py-1.5 rounded-full transition-all ${
                          post.userReactions?.includes('❤️') || post.userReaction === '❤️'
                            ? 'bg-primary-500/20 text-primary-500 border border-primary-500/40'
                            : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 border border-transparent'
                        }`}
                        title="React"
                      >
                        <ThumbsUp className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-semibold hidden sm:inline">Like</span>
                        {totalPostReactions > 0 && (
                          <span className="text-[11px] font-semibold bg-primary-500/15 border border-primary-500/30 px-1.5 py-0.5 rounded-full leading-none">
                            {totalPostReactions}
                          </span>
                        )}
                      </button>
                        )
                      })()}
                      {activePostReactionPicker === post._id && (
                        <div className="absolute bottom-full left-0 mb-2 bg-black/95 border border-primary-500/30 rounded-full px-2 py-1.5 flex items-center gap-1 z-50 shadow-lg max-w-[calc(100vw-2rem)]">
                          {['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                handleReaction(post._id, emoji)
                                setActivePostReactionPicker(null)
                              }}
                              className={`text-lg hover:scale-125 transition-transform ${
                                post.userReactions?.includes(emoji) || post.userReaction === emoji ? 'scale-125' : ''
                              }`}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedPostId(selectedPostId === post._id ? null : post._id)}
                      className="inline-flex items-center justify-start gap-1 px-2 py-1.5 rounded-full text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-semibold hidden sm:inline">Comment</span>
                      {post.comments.length > 0 && (
                        <span className="text-[11px] font-semibold bg-primary-500/15 border border-primary-500/30 px-1.5 py-0.5 rounded-full leading-none">
                          {post.comments.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleShare(post._id)}
                      className="inline-flex items-center justify-start gap-1 px-2 py-1.5 rounded-full text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                    >
                      <Share2 className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-semibold hidden sm:inline">Share</span>
                    </button>
                    {!isVenuePost && isFriend && authorId && authorId !== user?.id && authorId !== (user as any)?._id && (
                      <button
                        onClick={() => setSendDrinkTarget({
                          id: authorId,
                          name: `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim(),
                          firstName: post.author?.firstName || '',
                          avatar: post.author?.profilePicture,
                        })}
                        className="inline-flex items-center justify-start gap-1 px-2 py-1.5 rounded-full text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors border border-primary-500/20"
                      >
                        <span className="text-sm leading-none flex-shrink-0">🍺</span>
                        <span className="text-xs font-semibold whitespace-nowrap">Send Drink</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    {post.reactionCounts && Object.keys(post.reactionCounts).length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary-500/5 border border-primary-500/15">
                        {Object.keys(post.reactionCounts).slice(0, 2).map((emoji) => (
                          <span key={emoji} className="text-sm leading-none" title={emoji}>
                            {emoji}
                          </span>
                        ))}
                        {Object.keys(post.reactionCounts).length > 2 && (
                          <span className="text-[11px] text-primary-400/80 font-semibold ml-0.5">
                            +{Object.keys(post.reactionCounts).length - 2}
                          </span>
                        )}
                      </div>
                    )}
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
                </div>

                {/* Comment Form */}
                {selectedPostId === post._id && (
                  <form 
                    onSubmit={(e) => handleComment(post._id, e)} 
                    className="mt-3 pt-3 border-t border-primary-500/20"
                    data-post-id={post._id}
                  >
                    {replyingTo && replyingTo.postId === post._id && (
                      <div className="mb-2 flex items-center justify-between text-xs text-primary-400">
                        <span>Replying to {replyingTo.userName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(null)
                            setCommentText('')
                          }}
                          className="text-primary-500 hover:text-primary-400"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {/* Media preview */}
                    {commentMediaPreview && (
                      <div className="relative mb-2 inline-block">
                        <img src={commentMediaPreview} className="h-20 rounded-lg object-cover border border-primary-500/30" alt="preview" />
                        <button type="button" onClick={() => { setCommentMedia(null); setCommentMediaPreview(null) }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black border border-primary-500/40 rounded-full flex items-center justify-center text-primary-400 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Location chip */}
                    {commentLocation && (
                      <div className="flex items-center gap-1.5 mb-2 bg-primary-500/10 border border-primary-500/20 rounded-lg px-2 py-1 w-fit">
                        <MapPin className="w-3 h-3 text-primary-500" />
                        <span className="text-xs text-primary-400 font-medium">{commentLocation.name}</span>
                        <button type="button" onClick={() => setCommentLocation(null)} className="text-primary-500/50 hover:text-primary-400 ml-1"><X className="w-3 h-3" /></button>
                      </div>
                    )}

                    {/* Location search */}
                    {showLocationSearch && !commentLocation && (
                      <div className="relative mb-2">
                        <input
                          type="text"
                          value={locationSearch}
                          onChange={(e) => { setLocationSearch(e.target.value); searchPlaces(e.target.value) }}
                          placeholder="Search for a venue..."
                          className="w-full px-3 py-1.5 bg-black border border-primary-500/40 rounded-lg text-sm text-primary-500 placeholder-primary-600 focus:outline-none focus:border-primary-500"
                          autoFocus
                        />
                        {locationResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-gray-950 border border-primary-500/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                            {locationResults.map((place: any) => (
                              <button
                                key={place.place_id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setCommentLocation({ name: place.structured_formatting?.main_text || place.description, placeId: place.place_id })
                                  setShowLocationSearch(false)
                                  setLocationSearch('')
                                  setLocationResults([])
                                }}
                                className="w-full flex items-start gap-2 px-3 py-2 hover:bg-primary-500/10 text-left transition-colors"
                              >
                                <MapPin className="w-3.5 h-3.5 text-primary-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm text-white font-medium">{place.structured_formatting?.main_text || place.description}</p>
                                  {place.structured_formatting?.secondary_text && <p className="text-xs text-primary-400/60">{place.structured_formatting.secondary_text}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Add a comment..."}
                        className="flex-1 px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      {/* Toolbar */}
                      <input ref={commentFileRef} type="file" accept="image/*" className="hidden" onChange={handleCommentMediaSelect} />
                      <button type="button" onClick={() => { if (commentFileRef.current) { commentFileRef.current.removeAttribute('capture'); commentFileRef.current.click() }}} className="p-2 text-primary-500/60 hover:text-primary-500 transition-colors" title="Add photo">
                        <Camera className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => { if (commentFileRef.current) { commentFileRef.current.setAttribute('capture', 'environment'); commentFileRef.current.click() }}} className="p-2 text-primary-500/60 hover:text-primary-500 transition-colors" title="Take photo">
                        <Video className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setShowLocationSearch(v => !v)} className={`p-2 transition-colors ${showLocationSearch || commentLocation ? 'text-primary-500' : 'text-primary-500/60 hover:text-primary-500'}`} title="Add location">
                        <MapPin className="w-4 h-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={!commentText.trim() && !commentMedia && !commentLocation}
                        className="bg-primary-500 text-black px-3 py-2 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 text-sm"
                      >
                        {replyingTo ? 'Reply' : 'Post'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Comments - Expandable View */}
                {post.comments.length > 0 && (() => {
                  const isExpanded = expandedComments.has(post._id)
                  const topLevelComments = post.comments.filter(c => !c.replyTo)
                  const commentsToShow = isExpanded ? topLevelComments : topLevelComments.slice(0, 2)
                  
                  return (
                    <div className="mt-3 pt-3 border-t border-primary-500/20 space-y-3">
                      {commentsToShow.map((comment, idx) => {
                        // Get replies for this comment - check both _id and string comparison
                        const replies = post.comments.filter(c => {
                          if (!c.replyTo) return false
                          const replyToId = typeof c.replyTo === 'string' 
                            ? c.replyTo 
                            : (typeof c.replyTo === 'object' && c.replyTo !== null && '_id' in c.replyTo)
                              ? (c.replyTo as any)._id 
                              : String(c.replyTo)
                          const commentId = comment._id
                          return replyToId?.toString() === commentId?.toString()
                        })
                        return (
                          <div key={comment._id || idx} className="space-y-2">
                            {/* Main Comment */}
                            <div className="flex items-start space-x-2">
                              <UserAvatarButton
                                userId={comment.user._id || ''}
                                firstName={comment.user.firstName}
                                lastName={comment.user.lastName}
                                profilePicture={comment.user.profilePicture}
                                size="xs"
                                isFriend={(user as any)?.friends?.includes(comment.user._id)}
                                onViewProfile={onViewProfile}
                                onSendDrink={(uid, name) => { onSendDrink?.(uid, name) }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-primary-500 text-sm">
                                    {comment.user.firstName} {comment.user.lastName || ''}
                                  </span>
                                  {comment.content && <span className="text-primary-300 text-sm break-words">{comment.content}</span>}
                                </div>
                                {(comment as any).mediaUrl && (
                                  <img src={(comment as any).mediaUrl} className="mt-1.5 rounded-lg max-h-40 object-cover border border-primary-500/20" alt="comment media" />
                                )}
                                {(comment as any).location?.name && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3 text-primary-500" />
                                    <span className="text-xs text-primary-400">{(comment as any).location.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-primary-400/70">{getTimeAgo(comment.createdAt)}</span>
                                  
                                  {/* Enhanced Comment Like/Reaction - More Prominent */}
                                  <div 
                                    className="relative inline-block group/comment-reaction"
                                    onMouseEnter={() => setShowingReactionPicker({ postId: post._id, commentId: comment._id || '' })}
                                    onMouseLeave={() => {
                                      // Delay hiding to allow moving to picker
                                      setTimeout(() => {
                                        const picker = document.querySelector(`[data-comment-picker="${comment._id}"]`)
                                        if (!picker?.matches(':hover')) {
                                          setShowingReactionPicker(null)
                                        }
                                      }, 300)
                                    }}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowingReactionPicker(
                                          showingReactionPicker?.postId === post._id && showingReactionPicker?.commentId === (comment._id || '')
                                            ? null
                                            : { postId: post._id, commentId: comment._id || '' }
                                        )
                                      }}
                                      className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${
                                        getUserCommentReaction(comment)
                                          ? 'bg-primary-500/20 text-primary-500 border border-primary-500/30'
                                          : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                                      }`}
                                    >
                                      {(() => {
                                        const counts = getCommentReactionCounts(comment)
                                        const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
                                        return (
                                          <span className="flex items-center gap-1">
                                            <ThumbsUp className="w-3 h-3" />
                                            {totalCount > 0 && <span className="text-[10px] font-medium">{totalCount}</span>}
                                          </span>
                                        )
                                      })()}
                                    </button>
                                    
                                    {/* Reaction Picker (shows on hover) - Fixed positioning */}
                                    {showingReactionPicker?.postId === post._id && showingReactionPicker?.commentId === comment._id && (
                                      <div 
                                        data-comment-picker={comment._id}
                                        className="absolute bottom-full left-0 mb-2 bg-black/95 border border-primary-500/30 rounded-full px-2 py-1.5 flex items-center gap-1.5 z-50 shadow-lg"
                                        onMouseEnter={() => setShowingReactionPicker({ postId: post._id, commentId: comment._id || '' })}
                                        onMouseLeave={() => setShowingReactionPicker(null)}
                                      >
                                        {['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'].map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleCommentReaction(post._id, comment._id || '', emoji)
                                              setShowingReactionPicker(null)
                                            }}
                                            className={`text-lg hover:scale-125 transition-transform cursor-pointer ${
                                              getUserCommentReaction(comment) === emoji ? 'scale-125' : ''
                                            }`}
                                            title={emoji}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Reply, Send Drink & More Menu */}
                                  <div className="relative group/comment-menu" ref={commentMenuRef}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleReply(post._id, comment._id || '', comment.user.firstName)
                                      }}
                                      className="text-xs text-primary-400 hover:text-primary-500 px-2 py-1 rounded hover:bg-primary-500/10 transition-all"
                                    >
                                      Reply
                                    </button>
                                    {comment.user._id && comment.user._id !== (user?.id || (user as any)?._id) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSendDrinkTarget({
                                            id: comment.user._id!,
                                            name: `${comment.user.firstName} ${comment.user.lastName || ''}`.trim(),
                                            firstName: comment.user.firstName,
                                            avatar: comment.user.profilePicture,
                                          })
                                        }}
                                        className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-primary-500/10 transition-all"
                                        title={`Send drink to ${comment.user.firstName}`}
                                      >
                                        🍺
                                      </button>
                                    )}
                                    
                                    {/* Comment More Menu - Click to show */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCommentMenuOpen(
                                          commentMenuOpen?.postId === post._id && commentMenuOpen?.commentId === comment._id
                                            ? null
                                            : { postId: post._id, commentId: comment._id || '' }
                                        )
                                      }}
                                      className="text-xs text-primary-400 hover:text-primary-500 px-2 py-1 rounded hover:bg-primary-500/10 transition-all ml-1"
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </button>
                                    
                                    {/* Comment More Menu Dropdown */}
                                    {commentMenuOpen?.postId === post._id && commentMenuOpen?.commentId === comment._id && (
                                      <div 
                                        className="absolute left-0 bottom-full mb-1 bg-black/95 border border-primary-500/30 rounded-lg shadow-lg min-w-[140px] z-50"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="py-1">
                                          {(comment.user._id) === (user?.id || (user as any)?._id) && (
                                            <button
                                              onClick={() => {
                                                setCommentMenuOpen(null)
                                                handleDeleteComment(post._id, comment._id || '')
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                          {(comment.user._id) !== (user?.id || (user as any)?._id) && (
                                            <button
                                              onClick={() => {
                                                setCommentMenuOpen(null)
                                                handleReportComment(post._id, comment._id || '')
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-primary-400 hover:bg-primary-500/10 hover:text-primary-500 transition-colors"
                                            >
                                              <Flag className="w-3 h-3" />
                                              <span>Report</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Nested Replies */}
                                {replies.length > 0 && (
                                  <div className="ml-4 mt-2 space-y-2 border-l-2 border-primary-500/20 pl-3">
                                    {replies.map((reply, replyIdx) => (
                                      <div key={reply._id || replyIdx} className="flex items-start space-x-2">
                                        <UserAvatarButton
                                          userId={(reply.user as any)._id || ''}
                                          firstName={reply.user.firstName}
                                          profilePicture={reply.user.profilePicture}
                                          size="xs"
                                          isFriend={(user as any)?.friends?.includes((reply.user as any)._id)}
                                          onViewProfile={onViewProfile}
                                          onSendDrink={(uid, name) => { onSendDrink?.(uid, name) }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-primary-500 text-xs">
                                              {reply.user.firstName}
                                            </span>
                                            <span className="text-primary-300 text-xs break-words">{reply.content}</span>
                                          </div>
                                          <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] text-primary-400/70">{getTimeAgo(reply.createdAt)}</span>
                                            
                                            {/* Enhanced Reply Like/Reaction - More Prominent */}
                                            <div 
                                              className="relative inline-block group/reply-reaction"
                                              onMouseEnter={() => setShowingReactionPicker({ postId: post._id, commentId: reply._id || comment._id || '' })}
                                              onMouseLeave={() => {
                                                setTimeout(() => {
                                                  const picker = document.querySelector(`[data-reply-picker="${reply._id || comment._id}"]`)
                                                  if (!picker?.matches(':hover')) {
                                                    setShowingReactionPicker(null)
                                                  }
                                                }, 300)
                                              }}
                                            >
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setShowingReactionPicker(
                                                    showingReactionPicker?.postId === post._id && showingReactionPicker?.commentId === (reply._id || comment._id || '')
                                                      ? null
                                                      : { postId: post._id, commentId: reply._id || comment._id || '' }
                                                  )
                                                }}
                                                className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all ${
                                                  getUserCommentReaction(reply)
                                                    ? 'bg-primary-500/20 text-primary-500 border border-primary-500/30'
                                                    : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                                                }`}
                                              >
                                                {(() => {
                                                  const counts = getCommentReactionCounts(reply)
                                                  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
                                                  return (
                                                    <span className="flex items-center gap-0.5">
                                                      <ThumbsUp className="w-3 h-3" />
                                                      {totalCount > 0 && <span className="text-[9px] font-medium">{totalCount}</span>}
                                                    </span>
                                                  )
                                                })()}
                                              </button>
                                              
                                              {/* Reaction Picker for replies - Fixed positioning */}
                                              {showingReactionPicker?.postId === post._id && showingReactionPicker?.commentId === (reply._id || comment._id) && (
                                                <div 
                                                  data-reply-picker={reply._id || comment._id}
                                                  className="absolute bottom-full left-0 mb-2 bg-black/95 border border-primary-500/30 rounded-full px-2 py-1.5 flex items-center gap-1.5 z-50 shadow-lg"
                                                  onMouseEnter={() => setShowingReactionPicker({ postId: post._id, commentId: reply._id || comment._id || '' })}
                                                  onMouseLeave={() => setShowingReactionPicker(null)}
                                                >
                                                  {['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'].map((emoji) => (
                                                    <button
                                                      key={emoji}
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleCommentReaction(post._id, reply._id || comment._id || '', emoji)
                                                        setShowingReactionPicker(null)
                                                      }}
                                                      className={`text-base hover:scale-125 transition-transform cursor-pointer ${
                                                        getUserCommentReaction(reply) === emoji ? 'scale-125' : ''
                                                      }`}
                                                      title={emoji}
                                                    >
                                                      {emoji}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            
                                            <button
                                              onClick={() => handleReply(post._id, reply._id || comment._id || '', reply.user.firstName)}
                                              className="text-[10px] text-primary-400 hover:text-primary-500"
                                            >
                                              Reply
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* View All / View Less Button */}
                      {topLevelComments.length > 2 && (
                        <button
                          onClick={() => toggleCommentsExpanded(post._id)}
                          className="text-xs text-primary-400 hover:text-primary-500 font-medium"
                        >
                          {isExpanded 
                            ? `View less` 
                            : `View all ${topLevelComments.length} comments`
                          }
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })
        )}

        {/* Infinite scroll sentinel — IntersectionObserver watches this */}
        <div ref={sentinelRef} className="h-4" />
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-primary-500/40 text-xs py-4">You're all caught up 🥂</p>
        )}
      </div>

      {/* Story Viewer Modal */}
      {selectedStoryGroup && selectedStoryGroup.stories[currentStoryIndex] && (
        <div className="fixed inset-0 bg-black z-50">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
            {selectedStoryGroup.stories.map((story: any, index: number) => (
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
                    width: index === currentStoryIndex ? `${storyProgress}%` : index < currentStoryIndex ? '100%' : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Story content */}
          <div className="relative h-full flex items-center justify-center">
            {selectedStoryGroup.stories[currentStoryIndex].media.type === 'video' ? (
              <video
                src={selectedStoryGroup.stories[currentStoryIndex].media.url}
                className="max-w-full max-h-full object-contain"
                autoPlay
                loop={false}
                playsInline
              />
            ) : (
              <img
                src={selectedStoryGroup.stories[currentStoryIndex].media.url}
                alt="Story"
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Navigation */}
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
                  src={selectedStoryGroup.author.profilePicture || '/default-avatar.png'}
                  alt={selectedStoryGroup.author.firstName}
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
                <div className="flex-1">
                  <div className="text-white font-semibold">
                    {selectedStoryGroup.author.firstName} {selectedStoryGroup.author.lastName}
                  </div>
                  {selectedStoryGroup.stories[currentStoryIndex].venue && (
                    <div className="text-primary-400 text-sm">
                      📍 {selectedStoryGroup.stories[currentStoryIndex].venue.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const storyId = selectedStoryGroup.stories[currentStoryIndex]._id
                    axios.post(`${API_URL}/stories/${storyId}/reaction`, { emoji: '❤️' }, {
                      headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => { /* silent */ })
                  }}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                >
                  <Heart size={24} fill="currentColor" />
                </button>
              </div>
              {selectedStoryGroup.stories[currentStoryIndex].caption && (
                <p className="text-white text-sm">{selectedStoryGroup.stories[currentStoryIndex].caption}</p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleCloseStory}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateStory && !showStoryEditor && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-primary-500/20">
            <button
              onClick={() => {
                setShowCreateStory(false)
                setStoryFile(null)
                setStoryPreview(null)
                setStoryCaption('')
              }}
              className="text-primary-500 hover:text-primary-400"
            >
              <X size={24} />
            </button>
            <h2 className="text-primary-500 font-semibold">Create Story</h2>
            <div className="w-6" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="text-center">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setStoryFile(file)
                    setStoryPreview(URL.createObjectURL(file))
                    setShowStoryEditor(true)
                  }
                }}
                className="hidden"
                id="story-file-input"
              />
              <label
                htmlFor="story-file-input"
                className="inline-flex flex-col items-center gap-4 p-8 border-2 border-dashed border-primary-500/40 rounded-lg cursor-pointer hover:border-primary-500/60 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <Camera size={32} className="text-primary-500" />
                </div>
                <div className="text-primary-500 font-semibold">Select Photo or Video</div>
                <div className="text-primary-400/70 text-sm">Choose from your gallery</div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Story Editor */}
      {showStoryEditor && storyFile && storyPreview && (
        <StoryEditor
          file={storyFile}
          preview={storyPreview}
          venueBranding={null}
          onSave={async (editedFile, caption, metadata) => {
            setCreatingStory(true)
            try {
              const formData = new FormData()
              formData.append('media', editedFile)
              formData.append('caption', caption)
              formData.append('mediaType', editedFile.type.startsWith('video/') ? 'video' : 'image')
              if (metadata?.music) {
                formData.append('music', metadata.music)
              }
              
              await axios.post(`${API_URL}/stories`, formData, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                },
                timeout: 120000, // 2 minute timeout for large files
                onUploadProgress: (progressEvent) => {
                  if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    /* upload progress tracking */
                  }
                }
              })
              
              setShowCreateStory(false)
              setShowStoryEditor(false)
              setStoryFile(null)
              setStoryPreview(null)
              setStoryCaption('')
              // Refresh stories carousel
              window.dispatchEvent(new CustomEvent('story-created'))
            } catch (error: any) {
              const errorMessage = error.response?.data?.message || 
                                  error.response?.data?.error || 
                                  error.message || 
                                  'Failed to create story'
              showToast(`Failed to create story: ${errorMessage}`)
            } finally {
              setCreatingStory(false)
            }
          }}
          onCancel={() => {
            setShowStoryEditor(false)
            setStoryFile(null)
            setStoryPreview(null)
            setStoryCaption('')
          }}
        />
      )}

      {/* Quick Send Drink Sheet */}
      {sendDrinkTarget && (
        <QuickSendDrinkSheet
          recipientId={sendDrinkTarget.id}
          recipientName={sendDrinkTarget.name}
          recipientFirstName={sendDrinkTarget.firstName}
          recipientAvatar={sendDrinkTarget.avatar}
          isOpen={!!sendDrinkTarget}
          onClose={() => setSendDrinkTarget(null)}
          onSuccess={(amount) => {
            setSendDrinkTarget(null)
          }}
        />
      )}
    </div>
  )
}
