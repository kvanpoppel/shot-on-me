'use client'

import { ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SFljnAFRpWPINtQ4SzB5vIXQoCsUw0vhD6qZFYi5Ljb5XC1ywZbBEoTovt0I8GAzNpyWsjWlwUcW5jgpOdZLWBu00igtxwkZO'
)

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Elements stripe={stripePromise}>
      <AuthProvider>
        <SocketProvider>
          <GoogleMapsProvider>
            {children}
          </GoogleMapsProvider>
        </SocketProvider>
      </AuthProvider>
    </Elements>
  )
}



