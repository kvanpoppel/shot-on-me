'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { 
  Send, Image as ImageIcon, X, ArrowLeft, User, Users, Search, 
  Trash2, Heart, Reply, Share2, Copy, Check, CheckCheck, 
  UserPlus, MoreVertical, Phone, Video, Plus
} from 'lucide-react'
import { useApiUrl } from '../utils/api'
import { Tab } from '@/app/types'

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
  media?: Array<{ url: string; type: string; publicId?: string }>
  createdAt: string
  read: boolean
  likedBy?: string[]
  replyTo?: {
    _id: string
    content: string
    sender: { name: string; firstName?: string; lastName?: string }
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
  }
  unreadCount: number
}

interface Friend {
  _id: string
  id: string
  name: string
  firstName?: string
  lastName?: string
  profilePicture?: string
}

interface Group {
  _id: string
  name: string
  members: Array<{ user: Friend }>
  creator: Friend
  lastMessage?: {
    content: string
    createdAt: string
    sender: { name: string }
  }
  unreadCount?: number
}

interface MessagesTabProps {
  onViewProfile?: (userId: string) => void
  setActiveTab?: (tab: Tab) => void
  activeTab?: Tab | null
}

export default function MessagesTab({ onViewProfile, setActiveTab, activeTab: propActiveTab }: MessagesTabProps) {
  const API_URL = useApiUrl()
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchFriends, setSearchFriends] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const [__localActiveTab, __setLocalActiveTab] = useState<Tab | null>(propActiveTab ?? null)
  const _setActiveTab = typeof setActiveTab === 'function' ? setActiveTab : __setLocalActiveTab

  useEffect(() => {
    if (token) {
      fetchConversations()
      fetchGroups()
    }
  }, [token])

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
    if (!socket) return

    const handleNewMessage = (data: { message: Message; conversationId: string }) => {
      if (data.conversationId === selectedConversation) {
        setMessages(prev => [...prev, data.message])
        scrollToBottom()
        markAsRead(data.conversationId)
      }
      fetchConversations()
    }

    const handleGroupMessage = (data: { message: any; groupId: string }) => {
      if (data.groupId === selectedGroup) {
        fetchGroupMessages(selectedGroup)
        scrollToBottom()
      }
      fetchGroups()
    }

    socket.on('new-message', handleNewMessage)
    socket.on('new-group-message', handleGroupMessage)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('new-group-message', handleGroupMessage)
    }
  }, [socket, selectedConversation, selectedGroup])

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
      // Get user's friends list from their profile
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const friendIds = userResponse.data.user?.friends || []
      
      if (friendIds.length === 0) {
        setFriends([])
        return
      }
      
      // Fetch friend details
      const friendsData = await Promise.all(
        friendIds.map(async (friendId: string) => {
          try {
            const friendResponse = await axios.get(`${API_URL}/users/${friendId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            return friendResponse.data.user
          } catch (error) {
            console.error(`Failed to fetch friend ${friendId}:`, error)
            return null
          }
        })
      )
      
      setFriends(friendsData.filter(f => f !== null))
    } catch (error) {
      console.error('Failed to fetch friends:', error)
      // Fallback: try suggestions endpoint
      try {
        const response = await axios.get(`${API_URL}/users/suggestions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setFriends(response.data.suggestions || [])
      } catch (suggestionsError) {
        console.error('Failed to fetch suggestions:', suggestionsError)
        setFriends([])
      }
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

  const startConversation = async (friendId: string) => {
    if (!token) return
    try {
      // Find existing conversation or create new one
      const existingConv = conversations.find(conv => 
        conv.otherUser.id === friendId || conv.otherUser._id === friendId
      )
      
      if (existingConv) {
        setSelectedConversation(existingConv.conversationId)
        setSelectedGroup(null)
      } else {
        // Create conversation by sending a message
        const formData = new FormData()
        formData.append('recipientId', friendId)
        formData.append('content', '👋')
        
        await axios.post(`${API_URL}/messages/send`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Refresh conversations and select the new one
        await fetchConversations()
        const newConv = conversations.find(conv => 
          conv.otherUser.id === friendId || conv.otherUser._id === friendId
        )
        if (newConv) {
          setSelectedConversation(newConv.conversationId)
          setSelectedGroup(null)
        }
      }
      setShowNewChat(false)
      setSearchFriends('')
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      alert(error.response?.data?.message || 'Failed to start conversation')
    }
  }

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!token || (!selectedConversation && !selectedGroup) || (!messageContent.trim() && !fileInputRef.current?.files?.length)) return

    setSending(true)
    try {
      if (selectedGroup) {
        // Send group message
        const formData = new FormData()
        formData.append('content', messageContent)
        if (replyingTo) {
          formData.append('replyTo', replyingTo._id)
        }
        if (fileInputRef.current?.files) {
          Array.from(fileInputRef.current.files).forEach(file => {
            formData.append('media', file)
          })
        }

        await axios.post(`${API_URL}/groups/${selectedGroup}/messages`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } else {
        // Send direct message
        const formData = new FormData()
        formData.append('recipientId', getRecipientId())
        if (messageContent.trim()) {
          formData.append('content', messageContent)
        }
        if (replyingTo) {
          formData.append('replyTo', replyingTo._id)
        }
        if (fileInputRef.current?.files) {
          Array.from(fileInputRef.current.files).forEach(file => {
            formData.append('media', file)
          })
        }

        await axios.post(`${API_URL}/messages/send`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      }

      setMessageContent('')
      setReplyingTo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (selectedConversation) {
        fetchMessages(selectedConversation)
      } else if (selectedGroup) {
        fetchGroupMessages(selectedGroup)
      }
      fetchConversations()
      fetchGroups()
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
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

  const likeMessage = async (messageId: string) => {
    if (!token) return
    try {
      const response = await axios.post(`${API_URL}/messages/${messageId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, likedBy: response.data.message.likedBy || [] }
          : msg
      ))
      setSelectedMessage(null)
    } catch (error) {
      console.error('Failed to like message:', error)
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    setSelectedMessage(null)
  }

  const shareMessage = async (message: Message) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Message from Shot On Me',
          text: message.content,
          url: window.location.href
        })
      } catch (error) {
        copyMessage(message.content)
      }
    } else {
      copyMessage(message.content)
    }
    setSelectedMessage(null)
  }

  const getRecipientId = () => {
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
    if (date.toDateString() === now.toDateString()) return 'Today'
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

  // Chat view
  if (selectedConversation || selectedGroup) {
    const conversation = conversations.find(c => c.conversationId === selectedConversation)
    const group = groups.find(g => g._id === selectedGroup)
    const otherUser = conversation?.otherUser
    const isGroup = !!selectedGroup

    return (
      <div className="flex flex-col h-screen bg-black">
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
            {!isGroup && (
              <>
                <button className="text-primary-400 hover:text-primary-500 p-2">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="text-primary-400 hover:text-primary-500 p-2">
                  <Video className="w-5 h-5" />
                </button>
              </>
            )}
            <button className="text-primary-400 hover:text-primary-500 p-2">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Thread - Mobile Text Style */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ height: 'calc(100vh - 200px)' }}>
          {messages.map((message, index) => {
            const isOwn =
              message.sender._id.toString() === (user as any)?._id?.toString() ||
              message.sender._id.toString() === (user as any)?.id
            const showAvatar = !isOwn && (index === 0 || 
              messages[index - 1].sender._id.toString() !== message.sender._id.toString())
            const showTime = index === messages.length - 1 || 
              new Date(messages[index + 1].createdAt).getTime() - new Date(message.createdAt).getTime() > 300000
            
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
                      <img
                        src={message.sender.profilePicture || ''}
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
                          <div key={idx}>
                            {media.type === 'image' ? (
                              <img
                                src={media.url}
                                alt="Message media"
                                className="max-w-full rounded-lg max-h-64 object-cover"
                              />
                            ) : (
                              <video
                                src={media.url}
                                controls
                                className="max-w-full rounded-lg max-h-64"
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
                  {showTime && (
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
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="bg-black/60 border-t border-primary-500/10 px-4 py-2 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-primary-400 mb-1">Replying to {replyingTo.sender.firstName || replyingTo.sender.name}</p>
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

        {/* Message Input */}
        <form onSubmit={sendMessage} className="bg-black/95 backdrop-blur-sm border-t border-primary-500/10 p-4">
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              multiple
              className="hidden"
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
              disabled={sending || (!messageContent.trim() && !fileInputRef.current?.files?.length)}
              className="bg-primary-500 text-black p-2.5 rounded-full font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

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
                  onClick={() => shareMessage(selectedMessage)}
                  className="flex items-center gap-3 p-3 text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => copyMessage(selectedMessage.content)}
                  className="flex items-center gap-3 p-3 text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  <Copy className="w-5 h-5" />
                  <span>Copy</span>
                </button>
                {(selectedMessage.sender._id.toString() === (user as any)?._id?.toString() || 
                  selectedMessage.sender._id.toString() === (user as any)?.id) && (
                  <button
                    onClick={() => deleteMessage(selectedMessage._id)}
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

  // New Chat Modal
  if (showNewChat) {
    return (
      <div className="flex flex-col h-screen bg-black">
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
        <div className="flex-1 overflow-y-auto">
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

  // Conversations List
  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary-500">Messages</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowGroupChat(true)
            }}
            className="text-primary-400 hover:text-primary-500 p-2"
            title="New Group"
          >
            <Users className="w-5 h-5" />
          </button>
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
      <div className="flex-1 overflow-y-auto">
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
                      {conversation.lastMessage.senderId === ((user as any)?._id?.toString() || (user as any)?.id) && (
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
