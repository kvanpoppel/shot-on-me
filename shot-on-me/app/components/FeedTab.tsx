'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Heart, MessageCircle, Share2, Camera, Video, MapPin, Users, UserPlus, TrendingUp, Sparkles, CheckCircle2, Clock, X, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Filter, RefreshCw, Flame, Compass, UserCheck, Eye } from 'lucide-react'
import StatusIndicator from './StatusIndicator'
import StoriesCarousel from './StoriesCarousel'
import StoryEditor from './StoryEditor'
import BackButton from './BackButton'
import { getInviteLink, shareInvite, getInviteMessage } from '../utils/invite'

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
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string; userName: string } | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [showingReactionPicker, setShowingReactionPicker] = useState<{ postId: string; commentId: string } | null>(null)
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
  const [feedFilter, setFeedFilter] = useState<'following' | 'trending' | 'nearby' | 'foryou' | 'discover'>('following')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pullToRefresh, setPullToRefresh] = useState(false)
  const [pullStartY, setPullStartY] = useState(0)
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set())
  const [postViews, setPostViews] = useState<Map<string, number>>(new Map())
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // Scroll restoration - remember scroll position when switching tabs
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('feed-scroll-position')
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll))
      }, 100)
    }

    return () => {
      // Save scroll position when component unmounts
      sessionStorage.setItem('feed-scroll-position', window.scrollY.toString())
    }
  }, [])

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('feed-scroll-position', window.scrollY.toString())
      
      // Infinite scroll - load more when near bottom
      if (!loadingMore && hasMore && feedContainerRef.current) {
        const scrollHeight = document.documentElement.scrollHeight
        const scrollTop = window.innerHeight + window.scrollY
        const threshold = 500 // Load when 500px from bottom
        
        if (scrollTop >= scrollHeight - threshold) {
          setLoadingMore(true)
          setPage(prev => {
            const nextPage = prev + 1
            fetchFeed(nextPage, feedFilter)
            return nextPage
          })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (token) {
      // Fetch critical data first, then non-critical data
      // Show UI immediately - don't block on all data
      setLoading(true)
      setPage(1)
      setHasMore(true)
      
      // Fetch feed first (most important)
      fetchFeed(1, feedFilter).then(() => {
        // After feed loads, fetch friend activity from feed data (no separate API call needed)
        fetchFriendActivity()
      })
      
      // Fetch non-critical data in parallel (don't block UI)
      Promise.all([
        fetchNearbyFriends(),
        fetchTrendingVenues(),
        fetchFriendSuggestions()
      ]).catch(error => {
        console.error('Error fetching feed data:', error)
      })
    }
  }, [token, feedFilter])

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
        fetchFriendActivity()
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
      
      const newPosts = response.data.posts || []
      
      if (pageNum === 1) {
        setPosts(newPosts)
      } else {
        setPosts(prev => [...prev, ...newPosts])
      }
      
      setHasMore(newPosts.length === 10) // If we got 10 posts, there might be more
    } catch (error: any) {
      console.error('Failed to fetch feed:', error)
      if (pageNum === 1) {
        setPosts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setPullToRefresh(false)
    }
  }

  const fetchFriendActivity = async () => {
    if (!token) return
    try {
      // Derive friend activity directly from posts state (no separate API call)
      // This is more efficient and reduces redundant requests
      const activity: FriendActivity[] = posts
        .filter((post: FeedPost) => {
          const authorId = post.author._id || post.author.id
          const userId = user?.id || (user as any)?._id
          return authorId !== userId
        })
        .slice(0, 5)
        .map((post: FeedPost) => ({
          userId: post.author._id || post.author.id || '',
          name: `${post.author.firstName} ${post.author.lastName || ''}`.trim(),
          profilePicture: post.author.profilePicture,
          action: post.checkIn ? 'checked-in' : 'posted',
          venue: post.checkIn?.venue?.name || post.location?.venue?.name,
          time: post.createdAt
        }))
      
      setFriendActivity(activity)
    } catch (error) {
      console.error('Failed to process friend activity:', error)
      setFriendActivity([])
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
      console.error('Failed to fetch nearby friends:', error)
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
      console.error('Failed to fetch trending venues:', error)
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
      console.error('Failed to fetch friend suggestions:', error)
      setFriendSuggestions([])
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

    // Adding friend...

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
      
      // Success - refresh data
      await Promise.all([
        fetchFriendSuggestions(),
        fetchFeed()
      ])
      
      // Success feedback is handled by UI update
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
      fetchFeed().then(() => {
        fetchFriendActivity()
      })
      setSelectedVenue(null)
    } catch (error) {
      console.error('Failed to check in:', error)
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
      // Refresh to get accurate like count
      fetchFeed().then(() => {
        fetchFriendActivity()
      })
    } catch (error) {
      console.error('Failed to like post:', error)
      // Revert optimistic update on error
      setPosts(previousPosts)
    }
  }

  const handleReaction = async (postId: string, emoji: string) => {
    if (!token) {
      alert('Please log in to react to posts')
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
      console.error('Failed to react to post:', error)
      
      // Revert optimistic update on error
      setPosts(previousPosts)
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to react. Please try again.'
      if (error.response?.status !== 401) { // Don't alert on auth errors
        alert(errorMessage)
      }
      // Refresh feed to get correct state
      fetchFeed().then(() => {
        fetchFriendActivity()
      })
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
    setReplyingTo(null)

    try {
      const response = await axios.post(
        `${API_URL}/feed/${postId}/comment`,
        { 
          content: commentContent,
          replyTo: previousReplyingTo?.commentId || null
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
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
      console.error('Failed to comment:', error)
      // Revert optimistic update on error
      setPosts(previousPosts)
      setCommentText(commentContent)
      setReplyingTo(previousReplyingTo)
      
      const errorMessage = error.response?.data?.message || 'Failed to post comment. Please try again.'
      alert(errorMessage)
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
      console.error('Failed to react to comment:', error)
      const errorMessage = error.response?.data?.message || 'Failed to react. Please try again.'
      alert(errorMessage)
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
      fetchFeed().then(() => {
        fetchFriendActivity()
      })
      
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
      if (!post) {
        console.error('Post not found:', postId)
        alert('Unable to share: Post not found')
        return
      }
      
      const shareUrl = `${window.location.origin}/feed/${postId}`
      const shareText = post.content ? `${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}` : 'Check this out on Shot On Me!'
      
      // Try Web Share API first (works on mobile and modern browsers)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${post.author.firstName} ${post.author.lastName} on Shot On Me`,
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
          console.warn('Web Share API error:', shareError)
        }
      }
      
      // Fallback: Copy to clipboard
      try {
        // Check if clipboard API is available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl)
          // Show success feedback
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
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
            toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
            toast.textContent = 'Link copied to clipboard!'
            document.body.appendChild(toast)
            setTimeout(() => {
              toast.remove()
            }, 3000)
          } catch (err) {
            console.error('Failed to copy:', err)
            // Last resort: show the URL in a prompt
            prompt('Copy this link to share:', shareUrl)
          } finally {
            document.body.removeChild(textarea)
          }
        }
      } catch (clipboardError: any) {
        console.error('Clipboard error:', clipboardError)
        // Last resort: show the URL in a prompt
        prompt('Copy this link to share:', shareUrl)
      }
    } catch (error: any) {
      console.error('Share error:', error)
      alert('Unable to share. Please try again or copy the link manually.')
    }
  }

  const handleInviteFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitePhone.trim()) {
      alert('Please enter a phone number')
      return
    }

    // Validate phone number format
    const cleanNumber = invitePhone.replace(/\D/g, '')
    if (cleanNumber.length < 10) {
      alert('Please enter a valid phone number (at least 10 digits)')
      return
    }

    setInviting(true)

    try {
      // Get referral code if available
      let referralCode = ''
      try {
        const referralResponse = await axios.get(`${API_URL}/referrals/code`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        referralCode = referralResponse.data.code || ''
      } catch (err) {
        console.log('No referral code available, using user ID')
      }

      // Generate invite link
      const userId = user?.id || (user as any)?._id
      const inviteLink = await getInviteLink(userId, referralCode)
      const userName = user?.firstName || user?.name || ''
      const message = getInviteMessage(userName, referralCode)

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
        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
        toast.textContent = 'Opening SMS app to send invitation...'
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.remove()
        }, 3000)

        setInvitePhone('')
        setShowFriendInvite(false)
      } else {
        alert(result.error || 'Failed to send invitation. Please try again.')
      }
    } catch (error: any) {
      console.error('Failed to invite friend:', error)
      alert('Failed to send invitation. Please try again or copy the link manually.')
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
      <div className="min-h-screen pb-20 bg-black max-w-2xl mx-auto">
        {/* Stories skeleton */}
        <div className="p-4 border-b border-primary-500/10">
          <div className="flex gap-3 overflow-x-auto">
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
      className="min-h-screen pb-20 bg-black max-w-2xl mx-auto"
    >
      {/* Stories Carousel */}
      <StoriesCarousel
        onStoryClick={handleStoryClick}
        onCreateStory={() => setShowCreateStory(true)}
        onViewProfile={onViewProfile}
      />

      {/* Enhanced Header with Filters */}
      <div className="bg-black border-b border-primary-500/10 backdrop-blur-sm sticky top-16 z-30">
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-semibold text-primary-500 tracking-tight">Feed</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setPage(1)
                  setHasMore(true)
                  setLoading(true)
                  fetchFeed(1, feedFilter)
                }}
                disabled={loading || pullToRefresh}
                className="bg-primary-500/10 border border-primary-500/20 text-primary-500 px-3 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${pullToRefresh ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`bg-primary-500/10 border border-primary-500/20 text-primary-500 px-3 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all flex items-center ${showFilterMenu ? 'bg-primary-500/20' : ''}`}
              >
                <Filter className="w-4 h-4 mr-1.5" />
                <span className="text-sm hidden sm:inline">Filter</span>
              </button>
              <button
                onClick={() => setShowFriendInvite(true)}
                className="bg-primary-500/10 border border-primary-500/20 text-primary-500 px-3 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span className="text-sm hidden sm:inline">Invite</span>
              </button>
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="bg-primary-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-primary-600 transition-all"
              >
                Post
              </button>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
            {[
              { id: 'following', label: 'Following', icon: UserCheck },
              { id: 'trending', label: 'Trending', icon: Flame },
              { id: 'nearby', label: 'Nearby', icon: Compass },
              { id: 'foryou', label: 'For You', icon: Sparkles },
              { id: 'discover', label: 'Discover', icon: Eye }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setFeedFilter(id as any)
                  setPage(1)
                  setHasMore(true)
                  setLoading(true)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
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
                    let value = e.target.value.replace(/\D/g, '') // Remove non-digits
                    if (value.length > 0 && !value.startsWith('+')) {
                      // Add +1 for US numbers if not present
                      if (value.length <= 10) {
                        value = '+1' + value
                      } else if (!value.startsWith('+')) {
                        value = '+' + value
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
                      const result = event?.target?.result
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
            <p className="text-lg text-primary-400 mb-2">No posts yet</p>
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
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to default avatar on error
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-primary-500/10"><span class="text-primary-500 font-semibold">${post.author.firstName[0]}</span></div>`
                            }
                          }}
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
                        {isFriend && (post.author._id || post.author.id) && (
                          <StatusIndicator 
                            userId={(post.author._id || post.author.id) as string} 
                            size="sm" 
                          />
                        )}
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

                {/* Reactions Display with Hover Tooltips */}
                {post.reactionCounts && Object.keys(post.reactionCounts).length > 0 && (
                  <div className="flex items-center gap-2 pt-2 pb-1 flex-wrap">
                    {Object.entries(post.reactionCounts).map(([emoji, data]) => {
                      const userHasReacted = post.userReactions?.includes(emoji) || post.userReaction === emoji;
                      const userNames = data.users?.slice(0, 5).map((u: any) => 
                        u.firstName || u.name || 'Someone'
                      ).join(', ') || '';
                      const moreCount = (data.users?.length || 0) - 5;
                      const tooltipText = data.users?.length > 0 
                        ? `${userNames}${moreCount > 0 ? ` and ${moreCount} more` : ''} reacted ${emoji}`
                        : `${data.count} reaction${data.count !== 1 ? 's' : ''}`;
                      
                      return (
                        <div key={emoji} className="relative group">
                          <button
                            onClick={() => handleReaction(post._id, emoji)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all ${
                              userHasReacted
                                ? 'bg-primary-500/20 border border-primary-500/50'
                                : 'bg-primary-500/5 border border-primary-500/10 hover:bg-primary-500/10'
                            }`}
                            title={tooltipText}
                          >
                            <span className="text-base">{emoji}</span>
                            <span className="text-primary-400 font-medium">{data.count}</span>
                          </button>
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/95 border border-primary-500/30 rounded-lg text-xs text-primary-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-lg">
                            {tooltipText}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="w-2 h-2 bg-black/95 border-r border-b border-primary-500/30 transform rotate-45"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-primary-500/20">
                  <div className="flex items-center space-x-4">
                    {/* Quick Reaction Buttons with Hover Picker */}
                    <div className="relative flex items-center space-x-1 group/reactions">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleReaction(post._id, '❤️')}
                          className={`p-2 rounded-full transition-all ${
                            post.userReactions?.includes('❤️') || post.userReaction === '❤️'
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
                            post.userReactions?.includes('👍') || post.userReaction === '👍'
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
                            post.userReactions?.includes('😂') || post.userReaction === '😂'
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
                            post.userReactions?.includes('🔥') || post.userReaction === '🔥'
                              ? 'bg-primary-500/20 text-primary-500'
                              : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                          }`}
                          title="Fire"
                        >
                          <span className="text-xl">🔥</span>
                        </button>
                      </div>
                      {/* Extended Reaction Picker on Hover */}
                      <div className="absolute bottom-full left-0 mb-2 bg-black/95 border border-primary-500/30 rounded-full px-2 py-1.5 flex items-center gap-1.5 opacity-0 group-hover/reactions:opacity-100 pointer-events-none group-hover/reactions:pointer-events-auto transition-all duration-200 z-50 shadow-lg">
                        {['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(post._id, emoji)}
                            className={`text-lg hover:scale-125 transition-transform ${
                              post.userReactions?.includes(emoji) || post.userReaction === emoji ? 'scale-125' : ''
                            }`}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
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
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Add a comment..."}
                        className="flex-1 px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50"
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
                              <div className="w-6 h-6 border border-primary-500 rounded-full overflow-hidden flex-shrink-0">
                                {comment.user.profilePicture ? (
                                  <img src={comment.user.profilePicture} alt={comment.user.firstName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary-500/20">
                                    <span className="text-primary-500 text-xs font-bold">{comment.user.firstName[0]}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-primary-500 text-sm">
                                    {comment.user.firstName} {comment.user.lastName || ''}
                                  </span>
                                  <span className="text-primary-300 text-sm break-words">{comment.content}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-primary-400/70">{getTimeAgo(comment.createdAt)}</span>
                                  
                                  {/* Comment Reaction Button with Picker - Fixed Hover */}
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
                                      onClick={() => {
                                        const userReaction = getUserCommentReaction(comment)
                                        if (userReaction) {
                                          // Remove reaction if clicking on current reaction
                                          handleCommentReaction(post._id, comment._id || '', userReaction)
                                        } else {
                                          // Default to like if no reaction
                                          handleCommentReaction(post._id, comment._id || '', '❤️')
                                        }
                                      }}
                                      className="text-xs text-primary-400 hover:text-primary-500 flex items-center gap-1 transition-colors"
                                    >
                                      {(() => {
                                        const userReaction = getUserCommentReaction(comment)
                                        const counts = getCommentReactionCounts(comment)
                                        const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
                                        
                                        if (totalCount === 0) {
                                          return <span>❤️</span>
                                        }
                                        
                                        // Show user's reaction if they reacted
                                        if (userReaction) {
                                          return (
                                            <span className="flex items-center gap-1">
                                              <span>{userReaction}</span>
                                              {totalCount > 1 && <span className="text-[10px]">{totalCount}</span>}
                                            </span>
                                          )
                                        }
                                        
                                        // Show most common reaction
                                        const emojis = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'] as const
                                        const primaryEmoji = emojis.reduce((max, emoji) => 
                                          counts[emoji] > counts[max] ? emoji : max, '❤️'
                                        )
                                        return (
                                          <span className="flex items-center gap-1">
                                            <span>{primaryEmoji}</span>
                                            <span className="text-[10px]">{totalCount}</span>
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
                                  
                                  <button
                                    onClick={() => handleReply(post._id, comment._id || '', comment.user.firstName)}
                                    className="text-xs text-primary-400 hover:text-primary-500"
                                  >
                                    Reply
                                  </button>
                                </div>
                                
                                {/* Nested Replies */}
                                {replies.length > 0 && (
                                  <div className="ml-4 mt-2 space-y-2 border-l-2 border-primary-500/20 pl-3">
                                    {replies.map((reply, replyIdx) => (
                                      <div key={reply._id || replyIdx} className="flex items-start space-x-2">
                                        <div className="w-5 h-5 border border-primary-500/50 rounded-full overflow-hidden flex-shrink-0">
                                          {reply.user.profilePicture ? (
                                            <img src={reply.user.profilePicture} alt={reply.user.firstName} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                                              <span className="text-primary-500 text-[10px] font-bold">{reply.user.firstName[0]}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-primary-500 text-xs">
                                              {reply.user.firstName}
                                            </span>
                                            <span className="text-primary-300 text-xs break-words">{reply.content}</span>
                                          </div>
                                          <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] text-primary-400/70">{getTimeAgo(reply.createdAt)}</span>
                                            
                                            {/* Reply Reaction Button with Picker - Fixed Hover */}
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
                                                onClick={() => {
                                                  const userReaction = getUserCommentReaction(reply)
                                                  if (userReaction) {
                                                    handleCommentReaction(post._id, reply._id || comment._id || '', userReaction)
                                                  } else {
                                                    handleCommentReaction(post._id, reply._id || comment._id || '', '❤️')
                                                  }
                                                }}
                                                className="text-[10px] text-primary-400 hover:text-primary-500 flex items-center gap-0.5"
                                              >
                                                {(() => {
                                                  const userReaction = getUserCommentReaction(reply)
                                                  const counts = getCommentReactionCounts(reply)
                                                  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
                                                  
                                                  if (totalCount === 0) {
                                                    return <span className="text-xs">❤️</span>
                                                  }
                                                  
                                                  if (userReaction) {
                                                    return (
                                                      <span className="flex items-center gap-0.5">
                                                        <span className="text-xs">{userReaction}</span>
                                                        {totalCount > 1 && <span className="text-[9px]">{totalCount}</span>}
                                                      </span>
                                                    )
                                                  }
                                                  
                                                  const emojis = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'] as const
                                                  const primaryEmoji = emojis.reduce((max, emoji) => 
                                                    counts[emoji] > counts[max] ? emoji : max, '❤️'
                                                  )
                                                  return (
                                                    <span className="flex items-center gap-0.5">
                                                      <span className="text-xs">{primaryEmoji}</span>
                                                      <span className="text-[9px]">{totalCount}</span>
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
                    <div className="text-yellow-400 text-sm">
                      📍 {selectedStoryGroup.stories[currentStoryIndex].venue.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const storyId = selectedStoryGroup.stories[currentStoryIndex]._id
                    axios.post(`${API_URL}/stories/${storyId}/reaction`, { emoji: '❤️' }, {
                      headers: { Authorization: `Bearer ${token}` }
                    }).catch(console.error)
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
                    console.log(`Upload progress: ${percentCompleted}%`)
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
              console.error('Story creation error:', error)
              const errorMessage = error.response?.data?.message || 
                                  error.response?.data?.error || 
                                  error.message || 
                                  'Failed to create story'
              alert(`Failed to create story: ${errorMessage}`)
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
    </div>
  )
}
