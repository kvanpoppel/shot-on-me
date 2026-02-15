'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Search, UserPlus, Users, X, MapPin, CheckCircle2, Sparkles, Phone, ArrowLeft, Share2 } from 'lucide-react'

import { useApiUrl } from '../utils/api'
import InviteFriendsModal from './InviteFriendsModal'

interface FindFriendsProps {
  isOpen: boolean
  onClose: () => void
  onViewProfile?: (userId: string) => void
}

interface AIFriendPick {
  user: any
  score: number
  reason: string
}

export default function FindFriends({ isOpen, onClose, onViewProfile }: FindFriendsProps) {
  const { token, user } = useAuth()
  const aiEnabled = (user as any)?.notificationPreferences?.aiPersonalizationEnabled ?? true
  const API_URL = useApiUrl()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [currentFriends, setCurrentFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'friends' | 'invite'>('suggestions')
  const [aiSignals, setAiSignals] = useState<{ viewedProfileIds: string[]; addedFriendIds: string[] }>({
    viewedProfileIds: [],
    addedFriendIds: []
  })

  useEffect(() => {
    if (isOpen && token) {
      fetchSuggestions()
      fetchCurrentFriends()
      fetchAISignals()
    }
  }, [isOpen, token])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const fetchAISignals = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/users/me/ai-signals`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const nextSignals = response.data?.aiSignals || { viewedProfileIds: [], addedFriendIds: [] }
      setAiSignals({
        viewedProfileIds: Array.isArray(nextSignals.viewedProfileIds) ? nextSignals.viewedProfileIds : [],
        addedFriendIds: Array.isArray(nextSignals.addedFriendIds) ? nextSignals.addedFriendIds : []
      })
    } catch (error) {
      console.error('Failed to fetch AI signals:', error)
    }
  }

  const persistAISignals = async (next: { viewedProfileIds: string[]; addedFriendIds: string[] }) => {
    if (!token) return
    try {
      await axios.put(
        `${API_URL}/users/me/ai-signals`,
        next,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch (error) {
      console.error('Failed to persist AI signals:', error)
    }
  }

  const trackProfileView = (userId: string) => {
    const nextSignals = {
      viewedProfileIds: [userId, ...aiSignals.viewedProfileIds.filter((id) => id !== userId)].slice(0, 20),
      addedFriendIds: aiSignals.addedFriendIds
    }
    setAiSignals(nextSignals)
    void persistAISignals(nextSignals)
  }

  const trackFriendAdd = (userId: string) => {
    const nextSignals = {
      viewedProfileIds: aiSignals.viewedProfileIds,
      addedFriendIds: [userId, ...aiSignals.addedFriendIds.filter((id) => id !== userId)].slice(0, 20)
    }
    setAiSignals(nextSignals)
    void persistAISignals(nextSignals)
  }

  const aiFriendPicks = useMemo<AIFriendPick[]>(() => {
    if (!aiEnabled) return []
    if (!suggestions.length) return []
    const signals = aiSignals

    const picks = suggestions.map((candidate: any) => {
      const candidateId = candidate._id || candidate.id
      const mutualCount = Array.isArray(candidate.mutualFriends) ? candidate.mutualFriends.length : 0
      const hasViewed = signals.viewedProfileIds.includes(candidateId)
      const isSimilarToAccepted = signals.addedFriendIds.length > 0 && mutualCount > 0

      let score = typeof candidate.aiScore === 'number' ? candidate.aiScore : 50
      let reason = candidate.aiReason || 'Good network fit based on your activity'

      if (mutualCount > 0) {
        score += Math.min(30, mutualCount * 6)
        reason = `${mutualCount} mutual friend${mutualCount !== 1 ? 's' : ''}`
      }
      if (hasViewed) {
        score += 10
        reason = 'You viewed this profile recently'
      }
      if (isSimilarToAccepted) {
        score += 6
      }

      return {
        user: candidate,
        score: Math.min(98, score),
        reason
      }
    })

    return picks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [suggestions, aiSignals, aiEnabled])

  const fetchSuggestions = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/users/suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuggestions(response.data.suggestions || [])
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    }
  }

  const fetchCurrentFriends = async () => {
    if (!token || !user) return
    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const userData = response.data.user
      if (userData.friends && userData.friends.length > 0) {
        const friendPromises = userData.friends.map((friendId: string) =>
          axios.get(`${API_URL}/users/${friendId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null)
        )
        const friendResponses = await Promise.all(friendPromises)
        const friendList = friendResponses
          .filter(r => r !== null)
          .map(r => r?.data?.user)
          .filter(Boolean)
        setCurrentFriends(friendList)
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error)
    }
  }

  const searchUsers = async (query: string) => {
    if (!token || query.trim().length < 2) return
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/users/search/${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSearchResults(response.data.users || [])
    } catch (error) {
      console.error('Failed to search users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async (friendId: string) => {
    if (!token) return
    try {
      await axios.post(
        `${API_URL}/users/friends/${friendId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Friend added!')
      trackFriendAdd(friendId)
      fetchSuggestions()
      fetchCurrentFriends()
      if (activeTab === 'search') {
        searchUsers(searchQuery)
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add friend')
    }
  }

  const isFriend = (userId: string) => {
    return currentFriends.some(f => (f._id || f.id) === userId) || 
            (user as any)?.friends?.includes(userId)
  }

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [invitePhoneNumber, setInvitePhoneNumber] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState<string>('')

  const handleInviteFriend = async (e?: React.MouseEvent, phoneNumber?: string, email?: string) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!user?.id && !(user as any)?._id) {
      alert('Please wait for your account to load, then try again.')
      return
    }
    
    // Store phone/email if provided for pre-filling invite form
    if (phoneNumber) setInvitePhoneNumber(phoneNumber)
    if (email) setInviteEmail(email)
    
    // Open invite modal for better UX
    setShowInviteModal(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 text-primary-400/70 hover:text-primary-500 rounded-lg transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-primary-500 tracking-tight">Find Friends</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-primary-400/70 hover:text-primary-500 rounded-lg transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full pl-10 pr-10 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light"
            onFocus={() => setActiveTab('search')}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400/60 hover:text-primary-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>


        {/* Tabs - Mobile Optimized */}
        <div className="flex mt-4 border-b border-primary-500/10 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 min-w-[100px] py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'suggestions'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-primary-400/70 hover:text-primary-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5" />
            <span className="hidden sm:inline">Suggestions</span>
            <span className="sm:hidden">Suggest</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 min-w-[100px] py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'friends'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-primary-400/70 hover:text-primary-500'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5" />
            <span className="hidden sm:inline">My Friends ({currentFriends.length})</span>
            <span className="sm:hidden">Friends ({currentFriends.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`flex-1 min-w-[100px] py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'invite'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-primary-400/70 hover:text-primary-500'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5" />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-180px)] p-4">
        {activeTab === 'search' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-3"></div>
                <p className="text-primary-400/70 text-sm font-light">Searching...</p>
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">No users found</p>
                <p className="text-primary-400/60 text-sm mt-1 font-light">Try a different search</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result._id || result.id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-3 flex-1 cursor-pointer"
                        onClick={() => onViewProfile?.(result._id || result.id)}
                      >
                        <div className="w-12 h-12 border border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                          {result.profilePicture ? (
                            <img
                              src={result.profilePicture}
                              alt={result.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                              <span className="text-primary-500 font-medium">
                                {result.firstName?.[0]}{result.lastName?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-primary-500 text-sm truncate tracking-tight">
                            {result.firstName} {result.lastName}
                          </p>
                          {result.username && (
                            <p className="text-xs text-primary-400/70 font-light truncate">@{result.username}</p>
                          )}
                        </div>
                      </div>
                      {isFriend(result._id || result.id) ? (
                        <div className="flex items-center space-x-1 text-primary-500/60 text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-medium">Friends</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(result._id || result.id)}
                          className="bg-primary-500 text-black px-4 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-xs flex items-center space-x-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">Start typing to search</p>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div>
            {!aiEnabled && (
              <div className="mb-4 bg-black/40 border border-primary-500/20 rounded-lg p-3">
                <p className="text-xs text-primary-400/80">
                  AI friend picks are off. Enable in `Settings {'>'} AI Personalization`.
                </p>
              </div>
            )}
            {aiEnabled && aiFriendPicks.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <h3 className="text-sm font-semibold text-primary-500">AI Friend Picks</h3>
                </div>
                <div className="space-y-2">
                  {aiFriendPicks.map((pick) => {
                    const pickId = pick.user._id || pick.user.id
                    return (
                      <div
                        key={`ai-${pickId}`}
                        className="bg-gradient-to-r from-primary-500/10 to-transparent border border-primary-500/25 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              trackProfileView(pickId)
                              onViewProfile?.(pickId)
                            }}
                          >
                            <div className="w-10 h-10 border border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                              {pick.user.profilePicture ? (
                                <img src={pick.user.profilePicture} alt={pick.user.firstName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                                  <span className="text-primary-500 text-xs font-semibold">
                                    {pick.user.firstName?.[0]}{pick.user.lastName?.[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-primary-500 truncate">
                                {pick.user.firstName} {pick.user.lastName}
                              </p>
                              <p className="text-[11px] text-primary-400/70 truncate">Why: {pick.reason}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] font-semibold bg-primary-500/15 border border-primary-500/30 px-1.5 py-0.5 rounded-full text-primary-500">
                              {pick.score}%
                            </span>
                            {isFriend(pickId) ? (
                              <div className="flex items-center space-x-1 text-primary-500/60 text-xs">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">Friends</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddFriend(pickId)}
                                className="bg-primary-500 text-black px-3 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-xs flex items-center space-x-1"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">No suggestions yet</p>
                <p className="text-primary-400/60 text-sm mt-1 font-light">Keep using the app to get friend suggestions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion._id || suggestion.id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-3 flex-1 cursor-pointer"
                        onClick={() => {
                          trackProfileView(suggestion._id || suggestion.id)
                          onViewProfile?.(suggestion._id || suggestion.id)
                        }}
                      >
                        <div className="w-12 h-12 border border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                          {suggestion.profilePicture ? (
                            <img
                              src={suggestion.profilePicture}
                              alt={suggestion.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                              <span className="text-primary-500 font-medium">
                                {suggestion.firstName?.[0]}{suggestion.lastName?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-primary-500 text-sm truncate tracking-tight">
                            {suggestion.firstName} {suggestion.lastName}
                          </p>
                          {suggestion.username && (
                            <p className="text-xs text-primary-400/70 font-light truncate">@{suggestion.username}</p>
                          )}
                          {suggestion.mutualFriends && suggestion.mutualFriends.length > 0 && (
                            <p className="text-xs text-primary-400/60 font-light mt-0.5">
                              {suggestion.mutualFriends.length} mutual friend{suggestion.mutualFriends.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      {isFriend(suggestion._id || suggestion.id) ? (
                        <div className="flex items-center space-x-1 text-primary-500/60 text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-medium">Friends</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(suggestion._id || suggestion.id)}
                          className="bg-primary-500 text-black px-4 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-xs flex items-center space-x-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div>
            {currentFriends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">No friends yet</p>
                <p className="text-primary-400/60 text-sm mt-1 font-light">Start connecting with people!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentFriends.map((friend) => (
                  <div
                    key={friend._id || friend.id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-3 flex-1 cursor-pointer"
                        onClick={() => onViewProfile?.(friend._id || friend.id)}
                      >
                        <div className="w-12 h-12 border border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                          {friend.profilePicture ? (
                            <img
                              src={friend.profilePicture}
                              alt={friend.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                              <span className="text-primary-500 font-medium">
                                {friend.firstName?.[0]}{friend.lastName?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-primary-500 text-sm truncate tracking-tight">
                            {friend.firstName} {friend.lastName}
                          </p>
                          {friend.username && (
                            <p className="text-xs text-primary-400/70 font-light truncate">@{friend.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-primary-500/60 text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">Friends</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invite' && (
          <div className="text-center py-12">
            <Share2 className="w-16 h-16 text-primary-500/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-primary-500 mb-2">Invite Friends</h3>
            <p className="text-primary-400/80 font-light mb-6">
              Share Shot On Me with your friends and earn rewards!
            </p>
            <button
              onClick={(e) => handleInviteFriend(e)}
              className="bg-primary-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all inline-flex items-center space-x-2"
            >
              <Share2 className="w-5 h-5" />
              <span>Get Invite Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          setInvitePhoneNumber('')
          setInviteEmail('')
        }}
        initialPhoneNumber={invitePhoneNumber}
        initialEmail={inviteEmail}
      />
    </div>
  )
}
