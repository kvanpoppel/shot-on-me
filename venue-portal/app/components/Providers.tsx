'use client'

import { ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext'
import ErrorBoundary from './ErrorBoundary'
import { ToastProvider } from './ToastContainer'

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
    <ErrorBoundary>
      <ToastProvider>
        <ErrorBoundary>
          <AuthProvider>
            <ErrorBoundary>
              <SocketProvider>
                <ErrorBoundary>
                  <GoogleMapsProvider>
                    <ErrorBoundary>
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
      </ToastProvider>
    </ErrorBoundary>
  )
}

