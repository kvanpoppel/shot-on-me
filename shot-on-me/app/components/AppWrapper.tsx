'use client'

import { ReactNode, useEffect } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import Providers from './Providers'
import { ModalProvider } from '../contexts/ModalContext'

export default function AppWrapper({ children }: { children: ReactNode }) {
  // Force service worker update on mount
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
            // Reload after skip
            setTimeout(() => {
              window.location.reload()
            }, 100)
          }
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
