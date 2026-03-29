'use client'
import { useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { registerPushNotifications, setupPushNotificationListeners } from '../services/native'
import axios from 'axios'
import { useApiUrl } from '../utils/api'

export function usePushNotifications() {
  const { token } = useAuth()
  const API_URL = useApiUrl()

  const savePushToken = useCallback(async (pushToken: string) => {
    if (!token || !pushToken) return
    try {
      await axios.post(`${API_URL}/notifications/push-token`, { token: pushToken }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {}
  }, [token, API_URL])

  useEffect(() => {
    if (!token) return

    registerPushNotifications().then((pushToken) => {
      if (pushToken) savePushToken(pushToken)
    })

    setupPushNotificationListeners(
      (notification) => {
        // Foreground notification received — could show an in-app toast
        console.log('Push notification received:', notification)
      },
      (action) => {
        // User tapped a notification
        const data = action.notification?.data
        if (data?.tab) {
          window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: data.tab } }))
        }
      }
    )
  }, [token, savePushToken])
}
