'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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
// Now uses centralized getSocketUrl() function for consistency
const getSocketUrlForConnection = () => {
  return getSocketUrl()
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  
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

  useEffect(() => {
    if (user && token) {
      const newSocket = io(getSocketUrlForConnection(), {
        auth: { token },
        transports: ['websocket', 'polling'],
      })

      newSocket.on('connect', () => {
        console.log('Connected to Socket.io')
        setConnected(true)
        
        // Join user-specific room for notifications
        if (user.id || (user as any)._id) {
          const userId = user.id || (user as any)._id
          newSocket.emit('join-user-room', userId)
          console.log('Joined notification room for user:', userId)
        }
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.io')
        setConnected(false)
      })

      newSocket.on('error', (error) => {
        console.error('Socket.io error:', error)
      })

      // Listen for wallet updates
      newSocket.on('wallet-updated', (data: { userId: string; balance: number }) => {
        console.log('Wallet updated via Socket.io:', data)
        // Emit custom event that components can listen to
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet-updated', { detail: data }))
        }
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    } else {
      if (socket) {
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

