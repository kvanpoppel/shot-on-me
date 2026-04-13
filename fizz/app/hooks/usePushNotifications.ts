'use client'

import { useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'

export function usePushNotifications() {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()

  const register = useCallback(async () => {
    if (!token || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    try {
      // Fetch VAPID public key
      const { data } = await axios.get(`${API_URL}/fizz/push/vapid-public-key`)
      if (!data.publicKey) return

      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Check existing subscription
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        // Request permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey) as unknown as ArrayBuffer,
        })
      }

      // Send subscription to backend
      await axios.post(
        `${API_URL}/fizz/push/subscribe`,
        sub.toJSON(),
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch { /* ignore — push not supported or denied */ }
  }, [API_URL, token])

  // Auto-register when user is logged in
  useEffect(() => {
    if (user && token) register()
  }, [user, token, register])

  return { register }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)))
}
