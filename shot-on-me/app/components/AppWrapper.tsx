'use client'

import { ReactNode, useEffect } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import Providers from './Providers'
import { ModalProvider } from '../contexts/ModalContext'

export default function AppWrapper({ children }: { children: ReactNode }) {
  // AGGRESSIVE cache busting for mobile hydration fix
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Clear all caches first
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          // Delete all caches except keep some for fonts/images
          if (!cacheName.includes('google-fonts') && !cacheName.includes('static-image')) {
            caches.delete(cacheName)
          }
        })
      })
    }

    // Force service worker update and unregister
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          // Unregister all service workers to force fresh load
          registration.unregister().then(() => {
            // Force reload to get fresh code
            if (window.location.hostname !== 'localhost') {
              // Only reload on production to avoid dev loop
              window.location.reload()
            }
          })
        })
      })
    }
  }, [])

  return (
    <ErrorBoundary>
      <Providers>
        <ModalProvider>
          {children}
        </ModalProvider>
      </Providers>
    </ErrorBoundary>
  )
}
