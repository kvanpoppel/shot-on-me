'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { MapPin, Users, Navigation, X, User } from 'lucide-react'
import GoogleMapComponent from './GoogleMap'

import { useApiUrl } from '../utils/api'

interface LocationFinderProps {
  isOpen: boolean
  onClose: () => void
  onViewProfile?: (userId: string) => void
}

export default function LocationFinder({ isOpen, onClose, onViewProfile }: LocationFinderProps) {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [friends, setFriends] = useState<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && token) {
      fetchFriends()
      getCurrentLocation()
    }
  }, [isOpen, token])

  // Real-time location updates
  useEffect(() => {
    if (!socket || !isOpen) return

    const handleLocationUpdate = (data: { userId: string; location: any }) => {
      setFriends((prevFriends) =>
        prevFriends.map((friend) =>
          friend._id === data.userId
            ? { ...friend, location: data.location }
            : friend
        )
      )
    }

    socket.on('location-updated', handleLocationUpdate)
    socket.on('friend-location-update', handleLocationUpdate)

    return () => {
      socket.off('location-updated', handleLocationUpdate)
      socket.off('friend-location-update', handleLocationUpdate)
    }
  }, [socket, isOpen])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(loc)
          updateLocation(loc.lat, loc.lng)
        },
        (error) => {
          // Only log non-timeout errors (timeouts are expected on desktop)
          if (error.code !== error.TIMEOUT) {
            console.error('Geolocation error:', error)
            if (error.code === error.PERMISSION_DENIED) {
              alert('Location permission denied. Please enable location access in Settings → App Permissions to see friends on the map.')
            }
          }
          // Silently handle timeout - it's expected on desktop browsers
        },
        {
          enableHighAccuracy: false, // Use less accurate but faster location on desktop
          timeout: 30000, // 30 seconds timeout
          maximumAge: 60000 // Accept cached location up to 1 minute old
        }
      )
    } else {
      alert('Geolocation is not supported by your browser.')
    }
  }

  const updateLocation = async (lat: number, lng: number) => {
    if (!token) return
    try {
      await axios.put(
        `${API_URL}/location/update`,
        { latitude: lat, longitude: lng },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch (error) {
      console.error('Failed to update location:', error)
    }
  }

  const fetchFriends = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/location/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFriends(response.data.friends || [])
    } catch (error) {
      console.error('Failed to fetch friends:', error)
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return (R * c).toFixed(1)
  }

  const getDirections = (friendLocation: { lat: number; lng: number }) => {
    if (!userLocation) return
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${friendLocation.lat},${friendLocation.lng}`
    window.open(url, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-primary-500">Find Friends</h1>
          </div>
          <button
            onClick={getCurrentLocation}
            className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-full transition-colors"
          >
            <Navigation className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Map Container - Google Maps */}
      <div ref={mapRef} className="w-full h-full relative">
        {userLocation ? (
          <GoogleMapComponent
            center={userLocation}
            zoom={13}
            markers={useMemo(() => {
              const markers: Array<{
                id: string
                position: { lat: number; lng: number }
                label?: string
                title?: string
                icon?: string | { url: string; scaledSize?: { width: number; height: number }; anchor?: { x: number; y: number } }
                onClick?: () => void
              }> = []

              // Add user location marker
              markers.push({
                id: 'user',
                position: userLocation,
                title: 'You',
                label: 'You'
              })

              // Add friend markers
              friends.forEach((friend) => {
                if (!friend.location) return

                const distance = calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  friend.location.latitude,
                  friend.location.longitude
                )

                markers.push({
                  id: friend._id || friend.id,
                  position: {
                    lat: friend.location.latitude,
                    lng: friend.location.longitude
                  },
                  title: `${friend.firstName} ${friend.lastName} - ${distance} mi away`,
                  label: friend.firstName?.[0] || 'F',
                  onClick: () => setSelectedFriend(friend)
                })
              })

              return markers
            }, [userLocation, friends, user])}
            mapContainerStyle={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-primary-400">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Requesting location...</p>
              <p className="text-sm mt-2">Please allow location access</p>
            </div>
          </div>
        )}
      </div>

      {/* Friends List Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-primary-500/20 rounded-t-3xl p-4 max-h-64 overflow-y-auto">
        <h3 className="text-primary-500 font-semibold mb-3 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Nearby Friends ({friends.filter(f => f.location).length})
        </h3>
        <div className="space-y-2">
          {friends.filter(f => f.location).length === 0 ? (
            <p className="text-primary-400 text-sm text-center py-4">No friends nearby</p>
          ) : (
            friends
              .filter((f) => f.location)
              .map((friend) => {
                const distance = userLocation
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      friend.location.latitude,
                      friend.location.longitude
                    )
                  : null

                return (
                  <div
                    key={friend._id}
                    onClick={() => {
                      if (onViewProfile) {
                        onViewProfile(friend._id)
                        onClose()
                      } else {
                        setSelectedFriend(friend)
                      }
                    }}
                    className="flex items-center space-x-3 p-3 bg-black/50 border border-primary-500/20 rounded-lg hover:bg-primary-500/10 cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 border-2 border-primary-500 rounded-full overflow-hidden flex-shrink-0">
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt={friend.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/20">
                          <span className="text-primary-500 font-bold text-xs">
                            {friend.firstName?.[0]}{friend.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-primary-500 font-semibold text-sm truncate">
                        {friend.firstName} {friend.lastName}
                      </p>
                      {distance && (
                        <p className="text-primary-400 text-xs">{distance} miles away</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (friend.location) {
                          getDirections(friend.location)
                        }
                      }}
                      className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  </div>
                )
              })
          )}
        </div>
      </div>

      {/* Friend Details Modal */}
      {selectedFriend && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500 rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 border-2 border-primary-500 rounded-full overflow-hidden">
                {selectedFriend.profilePicture ? (
                  <img src={selectedFriend.profilePicture} alt={selectedFriend.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-500/20">
                    <span className="text-primary-500 font-bold text-lg">
                      {selectedFriend.firstName?.[0]}{selectedFriend.lastName?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary-500">
                  {selectedFriend.firstName} {selectedFriend.lastName}
                </h3>
                {userLocation && selectedFriend.location && (
                  <p className="text-primary-400 text-sm">
                    {calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      selectedFriend.location.latitude,
                      selectedFriend.location.longitude
                    )} miles away
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              {selectedFriend.location && (
                <button
                  onClick={() => {
                    getDirections(selectedFriend.location)
                    setSelectedFriend(null)
                  }}
                  className="flex-1 bg-primary-500 text-black py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all flex items-center justify-center space-x-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Directions</span>
                </button>
              )}
              {onViewProfile && (
                <button
                  onClick={() => {
                    onViewProfile(selectedFriend._id)
                    setSelectedFriend(null)
                    onClose()
                  }}
                  className="flex-1 bg-primary-500/10 border border-primary-500/20 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/20 transition-all"
                >
                  View Profile
                </button>
              )}
              <button
                onClick={() => setSelectedFriend(null)}
                className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/10 transition-all backdrop-blur-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

