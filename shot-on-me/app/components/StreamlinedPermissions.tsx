'use client'

import { useState, useEffect } from 'react'
import { MapPin, Camera, Users, Bell, Mic, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt' | 'unavailable'
  camera: 'granted' | 'denied' | 'prompt' | 'unavailable'
  microphone: 'granted' | 'denied' | 'prompt' | 'unavailable'
  contacts: 'granted' | 'denied' | 'prompt' | 'unavailable'
  notifications: 'granted' | 'denied' | 'prompt' | 'unavailable'
}

interface StreamlinedPermissionsProps {
  onComplete?: () => void
  showOnMount?: boolean
}

export default function StreamlinedPermissions({ onComplete, showOnMount = true }: StreamlinedPermissionsProps) {
  const [showModal, setShowModal] = useState(false)
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
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
        // Show modal after a short delay to not interrupt registration flow
        setTimeout(() => setShowModal(true), 1000)
      }
    }
  }, [showOnMount])

  const checkPermissions = async () => {
    const status: PermissionStatus = {
      location: 'unavailable',
      camera: 'unavailable',
      microphone: 'unavailable',
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

    // Check Microphone
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
        status.microphone = 'granted'
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          status.microphone = 'denied'
        } else {
          status.microphone = 'prompt'
        }
      }
    }

    // Check Contacts
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

  const requestPermission = async (type: keyof PermissionStatus) => {
    setRequesting(type)
    
    try {
      switch (type) {
        case 'location':
          if ('geolocation' in navigator) {
            await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { 
                timeout: 5000,
                enableHighAccuracy: true
              })
            })
            setPermissions(prev => ({ ...prev, location: 'granted' }))
          }
          break

        case 'camera':
          if (navigator.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach(track => track.stop())
            setPermissions(prev => ({ ...prev, camera: 'granted' }))
          }
          break

        case 'microphone':
          if (navigator.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(track => track.stop())
            setPermissions(prev => ({ ...prev, microphone: 'granted' }))
          }
          break

        case 'contacts':
          if ('contacts' in navigator && 'ContactsManager' in window) {
            const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
            if (contacts && contacts.length > 0) {
              setPermissions(prev => ({ ...prev, contacts: 'granted' }))
            } else {
              setPermissions(prev => ({ ...prev, contacts: 'denied' }))
            }
          }
          break

        case 'notifications':
          if ('Notification' in window) {
            const permission = await Notification.requestPermission()
            setPermissions(prev => ({ ...prev, notifications: permission as 'granted' | 'denied' | 'prompt' }))
          }
          break
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        setPermissions(prev => ({ ...prev, [type]: 'denied' }))
      } else {
        console.warn(`Permission request failed for ${type}:`, error)
      }
    } finally {
      setRequesting(null)
    }
  }

  const handleAllowAll = async () => {
    // Request all permissions in parallel (non-blocking)
    const permissionTypes: (keyof PermissionStatus)[] = ['location', 'camera', 'microphone', 'contacts', 'notifications']
    
    // Request all that are available and not already granted
    permissionTypes.forEach(type => {
      if (permissions[type] === 'prompt') {
        requestPermission(type)
      }
    })
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

  const handleContinue = () => {
    try {
      localStorage.setItem('permissions-shown', 'true')
    } catch (err) {
      // Continue anyway
    }
    setShowModal(false)
    if (onComplete) onComplete()
  }

  const permissionConfig = [
    {
      key: 'location' as keyof PermissionStatus,
      icon: MapPin,
      title: 'Location',
      description: 'Find nearby venues & friends',
      why: 'Shows you nearby venues with deals and helps you find friends'
    },
    {
      key: 'camera' as keyof PermissionStatus,
      icon: Camera,
      title: 'Camera',
      description: 'Share photos & videos',
      why: 'Capture and share moments with friends'
    },
    {
      key: 'microphone' as keyof PermissionStatus,
      icon: Mic,
      title: 'Microphone',
      description: 'Record videos with audio',
      why: 'Add audio to your videos and voice messages'
    },
    {
      key: 'contacts' as keyof PermissionStatus,
      icon: Users,
      title: 'Contacts',
      description: 'Find friends easily',
      why: 'Quickly find friends who are already on Shot On Me'
    },
    {
      key: 'notifications' as keyof PermissionStatus,
      icon: Bell,
      title: 'Notifications',
      description: 'Get deals & updates',
      why: 'Stay updated on promotions and friend activity'
    }
  ]

  if (!showModal) return null

  const grantedCount = Object.values(permissions).filter(s => s === 'granted').length
  const totalCount = permissionConfig.length

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full backdrop-blur-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary-500">Enable Features</h2>
          <button
            onClick={handleSkip}
            className="text-primary-400 hover:text-primary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-primary-400/80 text-sm mb-6 font-light">
          Enable these features to get the most out of Shot On Me. You can change these anytime in Settings.
        </p>

        {/* Permission List - All at once */}
        <div className="space-y-3 mb-6">
          {permissionConfig.map(({ key, icon: Icon, title, description, why }) => {
            const status = permissions[key]
            const isRequesting = requesting === key
            const isGranted = status === 'granted'
            const isUnavailable = status === 'unavailable' as any
            const canRequest = status === 'prompt' && !isUnavailable

            return (
              <div
                key={key}
                className={`p-4 rounded-lg border transition-all ${
                  isGranted
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-black/40 border-primary-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isGranted ? 'bg-emerald-500/20' : 'bg-primary-500/20'
                  }`}>
                    <Icon className={`w-5 h-5 ${isGranted ? 'text-emerald-400' : 'text-primary-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-primary-500 font-semibold text-sm">{title}</h3>
                      {isGranted && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </div>
                    <p className="text-primary-400/70 text-xs mb-2 font-light">{description}</p>
                    {canRequest && (
                      <button
                        onClick={() => requestPermission(key)}
                        disabled={isRequesting}
                        className="text-xs text-primary-500 hover:text-primary-400 font-medium disabled:opacity-50"
                      >
                        {isRequesting ? 'Requesting...' : 'Enable'}
                      </button>
                    )}
                    {isUnavailable && (
                      <p className="text-xs text-primary-400/50 font-light">Not available on this device</p>
                    )}
                    {status === 'denied' && (
                      <p className="text-xs text-red-400/70 font-light">Denied - enable in browser settings</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAllowAll}
            disabled={grantedCount === totalCount || requesting !== null}
            className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enable All
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-primary-500/10 transition-all"
          >
            Continue
          </button>
        </div>

        <p className="text-center text-primary-400/60 text-xs mt-4 font-light">
          {grantedCount} of {totalCount} enabled
        </p>
      </div>
    </div>
  )
}

