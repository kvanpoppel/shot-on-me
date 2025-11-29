'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false })

export const useSocket = () => useContext(SocketContext)

// Get socket URL dynamically at runtime in browser context
const getSocketUrlForConnection = () => {
  // If environment variable is set, use it (remove /api if present)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace('/api', '')
  }
  
  // If running in browser, use current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000`
    }
  }
  
  // Default to localhost
  return 'http://localhost:5000'
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user, token } = useAuth()

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
        if (user.id || user._id) {
          const userId = user.id || user._id
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

