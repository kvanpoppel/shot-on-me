'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  Send, ArrowLeft, Search, Plus, X, MoreVertical, Check, CheckCheck,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  _id: string
  sender: { _id: string; firstName?: string; lastName?: string; name?: string; profilePicture?: string }
  content: string
  createdAt: string
  read: boolean
  likedBy?: string[]
}

interface Conversation {
  conversationId: string
  otherUser: { id: string; _id: string; firstName: string; lastName: string; profilePicture?: string }
  lastMessage: { content: string; createdAt: string; senderId: string }
  unreadCount: number
}

interface Friend {
  _id: string; id: string; firstName?: string; lastName?: string; name?: string; profilePicture?: string
}

function Avatar({ user, size = 10 }: { user: any; size?: number }) {
  const name = `${user?.firstName || user?.name?.split(' ')[0] || '?'}`
  const last = user?.lastName || user?.name?.split(' ').slice(1).join(' ') || ''
  return (
    <div
      className={`w-${size} h-${size} rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm`}
      style={{ width: size * 4, height: size * 4, background: 'linear-gradient(135deg, #C8F135, #00D4FF)', color: '#1A1A2E' }}
    >
      {user?.profilePicture
        ? <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
        : <>{name[0]}{last[0]}</>
      }
    </div>
  )
}

