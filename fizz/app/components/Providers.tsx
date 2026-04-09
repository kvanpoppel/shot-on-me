'use client'

import { ReactNode, useMemo } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { Stripe, loadStripe } from '@stripe/stripe-js'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import { ErrorBoundary } from './ErrorBoundary'
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
        if (key && !key.includes('placeholder') && !key.includes('your_stripe')) {
          return await loadStripe(key)
        }
      }
      return null
    } catch {
      return null
    }
  })()

  globalStripePromise = promise
  return promise
}

export default function Providers({ children }: { children: ReactNode }) {
  // No global Elements wrapper — AddFundsModal manages its own Stripe Elements
  // to avoid nested Elements conflicts when creating PaymentIntents
  return (
    <ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center text-red-400" style={{ background: '#1A1A2E' }}>Auth Error — Please refresh</div>}>
      <AuthProvider>
        <ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center text-red-400" style={{ background: '#1A1A2E' }}>Socket Error — Please refresh</div>}>
          <SocketProvider>
            {children}
          </SocketProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  )
}
