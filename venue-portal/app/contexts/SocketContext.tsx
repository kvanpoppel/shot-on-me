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
      })

      newSocket.on('connect', () => {
        console.log('Venue Portal: Connected to Socket.io')
        setConnected(true)
        
        // Join venue-specific rooms for real-time updates
        if (user.id) {
          newSocket.emit('join-room', `user-${user.id}`)
          newSocket.emit('join-room', 'promotions')
          newSocket.emit('join-room', 'venues')
        }
      })

      newSocket.on('disconnect', () => {
        console.log('Venue Portal: Disconnected from Socket.io')
        setConnected(false)
      })

      newSocket.on('error', (error) => {
        console.error('Venue Portal Socket.io error:', error)
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


