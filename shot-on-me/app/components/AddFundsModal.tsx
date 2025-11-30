'use client'

import { useState, useEffect } from 'react'
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import { X, Loader } from 'lucide-react'

interface AddFundsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount?: number
}

function CheckoutForm({ amount, onSuccess, onClose }: { amount: number; onSuccess: () => void; onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard clause - ensure stripe and elements are available
  if (!stripe || !elements) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 animate-spin text-primary-500" />
        <span className="ml-2 text-primary-400">Loading payment form...</span>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Double-check guard clause
    if (!stripe || !elements) {
      setError('Payment form not ready. Please refresh and try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Confirm payment with existing clientSecret (already set in Elements options)
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/wallet?success=true` : undefined,
        },
        redirect: 'if_required', // Don't redirect, handle in app
      })

      if (confirmError) {
        console.error('Stripe payment error:', confirmError)
        setError(confirmError.message || 'Payment failed. Please try again.')
        setLoading(false)
      } else {
        // Payment succeeded - webhook will update wallet
        console.log('Payment confirmed successfully')
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.response?.data?.message || err.message || 'Failed to process payment. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <span>Add ${amount.toFixed(2)}</span>
        )}
      </button>
    </form>
  )
}

export default function AddFundsModal({ isOpen, onClose, onSuccess, amount = 50 }: AddFundsModalProps) {
  const [selectedAmount, setSelectedAmount] = useState(amount)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const quickAmounts = [10, 25, 50, 100, 200]

  // Fetch Stripe publishable key and create PaymentIntent when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setClientSecret(null)
      setStripePromise(null)
      setError(null)
      return
    }

    const initializeStripe = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1. Fetch Stripe publishable key
        const keyResponse = await axios.get(`${API_URL}/payments/stripe-key`)
        const publishableKey = keyResponse.data.publishableKey

        if (!publishableKey) {
          throw new Error('Stripe publishable key not available')
        }

        // 2. Initialize Stripe (loadStripe returns a Promise)
        const stripe = loadStripe(publishableKey)
        setStripePromise(stripe)

        // 3. Create PaymentIntent with selected amount
        const intentResponse = await axios.post(
          `${API_URL}/payments/create-intent`,
          { amount: selectedAmount },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        const { clientSecret: secret } = intentResponse.data
        if (!secret) {
          throw new Error('Failed to create payment intent')
        }

        setClientSecret(secret)
      } catch (err: any) {
        console.error('Stripe initialization error:', err)
        setError(err.response?.data?.message || err.message || 'Failed to initialize payment. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    initializeStripe()
  }, [isOpen, selectedAmount, token, API_URL])

  // Recreate PaymentIntent when amount changes
  useEffect(() => {
    if (!isOpen || !token || !clientSecret) return

    const updateIntent = async () => {
      try {
        const intentResponse = await axios.post(
          `${API_URL}/payments/create-intent`,
          { amount: selectedAmount },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        const { clientSecret: secret } = intentResponse.data
        if (secret) {
          setClientSecret(secret)
        }
      } catch (err: any) {
        console.error('Failed to update payment intent:', err)
        setError('Failed to update amount. Please try again.')
      }
    }

    // Debounce amount changes
    const timeout = setTimeout(updateIntent, 500)
    return () => clearTimeout(timeout)
  }, [selectedAmount, isOpen, token, API_URL])

  if (!isOpen) return null

  // Elements options with clientSecret (only when both are available)
  const elementsOptions: StripeElementsOptions | undefined = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#B8945A',
        colorBackground: '#000000',
        colorText: '#B8945A',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  } : undefined

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-primary-500">Add Funds</h2>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-500 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && !loading && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Quick Amount Buttons */}
        <div className="mb-6">
          <label className="block text-primary-500 text-sm font-medium mb-3">Select Amount</label>
          <div className="grid grid-cols-5 gap-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setSelectedAmount(quickAmount)}
                disabled={loading}
                className={`py-2 px-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  selectedAmount === quickAmount
                    ? 'border-primary-500 bg-primary-500/20 text-primary-500'
                    : 'border-primary-500/30 text-primary-400 hover:border-primary-500/50'
                }`}
              >
                ${quickAmount}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-primary-500 text-sm font-medium mb-2">Custom Amount</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter amount"
              disabled={loading}
              className="w-full px-4 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Stripe Payment Element - wrapped in Elements with clientSecret */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-primary-500" />
            <span className="ml-2 text-primary-400">Loading payment form...</span>
          </div>
        ) : clientSecret && stripePromise && elementsOptions ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CheckoutForm amount={selectedAmount} onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        ) : (
          <div className="text-center py-8 text-primary-400">
            {error || 'Unable to load payment form. Please try again.'}
          </div>
        )}
      </div>
    </div>
  )
}

