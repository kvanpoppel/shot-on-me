'use client'

import { ReactNode, useEffect, useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import Providers from './Providers'
import { ModalProvider } from '../contexts/ModalContext'

export default function AppWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // NUCLEAR OPTION: Force Safari to clear everything
    const version = 'v35949811-ssr-disabled'
    const cachedVersion = sessionStorage.getItem('app-version')
    
    if (cachedVersion !== version) {
      // Clear ALL caches
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => caches.delete(cacheName))
        })
      }

      // Unregister ALL service workers
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister())
        })
      }

      // Clear Safari's aggressive cache
      if ('localStorage' in window) {
        try {
          localStorage.clear()
        } catch (e) {
          // Ignore if blocked
        }
      }

      // Set new version
      sessionStorage.setItem('app-version', version)
      
      // Force reload if version changed (but only once)
      if (cachedVersion && cachedVersion !== version) {
        window.location.reload()
        return
      }
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
