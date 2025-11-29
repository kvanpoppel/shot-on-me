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
        const response = await axios.get(`${API_URL}/payments/stripe-key`)
        const publishableKey = response.data.publishableKey

        if (publishableKey) {
          const stripeInstance = await loadStripe(publishableKey)
          setStripe(stripeInstance)
        } else {
          setError('Stripe publishable key not found')
        }
      } catch (err: any) {
        console.error('Failed to initialize Stripe:', err)
        setError(err.message || 'Failed to load Stripe')
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

