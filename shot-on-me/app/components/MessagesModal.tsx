'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { 
  Send, Image as ImageIcon, X, ArrowLeft, User, Users, 
  Heart, Reply, Share2, MoreVertical, Search, Trash2,
  Check, CheckCheck, Copy, Forward, Volume2, Phone, Video, Plus, UserPlus
} from 'lucide-react'
import { useApiUrl } from '../utils/api'

interface Message {
  _id: string
  sender: {
    _id: string
    name: string
    firstName?: string
    lastName?: string
    profilePicture?: string
  }
  recipient: {
    _id: string
    name: string
    firstName?: string
    lastName?: string
    profilePicture?: string
  }
  content: string
  media?: Array<{ url: string; type: string }>
  createdAt: string
  read: boolean
  liked?: boolean
  likedBy?: string[]
  replyTo?: {
    _id: string
    content: string
    sender: { 
      name: string
      firstName?: string
      lastName?: string
    }
  }
}

interface Conversation {
  conversationId: string
  otherUser: {
    id: string
    _id: string
    name: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
    read?: boolean
  }
  unreadCount: number
}

interface MessagesModalProps {
  isOpen: boolean
  onClose: () => void
  onViewProfile?: (userId: string) => void
}

export default function MessagesModal({ isOpen, onClose, onViewProfile }: MessagesModalProps) {
  const API_URL = useApiUrl()
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [searchFriends, setSearchFriends] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [newConversationRecipient, setNewConversationRecipient] = useState<{ id: string; name: string; firstName?: string; lastName?: string; profilePicture?: string } | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (isOpen && token) {
      fetchConversations()
      fetchGroups()
    }
  }, [isOpen, token])

  useEffect(() => {
    if (selectedConversation && token && !selectedGroup) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation, token, selectedGroup])

  useEffect(() => {
    if (selectedGroup && token && !selectedConversation) {
      fetchGroupMessages(selectedGroup)
    }
  }, [selectedGroup, token, selectedConversation])

  // Listen for new messages via Socket.io
  useEffect(() => {
    if (!socket || !isOpen) return

    const handleNewMessage = (data: { message: Message; conversationId: string }) => {
      if (data.conversationId === selectedConversation) {
        setMessages(prev => [...prev, data.message])
        scrollToBottom()
        markAsRead(data.conversationId)
      }
      fetchConversations()
    }

    const handleMessageRead = (data: { conversationId: string }) => {
      if (data.conversationId === selectedConversation) {
        setMessages(prev => prev.map(msg => 
          msg.sender._id.toString() !== (user as any)?._id?.toString() && 
          msg.sender._id.toString() !== (user as any)?.id
            ? { ...msg, read: true }
            : msg
        ))
      }
    }

    const handleGroupMessage = (data: { message: any; groupId: string }) => {
      if (data.groupId === selectedGroup) {
        fetchGroupMessages(selectedGroup)
        scrollToBottom()
      }
      fetchGroups()
    }

    socket.on('new-message', handleNewMessage)
    socket.on('message-read', handleMessageRead)
    socket.on('new-group-message', handleGroupMessage)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('message-read', handleMessageRead)
      socket.off('new-group-message', handleGroupMessage)
    }
  }, [socket, selectedConversation, selectedGroup, isOpen, user])

  const fetchConversations = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConversations(response.data.conversations || [])
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGroups(response.data.groups || [])
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    }
  }

  const fetchGroupMessages = async (groupId: string) => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(response.data.messages || [])
      scrollToBottom()
    } catch (error) {
      console.error('Failed to fetch group messages:', error)
    }
  }

  const fetchFriends = async () => {
    if (!token) return
    try {
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const friendIds = userResponse.data.user?.friends || []
      
      if (friendIds.length === 0) {
        setFriends([])
        return
      }
      
      const friendsData = await Promise.all(
        friendIds.map(async (friendId: string) => {
          try {
            const friendResponse = await axios.get(`${API_URL}/users/${friendId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            return friendResponse.data.user
          } catch (error) {
            return null
          }
        })
      )
      
      setFriends(friendsData.filter(f => f !== null))
    } catch (error) {
      console.error('Failed to fetch friends:', error)
      try {
        const response = await axios.get(`${API_URL}/users/suggestions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setFriends(response.data.suggestions || [])
      } catch (suggestionsError) {
        setFriends([])
      }
    }
  }

  const startConversation = async (friendId: string) => {
    if (!token) return
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(conv => 
        conv.otherUser.id === friendId || conv.otherUser._id === friendId
      )
      
      if (existingConv) {
        // Open existing conversation
        setSelectedConversation(existingConv.conversationId)
        setSelectedGroup(null)
        setShowNewChat(false)
        setSearchFriends('')
      } else {
        // Start new conversation - don't send a message yet, just open the chat
        const friend = friends.find(f => (f._id || f.id) === friendId)
        setNewConversationRecipient({
          id: friendId,
          name: friend?.name || 'User',
          firstName: friend?.firstName,
          lastName: friend?.lastName,
          profilePicture: friend?.profilePicture
        })
        // Generate conversation ID (same format as backend)
        const userId = (user as any)?._id || (user as any)?.id
        const ids = [userId.toString(), friendId].sort()
        const conversationId = `${ids[0]}_${ids[1]}`
        setSelectedConversation(conversationId)
        setSelectedGroup(null)
        setMessages([]) // Start with empty messages - no auto-send
        setShowNewChat(false)
        setSearchFriends('')
      }
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      alert(error.response?.data?.message || 'Failed to start conversation')
    }
  }

  const fetchMessages = async (conversationId: string) => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/messages/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(response.data.messages || [])
      scrollToBottom()
      markAsRead(conversationId)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const markAsRead = async (conversationId: string) => {
    if (!token) return
    try {
      await axios.put(`${API_URL}/messages/read/${conversationId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConversations(prev => prev.map(conv => 
        conv.conversationId === conversationId 
          ? { ...conv, unreadCount: 0 }
          : conv
      ))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!token || (!selectedConversation && !selectedGroup) || (!messageContent.trim() && selectedMedia.length === 0)) return

    const recipientId = getRecipientId()
    if (!selectedGroup && !recipientId) {
      alert('Error: Cannot determine recipient. Please try again.')
      return
    }

    setSending(true)
    try {
      if (selectedGroup) {
        const formData = new FormData()
        formData.append('content', messageContent)
        if (replyingTo) {
          formData.append('replyTo', replyingTo._id)
        }
        selectedMedia.forEach(file => {
          formData.append('media', file)
        })

        await axios.post(`${API_URL}/groups/${selectedGroup}/messages`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } else {
        const formData = new FormData()
        const recipientIdToSend = getRecipientId()
        if (!recipientIdToSend) {
          throw new Error('Recipient ID is missing')
        }
        formData.append('recipientId', recipientIdToSend)
        if (messageContent.trim()) {
          formData.append('content', messageContent)
        }
        if (replyingTo) {
          formData.append('replyTo', replyingTo._id)
        }
        selectedMedia.forEach(file => {
          formData.append('media', file)
        })

        await axios.post(`${API_URL}/messages/send`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      }

      setMessageContent('')
      setReplyingTo(null)
      setSelectedMedia([])
      setMediaPreviews([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // If this was a new conversation, refresh conversations to get the new one
      const wasNewConversation = !!newConversationRecipient
      const recipientId = newConversationRecipient?.id
      if (wasNewConversation) {
        setNewConversationRecipient(null)
      }
      
      // Refresh conversations to get the newly created one
      await fetchConversations()
      
      // If it was a new conversation, find and select it
      if (wasNewConversation && recipientId) {
        const newConv = conversations.find(conv => 
          conv.otherUser.id === recipientId || 
          conv.otherUser._id === recipientId
        )
        if (newConv) {
          setSelectedConversation(newConv.conversationId)
        }
      }
      
      // Refresh messages to show the newly sent message
      if (selectedConversation) {
        await fetchMessages(selectedConversation)
      } else if (selectedGroup) {
        await fetchGroupMessages(selectedGroup)
      }
      await fetchConversations()
      await fetchGroups()
      
      // Scroll to bottom to show new message
      scrollToBottom()
    } catch (error: any) {
      console.error('❌ Failed to send message:', error)
      console.error('Error details:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
        fullError: error
      })
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to send message'
      console.error('Error message to display:', errorMessage)
      alert(`Failed to send message: ${errorMessage}`)
      // Don't clear media on error so user can retry
    } finally {
      setSending(false)
    }
  }

  const likeMessage = async (messageId: string) => {
    if (!token) return
    try {
      const response = await axios.post(`${API_URL}/messages/${messageId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, liked: response.data.liked, likedBy: response.data.message.likedBy || [] }
          : msg
      ))
    } catch (error) {
      console.error('Failed to like message:', error)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!token || !confirm('Delete this message?')) return
    try {
      await axios.delete(`${API_URL}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(prev => prev.filter(msg => msg._id !== messageId))
      setSelectedMessage(null)
      if (selectedConversation) {
        fetchMessages(selectedConversation)
      } else if (selectedGroup) {
        fetchGroupMessages(selectedGroup)
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('Failed to delete message')
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    setSelectedMessage(null)
    // Could show a toast notification here
  }

  const shareMessage = async (message: Message) => {
    try {
      const shareText = message.content || 'Check this message on Shot On Me!'
      const shareUrl = window.location.href
      
      // Try Web Share API first
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Message from Shot On Me',
            text: shareText,
            url: shareUrl
          })
          setSelectedMessage(null)
          return
        } catch (shareError: any) {
          // User cancelled - fine, just return
          if (shareError.name === 'AbortError' || shareError.name === 'NotAllowedError') {
            setSelectedMessage(null)
            return
          }
          console.warn('Web Share API error:', shareError)
        }
      }
      
      // Fallback: Copy to clipboard
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareText)
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
          toast.textContent = 'Message copied to clipboard!'
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.remove()
          }, 3000)
        } else {
          // Fallback for older browsers
          const textarea = document.createElement('textarea')
          textarea.value = shareText
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
          toast.textContent = 'Message copied to clipboard!'
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.remove()
          }, 3000)
        }
      } catch (clipboardError: any) {
        console.error('Clipboard error:', clipboardError)
        copyMessage(message.content)
      }
    } catch (error: any) {
      console.error('Share error:', error)
      copyMessage(message.content)
    }
    setSelectedMessage(null)
  }

  const getRecipientId = () => {
    if (newConversationRecipient) {
      return newConversationRecipient.id
    }
    const conversation = conversations.find(c => c.conversationId === selectedConversation)
    return conversation?.otherUser.id || conversation?.otherUser._id || ''
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const name = `${conv.otherUser.firstName} ${conv.otherUser.lastName}`.toLowerCase()
    return name.includes(searchQuery.toLowerCase()) || 
           conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredFriends = friends.filter(friend => {
    if (!searchFriends) return true
    const name = `${friend.firstName || ''} ${friend.lastName || ''}`.toLowerCase()
    return name.includes(searchFriends.toLowerCase())
  })

  if (!isOpen) return null

  // New Chat View
  if (showNewChat) {
    return (
      <div className="fixed inset-0 bg-black" style={{ zIndex: 60 }}>
        <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 p-4 flex items-center gap-3">
          <button
            onClick={() => {
              setShowNewChat(false)
              setSearchFriends('')
            }}
            className="text-primary-400 hover:text-primary-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-primary-500 flex-1">New Message</h2>
        </div>
        <div className="p-4 border-b border-primary-500/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400/50" />
            <input
              type="text"
              value={searchFriends}
              onChange={(e) => setSearchFriends(e.target.value)}
              placeholder="Search friends..."
              className="w-full bg-black/40 border border-primary-500/20 rounded-lg pl-10 pr-4 py-2 text-primary-300 placeholder-primary-400/50 focus:outline-none focus:border-primary-500"
              onFocus={() => fetchFriends()}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
          {filteredFriends.length === 0 ? (
            <div className="text-center py-12 text-primary-400">
              <p className="text-lg mb-2">No friends found</p>
              <p className="text-sm">Add friends to start conversations</p>
            </div>
          ) : (
            <div className="divide-y divide-primary-500/10">
              {filteredFriends.map((friend) => (
                <button
                  key={friend._id || friend.id}
                  onClick={() => startConversation(friend._id || friend.id)}
                  className="w-full bg-black/40 hover:bg-black/60 transition-colors p-4 text-left flex items-center gap-3"
                >
                  {friend.profilePicture ? (
                    <img
                      src={friend.profilePicture}
                      alt={friend.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-primary-500 font-semibold">
                      {friend.firstName && friend.lastName
                        ? `${friend.firstName} ${friend.lastName}`
                        : friend.name}
                    </h3>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (selectedConversation || selectedGroup) {
    const conversation = conversations.find(c => c.conversationId === selectedConversation)
    const group = groups.find(g => g._id === selectedGroup)
    const otherUser = newConversationRecipient || conversation?.otherUser
    const isGroup = !!selectedGroup

    return (
      <div className="fixed inset-0 bg-black" style={{ zIndex: 60 }}>
        {/* Chat Header */}
        <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 p-4 flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedConversation(null)
              setSelectedGroup(null)
              setReplyingTo(null)
              setSelectedMessage(null)
            }}
            className="text-primary-400 hover:text-primary-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          {isGroup ? (
            <>
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-primary-500 font-semibold">{group?.name || 'Group'}</h3>
                <p className="text-primary-400/70 text-xs">{group?.members.length || 0} members</p>
              </div>
            </>
          ) : (
            <>
              {otherUser?.profilePicture ? (
                <img
                  src={otherUser.profilePicture}
                  alt={otherUser.name}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                  onClick={() => onViewProfile?.(otherUser.id)}
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center cursor-pointer"
                  onClick={() => onViewProfile?.(otherUser?.id || '')}
                >
                  <User className="w-6 h-6 text-primary-500" />
                </div>
              )}
              <div className="flex-1">
                <h3 
                  className="text-primary-500 font-semibold cursor-pointer hover:text-primary-400"
                  onClick={() => onViewProfile?.(otherUser?.id || '')}
                >
                  {otherUser?.firstName && otherUser?.lastName
                    ? `${otherUser.firstName} ${otherUser.lastName}`
                    : otherUser?.name}
                </h3>
                <p className="text-primary-400/70 text-xs">Active now</p>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            {!isGroup && onViewProfile && otherUser && (
              <button
                onClick={() => onViewProfile(otherUser.id)}
                className="text-primary-400 hover:text-primary-500 p-2"
              >
                <User className="w-5 h-5" />
              </button>
            )}
            {!isGroup && (
              <>
                <button 
                  onClick={() => {
                    const phoneNumber = (otherUser as any)?.phoneNumber || (otherUser as any)?.phone
                    if (phoneNumber) {
                      window.location.href = `tel:${phoneNumber}`
                    } else {
                      const toast = document.createElement('div')
                      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                      toast.textContent = 'Phone number not available'
                      document.body.appendChild(toast)
                      setTimeout(() => toast.remove(), 3000)
                    }
                  }}
                  className="text-primary-400 hover:text-primary-500 p-2 transition-colors"
                  title="Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    // For video calls, we can use WebRTC or a third-party service
                    // For now, initiate a video call link or show a message
                    const phoneNumber = (otherUser as any)?.phoneNumber || (otherUser as any)?.phone
                    if (phoneNumber) {
                      // Try to use FaceTime on iOS or video calling on Android
                      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                        window.location.href = `facetime:${phoneNumber}`
                      } else {
                        // For Android/other, try video calling protocol
                        window.location.href = `tel:${phoneNumber}`
                        const toast = document.createElement('div')
                        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                        toast.textContent = 'Video calling via your default app'
                        document.body.appendChild(toast)
                        setTimeout(() => toast.remove(), 3000)
                      }
                    } else {
                      const toast = document.createElement('div')
                      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                      toast.textContent = 'Phone number not available for video call'
                      document.body.appendChild(toast)
                      setTimeout(() => toast.remove(), 3000)
                    }
                  }}
                  className="text-primary-400 hover:text-primary-500 p-2 transition-colors"
                  title="Video Call"
                >
                  <Video className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages Thread - Text Message Style */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ paddingBottom: '200px', maxHeight: 'calc(100vh - 80px)' }}>
          {messages.map((message, index) => {
            const isOwn =
              message.sender._id.toString() === (user as any)?._id?.toString() ||
              message.sender._id.toString() === (user as any)?.id
            const showAvatar = index === 0 || 
              messages[index - 1].sender._id.toString() !== message.sender._id.toString()
            
            return (
              <div
                key={message._id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setSelectedMessage(message)
                }}
              >
                {!isOwn && (
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      message.sender.profilePicture ? (
                        <img
                          src={message.sender.profilePicture}
                          alt={message.sender.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center"><span class="text-primary-500 text-xs font-semibold">${message.sender.firstName?.[0] || message.sender.name[0]}</span></div>`
                            }
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <span className="text-primary-500 text-xs font-semibold">
                            {message.sender.firstName?.[0] || message.sender.name[0]}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="w-8" />
                    )}
                  </div>
                )}
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  {message.replyTo && (
                    <div className={`mb-1 px-3 py-1 rounded-lg text-xs border-l-2 ${
                      isOwn 
                        ? 'bg-primary-500/20 text-primary-300 border-primary-500' 
                        : 'bg-black/40 text-primary-400 border-primary-500/50'
                    }`}>
                      <p className="font-semibold">{message.replyTo.sender.firstName || message.replyTo.sender.name}</p>
                      <p className="truncate">{message.replyTo.content}</p>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-primary-500 text-black rounded-br-sm'
                        : 'bg-black/40 border border-primary-500/20 text-primary-300 rounded-bl-sm'
                    }`}
                  >
                    {message.media && message.media.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {message.media.map((media, idx) => (
                          <div key={idx} className="relative group">
                            {media.type === 'image' || media.type?.startsWith('image/') ? (
                              <img
                                src={media.url}
                                alt="Message media"
                                className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer"
                                onClick={() => {
                                  // Open image in new tab for full view
                                  window.open(media.url, '_blank')
                                }}
                                onError={(e) => {
                                  console.error('Failed to load image:', media.url)
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <video
                                src={media.url}
                                controls
                                className="max-w-full max-h-64 rounded-lg"
                                onError={(e) => {
                                  console.error('Failed to load video:', media.url)
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-primary-400/50 text-xs">
                      {formatTime(message.createdAt)}
                    </span>
                    {isOwn && (
                      <div className="flex items-center">
                        {message.read ? (
                          <CheckCheck className="w-4 h-4 text-primary-500" />
                        ) : (
                          <Check className="w-4 h-4 text-primary-400/50" />
                        )}
                      </div>
                    )}
                    {message.likedBy && message.likedBy.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-primary-500 fill-primary-500" />
                        {message.likedBy.length > 1 && (
                          <span className="text-xs text-primary-400/70">{message.likedBy.length}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Container - Fixed at bottom above nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-black" style={{ zIndex: 60 }}>
          {/* Reply Preview */}
          {replyingTo && (
            <div className="bg-black/60 border-t border-primary-500/10 px-4 py-2 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-primary-400 mb-1">Replying to {replyingTo.sender.name}</p>
                <p className="text-sm text-primary-300 truncate">{replyingTo.content}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-primary-400 hover:text-primary-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Media Previews */}
          {mediaPreviews.length > 0 && (
            <div className="bg-black/60 border-t border-primary-500/10 px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-primary-400 text-sm">
                  {mediaPreviews.length} file{mediaPreviews.length > 1 ? 's' : ''} selected
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMedia([])
                    setMediaPreviews([])
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="text-primary-400 hover:text-primary-500 text-xs"
                >
                  Clear all
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {mediaPreviews.map((preview, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    {selectedMedia[idx]?.type.startsWith('video/') ? (
                      <video src={preview} className="w-20 h-20 rounded-lg object-cover" />
                    ) : (
                      <img src={preview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMedia(prev => prev.filter((_, i) => i !== idx))
                        setMediaPreviews(prev => prev.filter((_, i) => i !== idx))
                      }}
                      className="absolute -top-1 -right-1 bg-black/70 text-primary-500 rounded-full p-1 hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <form 
            onSubmit={sendMessage} 
            className="bg-black/95 backdrop-blur-sm border-t border-primary-500/10 p-4"
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const files = e.dataTransfer.files
            if (files && files.length > 0) {
              const newFiles = Array.from(files).filter(file => 
                file.type.startsWith('image/') || file.type.startsWith('video/')
              )
              if (newFiles.length > 0) {
                setSelectedMedia(prev => [...prev, ...newFiles])
                newFiles.forEach(file => {
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    const result = event.target?.result
                    if (result) {
                      setMediaPreviews(prev => [...prev, result as string])
                    }
                  }
                  reader.onerror = () => {
                    console.error('Failed to read file')
                  }
                  reader.readAsDataURL(file)
                })
              }
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files
                if (files && files.length > 0) {
                  const newFiles = Array.from(files)
                  setSelectedMedia(prev => [...prev, ...newFiles])
                  
                  // Create previews
                  newFiles.forEach(file => {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const result = event.target?.result
                      if (result) {
                        setMediaPreviews(prev => [...prev, result as string])
                      }
                    }
                    reader.onerror = () => {
                      console.error('Failed to read file')
                    }
                    reader.readAsDataURL(file)
                  })
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-primary-400 hover:text-primary-500 p-2 transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <textarea
              ref={inputRef}
              value={messageContent}
              onChange={(e) => {
                setMessageContent(e.target.value)
                // Auto-resize textarea
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto'
                  inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
                }
              }}
              placeholder="Type a message..."
              className="flex-1 bg-black/40 border border-primary-500/20 rounded-full px-4 py-2.5 text-primary-300 placeholder-primary-400/50 focus:outline-none focus:border-primary-500 resize-none max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || (!messageContent.trim() && selectedMedia.length === 0)}
              className={`p-2.5 rounded-full font-semibold transition-all ${
                sending || (!messageContent.trim() && selectedMedia.length === 0)
                  ? 'bg-primary-500/30 text-primary-500/50 cursor-not-allowed opacity-50'
                  : 'bg-primary-500 text-black hover:bg-primary-600 cursor-pointer shadow-lg shadow-primary-500/20'
              }`}
              title={
                sending 
                  ? 'Sending...' 
                  : selectedMedia.length > 0 
                    ? `Send ${selectedMedia.length} file${selectedMedia.length > 1 ? 's' : ''}` 
                    : messageContent.trim() 
                      ? 'Send message' 
                      : 'Type a message or select media'
              }
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
        </div>

        {/* Message Actions Menu */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setSelectedMessage(null)}>
            <div className="w-full bg-black/95 backdrop-blur-md border-t border-primary-500/10 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setReplyingTo(selectedMessage)
                    setSelectedMessage(null)
                    inputRef.current?.focus()
                  }}
                  className="flex items-center gap-3 p-3 text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  <Reply className="w-5 h-5" />
                  <span>Reply</span>
                </button>
                <button
                  onClick={() => {
                    likeMessage(selectedMessage._id)
                  }}
                  className="flex items-center gap-3 p-3 text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  <Heart className={`w-5 h-5 ${selectedMessage.likedBy?.includes((user as any)?._id || (user as any)?.id) ? 'fill-primary-500 text-primary-500' : ''}`} />
                  <span>{selectedMessage.likedBy?.includes((user as any)?._id || (user as any)?.id) ? 'Unlike' : 'Like'}</span>
                </button>
                <button
                  onClick={() => {
                    shareMessage(selectedMessage)
                  }}
                  className="flex items-center gap-3 p-3 text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => {
                    copyMessage(selectedMessage.content)
                  }}
                  className="flex items-center gap-3 p-3 text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  <Copy className="w-5 h-5" />
                  <span>Copy</span>
                </button>
                {(selectedMessage.sender._id.toString() === (user as any)?._id?.toString() || 
                  selectedMessage.sender._id.toString() === (user as any)?.id) && (
                  <button
                    onClick={() => {
                      deleteMessage(selectedMessage._id)
                    }}
                    className="flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary-500">Messages</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowNewChat(true)
              fetchFriends()
            }}
            className="text-primary-400 hover:text-primary-500 p-2"
            title="New Message"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-500 p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-primary-500/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-black/40 border border-primary-500/20 rounded-lg pl-10 pr-4 py-2 text-primary-300 placeholder-primary-400/50 focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
        {loading ? (
          <div className="text-center py-12 text-primary-400">Loading conversations...</div>
        ) : filteredConversations.length === 0 && groups.length === 0 ? (
          <div className="text-center py-12 text-primary-400">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Start a conversation with a friend!</p>
            <button
              onClick={() => {
                setShowNewChat(true)
                fetchFriends()
              }}
              className="mt-4 bg-primary-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-primary-600"
            >
              <UserPlus className="w-5 h-5 inline mr-2" />
              Start Conversation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-primary-500/10">
            {/* Groups */}
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => {
                  setSelectedGroup(group._id)
                  setSelectedConversation(null)
                }}
                className="w-full bg-black/40 hover:bg-black/60 transition-colors p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-primary-500 font-semibold truncate">{group.name}</h3>
                      {group.unreadCount && group.unreadCount > 0 && (
                        <span className="bg-primary-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                          {group.unreadCount}
                        </span>
                      )}
                    </div>
                    {group.lastMessage && (
                      <>
                        <p className="text-primary-400/80 text-sm truncate">
                          {group.lastMessage.sender.name}: {group.lastMessage.content}
                        </p>
                        <p className="text-primary-400/50 text-xs mt-1">
                          {formatTime(group.lastMessage.createdAt)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
            
            {/* Direct Conversations */}
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                onClick={() => {
                  setSelectedConversation(conversation.conversationId)
                  setSelectedGroup(null)
                }}
                className="w-full bg-black/40 hover:bg-black/60 transition-colors p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {conversation.otherUser.profilePicture ? (
                    <img
                      src={conversation.otherUser.profilePicture}
                      alt={conversation.otherUser.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-primary-500 font-semibold truncate">
                        {conversation.otherUser.firstName && conversation.otherUser.lastName
                          ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
                          : conversation.otherUser.name}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-primary-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-primary-400/80 text-sm truncate">
                      {conversation.lastMessage.content}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-primary-400/50 text-xs">
                        {formatTime(conversation.lastMessage.createdAt)}
                      </p>
                      {conversation.lastMessage.read !== false && (
                        <CheckCheck className="w-4 h-4 text-primary-500" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

