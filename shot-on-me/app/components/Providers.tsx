'use client'

import { ReactNode, useMemo } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { Stripe } from '@stripe/stripe-js'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext'
import { ErrorBoundary } from './ErrorBoundary'
import { getStripeInstance } from '../utils/stripe-instance'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

let globalStripePromise: Promise<Stripe | null> | null = null
let stripeInitialized = false

function initializeGlobalStripe() {
  if (stripeInitialized) return globalStripePromise

  if (typeof window === 'undefined') {
    stripeInitialized = true
    globalStripePromise = Promise.resolve(null)
    return globalStripePromise
  }

  stripeInitialized = true

  const promise = (async () => {
    try {
      const API_URL = getApiUrl()
      const response = await axios.get(`${API_URL}/payments/stripe-key`)

      if (response.data.configured && response.data.publishableKey) {
        const key = response.data.publishableKey
        if (key && !key.includes('0000') && !key.includes('placeholder') && !key.includes('your_stripe')) {
          return await getStripeInstance(key)
        }
      }
      return null
    } catch (error: any) {
      if (error.response?.status !== 503 && typeof window !== 'undefined') {
        console.error('❌ Failed to fetch Stripe key:', error)
      }
      return null
    }
  })()

  globalStripePromise = promise
  return promise
}

/**
 * Defers heavy SDKs (Google Maps ~200KB, Stripe ~40KB, Socket.io)
 * until after the user is authenticated. Before login, none of
 * these are needed — only SpinnerS and LoginScreen render.
 */
function HeavyProviders({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const stripePromise = useMemo(() => {
    if (!user) return null
    return initializeGlobalStripe()
  }, [!!user])

  if (!user) return <>{children}</>

  return (
    <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Socket Error - Please refresh</div>}>
      <SocketProvider>
        <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Maps Error - Please refresh</div>}>
          <GoogleMapsProvider>
            <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Stripe Error - Please refresh</div>}>
              {stripePromise ? (
                <Elements stripe={stripePromise}>{children}</Elements>
              ) : (
                <>{children}</>
              )}
            </ErrorBoundary>
          </GoogleMapsProvider>
        </ErrorBoundary>
      </SocketProvider>
    </ErrorBoundary>
  )
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Auth Error - Please refresh</div>}>
      <AuthProvider>
        <HeavyProviders>
          {children}
        </HeavyProviders>
      </AuthProvider>
    </ErrorBoundary>
  )
}
