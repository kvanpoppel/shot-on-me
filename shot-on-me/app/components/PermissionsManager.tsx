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
  const [currentStep, setCurrentStep] = useState(0)
  const [requesting, setRequesting] = useState(false)

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
    setRequesting(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      })
      setPermissions(prev => ({ ...prev, location: 'granted' }))
      return true
    } catch (error) {
      setPermissions(prev => ({ ...prev, location: 'denied' }))
      return false
    } finally {
      setRequesting(false)
    }
  }

  const requestCamera = async () => {
    setRequesting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setPermissions(prev => ({ ...prev, camera: 'granted' }))
      return true
    } catch (error: any) {
      setPermissions(prev => ({ ...prev, camera: 'denied' }))
      return false
    } finally {
      setRequesting(false)
    }
  }

  const requestContacts = async () => {
    setRequesting(true)
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
    } finally {
      setRequesting(false)
    }
  }

  const requestNotifications = async () => {
    setRequesting(true)
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
      setRequesting(false)
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
    setCurrentStep(prev => Math.min(prev + 1, 3))
  }

  const handleSkip = () => {
    localStorage.setItem('permissions-shown', 'true')
    setShowModal(false)
    if (onComplete) onComplete()
  }

  const handleContinue = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    } else {
      localStorage.setItem('permissions-shown', 'true')
      setShowModal(false)
      if (onComplete) onComplete()
    }
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

  const currentPermission = permissionSteps[currentStep]
  const currentStatus = permissions[currentPermission.permission]
  const Icon = currentPermission.icon

  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-md w-full backdrop-blur-md">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            {permissionSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full ${
                  idx <= currentStep
                    ? 'bg-primary-500'
                    : 'bg-primary-500/20'
                }`}
              />
            ))}
          </div>
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="ml-4 text-primary-400 hover:text-primary-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Permission Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 border-2 border-primary-500 rounded-full flex items-center justify-center bg-primary-500/10">
            <Icon className="w-10 h-10 text-primary-500" />
          </div>
        </div>

        {/* Title and Description */}
        <h2 className="text-2xl font-bold text-primary-500 text-center mb-2 tracking-tight">
          {currentPermission.title}
        </h2>
        <p className="text-primary-400 text-center mb-6 font-light">
          {currentPermission.description}
        </p>

        {/* Why We Need This */}
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
          <p className="text-primary-400/80 text-sm font-light">
            <span className="text-primary-500 font-medium">Why we need this:</span>{' '}
            {currentPermission.why}
          </p>
        </div>

        {/* Status Indicator */}
        {currentStatus !== 'prompt' && (
          <div className={`flex items-center justify-center space-x-2 mb-6 p-3 rounded-lg ${
            currentStatus === 'granted'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : currentStatus === 'unavailable'
              ? 'bg-primary-500/10 border border-primary-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {currentStatus === 'granted' ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Permission granted</span>
              </>
            ) : currentStatus === 'unavailable' ? (
              <>
                <AlertCircle className="w-5 h-5 text-primary-400" />
                <span className="text-primary-400 font-medium">Not available on this device</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">Permission denied</span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {currentStatus === 'prompt' ? (
            <>
              <button
                onClick={() => handleRequestPermission(currentPermission.permission)}
                disabled={requesting}
                className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting ? 'Requesting...' : 'Allow'}
              </button>
              <button
                onClick={handleContinue}
                disabled={requesting}
                className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-primary-500/10 transition-all backdrop-blur-sm disabled:opacity-50"
              >
                Skip
              </button>
            </>
          ) : (
            <button
              onClick={handleContinue}
              className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all"
            >
              {currentStep < 3 ? 'Continue' : 'Get Started'}
            </button>
          )}
        </div>

        {/* Skip All */}
        {currentStep === 0 && (
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-primary-400 hover:text-primary-500 text-sm font-light"
          >
            Skip all permissions
          </button>
        )}
      </div>
    </div>
  )
}

