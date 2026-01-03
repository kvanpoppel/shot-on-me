'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Bell, X, Heart, MessageCircle, UserPlus, MapPin, DollarSign, Camera, CheckCircle, Share2, Trophy, Gift, Users } from 'lucide-react'
import BackButton from './BackButton'
import { useApiUrl } from '../utils/api'

interface Notification {
  _id: string
  actor: {
    _id: string
    firstName: string
    lastName: string
    profilePicture?: string
  }
  type: 'reaction' | 'comment' | 'comment_reply' | 'follow' | 'friend_request' | 'friend_accepted' | 'friend_post' | 'mention' | 'message' | 'group_message' | 'group_invite' | 'check_in' | 'story_reaction' | 'story_view' | 'story_mention' | 'payment_received' | 'payment_sent' | 'venue_update' | 'venue_follow' | 'post_share' | 'achievement' | 'birthday' | 'milestone'
  content: string
  relatedPost?: {
    _id: string
    content: string
    media?: Array<{ url: string }>
  }
  relatedStory?: {
    _id: string
    media: { url: string }
  }
  relatedVenue?: {
    _id: string
    name: string
  }
  read: boolean
  createdAt: string
}

interface ActivityFeedProps {
  isOpen: boolean
  onClose: () => void
  onViewPost?: (postId: string) => void
  onViewProfile?: (userId: string) => void
}

export default function ActivityFeed({ isOpen, onClose, onViewPost, onViewProfile }: ActivityFeedProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isOpen && token) {
      fetchNotifications()
      fetchUnreadCount()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications()
        fetchUnreadCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isOpen, token])

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (data: any) => {
      console.log('📬 New notification received:', data)
      
      // Add notification to list immediately for instant feedback
      if (data.notification) {
        setNotifications(prev => [data.notification, ...prev])
        setUnreadCount(prev => prev + 1)
      } else {
        // Refresh if no notification object provided
        fetchNotifications()
        fetchUnreadCount()
      }
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted' && data.notification) {
        const notif = data.notification
        new Notification('Shot On Me', {
          body: notif.content || data.message || 'You have a new notification',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: notif._id || 'notification',
          requireInteraction: false
        })
      }
    }

    socket.on('new-notification', handleNewNotification)

    return () => {
      socket.off('new-notification', handleNewNotification)
    }
  }, [socket])

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(response.data.notifications || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUnreadCount(response.data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ))
      if (unreadCount > 0) {
        setUnreadCount(prev => prev - 1)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reaction':
        return <Heart className="w-5 h-5 text-red-500" />
      case 'comment':
      case 'comment_reply':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'follow':
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className="w-5 h-5 text-green-500" />
      case 'friend_post':
        return <Camera className="w-5 h-5 text-primary-500" />
      case 'check_in':
        return <MapPin className="w-5 h-5 text-purple-500" />
      case 'message':
      case 'group_message':
        return <MessageCircle className="w-5 h-5 text-cyan-500" />
      case 'group_invite':
        return <Users className="w-5 h-5 text-indigo-500" />
      case 'check_in':
        return <MapPin className="w-5 h-5 text-purple-500" />
      case 'story_reaction':
      case 'story_view':
      case 'story_mention':
        return <Camera className="w-5 h-5 text-pink-500" />
      case 'payment_received':
      case 'payment_sent':
        return <DollarSign className="w-5 h-5 text-yellow-500" />
      case 'venue_update':
      case 'venue_follow':
        return <Bell className="w-5 h-5 text-orange-500" />
      case 'post_share':
        return <Share2 className="w-5 h-5 text-teal-500" />
      case 'achievement':
      case 'milestone':
        return <Trophy className="w-5 h-5 text-amber-500" />
      case 'birthday':
        return <Gift className="w-5 h-5 text-pink-500" />
      default:
        return <Bell className="w-5 h-5 text-primary-500" />
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-primary-500/20 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-500/20">
          <div className="flex items-center gap-3">
            <BackButton onClick={onClose} />
            <Bell className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-primary-500">Activity Feed</h2>
            {unreadCount > 0 && (
              <span className="bg-primary-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary-400 hover:text-primary-500 px-3 py-1 rounded-lg hover:bg-primary-500/10 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-primary-400">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="w-16 h-16 text-primary-500/30 mb-4" />
              <div className="text-primary-400 text-center">
                <p className="font-semibold mb-2">No notifications yet</p>
                <p className="text-sm">When friends interact with your posts, you'll see it here!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id)
                    }
                    if (notification.relatedPost && onViewPost) {
                      onViewPost(notification.relatedPost._id)
                      onClose()
                    }
                  }}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    notification.read
                      ? 'bg-gray-800/50 border-primary-500/10 hover:border-primary-500/20'
                      : 'bg-primary-500/5 border-primary-500/30 hover:border-primary-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Actor Avatar */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onViewProfile) {
                          onViewProfile(notification.actor._id)
                        }
                      }}
                      className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-500/30 flex-shrink-0 cursor-pointer hover:border-primary-500/70 transition-colors"
                    >
                      {notification.actor.profilePicture ? (
                        <img
                          src={notification.actor.profilePicture}
                          alt={notification.actor.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                          <span className="text-primary-500 font-semibold">
                            {notification.actor.firstName[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <p className="text-primary-400 text-sm leading-relaxed">
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onViewProfile) {
                                  onViewProfile(notification.actor._id)
                                }
                              }}
                              className="font-semibold text-primary-500 hover:text-primary-400 cursor-pointer"
                            >
                              {notification.actor.firstName} {notification.actor.lastName}
                            </span>
                            {' '}
                            {notification.content}
                          </p>
                          <p className="text-primary-400/50 text-xs mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>

                      {/* Related Post Preview */}
                      {notification.relatedPost && (
                        <div className="mt-2 p-2 bg-gray-800/50 rounded-lg border border-primary-500/10">
                          <p className="text-primary-400/70 text-xs line-clamp-2">
                            {notification.relatedPost.content}
                          </p>
                          {notification.relatedPost.media && notification.relatedPost.media.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {notification.relatedPost.media.slice(0, 3).map((media, idx) => (
                                <img
                                  key={idx}
                                  src={media.url}
                                  alt="Post preview"
                                  className="w-16 h-16 rounded object-cover"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
}

