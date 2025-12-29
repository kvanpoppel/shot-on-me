'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import axios from 'axios'
import { useApiUrl } from '../utils/api'

interface StripeContextType {
  stripe: Stripe | null
  loading: boolean
  error: string | null
}

const StripeContext = createContext<StripeContextType>({
  stripe: null,
  loading: true,
  error: null,
})

export const useStripeContext = () => useContext(StripeContext)

export function StripeProvider({ children }: { children: ReactNode }) {
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const API_URL = useApiUrl()

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        // First try environment variable
        const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        if (envKey) {
          const stripeInstance = await loadStripe(envKey)
          setStripe(stripeInstance)
          setLoading(false)
          return
        }

        // Fallback to fetching from backend
        try {
          const response = await axios.get(`${API_URL}/payments/stripe-key`)
          
          // Check if Stripe is configured
          if (response.status === 503 || !response.data.configured) {
            setError('Payment processing is not configured')
            setLoading(false)
            return
          }
          
          const publishableKey = response.data.publishableKey

          if (publishableKey && !publishableKey.includes('your_stripe') && !publishableKey.includes('placeholder')) {
            const stripeInstance = await loadStripe(publishableKey)
            setStripe(stripeInstance)
          } else {
            setError('Stripe publishable key not found')
          }
        } catch (fetchErr: any) {
          // If it's a 503, Stripe is not configured (this is OK)
          if (fetchErr.response?.status === 503) {
            setError('Payment processing is not configured')
          } else {
            console.error('Failed to fetch Stripe key:', fetchErr)
            setError('Failed to load payment system')
          }
        }
      } catch (err: any) {
        // If loadStripe fails due to invalid key, handle gracefully
        if (err.message?.includes('Invalid API Key') || err.message?.includes('Invalid')) {
          setError('Payment processing is not properly configured')
        } else {
          console.error('Failed to initialize Stripe:', err)
          setError(err.message || 'Failed to load Stripe')
        }
      } finally {
        setLoading(false)
      }
    }

    initializeStripe()
  }, [API_URL])

  return (
    <StripeContext.Provider value={{ stripe, loading, error }}>
      {children}
    </StripeContext.Provider>
  )
}

