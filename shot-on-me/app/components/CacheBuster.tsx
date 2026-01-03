'use client'

import { useEffect } from 'react'

/**
 * Cache Buster Component
 * Forces service worker update and cache refresh
 */
export default function CacheBuster() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for service worker and force update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          // Force update
          registration.update()
          
          // If there's a waiting service worker, skip waiting
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
          
          // If there's an installing service worker, wait for it
          if (registration.installing) {
            registration.installing.addEventListener('statechange', (event: any) => {
              if (event.target?.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, reload
                window.location.reload()
              }
            })
          }
        })
      })
    }

    // Add version check on page load
    const checkVersion = async () => {
      try {
        // Try to fetch a version file or use cache-busting
        const response = await fetch('/?v=' + Date.now(), { cache: 'no-store' })
        // If we get a different response, reload
      } catch (error) {
        console.warn('Version check failed:', error)
      }
    }

    // Check version every 5 minutes
    const versionInterval = setInterval(checkVersion, 5 * 60 * 1000)

    return () => {
      clearInterval(versionInterval)
    }
  }, [])

  return null
}

