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
      let permissionsShown = null
      try {
        permissionsShown = localStorage.getItem('permissions-shown')
      } catch (err) {
        // Tracking prevention or localStorage blocked - show modal anyway
        permissionsShown = null
      }
      if (!permissionsShown) {
        checkPermissions()
        setShowModal(true)
      }
    } else {
      // If showOnMount is false, always show when component mounts (called from Settings)
      checkPermissions()
      setShowModal(true)
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
          
          // Listen for permission changes
          result.onchange = () => {
            setPermissions(prev => ({ ...prev, location: result.state as 'granted' | 'denied' | 'prompt' }))
          }
        } catch {
          status.location = 'prompt'
        }
      } else {
        status.location = 'prompt'
      }
    }

    // Check Camera - don't request, just check if available
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      status.camera = 'prompt' // Assume prompt if available
    }

    // Check Contacts (Contacts API is only available on Android Chrome and some mobile browsers)
    if ('contacts' in navigator && 'ContactsManager' in window) {
      status.contacts = 'prompt'
    } else {
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
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not available in this browser')
      return false
    }
    
    setRequesting('location')
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 5000,
          enableHighAccuracy: true,
          maximumAge: 60000
        })
      })
      setPermissions(prev => ({ ...prev, location: 'granted' }))
      return true
    } catch (error) {
      console.warn('Location permission request failed:', error)
      setPermissions(prev => ({ ...prev, location: 'denied' }))
      return false
    } finally {
      setRequesting(null)
    }
  }

  const requestCamera = async () => {
    setRequesting('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setPermissions(prev => ({ ...prev, camera: 'granted' }))
      return true
    } catch (error: any) {
      setPermissions(prev => ({ ...prev, camera: 'denied' }))
      return false
    } finally {
      setRequesting(null)
    }
  }

  const requestContacts = async () => {
    setRequesting('contacts')
    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
        if (contacts && contacts.length > 0) {
          setPermissions(prev => ({ ...prev, contacts: 'granted' }))
          return true
        } else {
          setPermissions(prev => ({ ...prev, contacts: 'denied' }))
          return false
        }
      } else {
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
    } finally {
      setRequesting(null)
    }
  }

  const requestNotifications = async () => {
    setRequesting('notifications')
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
    } finally {
      setRequesting(null)
    }
  }

  const handleRequestPermission = async (type: keyof PermissionStatus) => {
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
    // Refresh permissions after request
    setTimeout(() => checkPermissions(), 500)
  }

  const handleClose = () => {
    setShowModal(false)
    if (onComplete) onComplete()
  }

  const permissionList = [
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

  const getStatusIcon = (status: string) => {
    if (status === 'granted') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    } else if (status === 'unavailable') {
      return <AlertCircle className="w-5 h-5 text-primary-400" />
    } else if (status === 'denied') {
      return <AlertCircle className="w-5 h-5 text-red-400" />
    }
    return null
  }

  const getStatusText = (status: string) => {
    if (status === 'granted') return 'Granted'
    if (status === 'unavailable') return 'Not Available'
    if (status === 'denied') return 'Denied'
    return 'Not Set'
  }

  const getStatusColor = (status: string) => {
    if (status === 'granted') return 'text-emerald-400'
    if (status === 'unavailable') return 'text-primary-400'
    if (status === 'denied') return 'text-red-400'
    return 'text-primary-400'
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-2xl w-full backdrop-blur-md my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary-500 tracking-tight">App Permissions</h2>
          <button
            onClick={handleClose}
            className="text-primary-400 hover:text-primary-500 transition-all"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* All Permissions List */}
        <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
          {permissionList.map((perm) => {
            const Icon = perm.icon
            const status = permissions[perm.permission]
            const isRequesting = requesting === perm.permission
            const canRequest = status === 'prompt' && !isRequesting

            return (
              <div
                key={perm.permission}
                className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 border-2 border-primary-500/30 rounded-full flex items-center justify-center bg-primary-500/10 flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-primary-500">{perm.title}</h3>
                      {getStatusIcon(status) && (
                        <div className={`flex items-center gap-2 ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          <span className="text-sm font-medium">{getStatusText(status)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-primary-400/80 mb-2 font-light">{perm.description}</p>
                    <div className="bg-black/40 border border-primary-500/10 rounded p-2 mb-3">
                      <p className="text-xs text-primary-400/70 font-light">
                        <span className="text-primary-500 font-medium">Why:</span> {perm.why}
                      </p>
                    </div>

                    {/* Status and Action */}
                    <div className="flex items-center justify-between">
                      <div className={`text-sm font-medium ${getStatusColor(status)}`}>
                        Status: {getStatusText(status)}
                      </div>
                      {canRequest && (
                        <button
                          onClick={() => handleRequestPermission(perm.permission)}
                          disabled={isRequesting}
                          className="px-4 py-2 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {isRequesting ? 'Requesting...' : 'Allow'}
                        </button>
                      )}
                      {status === 'granted' && (
                        <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
                          ✓ Enabled
                        </div>
                      )}
                      {status === 'denied' && (
                        <div className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium">
                          Blocked
                        </div>
                      )}
                      {status === 'unavailable' && (
                        <div className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium">
                          Not Available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-primary-500/10">
          <button
            onClick={handleClose}
            className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
