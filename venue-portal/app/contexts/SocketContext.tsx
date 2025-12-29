'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false })

export const useSocket = () => useContext(SocketContext)

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user, token } = useAuth()

  useEffect(() => {
    if (user && token) {
      const newSocket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000,
      })

      newSocket.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Venue Portal: Connected to Socket.io')
        }
        setConnected(true)
        
        // Join venue-specific rooms for real-time updates
        if (user.id) {
          newSocket.emit('join-room', `user-${user.id}`)
          newSocket.emit('join-room', 'promotions')
          newSocket.emit('join-room', 'venues')
        }
      })

      newSocket.on('disconnect', (reason) => {
        // Only log unexpected disconnects
        if (reason !== 'io client disconnect' && process.env.NODE_ENV === 'development') {
          console.debug('Venue Portal: Disconnected from Socket.io', reason)
        }
        setConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        // Silently handle connection errors - don't spam console
        // These are expected during initial connection attempts
        if (error.message.includes('websocket') || error.message.includes('closed')) {
          // WebSocket connection failed, will retry with polling - this is normal
          return
        }
        // Only log persistent connection errors
        if (process.env.NODE_ENV === 'development') {
          console.debug('Venue Portal Socket.io connection retry:', error.message)
        }
      })

      newSocket.on('error', (error) => {
        // Only log actual errors, not connection retries
        if (process.env.NODE_ENV === 'development') {
          console.debug('Venue Portal Socket.io error:', error)
        }
      })

      setSocket(newSocket)

      return () => {
        if (newSocket.connected) {
          newSocket.disconnect()
        }
        newSocket.close()
      }
    } else {
      if (socket) {
        if (socket.connected) {
          socket.disconnect()
        }
        socket.close()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [user, token])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}


