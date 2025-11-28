'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Send, Image as ImageIcon, X, ArrowLeft, User, Users } from 'lucide-react'
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

interface MessagesTabProps {
  onViewProfile?: (userId: string) => void
  setActiveTab?: (tab: string) => void
}

export default function MessagesTab({ onViewProfile }: MessagesTabProps) {
  const API_URL = useApiUrl()
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (token) {
      fetchConversations()
    }
  }, [token])

  useEffect(() => {
    if (selectedConversation && token) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation, token])

  // Listen for new messages via Socket.io
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: { message: Message; conversationId: string }) => {
      if (data.conversationId === selectedConversation) {
        setMessages(prev => [...prev, data.message])
        scrollToBottom()
        // Mark as read
        markAsRead(data.conversationId)
      }
      // Refresh conversations to update unread count
      fetchConversations()
    }

    socket.on('new-message', handleNewMessage)

    return () => {
      socket.off('new-message', handleNewMessage)
    }
  }, [socket, selectedConversation])

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
      // Update local state
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
    if (!token || !selectedConversation || (!messageContent.trim() && !fileInputRef.current?.files?.length)) return

    setSending(true)
    try {
      const formData = new FormData()
      formData.append('recipientId', getRecipientId())
      if (messageContent.trim()) {
        formData.append('content', messageContent)
      }
      
      // Add files if any
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

      setMessageContent('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      fetchMessages(selectedConversation)
      fetchConversations()
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const getRecipientId = () => {
    const conversation = conversations.find(c => c.conversationId === selectedConversation)
    return conversation?.otherUser.id || ''
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
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (selectedConversation) {
    const conversation = conversations.find(c => c.conversationId === selectedConversation)
    const otherUser = conversation?.otherUser

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] bg-black">
        {/* Chat Header */}
        <div className="bg-black/95 border-b border-primary-500/10 p-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedConversation(null)}
            className="text-primary-400 hover:text-primary-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          {otherUser?.profilePicture ? (
            <img
              src={otherUser.profilePicture}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-500" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-primary-500 font-semibold">
              {otherUser?.firstName && otherUser?.lastName
                ? `${otherUser.firstName} ${otherUser.lastName}`
                : otherUser?.name}
            </h3>
          </div>
          {onViewProfile && otherUser && (
            <button
              onClick={() => onViewProfile(otherUser.id)}
              className="text-primary-400 hover:text-primary-500 text-sm"
            >
              View Profile
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender._id.toString() === (user as any)?._id?.toString() || message.sender._id.toString() === user?.id
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    isOwn
                      ? 'bg-primary-500 text-black'
                      : 'bg-black/40 border border-primary-500/20 text-primary-300'
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
                              className="max-w-full rounded-lg"
                            />
                          ) : (
                            <video
                              src={media.url}
                              controls
                              className="max-w-full rounded-lg"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p className={`text-xs mt-1 ${isOwn ? 'text-black/70' : 'text-primary-400/70'}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="bg-black/95 border-t border-primary-500/10 p-4">
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
              className="text-primary-400 hover:text-primary-500 p-2"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-black/40 border border-primary-500/20 rounded-lg px-4 py-2 text-primary-300 placeholder-primary-400/50 focus:outline-none focus:border-primary-500 resize-none"
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
              className="bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-primary-500">Messages</h2>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('groups')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-lg hover:bg-primary-500/20 transition-colors text-sm font-medium"
            >
              <Users size={18} />
              Groups
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-primary-400">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 text-primary-400">
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Start a conversation with a friend!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                onClick={() => setSelectedConversation(conversation.conversationId)}
                className="w-full bg-black/40 border border-primary-500/15 rounded-lg p-4 hover:bg-black/60 transition-all text-left"
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
                    <p className="text-primary-400/50 text-xs mt-1">
                      {formatTime(conversation.lastMessage.createdAt)}
                    </p>
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


