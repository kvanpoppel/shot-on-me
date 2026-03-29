/**
 * Native Service — single source of truth for all Capacitor plugin interactions.
 * Gracefully falls back to web APIs when running in a browser.
 */

import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()
export const getPlatform = () => Capacitor.getPlatform() // 'ios' | 'android' | 'web'

// ─── Push Notifications ───────────────────────────────────────────────────────

export async function registerPushNotifications(): Promise<string | null> {
  if (!isNative()) return null
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return null
    await PushNotifications.register()
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => resolve(token.value))
      PushNotifications.addListener('registrationError', () => resolve(null))
    })
  } catch {
    return null
  }
}

export async function setupPushNotificationListeners(
  onNotification: (data: any) => void,
  onAction: (data: any) => void
) {
  if (!isNative()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    PushNotifications.addListener('pushNotificationReceived', onNotification)
    PushNotifications.addListener('pushNotificationActionPerformed', onAction)
  } catch {}
}

// ─── Biometric Auth ───────────────────────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    const info = await BiometricAuth.checkBiometry()
    return info.isAvailable
  } catch {
    return false
  }
}

export async function authenticateWithBiometrics(reason: string): Promise<boolean> {
  if (!isNative()) return true // allow on web
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use Passcode',
      androidTitle: 'Shot On Me',
      androidSubtitle: reason,
      androidConfirmationRequired: false,
    })
    return true
  } catch {
    return false
  }
}

// ─── Camera ───────────────────────────────────────────────────────────────────

export async function takePhoto(): Promise<string | null> {
  if (!isNative()) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    })
    return photo.dataUrl || null
  } catch {
    return null
  }
}

export async function pickFromGallery(): Promise<string | null> {
  if (!isNative()) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    })
    return photo.dataUrl || null
  } catch {
    return null
  }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export interface NativeContact {
  id: string
  name: string
  phone: string
}

export async function getContacts(): Promise<NativeContact[]> {
  if (!isNative()) return []
  try {
    const { Contacts } = await import('@capacitor-community/contacts')
    const permission = await Contacts.requestPermissions()
    if (permission.contacts !== 'granted') return []
    const result = await Contacts.getContacts({
      projection: { name: true, phones: true },
    })
    return result.contacts
      .filter((c) => c.phones && c.phones.length > 0)
      .map((c) => ({
        id: c.contactId || '',
        name: c.name?.display || c.name?.given || 'Unknown',
        phone: c.phones![0].number || '',
      }))
      .filter((c) => c.phone)
  } catch {
    return []
  }
}

// ─── Geolocation ─────────────────────────────────────────────────────────────

export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (!isNative()) return null
  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    return null
  }
}

// ─── Haptics ─────────────────────────────────────────────────────────────────

export async function hapticSuccess() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {}
}

export async function hapticError() {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Error })
  } catch {}
}

export async function hapticLight() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {}
}

// ─── Status Bar ──────────────────────────────────────────────────────────────

export async function setStatusBarDark() {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#000000' })
  } catch {}
}

// ─── Network ─────────────────────────────────────────────────────────────────

export async function getNetworkStatus(): Promise<boolean> {
  try {
    const { Network } = await import('@capacitor/network')
    const status = await Network.getStatus()
    return status.connected
  } catch {
    return navigator.onLine
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

export async function setupAppListeners(onResume: () => void, onPause: () => void) {
  if (!isNative()) return
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) onResume()
      else onPause()
    })
  } catch {}
}
