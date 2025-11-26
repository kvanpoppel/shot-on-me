'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { MapPin, X, Bell, Sparkles } from 'lucide-react'

import { useApiUrl } from '../utils/api'

interface NearbyVenue {
  venue: {
    _id: string
    name: string
    address?: any
    location?: any
  }
  distance: string
  promotions: Array<{
    title: string
    description?: string
    type: string
  }>
}

export default function ProximityNotifications() {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const API_URL = useApiUrl()
  const [notifications, setNotifications] = useState<NearbyVenue[]>([])
  const [showNotification, setShowNotification] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<NearbyVenue | null>(null)
  const notifiedVenuesRef = useRef<Set<string>>(new Set())
  const locationWatchIdRef = useRef<number | null>(null)

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Listen for proximity notifications from socket
  useEffect(() => {
    if (!socket || !token) return

    const handleProximityNotification = (data: { venues: NearbyVenue[] }) => {
      if (data.venues && data.venues.length > 0) {
        // Filter out venues we've already notified about
        const newVenues = data.venues.filter(
          v => !notifiedVenuesRef.current.has(v.venue._id)
        )

        if (newVenues.length > 0) {
          // Mark as notified
          newVenues.forEach(v => notifiedVenuesRef.current.add(v.venue._id))
          
          // Show the closest venue first
          const closest = newVenues[0]
          setCurrentNotification(closest)
          setShowNotification(true)
          setNotifications(prev => [...newVenues, ...prev])

          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            const promo = closest.promotions[0]
            new Notification(`🎉 Special at ${closest.venue.name}!`, {
              body: `${promo.title} - ${closest.distance} km away`,
              icon: '/icon-192x192.png',
              tag: `venue-${closest.venue._id}`,
              requireInteraction: false
            })
          }
        }
      }
    }

    socket.on('proximity-notification', handleProximityNotification)

    return () => {
      socket.off('proximity-notification', handleProximityNotification)
    }
  }, [socket, token])

  // Periodically check for nearby venues (every 30 seconds when app is active)
  useEffect(() => {
    if (!token || !user) return

    const checkProximity = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              
              // Update location on server
              await axios.put(
                `${API_URL}/location/update`,
                { latitude, longitude },
                { headers: { Authorization: `Bearer ${token}` } }
              )

              // Check for nearby venues with promotions
              const response = await axios.get(
                `${API_URL}/location/check-proximity?latitude=${latitude}&longitude=${longitude}&radius=2`,
                { headers: { Authorization: `Bearer ${token}` } }
              )

              if (response.data.venues && response.data.venues.length > 0) {
                // Filter out already notified venues
                const newVenues = response.data.venues.filter(
                  (v: NearbyVenue) => !notifiedVenuesRef.current.has(v.venue._id)
                )

                if (newVenues.length > 0) {
                  newVenues.forEach((v: NearbyVenue) => {
                    notifiedVenuesRef.current.add(v.venue._id)
                  })

                  const closest = newVenues[0]
                  setCurrentNotification(closest)
                  setShowNotification(true)
                  setNotifications(prev => [...newVenues, ...prev])

                  // Browser notification
                  if ('Notification' in window && Notification.permission === 'granted') {
                    const promo = closest.promotions[0]
                    new Notification(`🎉 Special at ${closest.venue.name}!`, {
                      body: `${promo.title} - ${closest.distance} km away`,
                      icon: '/icon-192x192.png',
                      tag: `venue-${closest.venue._id}`
                    })
                  }
                }
              }
            },
            (error) => {
              console.error('Geolocation error:', error)
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
          )
        }
      } catch (error) {
        console.error('Proximity check error:', error)
      }
    }

    // Check immediately
    checkProximity()

    // Then check every 30 seconds
    const interval = setInterval(checkProximity, 30000)

    return () => clearInterval(interval)
  }, [token, user])

  const handleClose = () => {
    setShowNotification(false)
    setTimeout(() => {
      setCurrentNotification(null)
    }, 300)
  }

  if (!showNotification || !currentNotification) return null

  const promo = currentNotification.promotions[0]

  return (
    <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto animate-slide-down">
      <div className="bg-black/90 border border-primary-500/20 rounded-lg p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-2">
              <Bell className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-500 text-base tracking-tight">Nearby Special</h3>
              <p className="text-xs text-primary-400/70 font-light">{currentNotification.distance} km away</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-primary-400 hover:text-primary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-primary-500" />
            <span className="font-semibold text-primary-500">{currentNotification.venue.name}</span>
          </div>
          
          <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <span className="font-medium text-primary-400 text-sm tracking-tight">{promo.title}</span>
            </div>
            {promo.description && (
              <p className="text-sm text-primary-400/80 mt-1 font-light">{promo.description}</p>
            )}
          </div>

          <button
            onClick={() => {
              // Navigate to venues tab or show venue details
              window.location.hash = 'map'
              handleClose()
            }}
            className="w-full bg-primary-500 text-black py-2 rounded-lg font-medium hover:bg-primary-600 transition-all mt-2"
          >
            View Venue
          </button>
        </div>
      </div>
    </div>
  )
}

