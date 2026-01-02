/**
 * Permission Utilities
 * Centralized permission checking and requesting for the app
 */

export type PermissionType = 'location' | 'camera' | 'notifications' | 'contacts'
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable'

export interface PermissionState {
  location: PermissionStatus
  camera: PermissionStatus
  notifications: PermissionStatus
  contacts: PermissionStatus
}

/**
 * Check the current status of a permission
 */
export async function checkPermission(type: PermissionType): Promise<PermissionStatus> {
  if (typeof window === 'undefined') return 'unavailable'

  switch (type) {
    case 'location':
      if (!('geolocation' in navigator)) return 'unavailable'
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
          return result.state as PermissionStatus
        } catch {
          return 'prompt'
        }
      }
      return 'prompt'

    case 'camera':
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 'unavailable'
      // Camera permission can't be checked without requesting, so we assume prompt
      return 'prompt'

    case 'notifications':
      if (!('Notification' in window)) return 'unavailable'
      return Notification.permission as PermissionStatus

    case 'contacts':
      if ('contacts' in navigator && 'ContactsManager' in window) {
        return 'prompt'
      }
      return 'unavailable'

    default:
      return 'unavailable'
  }
}

/**
 * Request a permission from the user
 */
export async function requestPermission(type: PermissionType): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    switch (type) {
      case 'location':
        if (!('geolocation' in navigator)) {
          console.warn('Geolocation is not available')
          return false
        }
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            (error) => {
              console.warn('Location permission denied:', error)
              resolve(false)
            },
            { timeout: 5000, enableHighAccuracy: true, maximumAge: 60000 }
          )
        })

      case 'camera':
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('Camera is not available')
          return false
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach(track => track.stop())
          return true
        } catch (error: any) {
          if (error.name === 'NotAllowedError') {
            console.warn('Camera permission denied')
          }
          return false
        }

      case 'notifications':
        if (!('Notification' in window)) {
          console.warn('Notifications are not available')
          return false
        }
        const permission = await Notification.requestPermission()
        return permission === 'granted'

      case 'contacts':
        if (!('contacts' in navigator) || !('ContactsManager' in window)) {
          console.warn('Contacts API is not available')
          return false
        }
        try {
          const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
          return contacts && contacts.length > 0
        } catch (error: any) {
          if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
            console.warn('Contacts permission denied')
          }
          return false
        }

      default:
        return false
    }
  } catch (error) {
    console.error(`Error requesting ${type} permission:`, error)
    return false
  }
}

/**
 * Check all permissions at once
 */
export async function checkAllPermissions(): Promise<PermissionState> {
  const [location, camera, notifications, contacts] = await Promise.all([
    checkPermission('location'),
    checkPermission('camera'),
    checkPermission('notifications'),
    checkPermission('contacts')
  ])

  return { location, camera, notifications, contacts }
}

/**
 * Request location with continuous updates
 */
export function watchLocation(
  onSuccess: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void
): number | null {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    if (onError) {
      onError({ code: 0, message: 'Geolocation not available', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
    }
    return null
  }

  try {
    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      (error) => {
        if (onError) onError(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
    return watchId
  } catch (error) {
    console.error('Error watching location:', error)
    if (onError) {
      onError({ code: 0, message: 'Failed to watch location', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
    }
    return null
  }
}

/**
 * Stop watching location
 */
export function clearLocationWatch(watchId: number): void {
  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId)
  }
}

/**
 * Show a browser notification (if permission is granted)
 */
export function showNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options
      })
      return true
    } catch (error) {
      console.error('Error showing notification:', error)
      return false
    }
  }

  return false
}

/**
 * Get user-friendly error message for permission denial
 */
export function getPermissionErrorMessage(type: PermissionType): string {
  switch (type) {
    case 'location':
      return 'Location access is required to find nearby venues and friends. Please enable it in Settings → Device Permissions.'
    case 'camera':
      return 'Camera access is required to take photos. Please enable it in Settings → Device Permissions.'
    case 'notifications':
      return 'Notifications help you stay updated. Please enable them in Settings → Device Permissions.'
    case 'contacts':
      return 'Contacts access helps you find friends. Please enable it in Settings → Device Permissions.'
    default:
      return 'This feature requires a permission. Please enable it in Settings → Device Permissions.'
  }
}

