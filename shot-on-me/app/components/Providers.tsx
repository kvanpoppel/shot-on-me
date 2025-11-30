'use client'

import { ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext'

// Initialize Stripe with publishable key from environment variable
// Falls back to placeholder if not set (for development)
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
const stripePromise = loadStripe(stripePublishableKey)

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <GoogleMapsProvider>
          <Elements stripe={stripePromise}>
            {children}
          </Elements>
        </GoogleMapsProvider>
      </SocketProvider>
    </AuthProvider>
  )
}



