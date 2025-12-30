'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { getSocketUrl } from '../utils/api'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false })

export const useSocket = () => useContext(SocketContext)

// Get socket URL dynamically at runtime in browser context
// Priority: NEXT_PUBLIC_SOCKET_URL env var, then getSocketUrl() fallback
const getSocketUrlForConnection = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.trim()
  }
  return getSocketUrl()
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const userIdRef = useRef<string | null>(null)
  
  // Safely get auth context - don't crash if AuthProvider fails
  let user = null
  let token = null
  try {
    const auth = useAuth()
    if (auth) {
      user = auth.user || null
      token = auth.token || null
    }
  } catch (error) {
    console.warn('SocketProvider: Could not access AuthContext:', error)
  }

  // Get stable user ID for comparison
  const userId = useMemo(() => {
    if (!user) return null
    return user.id || (user as any)?._id || null
  }, [user?.id, (user as any)?._id])

  useEffect(() => {
    // Only reconnect if user ID or token actually changed
    const currentUserId = userId
    const hasUserIdChanged = userIdRef.current !== currentUserId
    const hasToken = !!token
    
    // If we already have a socket and nothing changed, don't reconnect
    if (socketRef.current && socketRef.current.connected && !hasUserIdChanged && hasToken) {
      return
    }

    // Clean up existing socket if user changed
    if (socketRef.current && hasUserIdChanged) {
      console.log('User changed, closing existing socket')
      socketRef.current.close()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }

    if (user && token && currentUserId) {
      const socketUrl = getSocketUrlForConnection()
      console.log('🔌 Connecting Socket.io to:', socketUrl)
      
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000, // 20 second connection timeout
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity, // Keep trying to reconnect
        // Exponential backoff
        randomizationFactor: 0.5,
        // Force new connection to avoid stale connections
        forceNew: false,
        // Auto-connect
        autoConnect: true,
      })

      newSocket.on('connect', () => {
        console.log('Connected to Socket.io')
        setConnected(true)
        
        // Authenticate socket connection
        if (token) {
          newSocket.emit('authenticate', token)
        }
        
        // Join user-specific room for notifications
        if (currentUserId) {
          newSocket.emit('join-user-room', currentUserId)
          console.log('Joined notification room for user:', currentUserId)
          userIdRef.current = currentUserId
        }
        
        // Send activity ping every 2 minutes to keep status as online
        const activityInterval = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit('activity-ping')
          }
        }, 120000) // 2 minutes
        
        // Store interval ID for cleanup
        ;(newSocket as any).activityInterval = activityInterval
      })
      
      newSocket.on('authenticated', (data: { success: boolean }) => {
        if (data.success) {
          console.log('✅ Socket authenticated successfully')
          console.log('🎯 Real-time features enabled:')
          console.log('   • Wallet updates')
          console.log('   • Card creation notifications')
          console.log('   • Payment processing')
          console.log('   • Feed updates')
          console.log('   • Location sharing')
          console.log('   • Messages')
          console.log('   • Notifications')
        } else {
          console.warn('⚠️ Socket authentication failed')
        }
      })

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.io:', reason)
        setConnected(false)
        
        // Don't manually reconnect - let Socket.io handle it automatically
        // Only manual disconnect reasons: 'io client disconnect' (user action)
        // All other reasons (transport close, ping timeout, etc.) will auto-reconnect
      })

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to Socket.io after', attemptNumber, 'attempts')
        setConnected(true)
        
        // Re-authenticate after reconnection
        if (token) {
          newSocket.emit('authenticate', token)
        }
        
        // Re-join user room
        if (currentUserId) {
          newSocket.emit('join-user-room', currentUserId)
        }
      })

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Attempting to reconnect to Socket.io (attempt', attemptNumber, ')')
      })

      newSocket.on('reconnect_error', (error) => {
        console.warn('Socket.io reconnection error:', error)
      })

      newSocket.on('reconnect_failed', () => {
        console.error('Socket.io reconnection failed after all attempts')
        setConnected(false)
      })

      newSocket.on('error', (error) => {
        console.error('Socket.io error:', error)
      })

      // Listen for wallet updates
      newSocket.on('wallet-updated', (data: { userId: string; balance: number }) => {
        console.log('💰 Wallet updated via Socket.io:', data)
        // Emit custom event that components can listen to
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet-updated', { detail: data }))
        }
      })

      // Listen for card creation
      newSocket.on('card-created', (data: any) => {
        console.log('💳 Card created via Socket.io:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('card-created', { detail: data }))
        }
      })

      // Listen for payment processing
      newSocket.on('payment-processed', (data: any) => {
        console.log('💸 Payment processed via Socket.io:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('payment-processed', { detail: data }))
        }
      })

      // Listen for notifications
      newSocket.on('notification', (data: any) => {
        console.log('🔔 Notification received via Socket.io:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socket-notification', { detail: data }))
          
          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(data.title || 'Shot On Me', {
              body: data.message || data.text || data.content,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: data.id || data.notification?._id || 'notification',
              requireInteraction: false
            })
          }
        }
      })

      // Listen for new-notification events (from backend)
      newSocket.on('new-notification', (data: any) => {
        console.log('🔔 New notification event:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('new-notification', { detail: data }))
          
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
      })

      // Listen for feed updates
      newSocket.on('new-post', (data: any) => {
        console.log('📝 New post via Socket.io:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('new-post', { detail: data }))
        }
      })

      // Listen for location updates
      newSocket.on('location-updated', (data: any) => {
        console.log('📍 Location updated via Socket.io:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('location-updated', { detail: data }))
        }
      })

      socketRef.current = newSocket
      setSocket(newSocket)

      return () => {
        // Clear activity ping interval
        if ((newSocket as any).activityInterval) {
          clearInterval((newSocket as any).activityInterval)
        }
        newSocket.close()
        socketRef.current = null
      }
    } else {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
        setSocket(null)
        setConnected(false)
        userIdRef.current = null
      }
    }
  }, [userId, token])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

