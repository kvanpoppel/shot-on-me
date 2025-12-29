'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { MapPin, Clock, User, Loader2 } from 'lucide-react'
import { getApiUrl } from '../utils/api'

interface CheckIn {
  _id: string
  user: {
    _id: string
    name: string
    email?: string
    profilePicture?: string
  }
  venue: {
    _id: string
    name: string
  }
  createdAt: string
}

export default function CheckInsHistory() {
  const { token } = useAuth()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [venueId, setVenueId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchVenueId()
    }
  }, [token])

  useEffect(() => {
    if (venueId && token) {
      fetchCheckIns()
    }
  }, [venueId, token])

  const fetchVenueId = async () => {
    if (!token) return
    
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const venueId = Array.isArray(response.data) 
        ? response.data[0]?._id 
        : response.data?.venues?.[0]?._id
      
      setVenueId(venueId)
    } catch (error) {
      console.error('Error fetching venue:', error)
    }
  }

  const fetchCheckIns = async () => {
    if (!venueId || !token) return

    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/checkins?venueId=${venueId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCheckIns(response.data.checkIns || [])
    } catch (error) {
      console.error('Failed to fetch check-ins:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary-500">Check-in History</h2>
        <button
          onClick={fetchCheckIns}
          className="text-xs text-primary-500/70 hover:text-primary-500 transition-colors"
        >
          Refresh
        </button>
      </div>

      {checkIns.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-lg border border-primary-500/10">
          <MapPin className="w-12 h-12 text-primary-500/50 mx-auto mb-3" />
          <p className="text-primary-400 text-sm">No check-ins yet</p>
          <p className="text-primary-400/70 text-xs mt-1">Check-ins will appear here as customers visit your venue</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {checkIns.map((checkIn) => (
            <div
              key={checkIn._id}
              className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/40 hover:bg-black/60 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                    {checkIn.user.profilePicture ? (
                      <img
                        src={checkIn.user.profilePicture}
                        alt={checkIn.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-500">{checkIn.user.name || 'Customer'}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3 text-primary-400/70" />
                      <p className="text-xs text-primary-400/70">
                        {new Date(checkIn.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-primary-500/70">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">{checkIn.venue.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