export default function MessagesTab() {
  const { user, token } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [selectedOtherUser, setSelectedOtherUser] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendSearch, setFriendSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const userId = user?.id || (user as any)?._id

  const fetchConversations = useCallback(async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/fizz/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConversations(res.data.conversations || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  const fetchMessages = useCallback(async (convId: string) => {
    if (!token) return
    setMsgLoading(true)
    try {
      const res = await axios.get(`${API_URL}/fizz/messages/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMessages(res.data.messages || [])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch { /* ignore */ } finally {
      setMsgLoading(false)
    }
  }, [API_URL, token])

  const fetchFriends = useCallback(async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/fizz/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setFriends(res.data.friends || [])
    } catch { /* ignore */ }
  }, [API_URL, token])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    if (selectedConvId) fetchMessages(selectedConvId)
  }, [selectedConvId, fetchMessages])

  // Real-time socket
  useEffect(() => {
    if (!socket) return
    const handleNewMsg = (data: { message: Message; conversationId: string }) => {
      if (data.conversationId === selectedConvId) {
        setMessages(prev => [...prev, data.message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      fetchConversations()
    }
    socket.on('new-message', handleNewMsg)
    return () => { socket.off('new-message', handleNewMsg) }
  }, [socket, selectedConvId, fetchConversations])

  const handleSend = async () => {
    if (!input.trim() || !selectedConvId || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const otherUserId = selectedOtherUser?.id || selectedOtherUser?._id
      await axios.post(`${API_URL}/fizz/messages`,
        { recipientId: otherUserId, content: text },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchMessages(selectedConvId)
      fetchConversations()
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  const openConversation = (conv: Conversation) => {
    setSelectedConvId(conv.conversationId)
    setSelectedOtherUser(conv.otherUser)
  }

  const startNewConversation = (friend: Friend) => {
    const otherUserId = friend._id || friend.id
    const ids = [userId, otherUserId].sort()
    const convId = `fizz_${ids[0]}_${ids[1]}`
    setSelectedConvId(convId)
    setSelectedOtherUser(friend)
    setShowNewChat(false)
    fetchConversations()
  }

  const filteredFriends = friends.filter(f => {
    const name = `${f.firstName || ''} ${f.lastName || ''}`.toLowerCase()
    return name.includes(friendSearch.toLowerCase())
  })

  // ─── Thread view ───────────────────────────────────────────────
  if (selectedConvId && selectedOtherUser) {
    const otherName = `${selectedOtherUser.firstName || selectedOtherUser.name?.split(' ')[0] || ''} ${selectedOtherUser.lastName || ''}`.trim()

    return (
      <div className="flex flex-col h-full" style={{ background: '#0F0F1E' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1A1A2E' }}>
          <button onClick={() => { setSelectedConvId(null); setSelectedOtherUser(null); setMessages([]) }} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <Avatar user={selectedOtherUser} size={9} />
          <div className="flex-1">
            <p className="font-bold text-white text-sm">{otherName}</p>
            <p className="text-xs text-white/30">Fizz friend</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {msgLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i * 0.15}s` }} />)}</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <p className="text-3xl mb-2">🫧</p>
              <p className="text-white/40 text-sm">Say something nice!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender?._id === userId
              return (
                <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={isMine
                      ? { background: '#C8F135', color: '#1A1A2E', borderBottomRightRadius: 6 }
                      : { background: '#252540', color: 'white', borderBottomLeftRadius: 6 }
                    }
                  >
                    <p>{msg.content}</p>
                    <p className="text-[10px] mt-1 opacity-50">
                      {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t safe-bottom flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#1A1A2E' }}>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Message..."
              rows={1}
              className="flex-1 px-4 py-3 rounded-2xl text-sm resize-none border border-white/10 focus:border-lime-fizz max-h-24"
              style={{ background: '#252540' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
              style={{ background: '#C8F135' }}
            >
              <Send className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Conversation list ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ background: '#0F0F1E' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ background: '#1A1A2E' }}>
        <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Messages</h2>
        <button
          onClick={() => { setShowNewChat(true); fetchFriends() }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(200,241,53,0.15)' }}
        >
          <Plus className="w-5 h-5" style={{ color: '#C8F135' }} />
        </button>
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewChat(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 safe-bottom animate-slide-up" style={{ background: '#1A1A2E', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white text-lg">New Message</h3>
              <button onClick={() => setShowNewChat(false)}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={friendSearch}
                onChange={e => setFriendSearch(e.target.value)}
                placeholder="Search friends..."
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
                style={{ background: '#252540' }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {filteredFriends.length === 0
                ? <p className="text-center text-white/30 text-sm py-6">No friends found</p>
                : filteredFriends.map(f => {
                    const name = `${f.firstName || f.name?.split(' ')[0] || ''} ${f.lastName || ''}`.trim()
                    return (
                      <button
                        key={f._id || f.id}
                        onClick={() => startNewConversation(f)}
                        className="flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-white/5 transition-colors"
                        style={{ background: '#252540' }}
                      >
                        <Avatar user={f} size={10} />
                        <p className="font-semibold text-white text-sm">{name}</p>
                      </button>
                    )
                  })
              }
            </div>
          </div>
        </>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28">
        {loading ? (
          <div className="flex flex-col gap-3 pt-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#252540' }} />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold text-white/40">No conversations yet</p>
            <p className="text-sm text-white/25 mt-1">Tap + to start messaging a friend</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-2">
            {conversations.map(conv => {
              const other = conv.otherUser
              const name = `${other.firstName} ${other.lastName}`.trim()
              const timeAgo = conv.lastMessage?.createdAt
                ? formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })
                : ''
              const isUnread = conv.unreadCount > 0

              return (
                <button
                  key={conv.conversationId}
                  onClick={() => openConversation(conv)}
                  className="flex items-center gap-3 p-4 rounded-2xl text-left transition-colors hover:bg-white/5"
                  style={{ background: isUnread ? 'rgba(200,241,53,0.05)' : '#1C1C32', border: `1px solid ${isUnread ? 'rgba(200,241,53,0.15)' : 'rgba(255,255,255,0.05)'}` }}
                >
                  <Avatar user={other} size={12} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm font-bold ${isUnread ? 'text-white' : 'text-white/70'}`}>{name}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo}</p>
                    </div>
                    <p className={`text-xs truncate ${isUnread ? 'text-white/70' : 'text-white/35'}`}>
                      {conv.lastMessage?.content || 'Start the conversation'}
                    </p>
                  </div>
                  {isUnread && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ background: '#C8F135', color: '#1A1A2E' }}>
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
