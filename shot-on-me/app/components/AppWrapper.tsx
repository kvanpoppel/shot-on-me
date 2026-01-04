'use client'

import { ReactNode, useEffect, useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import Providers from './Providers'
import { ModalProvider } from '../contexts/ModalContext'

export default function AppWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const version = 'v580423b0-safari-fix'
    const cachedVersion = sessionStorage.getItem('app-version')
    
    // Clear ALL caches immediately for Safari
    if (isSafari || cachedVersion !== version) {
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

      // Set new version
      sessionStorage.setItem('app-version', version)
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
