'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { 
  Search, 
  X, 
  User, 
  MapPin, 
  MessageSquare, 
  Loader2,
  Users,
  TrendingUp,
  Clock,
  ArrowLeft
} from 'lucide-react'
import { useApiUrl } from '../utils/api'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onViewProfile?: (userId: string) => void
  onViewVenue?: (venueId: string) => void
  onViewPost?: (postId: string) => void
  setActiveTab?: (tab: 'feed' | 'home' | 'map' | 'wallet' | 'profile') => void
}

interface SearchResult {
  users: Array<{
    _id: string
    id: string
    firstName: string
    lastName: string
    name: string
    profilePicture?: string
    username?: string
    isFriend?: boolean
  }>
  venues: Array<{
    _id: string
    name: string
    address?: {
      city?: string
      state?: string
    }
    image?: string
  }>
  posts: Array<{
    _id: string
    content: string
    author: {
      _id: string
      firstName: string
      lastName: string
      profilePicture?: string
    }
    media?: Array<{ type: string; url: string }>
    createdAt: string
  }>
}

export default function SearchModal({ 
  isOpen, 
  onClose, 
  onViewProfile, 
  onViewVenue,
  onViewPost,
  setActiveTab 
}: SearchModalProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ users: [], venues: [], posts: [] })
  const [loading, setLoading] = useState(false)
  const [activeTabInternal, setActiveTabInternal] = useState<'all' | 'users' | 'venues' | 'posts'>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else if (!isOpen) {
      setQuery('')
      setResults({ users: [], venues: [], posts: [] })
      setActiveTabInternal('all')
    }
  }, [isOpen])

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !token || !API_URL) {
      setResults({ users: [], venues: [], posts: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: searchQuery.trim(), limit: 10 },
        timeout: 10000
      })
      setResults(response.data || { users: [], venues: [], posts: [] })
    } catch (error) {
      console.error('Search error:', error)
      setResults({ users: [], venues: [], posts: [] })
    } finally {
      setLoading(false)
    }
  }, [token, API_URL])

  // Debounce search queries
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query)
      }, 300) // 300ms debounce
    } else {
      setResults({ users: [], venues: [], posts: [] })
      setLoading(false)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, performSearch])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Filter results based on active tab - inline to avoid closure issues
  const filteredResults = (() => {
    const tab = activeTabInternal || 'all'
    if (tab === 'users') {
      return { ...results, venues: [], posts: [] }
    } else if (tab === 'venues') {
      return { ...results, users: [], posts: [] }
    } else if (tab === 'posts') {
      return { ...results, users: [], venues: [] }
    }
    return results
  })()
  
  const hasResults = filteredResults.users.length > 0 || 
                     filteredResults.venues.length > 0 || 
                     filteredResults.posts.length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col pb-14">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-primary-500/20">
        <button
          onClick={onClose}
          className="p-2 text-primary-400 hover:text-primary-500 transition-colors flex-shrink-0"
          aria-label="Close search"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, venues, posts..."
            className="w-full bg-black/60 border border-primary-500/30 rounded-xl px-10 py-3 text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-500"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      {query.trim().length >= 2 && (
        <div className="flex gap-2 p-3 border-b border-primary-500/10 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTabInternal('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTabInternal === 'all'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 border border-primary-500/30 text-primary-400 hover:text-primary-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTabInternal('users')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTabInternal === 'users'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 border border-primary-500/30 text-primary-400 hover:text-primary-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Users {results.users.length > 0 && `(${results.users.length})`}
          </button>
          <button
            onClick={() => setActiveTabInternal('venues')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTabInternal === 'venues'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 border border-primary-500/30 text-primary-400 hover:text-primary-500'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Venues {results.venues.length > 0 && `(${results.venues.length})`}
          </button>
          <button
            onClick={() => setActiveTabInternal('posts')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTabInternal === 'posts'
                ? 'bg-primary-500 text-black'
                : 'bg-black/40 border border-primary-500/30 text-primary-400 hover:text-primary-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Posts {results.posts.length > 0 && `(${results.posts.length})`}
          </button>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {query.trim().length < 2 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-primary-500/40 mx-auto mb-4" />
            <p className="text-primary-400/80 font-light">Start typing to search</p>
            <p className="text-primary-400/60 text-sm mt-2 font-light">Search for users, venues, or posts</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <span className="ml-3 text-primary-400">Searching...</span>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
            <p className="text-primary-400/80 font-light">No results found</p>
            <p className="text-primary-400/60 text-sm mt-1 font-light">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Users */}
            {filteredResults.users.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary-500 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </h3>
                <div className="space-y-2">
                  {filteredResults.users.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => {
                        onViewProfile?.(user._id)
                        onClose()
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-black/40 border border-primary-500/15 rounded-xl hover:bg-black/60 hover:border-primary-500/30 transition-all text-left"
                    >
                      <div className="w-12 h-12 border-2 border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                            <User className="w-6 h-6 text-primary-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary-500 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.username && (
                          <p className="text-xs text-primary-400/70 truncate">@{user.username}</p>
                        )}
                        {user.isFriend && (
                          <p className="text-xs text-primary-400/50 mt-1">Friend</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Venues */}
            {filteredResults.venues.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary-500 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Venues
                </h3>
                <div className="space-y-2">
                  {filteredResults.venues.map((venue) => (
                    <button
                      key={venue._id}
                      onClick={() => {
                        // Store venue ID in localStorage for MapTab to pick up
                        localStorage.setItem('selectedVenueId', venue._id)
                        if (onViewVenue) {
                          onViewVenue(venue._id)
                        } else if (setActiveTab) {
                          setActiveTab('map')
                        }
                        onClose()
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-black/40 border border-primary-500/15 rounded-xl hover:bg-black/60 hover:border-primary-500/30 transition-all text-left"
                    >
                      <div className="w-12 h-12 border-2 border-primary-500/30 rounded-xl overflow-hidden flex-shrink-0">
                        {venue.image ? (
                          <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                            <MapPin className="w-6 h-6 text-primary-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary-500 truncate">{venue.name}</p>
                        {venue.address && (
                          <p className="text-xs text-primary-400/70 truncate">
                            {venue.address.city}{venue.address.state ? `, ${venue.address.state}` : ''}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {filteredResults.posts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-primary-500 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Posts
                </h3>
                <div className="space-y-2">
                  {filteredResults.posts.map((post) => (
                    <button
                      key={post._id}
                      onClick={() => {
                        if (onViewPost) {
                          onViewPost(post._id)
                        } else if (setActiveTab) {
                          setActiveTab('feed')
                        }
                        onClose()
                      }}
                      className="w-full flex gap-3 p-3 bg-black/40 border border-primary-500/15 rounded-xl hover:bg-black/60 hover:border-primary-500/30 transition-all text-left"
                    >
                      {post.media && post.media.length > 0 && (
                        <div className="w-16 h-16 border border-primary-500/20 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={post.media[0].url} 
                            alt="Post" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-primary-500 text-sm">
                            {post.author.firstName} {post.author.lastName}
                          </p>
                          <span className="text-primary-400/50">•</span>
                          <p className="text-xs text-primary-400/70 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(post.createdAt)}
                          </p>
                        </div>
                        {post.content && (
                          <p className="text-sm text-primary-400/80 line-clamp-2">{post.content}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
