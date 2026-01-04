'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Bell, X, Check, Trash2, Heart, MessageCircle, UserPlus, CreditCard, MapPin, Sparkles, Eye } from 'lucide-react'
import BackButton from './BackButton'
import { useApiUrl } from '../utils/api'

interface Notification {
  _id: string
  type: string
  content: string
  actor?: {
    _id?: string
    firstName: string
    lastName?: string
    profilePicture?: string
  }
  relatedPost?: any
  relatedVenue?: any
  read: boolean
  createdAt: string
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onNotificationClick?: (notification: Notification) => void
}

export default function NotificationCenter({ isOpen, onClose, onNotificationClick }: NotificationCenterProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && token) {
      fetchNotifications()
    }
  }, [isOpen, token])

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (data: any) => {
      console.log('🔔 New notification received:', data)
      // Add to top of list
      setNotifications(prev => [data.notification, ...prev])
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.notification.content || 'New notification', {
          body: data.message || '',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: data.notification._id,
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
    if (!token) return
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(response.data.notifications || [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!token) return
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!token) return
    setMarkingAllRead(true)
    try {
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setMarkingAllRead(false)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!token) return
    try {
      await axios.delete(`${API_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reaction':
      case 'story_reaction':
        return <Heart className="w-5 h-5 text-red-400" />
      case 'comment':
      case 'comment_reply':
        return <MessageCircle className="w-5 h-5 text-blue-400" />
      case 'friend_request':
      case 'friend_accepted':
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-400" />
      case 'payment_received':
      case 'payment_sent':
        return <CreditCard className="w-5 h-5 text-primary-500" />
      case 'check_in':
      case 'venue_update':
        return <MapPin className="w-5 h-5 text-orange-400" />
      case 'achievement':
      case 'milestone':
        return <Sparkles className="w-5 h-5 text-yellow-400" />
      case 'message':
      case 'group_message':
        return <MessageCircle className="w-5 h-5 text-purple-400" />
      default:
        return <Bell className="w-5 h-5 text-primary-400" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id)
    }
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
    // Close notification center after clicking
    onClose()
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50"
        onClick={onClose}
      />
      
      {/* Notification Center */}
      <div
        ref={containerRef}
        className="fixed top-16 right-0 bottom-0 w-full sm:w-96 bg-black/95 backdrop-blur-md border-l border-primary-500/10 z-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur-md border-b border-primary-500/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton onClick={onClose} />
            <Bell className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-primary-500">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-primary-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAllRead}
                className="text-xs text-primary-400 hover:text-primary-500 px-3 py-1.5 rounded-lg hover:bg-primary-500/10 transition-all disabled:opacity-50"
              >
                {markingAllRead ? 'Marking...' : 'Mark all read'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-primary-400 hover:text-primary-500 rounded-lg hover:bg-primary-500/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-primary-400/30 mx-auto mb-4" />
              <p className="text-primary-400/60">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    notification.read
                      ? 'bg-black/40 border-primary-500/10 hover:bg-black/60'
                      : 'bg-primary-500/5 border-primary-500/30 hover:bg-primary-500/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${notification.read ? 'text-primary-400' : 'text-primary-500 font-medium'}`}>
                          {notification.content}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5"></div>
                        )}
                      </div>
                      
                      {/* Actor info */}
                      {notification.actor && (
                        <div className="flex items-center gap-2 mt-1">
                          {notification.actor.profilePicture ? (
                            <img
                              src={notification.actor.profilePicture}
                              alt={notification.actor.firstName}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center">
                              <span className="text-primary-500 text-[10px] font-bold">
                                {notification.actor.firstName[0]}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-primary-400/70">
                            {notification.actor.firstName} {notification.actor.lastName}
                          </span>
                        </div>
                      )}
                      
                      {/* Time */}
                      <p className="text-xs text-primary-400/50 mt-1">
                        {isMounted ? new Date(notification.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification._id)
                          }}
                          className="p-1.5 text-primary-400 hover:text-primary-500 rounded hover:bg-primary-500/10 transition-all"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification._id)
                        }}
                        className="p-1.5 text-primary-400 hover:text-red-400 rounded hover:bg-red-500/10 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

