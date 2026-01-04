'use client'

import { ReactNode, useEffect, useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import Providers from './Providers'
import { ModalProvider } from '../contexts/ModalContext'

export default function AppWrapper({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  // NUCLEAR OPTION: Completely disable service workers and clear all caches
  // Also ensure component only renders after mount to prevent hydration
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Clear ALL caches - no exceptions
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName)
        })
      })
    }

    // Unregister ALL service workers immediately
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
        })
      })
    }

    // Set mounted after cleanup
    setIsMounted(true)
  }, [])

  // Don't render anything until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

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
