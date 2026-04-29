'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
interface SocketContextType { socket: Socket | null; connected: boolean }
const SocketContext = createContext<SocketContextType>({ socket: null, connected: false })
export const useSocket = () => useContext(SocketContext)
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api$/, '') || 'https://shot-on-me.onrender.com'
export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user, token } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; setSocket(null); setConnected(false) }
      return
    }
    const newSocket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 5, timeout: 10000 })
    socketRef.current = newSocket
    newSocket.on('connect', () => {
      setConnected(true)
      if (user.id) {
        newSocket.emit('join-room', `user-${user.id}`)
        if ((user as any).venueId) newSocket.emit('join-room', `venue-${(user as any).venueId}`)
      }
    })
    newSocket.on('disconnect', () => setConnected(false))
    newSocket.on('connect_error', (err) => console.error('Socket connect error:', err?.message))
    setSocket(newSocket)
    return () => { newSocket.disconnect(); socketRef.current = null }
  }, [user?.id, token])
  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>
}
