'use client'

import { ReactNode, useRef, useEffect, useState, useMemo, useContext } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { Stripe } from '@stripe/stripe-js'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext'
import { ErrorBoundary } from './ErrorBoundary'
import { getStripeInstance } from '../utils/stripe-instance'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
// import { useModal } from '../contexts/ModalContext' // Not needed here anymore

// Create Stripe promise OUTSIDE component - this ensures it's truly stable
let globalStripePromise: Promise<Stripe | null> | null = null
let stripeInitialized = false

function initializeGlobalStripe() {
  if (stripeInitialized) return globalStripePromise
  stripeInitialized = true
  
  const promise = (async () => {
    try {
      const API_URL = getApiUrl()
      const response = await axios.get(`${API_URL}/payments/stripe-key`)
      
      if (response.data.configured && response.data.publishableKey) {
        const key = response.data.publishableKey
        if (key && !key.includes('0000') && !key.includes('placeholder') && !key.includes('your_stripe')) {
          // Stripe key loaded successfully (not logging key for security)
          return await getStripeInstance(key)
        }
      }
      return null
    } catch (error: any) {
      if (error.response?.status !== 503) {
        console.error('❌ Failed to fetch Stripe key:', error)
      }
      return null
    }
  })()
  
  globalStripePromise = promise
  return promise
}

export default function Providers({ children }: { children: ReactNode }) {
  // CRITICAL: Use global promise that's created OUTSIDE component
  // This ensures it's truly stable and never changes
  const stripePromise = useMemo(() => {
    return initializeGlobalStripe()
  }, []) // Empty deps - promise created ONCE

  return (
    <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Auth Error - Please refresh</div>}>
      <AuthProvider>
        <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Socket Error - Please refresh</div>}>
          <SocketProvider>
            <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Maps Error - Please refresh</div>}>
              <GoogleMapsProvider>
                <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Stripe Error - Please refresh</div>}>
                  {/* Render Elements directly - ModalProvider is now outside */}
                  {stripePromise ? (
                    <Elements stripe={stripePromise}>
                      {children}
                    </Elements>
                  ) : (
                    <>{children}</>
                  )}
                </ErrorBoundary>
              </GoogleMapsProvider>
            </ErrorBoundary>
          </SocketProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  )
}



