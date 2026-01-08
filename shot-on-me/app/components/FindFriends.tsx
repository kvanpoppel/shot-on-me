'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Search, UserPlus, Users, X, MapPin, CheckCircle2, Sparkles, Phone, ArrowLeft } from 'lucide-react'

import { useApiUrl } from '../utils/api'
import InviteFriendsModal from './InviteFriendsModal'

interface FindFriendsProps {
  isOpen: boolean
  onClose: () => void
  onViewProfile?: (userId: string) => void
}

export default function FindFriends({ isOpen, onClose, onViewProfile }: FindFriendsProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [currentFriends, setCurrentFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'friends'>('suggestions')

  useEffect(() => {
    if (isOpen && token) {
      fetchSuggestions()
      fetchCurrentFriends()
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

        {/* Import Contacts Button */}
        <div className="mt-4">
          <button
            onClick={async () => {
              try {
                if ('contacts' in navigator && 'ContactsManager' in window) {
                  const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
                  if (contacts && contacts.length > 0) {
                    // Search for contacts in the app
                    const phoneNumbers = contacts
                      .map((c: any) => c.tel?.[0] || c.tel)
                      .filter(Boolean)
                    
                    const emails = contacts
                      .map((c: any) => c.email?.[0] || c.email)
                      .filter(Boolean)
                    
                    let foundCount = 0
                    let notFoundContacts: Array<{phone?: string, email?: string, name?: string}> = []
                    
                    if (phoneNumbers.length > 0 || emails.length > 0) {
                      // Search for users by phone numbers and emails
                      for (let i = 0; i < Math.max(phoneNumbers.length, emails.length); i++) {
                        const phone = phoneNumbers[i]
                        const email = emails[i]
                        const contact = contacts[i]
                        
                        let found = false
                        
                        // Try phone number search
                        if (phone) {
                          try {
                            const response = await axios.get(`${API_URL}/users/search/${phone}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            })
                            if (response.data.users && response.data.users.length > 0) {
                              setSearchResults(prev => [...prev, ...response.data.users])
                              setActiveTab('search')
                              found = true
                              foundCount++
                            }
                          } catch (error) {
                            // Continue searching
                          }
                        }
                        
                        // Try email search if not found
                        if (!found && email) {
                          try {
                            const response = await axios.get(`${API_URL}/users/search/${email}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            })
                            if (response.data.users && response.data.users.length > 0) {
                              setSearchResults(prev => [...prev, ...response.data.users])
                              setActiveTab('search')
                              found = true
                              foundCount++
                            }
                          } catch (error) {
                            // Continue searching
                          }
                        }
                        
                        // If not found, add to invite list
                        if (!found && (phone || email)) {
                          notFoundContacts.push({
                            phone: phone,
                            email: email,
                            name: contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim()
                          })
                        }
                      }
                      
                      // Show results
                      if (foundCount > 0) {
                        setActiveTab('search')
                      }
                      
                      // If we have contacts not in the app, offer to invite them
                      if (notFoundContacts.length > 0) {
                        const inviteMessage = `Found ${foundCount} friend${foundCount !== 1 ? 's' : ''} on Shot On Me!\n\n${notFoundContacts.length} contact${notFoundContacts.length !== 1 ? 's' : ''} not in the app. Would you like to invite them?`
                        if (confirm(inviteMessage)) {
                          // Open invite modal - user can invite from there
                          handleInviteFriend(undefined, notFoundContacts[0]?.phone, notFoundContacts[0]?.email)
                        }
                      } else if (foundCount > 0) {
                        alert(`Found ${foundCount} friend${foundCount !== 1 ? 's' : ''} on Shot On Me!`)
                      } else {
                        // No matches - offer to invite
                        if (confirm(`None of your contacts are on Shot On Me yet. Would you like to invite them?`)) {
                          handleInviteFriend()
                        }
                      }
                    }
                  }
                } else if ('contacts' in navigator && typeof (navigator as any).contacts.getContacts === 'function') {
                  // iOS Safari Contact Picker API
                  const contacts = await (navigator as any).contacts.getContacts({
                    properties: ['name', 'tel', 'email']
                  })
                  if (contacts && contacts.length > 0) {
                    // Similar logic as above for iOS
                    const phoneNumbers = contacts
                      .map((c: any) => c.tel?.[0])
                      .filter(Boolean)
                    
                    let foundCount = 0
                    for (const phone of phoneNumbers.slice(0, 5)) {
                      try {
                        const response = await axios.get(`${API_URL}/users/search/${phone}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        })
                        if (response.data.users && response.data.users.length > 0) {
                          setSearchResults(prev => [...prev, ...response.data.users])
                          setActiveTab('search')
                          foundCount++
                        }
                      } catch (error) {
                        // Continue
                      }
                    }
                    
                    if (foundCount === 0) {
                      if (confirm(`None of your contacts are on Shot On Me yet. Would you like to invite them?`)) {
                        handleInviteFriend()
                      }
                    } else {
                      alert(`Found ${foundCount} friend${foundCount !== 1 ? 's' : ''} on Shot On Me!`)
                    }
                  }
                } else {
                  alert('Contacts API not available. Please search for friends manually or use the invite link.')
                }
              } catch (error: any) {
                if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                  alert('Contacts permission denied. Please enable contacts access in Settings → App Permissions.')
                } else {
                  alert('Unable to access contacts. Please search for friends manually.')
                }
              }
            }}
            className="w-full flex items-center justify-center space-x-2 bg-primary-500/10 border border-primary-500/20 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/20 transition-all backdrop-blur-sm"
          >
            <Phone className="w-4 h-4" />
            <span>Import from Contacts</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 border-b border-primary-500/10">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 py-2 text-sm font-medium transition-all ${
              activeTab === 'suggestions'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-primary-400/70 hover:text-primary-500'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            Suggestions
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 text-sm font-medium transition-all ${
              activeTab === 'friends'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-primary-400/70 hover:text-primary-500'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            My Friends ({currentFriends.length})
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
                <UserPlus className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light mb-2">No users found</p>
                <p className="text-primary-400/60 text-sm mb-4 font-light">Invite them to join Shot On Me!</p>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleInviteFriend(e)
                  }}
                  className="bg-primary-500 text-black px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all"
                >
                  Invite Friends
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light">Start typing to search</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div>
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
                <p className="text-primary-400/80 font-light mb-4">No suggestions available</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleInviteFriend(e)
                  }}
                  className="bg-primary-500 text-black px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all"
                >
                  Invite Friends
                </button>
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
                        onClick={() => onViewProfile?.(suggestion._id || suggestion.id)}
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
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFriend(suggestion._id || suggestion.id)}
                        className="bg-primary-500 text-black px-4 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-xs flex items-center space-x-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
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
                <p className="text-primary-400/80 font-light mb-2">No friends yet</p>
                <p className="text-primary-400/60 text-sm mb-4 font-light">Start adding friends to connect!</p>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className="bg-primary-500 text-black px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all"
                >
                  Find Friends
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {currentFriends.map((friend) => (
                  <div
                    key={friend._id || friend.id}
                    className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-all"
                    onClick={() => onViewProfile?.(friend._id || friend.id)}
                  >
                    <div className="flex items-center space-x-3">
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
                        {friend.location && (
                          <div className="flex items-center space-x-1 mt-1">
                            <MapPin className="w-3 h-3 text-primary-500/60" />
                            <p className="text-xs text-primary-400/60 font-light">Location shared</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewProfile?.(friend._id || friend.id)
                        }}
                        className="text-primary-400/70 hover:text-primary-500"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Button */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-primary-500/10 p-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleInviteFriend(e)
          }}
          className="w-full bg-primary-500 text-black py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all flex items-center justify-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Friends</span>
        </button>
      </div>

      {/* Invite Friends Modal */}
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

