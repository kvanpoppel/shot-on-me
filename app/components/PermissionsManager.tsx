'use client'

import { useState, useEffect } from 'react'
import { MapPin, Camera, Users, Bell, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt' | 'unavailable'
  camera: 'granted' | 'denied' | 'prompt' | 'unavailable'
  contacts: 'granted' | 'denied' | 'prompt' | 'unavailable'
  notifications: 'granted' | 'denied' | 'prompt' | 'unavailable'
}

interface PermissionsManagerProps {
  onComplete?: () => void
  showOnMount?: boolean
}

export default function PermissionsManager({ onComplete, showOnMount = true }: PermissionsManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: 'prompt',
    camera: 'prompt',
    contacts: 'prompt',
    notifications: 'prompt'
  })
  const [requesting, setRequesting] = useState<string | null>(null)

  useEffect(() => {
    if (showOnMount) {
      // Check if permissions have been requested before
      const permissionsShown = localStorage.getItem('permissions-shown')
      if (!permissionsShown) {
        checkPermissions()
        setShowModal(true)
      }
    }
  }, [showOnMount])

  const checkPermissions = async () => {
    const status: PermissionStatus = {
      location: 'unavailable',
      camera: 'unavailable',
      contacts: 'unavailable',
      notifications: 'unavailable'
    }

    // Check Location
    if ('geolocation' in navigator) {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
          status.location = result.state as 'granted' | 'denied' | 'prompt'
        } catch {
          status.location = 'prompt'
        }
      } else {
        status.location = 'prompt'
      }
    }

    // Check Camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop())
        status.camera = 'granted'
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          status.camera = 'denied'
        } else {
          status.camera = 'prompt'
        }
      }
    }

    // Check Contacts (Contacts API is only available on Android Chrome and some mobile browsers)
    if ('contacts' in navigator && 'ContactsManager' in window) {
      // API is available, but we can't check permission without requesting
      status.contacts = 'prompt'
    } else {
      // API not available (most browsers/desktop)
      status.contacts = 'unavailable'
    }

    // Check Notifications
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        status.notifications = 'granted'
      } else if (Notification.permission === 'denied') {
        status.notifications = 'denied'
      } else {
        status.notifications = 'prompt'
      }
    }

    setPermissions(status)
  }

  const requestLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve, 
          reject, 
          { 
            timeout: 30000, // 30 seconds
            enableHighAccuracy: false, // Faster on desktop
            maximumAge: 60000 // Accept cached location
          }
        )
      })
      setPermissions(prev => ({ ...prev, location: 'granted' }))
      return true
    } catch (error: any) {
      // Only set denied for actual permission errors, not timeouts
      if (error.code === error.PERMISSION_DENIED) {
        setPermissions(prev => ({ ...prev, location: 'denied' }))
      } else {
        // Timeout or other errors - keep as prompt so user can try again
        setPermissions(prev => ({ ...prev, location: 'prompt' }))
      }
      return false
    }
  }

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setPermissions(prev => ({ ...prev, camera: 'granted' }))
      return true
    } catch (error: any) {
      setPermissions(prev => ({ ...prev, camera: 'denied' }))
      return false
    }
  }

  const requestContacts = async () => {
    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
        if (contacts && contacts.length > 0) {
          setPermissions(prev => ({ ...prev, contacts: 'granted' }))
          // You could process contacts here and send to backend
          return true
        } else {
          setPermissions(prev => ({ ...prev, contacts: 'denied' }))
          return false
        }
      } else {
        // API not available - show helpful message
        alert('Contacts API is not available on this device/browser. You can still find friends by searching for their name, username, or email in the Find Friends section.')
        setPermissions(prev => ({ ...prev, contacts: 'unavailable' }))
        return false
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        setPermissions(prev => ({ ...prev, contacts: 'denied' }))
      } else {
        setPermissions(prev => ({ ...prev, contacts: 'unavailable' }))
      }
      return false
    }
  }

  const requestNotifications = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        setPermissions(prev => ({ ...prev, notifications: permission as 'granted' | 'denied' | 'prompt' }))
        return permission === 'granted'
      }
      return false
    } catch (error) {
      setPermissions(prev => ({ ...prev, notifications: 'denied' }))
      return false
    }
  }

  const handleRequestPermission = async (type: keyof PermissionStatus) => {
    setRequesting(type)
    try {
      switch (type) {
        case 'location':
          await requestLocation()
          break
        case 'camera':
          await requestCamera()
          break
        case 'contacts':
          await requestContacts()
          break
        case 'notifications':
          await requestNotifications()
          break
      }
    } finally {
      setRequesting(null)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('permissions-shown', 'true')
    setShowModal(false)
    if (onComplete) onComplete()
  }

  const handleContinue = () => {
    localStorage.setItem('permissions-shown', 'true')
    setShowModal(false)
    if (onComplete) onComplete()
  }

  const permissionSteps = [
    {
      icon: MapPin,
      title: 'Location Access',
      description: 'Find nearby venues, see friend locations, and get proximity notifications for special deals.',
      permission: 'location' as keyof PermissionStatus,
      why: 'We use your location to show you nearby venues with active promotions and help you find friends nearby.'
    },
    {
      icon: Camera,
      title: 'Camera Access',
      description: 'Take photos and videos to share moments with friends on your feed.',
      permission: 'camera' as keyof PermissionStatus,
      why: 'Capture and share your experiences at venues with photos and videos.'
    },
    {
      icon: Users,
      title: 'Contacts Access',
      description: 'Find friends who are already on Shot On Me from your contacts. (Available on mobile browsers)',
      permission: 'contacts' as keyof PermissionStatus,
      why: 'We match phone numbers to help you quickly find and connect with friends.'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Get notified about nearby deals, friend activity, and messages.',
      permission: 'notifications' as keyof PermissionStatus,
      why: 'Stay updated on promotions, friend check-ins, and important updates.'
    }
  ]

  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-md w-full backdrop-blur-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary-500 mb-2 tracking-tight">
            Enable Permissions
          </h2>
          <p className="text-primary-400 text-sm font-light">
            Grant permissions to unlock the full Shot On Me experience
          </p>
        </div>

        {/* All Permissions List */}
        <div className="space-y-3 mb-6">
          {permissionSteps.map((step) => {
            const status = permissions[step.permission]
            const Icon = step.icon
            const isRequesting = requesting === step.permission
            const isUnavailable = status === 'unavailable'
            const isGranted = status === 'granted'
            const isDenied = status === 'denied'
            const canRequest = status === 'prompt' && !isUnavailable

            return (
              <div
                key={step.permission}
                className="bg-black/40 border border-primary-500/20 rounded-lg p-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-10 h-10 border border-primary-500/30 rounded-full flex items-center justify-center bg-primary-500/10 flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-primary-500 font-semibold mb-1">{step.title}</h3>
                      <p className="text-primary-400 text-xs font-light mb-2">{step.description}</p>
                      {status !== 'prompt' && (
                        <div className="flex items-center space-x-2 mt-2">
                          {isGranted && (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400 text-xs">Granted</span>
                            </>
                          )}
                          {isDenied && (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 text-xs">Denied</span>
                            </>
                          )}
                          {isUnavailable && (
                            <>
                              <AlertCircle className="w-4 h-4 text-primary-400" />
                              <span className="text-primary-400 text-xs">Not available</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {canRequest && (
                    <button
                      onClick={() => handleRequestPermission(step.permission)}
                      disabled={isRequesting || requesting !== null}
                      className="ml-3 bg-primary-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {isRequesting ? '...' : 'Allow'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleSkip}
            className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-primary-500/10 transition-all backdrop-blur-sm"
          >
            Skip All
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

