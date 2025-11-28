'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Users, Plus, Send, Image as ImageIcon, X, ArrowLeft, User, Copy, Check } from 'lucide-react'
import { useApiUrl } from '../utils/api'

interface Group {
  _id: string
  name: string
  description?: string
  creator: {
    _id: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  members: Array<{
    user: {
      _id: string
      firstName: string
      lastName: string
      profilePicture?: string
    }
    role: string
  }>
  inviteCode?: string
  isPrivate: boolean
  memberCount: number
  lastMessage?: {
    content: string
    sender: {
      firstName: string
      lastName: string
    }
    createdAt: string
  }
}

interface GroupMessage {
  _id: string
  sender: {
    _id: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  content: string
  media?: Array<{ url: string; type: string }>
  createdAt: string
}

interface GroupChatsTabProps {
  onViewProfile?: (userId: string) => void
}

export default function GroupChatsTab({ onViewProfile }: GroupChatsTabProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (token) {
      fetchGroups()
    }
  }, [token])

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup._id)
      
      // Join socket room for this group
      if (socket) {
        socket.emit('join-group', selectedGroup._id)
      }

      return () => {
        if (socket) {
          socket.emit('leave-group', selectedGroup._id)
        }
      }
    }
  }, [selectedGroup, socket])

  useEffect(() => {
    if (socket) {
      socket.on('group-message', (message: GroupMessage) => {
        if (selectedGroup && message.group === selectedGroup._id) {
          setMessages(prev => [...prev, message])
          scrollToBottom()
        }
        // Refresh groups to update last message
        fetchGroups()
      })

      return () => {
        socket.off('group-message')
      }
    }
  }, [socket, selectedGroup])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGroups(response.data.groups || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (groupId: string) => {
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() && selectedMedia.length === 0) return
    if (!selectedGroup) return

    try {
      setSending(true)
      const formData = new FormData()
      formData.append('content', messageText)
      
      selectedMedia.forEach(file => {
        formData.append('media', file)
      })

      await axios.post(`${API_URL}/groups/${selectedGroup._id}/messages`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      setMessageText('')
      setSelectedMedia([])
      setMediaPreviews([])
      fetchMessages(selectedGroup._id)
      fetchGroups()
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(error.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    try {
      const response = await axios.post(
        `${API_URL}/groups`,
        {
          name: newGroupName,
          description: newGroupDescription,
          isPrivate: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setNewGroupName('')
      setNewGroupDescription('')
      setShowCreateGroup(false)
      fetchGroups()
      setSelectedGroup(response.data.group)
    } catch (error: any) {
      console.error('Error creating group:', error)
      alert(error.response?.data?.message || 'Failed to create group')
    }
  }

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    try {
      const response = await axios.post(
        `${API_URL}/groups/join`,
        { inviteCode: inviteCode.trim().toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setInviteCode('')
      setShowJoinGroup(false)
      fetchGroups()
      setSelectedGroup(response.data.group)
    } catch (error: any) {
      console.error('Error joining group:', error)
      alert(error.response?.data?.message || 'Failed to join group')
    }
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedMedia(files)
    
    const previews = files.map(file => URL.createObjectURL(file))
    setMediaPreviews(previews)
  }

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  // Create Group Modal
  if (showCreateGroup) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-primary-500/20 rounded-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary-500">Create Group</h2>
            <button
              onClick={() => setShowCreateGroup(false)}
              className="text-primary-400 hover:text-primary-500"
            >
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-primary-400 text-sm mb-2">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-primary-500/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                placeholder="Enter group name"
                required
              />
            </div>
            <div>
              <label className="block text-primary-400 text-sm mb-2">Description (optional)</label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-primary-500/20 rounded-lg text-white focus:border-primary-500 focus:outline-none resize-none"
                rows={3}
                placeholder="What's this group about?"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 px-4 py-2 bg-gray-800 text-primary-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors font-semibold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Join Group Modal
  if (showJoinGroup) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-primary-500/20 rounded-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary-500">Join Group</h2>
            <button
              onClick={() => setShowJoinGroup(false)}
              className="text-primary-400 hover:text-primary-500"
            >
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label className="block text-primary-400 text-sm mb-2">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full p-3 bg-gray-800 border border-primary-500/20 rounded-lg text-white focus:border-primary-500 focus:outline-none text-center text-2xl font-mono tracking-wider"
                placeholder="ABCD1234"
                maxLength={8}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowJoinGroup(false)}
                className="flex-1 px-4 py-2 bg-gray-800 text-primary-400 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors font-semibold"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Chat View
  if (selectedGroup) {
    return (
      <div className="h-full bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-500/20 bg-black/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Users size={20} className="text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-500">{selectedGroup.name}</h3>
              <p className="text-xs text-primary-400">{selectedGroup.memberCount} members</p>
            </div>
          </div>
          {selectedGroup.inviteCode && (
            <button
              onClick={() => copyInviteCode(selectedGroup.inviteCode!)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-lg hover:bg-primary-500/20 transition-colors text-sm"
            >
              {copiedCode === selectedGroup.inviteCode ? (
                <>
                  <Check size={16} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>{selectedGroup.inviteCode}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender._id === user?.id || message.sender._id === (user as any)?._id
            return (
              <div
                key={message._id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <div
                  onClick={() => onViewProfile?.(message.sender._id)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500/30 flex-shrink-0 cursor-pointer hover:border-primary-500/70 transition-colors"
                >
                  {message.sender.profilePicture ? (
                    <img
                      src={message.sender.profilePicture}
                      alt={message.sender.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                      <span className="text-primary-500 font-semibold text-sm">
                        {message.sender.firstName[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`flex-1 ${isOwn ? 'items-end' : ''} flex flex-col`}>
                  {!isOwn && (
                    <span className="text-xs text-primary-400 mb-1">
                      {message.sender.firstName} {message.sender.lastName}
                    </span>
                  )}
                  <div
                    className={`inline-block max-w-[75%] rounded-lg p-3 ${
                      isOwn
                        ? 'bg-primary-500 text-black'
                        : 'bg-gray-800 text-primary-400'
                    }`}
                  >
                    {message.content && <p className="text-sm">{message.content}</p>}
                    {message.media && message.media.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.media.map((media, idx) => (
                          <div key={idx}>
                            {media.type === 'image' ? (
                              <img
                                src={media.url}
                                alt="Media"
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
                  </div>
                  <span className="text-xs text-primary-400/50 mt-1">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {mediaPreviews.length > 0 && (
          <div className="px-4 py-2 border-t border-primary-500/20">
            <div className="flex gap-2 overflow-x-auto">
              {mediaPreviews.map((preview, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => {
                      setSelectedMedia(prev => prev.filter((_, i) => i !== idx))
                      setMediaPreviews(prev => prev.filter((_, i) => i !== idx))
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-primary-500/20 bg-black/50">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
              id="group-media-input"
            />
            <label
              htmlFor="group-media-input"
              className="p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <ImageIcon size={20} />
            </label>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-3 bg-gray-800 border border-primary-500/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || (!messageText.trim() && selectedMedia.length === 0)}
              className="p-3 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Groups List
  return (
    <div className="h-full bg-gray-900 text-white overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Group Chats</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinGroup(true)}
              className="px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-lg hover:bg-primary-500/20 transition-colors text-sm font-medium"
            >
              Join
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors font-semibold flex items-center gap-2"
            >
              <Plus size={18} />
              Create
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-primary-400">Loading groups...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-primary-500/30 mx-auto mb-4" />
            <div className="text-primary-400 mb-4">No groups yet</div>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-6 py-3 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors font-semibold"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className="p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Users size={24} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-primary-500 truncate">{group.name}</h3>
                    {group.lastMessage ? (
                      <p className="text-sm text-primary-400 truncate">
                        {group.lastMessage.sender.firstName}: {group.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-primary-400/50">No messages yet</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-primary-400/50">
                      {group.lastMessage ? formatTime(group.lastMessage.createdAt) : ''}
                    </p>
                    <p className="text-xs text-primary-400 mt-1">{group.memberCount} members</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

