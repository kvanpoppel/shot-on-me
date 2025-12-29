'use client'

import { useEffect, useState } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export type UserStatus = 'online' | 'away' | 'offline'

interface StatusIndicatorProps {
  userId: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-500'
}

const statusLabels = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline'
}

export default function StatusIndicator({ 
  userId, 
  size = 'md', 
  showLabel = false,
  className = '' 
}: StatusIndicatorProps) {
  const [status, setStatus] = useState<UserStatus>('offline')
  const { socket } = useSocket()
  const { token } = useAuth()
  const API_URL = useApiUrl()

  useEffect(() => {
    if (!userId || !token) return

    // Fetch initial status
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/${userId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setStatus(response.data.status || 'offline')
      } catch (error) {
        console.error('Error fetching user status:', error)
        setStatus('offline')
      }
    }

    fetchStatus()

    // Listen for real-time status updates
    if (socket) {
      const handleStatusUpdate = (data: { userId: string; status: UserStatus }) => {
        if (data.userId === userId) {
          setStatus(data.status)
        }
      }

      socket.on('user-status-update', handleStatusUpdate)

      return () => {
        socket.off('user-status-update', handleStatusUpdate)
      }
    }
  }, [userId, token, socket, API_URL])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full ${statusColors[status]} border-2 border-black`} />
        {status === 'online' && (
          <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full ${statusColors[status]} opacity-60 blur-sm`} />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-primary-400">
          {statusLabels[status]}
        </span>
      )}
    </div>
  )
}

