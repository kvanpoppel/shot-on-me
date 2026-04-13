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

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const userIdRef = useRef<string | null>(null)

  let user = null
  let token = null
  try {
    const auth = useAuth()
    if (auth) {
      user = auth.user || null
      token = auth.token || null
    }
  } catch (error) {
    // AuthContext not available
  }

  const userId = useMemo(() => {
    if (!user) return null
    return user.id || (user as any)?._id || null
  }, [user?.id, (user as any)?._id])

  useEffect(() => {
    const currentUserId = userId
    const hasUserIdChanged = userIdRef.current !== currentUserId

    if (socketRef.current && socketRef.current.connected && !hasUserIdChanged && !!token) {
      return
    }

    if (socketRef.current && hasUserIdChanged) {
      socketRef.current.close()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }

    if (user && token && currentUserId) {
      const socketUrl = getSocketUrl()
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        forceNew: false,
        autoConnect: true,
      })

      newSocket.on('connect', () => {
        setConnected(true)
        if (token) newSocket.emit('authenticate', token)
        if (currentUserId) {
          newSocket.emit('join-user-room', currentUserId)
          userIdRef.current = currentUserId
        }
        const activityInterval = setInterval(() => {
          if (newSocket.connected) newSocket.emit('activity-ping')
        }, 120000)
        ;(newSocket as any).activityInterval = activityInterval
      })

      newSocket.on('disconnect', () => setConnected(false))

      newSocket.on('reconnect', () => {
        setConnected(true)
        if (token) newSocket.emit('authenticate', token)
        if (currentUserId) newSocket.emit('join-user-room', currentUserId)
      })

      newSocket.on('wallet-updated', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet-updated', { detail: data }))
        }
      })

      newSocket.on('notification', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socket-notification', { detail: data }))
        }
      })

      newSocket.on('new-notification', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('new-notification', { detail: data }))
        }
      })

      // Fizz-specific real-time events
      newSocket.on('fizz-message', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fizz-message', { detail: data }))
        }
      })

      newSocket.on('fizz-typing', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fizz-typing', { detail: data }))
        }
      })

      newSocket.on('fizz-notification', (data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('new-notification', { detail: data }))
        }
      })

      socketRef.current = newSocket
      setSocket(newSocket)

      return () => {
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
