'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { Users } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function FollowerCount() {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [followerCount, setFollowerCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [venueId, setVenueId] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !user) return
    fetchVenue()
  }, [token, user])

  // Listen for real-time follower updates
  useEffect(() => {
    if (!socket || !venueId) return

    const handleFollowerUpdate = (data: { venueId: string; followerCount: number }) => {
      if (data.venueId === venueId) {
        setFollowerCount(data.followerCount)
      }
    }

    socket.on('venue-followers-updated', handleFollowerUpdate)

    return () => {
      socket.off('venue-followers-updated', handleFollowerUpdate)
    }
  }, [socket, venueId])

  const fetchVenue = async () => {
    if (!token || !user) return
    try {
      // Get user's venue
      const venuesResponse = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venues = venuesResponse.data.venues || []
      
      // Find venue owned by current user
      let myVenue = null
      if (venues.length > 0 && venues[0].venue) {
        myVenue = venues[0].venue
      } else {
        myVenue = venues.find((v: any) => {
          const venueOwnerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
          const userId = user.id?.toString() || (user as any)._id?.toString()
          return venueOwnerId === userId
        })
      }

      if (myVenue) {
        const vid = myVenue._id?.toString() || myVenue.id?.toString() || myVenue._id || myVenue.id
        setVenueId(vid)
        
        // Get follower count
        try {
          const followersResponse = await axios.get(`${API_URL}/venues/${vid}/followers`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          setFollowerCount(followersResponse.data.followerCount || 0)
        } catch (error) {
          // If endpoint fails, use followerCount from venue object
          setFollowerCount(myVenue.followerCount || 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch venue:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-primary-500" />
          <span className="text-primary-400/70 text-sm font-light">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 hover:border-primary-500/25 hover:bg-black/50 transition-all backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
            <Users className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-primary-400/70 uppercase tracking-wider mb-0.5">Followers</p>
            <p className="text-lg font-semibold text-primary-500 tracking-tight">{followerCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

