'use client'

import { useState, useEffect } from 'react'
import { MapPin, Camera, Users, Bell, Mic, X } from 'lucide-react'

interface PermissionConfig {
  key: string
  icon: any
  title: string
  description: string
  why: string
}

interface EnhancedPermissionsProps {
  onComplete?: () => void
  showOnMount?: boolean
}

export default function EnhancedPermissions({ onComplete, showOnMount = true }: EnhancedPermissionsProps) {
  const [showModal, setShowModal] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    location: true,
    camera: true,
    microphone: true,
    contacts: true,
    notifications: true
  })
  const [requesting, setRequesting] = useState<string | null>(null)
  const [requested, setRequested] = useState<Set<string>>(new Set())
  const [availability, setAvailability] = useState<Record<string, boolean>>({
    location: true,
    camera: true,
    microphone: true,
    contacts: false,
    notifications: false
  })

  // Check availability on mount
  useEffect(() => {
    try {
      // Check contacts API availability (only available on mobile browsers with HTTPS)
      let contactsAvailable = false
      try {
        contactsAvailable = 'contacts' in navigator && typeof (window as any).ContactsManager !== 'undefined'
      } catch (e) {
        contactsAvailable = false
      }
      setAvailability(prev => ({ ...prev, contacts: contactsAvailable }))
      
      // Check notifications API availability
      const notificationsAvailable = typeof window !== 'undefined' && 'Notification' in window
      setAvailability(prev => ({ ...prev, notifications: notificationsAvailable }))
      
      // If contacts or notifications are not available, disable them by default
      if (!contactsAvailable) {
        setPermissions(prev => ({ ...prev, contacts: false }))
      }
      if (!notificationsAvailable) {
        setPermissions(prev => ({ ...prev, notifications: false }))
      }
    } catch (error) {
      console.error('Error checking permission availability:', error)
      // Set defaults on error
      setAvailability({
        location: true,
        camera: true,
        microphone: true,
        contacts: false,
        notifications: false
      })
    }
  }, [])

  useEffect(() => {
    if (showOnMount) {
      // Check if permissions have been shown before
      let permissionsShown = null
      try {
        permissionsShown = localStorage.getItem('permissions-shown')
      } catch (err) {
        permissionsShown = null
      }
      if (!permissionsShown) {
        setShowModal(true)
      }
    } else {
      setShowModal(true)
    }
  }, [showOnMount])

  const permissionConfig: PermissionConfig[] = [
    {
      key: 'location',
      icon: MapPin,
      title: 'Location Access',
      description: 'Find nearby venues, see friend locations, and get proximity notifications',
      why: 'We use your location to show you nearby venues with active promotions and help you find friends nearby.'
    },
    {
      key: 'camera',
      icon: Camera,
      title: 'Camera Access',
      description: 'Take photos and videos to share moments with friends',
      why: 'Capture and share your experiences at venues with photos and videos.'
    },
    {
      key: 'microphone',
      icon: Mic,
      title: 'Microphone Access',
      description: 'Record videos with audio and voice messages',
      why: 'Add audio to your videos and voice messages for better engagement.'
    },
    {
      key: 'contacts',
      icon: Users,
      title: 'Contacts Access',
      description: 'Find friends who are already on Shot On Me from your contacts',
      why: 'We match phone numbers to help you quickly find and connect with friends.'
    },
    {
      key: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Get notified about nearby deals, friend activity, and messages',
      why: 'Stay updated on promotions, friend check-ins, and important updates.'
    }
  ]

  const requestLocation = async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      console.warn('Geolocation is not available in this browser')
      return false
    }
    
    setRequesting('location')
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Location request timeout'))
        }, 10000) // 10 second timeout
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout)
            resolve(position)
          },
          (error) => {
            clearTimeout(timeout)
            reject(error)
          },
          { 
            timeout: 8000,
            enableHighAccuracy: false, // Changed to false for better compatibility
            maximumAge: 60000
          }
        )
      })
      setRequested(prev => new Set([...prev, 'location']))
      return true
    } catch (error: any) {
      console.warn('Location permission request failed:', error?.message || error)
      // Don't show alert for user-denied permissions
      if (error?.code !== 1) { // PERMISSION_DENIED
        console.warn('Location error details:', error)
      }
      return false
    } finally {
      setRequesting(null)
    }
  }

  const requestCamera = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API is not available in this browser')
      return false
    }
    
    setRequesting('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // Stop all tracks immediately to release the camera
      stream.getTracks().forEach(track => {
        track.stop()
      })
      setRequested(prev => new Set([...prev, 'camera']))
      return true
    } catch (error: any) {
      console.warn('Camera permission request failed:', error?.name || error?.message || error)
      // Don't show alert for user-denied permissions
      if (error?.name !== 'NotAllowedError') {
        console.warn('Camera error details:', error)
      }
      return false
    } finally {
      setRequesting(null)
    }
  }

  const requestMicrophone = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Microphone API is not available in this browser')
      return false
    }
    
    setRequesting('microphone')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop all tracks immediately to release the microphone
      stream.getTracks().forEach(track => {
        track.stop()
      })
      setRequested(prev => new Set([...prev, 'microphone']))
      return true
    } catch (error: any) {
      console.warn('Microphone permission request failed:', error?.name || error?.message || error)
      // Don't show alert for user-denied permissions
      if (error?.name !== 'NotAllowedError') {
        console.warn('Microphone error details:', error)
      }
      return false
    } finally {
      setRequesting(null)
    }
  }

  const requestContacts = async () => {
    setRequesting('contacts')
    try {
      // Check if Contacts API is available
      if (typeof window === 'undefined' || !('contacts' in navigator)) {
        console.warn('Contacts API is not available on this device/browser')
        return false
      }
      
      // Check for ContactsManager (Chrome/Edge on Android)
      const ContactsManager = (window as any).ContactsManager
      if (!ContactsManager) {
        console.warn('ContactsManager is not available. Contacts API requires HTTPS and mobile browser support.')
        return false
      }
      
      // Request contacts access
      const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
      if (contacts && contacts.length > 0) {
        setRequested(prev => new Set([...prev, 'contacts']))
        return true
      }
      return false
    } catch (error: any) {
      // Handle specific error types
      if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
        console.warn('Contacts permission denied by user')
      } else if (error?.name === 'NotSupportedError') {
        console.warn('Contacts API not supported on this device/browser')
      } else {
        console.warn('Contacts permission request failed:', error?.message || error)
      }
      return false
    } finally {
      setRequesting(null)
    }
  }

  const requestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications are not supported in this browser')
      return false
    }
    
    setRequesting('notifications')
    try {
      // Check current permission first
      if (Notification.permission === 'granted') {
        setRequested(prev => new Set([...prev, 'notifications']))
        return true
      }
      
      if (Notification.permission === 'denied') {
        console.warn('Notifications are blocked. User must enable them in browser settings.')
        return false
      }
      
      // Request permission (only works in response to user gesture)
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setRequested(prev => new Set([...prev, 'notifications']))
        return true
      }
      
      return false
    } catch (error: any) {
      console.warn('Notifications permission request failed:', error?.message || error)
      return false
    } finally {
      setRequesting(null)
    }
  }

  const handleToggle = async (key: string) => {
    try {
      const newValue = !permissions[key]
      setPermissions(prev => ({ ...prev, [key]: newValue }))

      // If enabling, request permission immediately
      if (newValue && !requested.has(key)) {
        let success = false
        switch (key) {
          case 'location':
            success = await requestLocation()
            break
          case 'camera':
            success = await requestCamera()
            break
          case 'microphone':
            success = await requestMicrophone()
            break
          case 'contacts':
            success = await requestContacts()
            break
          case 'notifications':
            success = await requestNotifications()
            break
        }
        
        // If permission request failed and it's not available, disable the toggle
        if (!success && !availability[key]) {
          setPermissions(prev => ({ ...prev, [key]: false }))
        }
      }
    } catch (error) {
      console.error('Error in handleToggle:', error)
      // Revert toggle on error
      setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
    }
  }

  const handleContinue = async () => {
    try {
      // Request all enabled permissions
      const permissionTypes = ['location', 'camera', 'microphone', 'contacts', 'notifications'] as const
      
      for (const type of permissionTypes) {
        if (permissions[type] && !requested.has(type) && availability[type]) {
          try {
            switch (type) {
              case 'location':
                await requestLocation()
                break
              case 'camera':
                await requestCamera()
                break
              case 'microphone':
                await requestMicrophone()
                break
              case 'contacts':
                await requestContacts()
                break
              case 'notifications':
                await requestNotifications()
                break
            }
          } catch (error) {
            console.warn(`Failed to request ${type} permission:`, error)
            // Continue with other permissions even if one fails
          }
          // Small delay between requests to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      // Mark as shown
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('permissions-shown', 'true')
        }
      } catch (err) {
        console.warn('Failed to save permissions-shown flag:', err)
        // Continue anyway
      }
      
      setShowModal(false)
      if (onComplete) onComplete()
    } catch (error) {
      console.error('Error in handleContinue:', error)
      // Still close modal and call onComplete even on error
      setShowModal(false)
      if (onComplete) onComplete()
    }
  }

  const handleSkip = () => {
    try {
      localStorage.setItem('permissions-shown', 'true')
    } catch (err) {
      // Continue anyway
    }
    setShowModal(false)
    if (onComplete) onComplete()
  }

  if (!showModal) return null

  const enabledCount = Object.values(permissions).filter(Boolean).length

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-2xl w-full backdrop-blur-md my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary-500 tracking-tight">App Permissions</h2>
            <p className="text-sm text-primary-400/80 mt-1 font-light">
              Enable features to get the most out of Shot On Me. You can change these anytime in Settings.
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-primary-400 hover:text-primary-500 transition-all"
            title="Skip"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Permissions List with Toggles */}
        <div className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
          {permissionConfig.map((config) => {
            const Icon = config.icon
            const isEnabled = permissions[config.key]
            const isRequesting = requesting === config.key
            const hasRequested = requested.has(config.key)
            const isUnavailable = !availability[config.key]

            return (
              <div
                key={config.key}
                className={`bg-black/40 border rounded-lg p-4 transition-all ${
                  isEnabled
                    ? 'border-primary-500/40 bg-primary-500/5'
                    : 'border-primary-500/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 border-2 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isEnabled
                      ? 'border-primary-500/50 bg-primary-500/20'
                      : 'border-primary-500/20 bg-primary-500/10'
                  }`}>
                    <Icon className={`w-6 h-6 ${isEnabled ? 'text-primary-500' : 'text-primary-500/60'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-primary-500">{config.title}</h3>
                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggle(config.key)}
                          disabled={isRequesting || isUnavailable}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-primary-500/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-primary-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                      </label>
                    </div>
                    <p className="text-sm text-primary-400/80 mb-2 font-light">{config.description}</p>
                    <div className="bg-black/40 border border-primary-500/10 rounded p-2 mb-2">
                      <p className="text-xs text-primary-400/70 font-light">
                        <span className="text-primary-500 font-medium">Why:</span> {config.why}
                      </p>
                    </div>
                    {/* Status indicators */}
                    <div className="flex items-center gap-2 text-xs">
                      {isRequesting && (
                        <span className="text-primary-400">Requesting...</span>
                      )}
                      {hasRequested && isEnabled && (
                        <span className="text-emerald-400">✓ Enabled</span>
                      )}
                      {!isEnabled && (
                        <span className="text-primary-400/60">Disabled</span>
                      )}
                      {isUnavailable && (
                        <span className="text-primary-400/50">
                          {config.key === 'contacts' 
                            ? 'Contacts API not supported on this device/browser. You can still find friends by searching.'
                            : config.key === 'notifications'
                            ? 'Notifications not supported on this device/browser.'
                            : 'Not available on this device'}
                        </span>
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-primary-400/70 font-light">
              {enabledCount} of {permissionConfig.length} permissions enabled
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-primary-500/10 transition-all"
            >
              Skip
            </button>
            <button
              onClick={handleContinue}
              disabled={requesting !== null}
              className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requesting ? 'Requesting...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

