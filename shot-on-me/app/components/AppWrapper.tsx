'use client'

import { ReactNode, useEffect } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import Providers from './Providers'
import { ModalProvider } from '../contexts/ModalContext'

export default function AppWrapper({ children }: { children: ReactNode }) {
  // NUCLEAR OPTION: Completely disable service workers and clear all caches
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
