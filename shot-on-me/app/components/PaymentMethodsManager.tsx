'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { CreditCard, Plus, Trash2, Check, Loader, X } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface PaymentMethod {
  id: string
  type: string
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  isDefault: boolean
}

export default function PaymentMethodsManager() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchPaymentMethods()
      initializeStripe()
    }
  }, [token])

  const initializeStripe = async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/stripe-key`)
      if (response.data.configured && response.data.publishableKey) {
        const stripe = loadStripe(response.data.publishableKey)
        setStripePromise(stripe)
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPaymentMethods(response.data.paymentMethods || [])
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/payment-methods/setup-intent`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSetupIntentSecret(response.data.clientSecret)
      setShowAddForm(true)
    } catch (error) {
      console.error('Failed to create setup intent:', error)
      alert('Failed to add payment method. Please try again.')
    }
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await axios.post(
        `${API_URL}/payment-methods/${paymentMethodId}/set-default`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to set default payment method:', error)
      alert('Failed to set default payment method.')
    }
  }

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return
    }

    try {
      await axios.delete(`${API_URL}/payment-methods/${paymentMethodId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to delete payment method:', error)
      alert('Failed to delete payment method.')
    }
  }

  const getCardIcon = (brand: string) => {
    const brands: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳'
    }
    return brands[brand.toLowerCase()] || '💳'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-500">Payment Methods</h3>
        <button
          onClick={handleAddPaymentMethod}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black rounded-lg font-medium hover:bg-primary-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Card</span>
        </button>
      </div>

      {paymentMethods.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-primary-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No payment methods saved</p>
          <p className="text-sm mt-1">Add a card for faster checkout</p>
        </div>
      )}

      <div className="space-y-2">
        {paymentMethods.map(pm => (
          <div
            key={pm.id}
            className="flex items-center justify-between p-4 bg-black/40 border border-primary-500/10 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getCardIcon(pm.card.brand)}</div>
              <div>
                <p className="font-medium text-primary-500">
                  {pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)} •••• {pm.card.last4}
                </p>
                <p className="text-sm text-primary-400">
                  Expires {pm.card.expMonth}/{pm.card.expYear}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pm.isDefault && (
                <span className="px-2 py-1 bg-primary-500/20 text-primary-500 text-xs rounded">
                  Default
                </span>
              )}
              {!pm.isDefault && (
                <button
                  onClick={() => handleSetDefault(pm.id)}
                  className="px-3 py-1 text-xs text-primary-400 hover:text-primary-500 border border-primary-500/20 rounded hover:border-primary-500/40 transition-all"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => handleDelete(pm.id)}
                className="p-2 text-red-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddForm && setupIntentSecret && stripePromise && (
        <AddPaymentMethodForm
          stripePromise={stripePromise}
          setupIntentSecret={setupIntentSecret}
          onSuccess={() => {
            setShowAddForm(false)
            setSetupIntentSecret(null)
            fetchPaymentMethods()
          }}
          onCancel={() => {
            setShowAddForm(false)
            setSetupIntentSecret(null)
          }}
        />
      )}
    </div>
  )
}

function AddPaymentMethodForm({
  stripePromise,
  setupIntentSecret,
  onSuccess,
  onCancel
}: {
  stripePromise: Promise<any>
  setupIntentSecret: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentElementReady, setPaymentElementReady] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    if (!paymentElementReady) {
      setError('Payment form is still loading. Please wait a moment.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // CRITICAL: Must call elements.submit() before confirmSetup()
      const submitResult = await elements.submit()
      
      // Check if submit returned a validation error
      if (submitResult && typeof submitResult === 'object') {
        const submitError = (submitResult as any).error
        
        if (submitError && typeof submitError === 'object' && submitError.type) {
          const errorType = submitError.type
          const errorCode = submitError.code
          const errorMessage = submitError.message || submitError.msg || ''
          
          // Handle incomplete payment method error specifically
          if (errorCode === 'incomplete_payment_method' || 
              errorMessage.toLowerCase().includes('select a payment method') ||
              errorMessage.toLowerCase().includes('please select')) {
            setError('Please enter your complete card details (card number, expiry, and CVC) before submitting.')
            setLoading(false)
            return
          }
          
          // Block on validation or card errors
          if (errorType === 'validation_error' || errorType === 'card_error') {
            setError(errorMessage || 'Please check your card information and try again.')
            setLoading(false)
            return
          }
        }
      }

      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/wallet?success=true` : undefined
        },
        redirect: 'if_required'
      })

      if (confirmError) {
        let errorMessage = confirmError.message || 'Failed to save payment method'
        
        if (confirmError.code === 'incomplete_payment_method') {
          errorMessage = 'Please enter your complete card details before submitting.'
        }
        
        setError(errorMessage)
      } else {
        onSuccess()
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to save payment method'
      
      if (err.code === 'incomplete_payment_method' || 
          err.message?.toLowerCase().includes('select a payment method')) {
        errorMessage = 'Please enter your complete card details before submitting.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!stripe || !elements) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="p-4 bg-black/60 border border-primary-500/20 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-primary-500">Add Payment Method</h4>
        <button onClick={onCancel} className="text-primary-400 hover:text-primary-500">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement 
          onReady={() => {
            setPaymentElementReady(true)
          }}
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: 'never'
            }
          }}
        />
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-500 text-black py-2 rounded-lg font-medium hover:bg-primary-400 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Card'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-black/40 border border-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/10 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

