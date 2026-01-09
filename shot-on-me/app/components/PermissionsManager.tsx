'use client'

import { useState, useEffect } from 'react'
import { MapPin, Camera, Users, Bell, X } from 'lucide-react'

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
        permissionsShown = null
      }
      if (!permissionsShown) {
        checkPermissions()
        setShowModal(true)
      }
    } else {
      checkPermissions()
      setShowModal(true)
    }
  }, [showOnMount])

  // Re-check permissions periodically
  useEffect(() => {
    if (!showModal) return
    const interval = setInterval(() => {
      checkPermissions()
    }, 2000)
    return () => clearInterval(interval)
  }, [showModal])

  const checkPermissions = async () => {
    const status: PermissionStatus = {
      location: 'unavailable',
      camera: 'unavailable',
      contacts: 'unavailable',
      notifications: 'unavailable'
    }

    // Check Location - More thorough check
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
            status.location = result.state as 'granted' | 'denied' | 'prompt'
            
            result.onchange = () => {
              setPermissions(prev => ({ ...prev, location: result.state as 'granted' | 'denied' | 'prompt' }))
            }
          } catch {
            // Fallback: geolocation exists, so it's at least prompt
            status.location = 'prompt'
          }
        } else {
          // No permissions API, but geolocation exists - assume prompt
          status.location = 'prompt'
        }
      } catch (e) {
        // If geolocation exists, default to prompt
        status.location = 'prompt'
      }
    }

    // Check Camera - Actually check permission status
    const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
    if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
      try {
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
            status.camera = result.state as 'granted' | 'denied' | 'prompt'
            
            result.onchange = () => {
              setPermissions(prev => ({ ...prev, camera: result.state as 'granted' | 'denied' | 'prompt' }))
            }
          } catch {
            // Fallback: check by trying to enumerate devices
            try {
              if (mediaDevices && typeof mediaDevices.enumerateDevices === 'function') {
                const devices = await mediaDevices.enumerateDevices()
                const hasVideo = devices.some(device => device.kind === 'videoinput')
                status.camera = hasVideo ? 'prompt' : 'unavailable'
              } else {
                status.camera = 'prompt'
              }
            } catch {
              status.camera = 'prompt'
            }
          }
        } else {
          // No permissions API, check if camera devices exist
          try {
            if (mediaDevices && typeof mediaDevices.enumerateDevices === 'function') {
              const devices = await mediaDevices.enumerateDevices()
              const hasVideo = devices.some(device => device.kind === 'videoinput')
              status.camera = hasVideo ? 'prompt' : 'unavailable'
            } else {
              status.camera = 'prompt'
            }
          } catch {
            status.camera = 'prompt'
          }
        }
      } catch (e) {
        status.camera = 'prompt'
      }
    }

    // Check Contacts - Multiple API support with better detection
    try {
      const contactsPermission = localStorage.getItem('contacts-permission')
      if (contactsPermission === 'granted') {
        status.contacts = 'granted'
      } else if (typeof navigator !== 'undefined' && 'contacts' in navigator) {
        // Android Chrome ContactsManager API
        if (typeof window !== 'undefined' && 'ContactsManager' in window) {
          status.contacts = 'prompt'
        }
        // iOS Safari and newer browsers Contact Picker API
        else if (navigator.contacts && typeof (navigator.contacts as any).getContacts === 'function') {
          status.contacts = 'prompt'
        } else {
          // On mobile devices, contacts might be available even if not detected
          // Check if we're on a mobile device
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          status.contacts = isMobile ? 'prompt' : 'unavailable'
        }
      } else {
        // Check for iOS Contact Picker (different API)
        if (typeof window !== 'undefined' && typeof (window as any).ContactsPicker !== 'undefined') {
          status.contacts = 'prompt'
        } else {
          // On mobile devices, assume contacts might be available
          const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          status.contacts = isMobile ? 'prompt' : 'unavailable'
        }
      }
    } catch (e) {
      // On mobile, default to prompt for contacts
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      status.contacts = isMobile ? 'prompt' : 'unavailable'
    }

    // Check Notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const notificationPermission = Notification.permission
      if (notificationPermission === 'granted') {
        status.notifications = 'granted'
      } else if (notificationPermission === 'denied') {
        status.notifications = 'denied'
      } else {
        status.notifications = 'prompt'
      }
    } else {
      // Notifications not supported
      status.notifications = 'unavailable'
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
        navigator.geolocation.getCurrentPosition(
          resolve, 
          reject, 
          { 
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 60000
          }
        )
      })
      setPermissions(prev => ({ ...prev, location: 'granted' }))
      setTimeout(() => checkPermissions(), 500)
      return true
    } catch (error: any) {
      console.warn('Location permission request failed:', error)
      const newStatus = error.code === 1 ? 'denied' : 'prompt'
      setPermissions(prev => ({ ...prev, location: newStatus }))
      setTimeout(() => checkPermissions(), 500)
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
      setTimeout(() => checkPermissions(), 500)
      return true
    } catch (error: any) {
      console.warn('Camera permission request failed:', error)
      const newStatus = error.name === 'NotAllowedError' ? 'denied' : 'prompt'
      setPermissions(prev => ({ ...prev, camera: newStatus }))
      setTimeout(() => checkPermissions(), 500)
      return false
    } finally {
      setRequesting(null)
    }
  }

  const requestContacts = async () => {
    setRequesting('contacts')
    try {
      // Android Chrome ContactsManager API
      if ('contacts' in navigator && 'ContactsManager' in window) {
        try {
          const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
          if (contacts && contacts.length > 0) {
            setPermissions(prev => ({ ...prev, contacts: 'granted' }))
            try {
              localStorage.setItem('contacts-permission', 'granted')
            } catch (e) {}
            setTimeout(() => checkPermissions(), 500)
            return true
          } else {
            setPermissions(prev => ({ ...prev, contacts: 'denied' }))
            setTimeout(() => checkPermissions(), 500)
            return false
          }
        } catch (selectError: any) {
          if (selectError.name === 'NotAllowedError' || selectError.name === 'AbortError') {
            setPermissions(prev => ({ ...prev, contacts: 'denied' }))
          } else {
            setPermissions(prev => ({ ...prev, contacts: 'unavailable' }))
          }
          setTimeout(() => checkPermissions(), 500)
          return false
        }
      } 
      // iOS Safari and newer browsers Contact Picker API
      else if ('contacts' in navigator && navigator.contacts && typeof (navigator.contacts as any).getContacts === 'function') {
        try {
          const contacts = await (navigator as any).contacts.getContacts({
            properties: ['name', 'tel', 'email']
          })
          if (contacts && contacts.length > 0) {
            setPermissions(prev => ({ ...prev, contacts: 'granted' }))
            try {
              localStorage.setItem('contacts-permission', 'granted')
            } catch (e) {}
            setTimeout(() => checkPermissions(), 500)
            return true
          } else {
            setPermissions(prev => ({ ...prev, contacts: 'denied' }))
            setTimeout(() => checkPermissions(), 500)
            return false
          }
        } catch (getError: any) {
          if (getError.name === 'NotAllowedError' || getError.name === 'AbortError') {
            setPermissions(prev => ({ ...prev, contacts: 'denied' }))
          } else {
            setPermissions(prev => ({ ...prev, contacts: 'unavailable' }))
          }
          setTimeout(() => checkPermissions(), 500)
          return false
        }
      }
      // iOS Contact Picker (alternative)
      else if (typeof (window as any).ContactsPicker !== 'undefined') {
        try {
          const contacts = await (window as any).ContactsPicker.pick()
          if (contacts && contacts.length > 0) {
            setPermissions(prev => ({ ...prev, contacts: 'granted' }))
            try {
              localStorage.setItem('contacts-permission', 'granted')
            } catch (e) {}
            setTimeout(() => checkPermissions(), 500)
            return true
          } else {
            setPermissions(prev => ({ ...prev, contacts: 'denied' }))
            setTimeout(() => checkPermissions(), 500)
            return false
          }
        } catch (pickerError: any) {
          if (pickerError.name === 'NotAllowedError' || pickerError.name === 'AbortError') {
            setPermissions(prev => ({ ...prev, contacts: 'denied' }))
          } else {
            setPermissions(prev => ({ ...prev, contacts: 'unavailable' }))
          }
          setTimeout(() => checkPermissions(), 500)
          return false
        }
      }
      else {
        alert('Contacts API is not directly available on this device. You can use the "Import from Contacts" button in Find Friends or manually search for friends.')
        setPermissions(prev => ({ ...prev, contacts: 'unavailable' }))
        return false
      }
    } catch (error: any) {
      console.error('Contacts permission error:', error)
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        setPermissions(prev => ({ ...prev, contacts: 'denied' }))
      } else {
        setPermissions(prev => ({ ...prev, contacts: 'unavailable' }))
      }
      setTimeout(() => checkPermissions(), 500)
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
        setTimeout(() => checkPermissions(), 500)
        return permission === 'granted'
      }
      return false
    } catch (error) {
      setPermissions(prev => ({ ...prev, notifications: 'denied' }))
      setTimeout(() => checkPermissions(), 500)
      return false
    } finally {
      setRequesting(null)
    }
  }

  const handleToggle = async (type: keyof PermissionStatus) => {
    const currentStatus = permissions[type]
    
    // If already granted, we can't toggle off (user would need to change in browser settings)
    if (currentStatus === 'granted') {
      alert(`To disable ${type} permission, please go to your browser settings.`)
      return
    }
    
    // If denied, try to request again (some browsers allow re-prompting)
    if (currentStatus === 'denied') {
      // For location and notifications, we can still try to request
      if (type === 'location' || type === 'notifications') {
        // Continue to request - browser might allow it
      } else {
        alert(`Permission was previously denied. Please enable ${type} in your browser settings.`)
        return
      }
    }
    
    // If unavailable, still try to request (might work on some devices)
    if (currentStatus === 'unavailable') {
      // For mobile devices, still try to request
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (!isMobile && type !== 'location' && type !== 'notifications') {
        alert(`${type} permission is not available on this device or browser.`)
        return
      }
      // Continue to request anyway
    }
    
    // Request permission
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
  }

  const handleClose = () => {
    setShowModal(false)
    try {
      localStorage.setItem('permissions-shown', 'true')
    } catch (err) {
      // Ignore localStorage errors
    }
    if (onComplete) onComplete()
  }

  const permissionList = [
    {
      icon: MapPin,
      title: 'Location Access',
      description: 'Find nearby venues, see friend locations, and get proximity notifications.',
      permission: 'location' as keyof PermissionStatus,
    },
    {
      icon: Camera,
      title: 'Camera Access',
      description: 'Take photos and videos to share moments with friends.',
      permission: 'camera' as keyof PermissionStatus,
    },
    {
      icon: Users,
      title: 'Contacts Access',
      description: 'Find friends who are already on Shot On Me from your contacts.',
      permission: 'contacts' as keyof PermissionStatus,
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Get notified about nearby deals, friend activity, and messages.',
      permission: 'notifications' as keyof PermissionStatus,
    }
  ]

  // Close on Escape key
  useEffect(() => {
    if (!showModal) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showModal])

  if (!showModal) return null

  const isEnabled = (status: string) => status === 'granted'
  const isDisabled = (status: string) => status === 'denied' || status === 'unavailable'
  const canToggle = (status: string) => status === 'prompt' || status === 'granted'

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
          e.stopPropagation()
          handleClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-title"
    >
      <div 
        className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-lg w-full backdrop-blur-md my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="permissions-title" className="text-2xl font-bold text-primary-500 tracking-tight">App Permissions</h2>
          <button
            onClick={handleClose}
            className="text-primary-400 hover:text-primary-500 transition-all"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Permissions List with Toggles */}
        <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
          {permissionList.map((perm) => {
            const Icon = perm.icon
            const status = permissions[perm.permission]
            const isRequesting = requesting === perm.permission
            const enabled = isEnabled(status)
            const disabled = isDisabled(status)
            const canInteract = canToggle(status) && !isRequesting

            return (
              <div
                key={perm.permission}
                className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/30 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Icon and Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 border-2 rounded-full flex items-center justify-center flex-shrink-0 ${
                      enabled 
                        ? 'border-emerald-500/50 bg-emerald-500/10' 
                        : disabled
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-primary-500/30 bg-primary-500/10'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        enabled 
                          ? 'text-emerald-400' 
                          : disabled
                          ? 'text-red-400'
                          : 'text-primary-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-primary-500 mb-0.5">{perm.title}</h3>
                      <p className="text-xs text-primary-400/70 font-light line-clamp-2">{perm.description}</p>
                    </div>
                  </div>

                  {/* Right: Toggle Switch */}
                  <div className="flex-shrink-0">
                    {disabled ? (
                      <div className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                        {status === 'denied' ? 'Denied' : 'N/A'}
                      </div>
                    ) : (
                      <button
                        onClick={() => canInteract && handleToggle(perm.permission)}
                        disabled={!canInteract || isRequesting}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black ${
                          enabled
                            ? 'bg-emerald-500'
                            : 'bg-primary-500/30'
                        } ${!canInteract || isRequesting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`Toggle ${perm.title}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Text */}
                {isRequesting && (
                  <div className="mt-2 text-xs text-primary-400/60 font-light">
                    Requesting permission...
                  </div>
                )}
                {enabled && !isRequesting && (
                  <div className="mt-2 text-xs text-emerald-400 font-light">
                    ✓ Enabled
                  </div>
                )}
                {status === 'denied' && (
                  <div className="mt-2 text-xs text-red-400/70 font-light">
                    Permission denied. Enable in browser settings.
                  </div>
                )}
                {status === 'unavailable' && (
                  <div className="mt-2 text-xs text-primary-400/60 font-light">
                    Not available on this device
                  </div>
                )}
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
