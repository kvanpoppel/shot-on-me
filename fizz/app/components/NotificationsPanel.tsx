'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { X, Gift, MapPin, Bell, MessageCircle, UserPlus, Heart } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  data?: {
    amount?: number
    senderName?: string
    venueName?: string
    shotId?: string
  }
  read: boolean
  createdAt: string
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/fizz/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(res.data.notifications || res.data || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  const markAllRead = useCallback(async () => {
    if (!token) return
    try {
      await axios.put(`${API_URL}/fizz/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch { /* ignore */ }
  }, [API_URL, token])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
      markAllRead()
    }
  }, [isOpen, fetchNotifications, markAllRead])

  // Listen for real-time notifications pushed via socket
  useEffect(() => {
    const handleNew = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return
      const notif: Notification = {
        _id: detail._id || `tmp-${Date.now()}`,
        type: detail.type || 'info',
        title: detail.title || 'New notification',
        message: detail.message || detail.body || '',
        data: detail.data || {},
        read: isOpen,
        createdAt: detail.createdAt || new Date().toISOString(),
      }
      setNotifications(prev => {
        if (detail._id && prev.some(n => n._id === detail._id)) return prev
        return [notif, ...prev]
      })
    }
    window.addEventListener('new-notification', handleNew)
    window.addEventListener('socket-notification', handleNew)
    return () => {
      window.removeEventListener('new-notification', handleNew)
      window.removeEventListener('socket-notification', handleNew)
    }
  }, [isOpen])

  if (!isOpen) return null

  const NotifIcon = ({ type }: { type: string }) => {
    if (type === 'fizz_received' || type === 'shot' || type === 'gift' || type === 'fizz') {
      return <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(200,241,53,0.15)' }}>🫧</div>
    }
    if (type === 'message') {
      return <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,212,255,0.15)' }}><MessageCircle className="w-5 h-5" style={{ color: '#00D4FF' }} /></div>
    }
    if (type === 'friend_request' || type === 'friend_accepted') {
      return <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(167,139,250,0.15)' }}><UserPlus className="w-5 h-5" style={{ color: '#A78BFA' }} /></div>
    }
    if (type === 'feed_like' || type === 'feed_comment') {
      return <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,95,87,0.15)' }}><Heart className="w-5 h-5" style={{ color: '#FF5F57' }} /></div>
    }
    if (type === 'wallet' || type === 'payment_received') {
      return <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,212,255,0.15)' }}><Gift className="w-5 h-5" style={{ color: '#00D4FF' }} /></div>
    }
    return <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}><Bell className="w-5 h-5 text-white/40" /></div>
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col animate-slide-up"
        style={{ background: '#1A1A2E', maxHeight: '85vh' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: '#C8F135' }} />
            <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Notifications</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-8 safe-bottom max-w-2xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col gap-3 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#252540' }} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">🫧</p>
              <p className="font-semibold text-white/50">No notifications yet</p>
              <p className="text-sm text-white/30 mt-1">When someone sends you a Fizz, you&apos;ll see it here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              {notifications.map(n => (
                <div
                  key={n._id}
                  className="flex items-start gap-3 p-3 rounded-2xl transition-colors"
                  style={{ background: n.read ? 'transparent' : 'rgba(200,241,53,0.05)', border: n.read ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(200,241,53,0.12)' }}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-snug">{n.title}</p>
                    {n.message && (
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{n.message}</p>
                    )}
                    {n.data?.amount && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-xs font-black" style={{ color: '#C8F135' }}>${n.data.amount.toFixed(2)}</span>
                        {n.data.venueName && (
                          <span className="flex items-center gap-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <MapPin className="w-3 h-3" /> {n.data.venueName}
                          </span>
                        )}
                      </div>
                    )}
                    {n.createdAt && (
                      <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#C8F135' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
