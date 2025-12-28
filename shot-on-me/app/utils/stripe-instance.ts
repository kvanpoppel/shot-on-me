// Global Stripe instance to ensure we use the SAME instance everywhere
import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null
let stripeKey: string | null = null

export function getStripeInstance(key: string): Promise<Stripe | null> {
  // Normalize key (trim whitespace)
  const normalizedKey = key.trim()
  
        // If we already have an instance with this key, return it
        if (stripeKey === normalizedKey && stripePromise) {
          // Reusing existing Stripe instance (not logging key for security)
          return stripePromise
        }
        
        // Otherwise, create a new instance (not logging key for security)
  stripeKey = normalizedKey
  stripePromise = loadStripe(normalizedKey)
  return stripePromise
}

export function getStripeKey(): string | null {
  return stripeKey
}

export function resetStripeInstance(): void {
  stripePromise = null
  stripeKey = null
}

