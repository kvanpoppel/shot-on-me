'use client'

import { ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext'
import { ErrorBoundary } from './ErrorBoundary'

// Initialize Stripe with publishable key from environment variable
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey && 
  !stripePublishableKey.includes('placeholder') && 
  !stripePublishableKey.includes('your_stripe') &&
  stripePublishableKey.length > 20
  ? loadStripe(stripePublishableKey)
  : loadStripe('pk_test_0000000000000000000000000000000000000000000000000000000000000000')

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Auth Error - Please refresh</div>}>
      <AuthProvider>
        <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Socket Error - Please refresh</div>}>
          <SocketProvider>
            <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Maps Error - Please refresh</div>}>
              <GoogleMapsProvider>
                <ErrorBoundary fallback={<div className="min-h-screen bg-black flex items-center justify-center text-red-500">Stripe Error - Please refresh</div>}>
                  <Elements stripe={stripePromise}>
                    {children}
                  </Elements>
                </ErrorBoundary>
              </GoogleMapsProvider>
            </ErrorBoundary>
          </SocketProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  )
}

