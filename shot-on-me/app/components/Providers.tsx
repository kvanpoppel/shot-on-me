'use client'

import { ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { GoogleMapsProvider } from '../contexts/GoogleMapsContext'
import { StripeProvider, useStripeContext } from '../contexts/StripeContext'

// Inner component that uses Stripe context
function ProvidersWithStripe({ children }: { children: ReactNode }) {
  const { stripe, loading } = useStripeContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <>
      {stripe ? (
        <Elements stripe={stripe}>
          {children}
        </Elements>
      ) : (
        children
      )}
    </>
  )
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <GoogleMapsProvider>
          <StripeProvider>
            <ProvidersWithStripe>
              {children}
            </ProvidersWithStripe>
          </StripeProvider>
        </GoogleMapsProvider>
      </SocketProvider>
    </AuthProvider>
  )
}



