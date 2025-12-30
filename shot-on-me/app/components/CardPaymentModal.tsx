'use client'

import { useState, useEffect, useRef } from 'react'
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import { useModal } from '../contexts/ModalContext'
import { nextFrameTick } from '../utils/elementsCoordinator'
import { X, Loader, CreditCard } from 'lucide-react'

interface CardPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount: number
  recipientPhone?: string
  recipientId?: string
  message?: string
}

function CheckoutForm({ 
  amount, 
  onSuccess, 
  onClose, 
  canRender,
  recipientPhone,
  recipientId,
  message
}: { 
  amount: number
  onSuccess: () => void
  onClose: () => void
  canRender: boolean
  recipientPhone?: string
  recipientId?: string
  message?: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (stripe && elements && canRender) {
      setPaymentElementReady(false)
    }
  }, [stripe, elements, canRender])

  useEffect(() => {
    if (!canRender || !stripe || !elements || paymentElementReady) return

    readyTimeoutRef.current = setTimeout(() => {
      if (!paymentElementReady) {
        try {
          const paymentElement = elements.getElement('payment')
          if (paymentElement) {
            setPaymentElementReady(true)
          } else {
            setPaymentElementReady(true)
          }
        } catch (err) {
          setPaymentElementReady(true)
        }
      }
    }, 5000)

    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current)
      }
    }
  }, [stripe, elements, paymentElementReady, canRender])

  if (!canRender) {
    return null
  }

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

    if (!stripe || !elements) {
      setError('Payment form not ready. Please refresh and try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Wait for PaymentElement to be available
      let attempts = 0
      let paymentElement = null
      while (attempts < 10 && !paymentElement) {
        try {
          paymentElement = elements.getElement('payment')
          if (paymentElement) {
            break
          }
        } catch (err) {
          // PaymentElement not ready yet
        }
        if (!paymentElement) {
          await new Promise(resolve => setTimeout(resolve, 200))
          attempts++
        }
      }

      // Confirm payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/wallet?success=true` : undefined,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        if (confirmError.message?.includes('mounted Payment Element') || confirmError.message?.includes('Express Checkout Element')) {
          setError('Payment form is still loading. Please wait a few seconds and try again.')
        } else {
          setError(confirmError.message || 'Payment failed. Please try again.')
        }
        setLoading(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded - now send the money to recipient
        try {
          const response = await axios.post(
            `${API_URL}/payments/send-with-card`,
            {
              recipientPhone,
              recipientId,
              amount,
              message,
              clientSecret: paymentIntent.client_secret
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          )

          if (response.data.requiresAction) {
            // Payment needs additional action
            setError('Payment requires additional verification. Please complete the payment.')
            setLoading(false)
          } else {
            // Success!
            onSuccess()
            onClose()
          }
        } catch (sendError: any) {
          console.error('Error sending payment after card charge:', sendError)
          setError(sendError.response?.data?.message || 'Payment processed but failed to send. Please contact support.')
          setLoading(false)
        }
      } else {
        setError('Payment is still processing. Please wait...')
        setLoading(false)
      }
    } catch (err: any) {
      if (err.message?.includes('mounted Payment Element') || err.message?.includes('Express Checkout Element')) {
        setError('Payment form is still loading. Please wait a few seconds and try again.')
      } else {
        setError(err.message || 'Failed to process payment. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        onReady={() => {
          if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current)
          }
          setPaymentElementReady(true)
          if (error && error.includes('still loading')) {
            setError(null)
          }
        }}
        onLoadError={(error) => {
          setError('Failed to load payment form. Please refresh and try again.')
          setPaymentElementReady(false)
        }}
      />
      <div className="text-xs text-primary-400 text-center py-1">
        {paymentElementReady ? '✅ Form ready' : '⏳ Loading form...'}
      </div>
      {error && !error.includes('still loading') && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={async (e) => {
          e.preventDefault()
          e.stopPropagation()
          const fakeEvent = {
            preventDefault: () => {},
          } as React.FormEvent
          await handleSubmit(fakeEvent)
        }}
        className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Pay ${amount.toFixed(2)} & Send</span>
          </>
        )}
      </button>
    </form>
  )
}

export default function CardPaymentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  amount,
  recipientPhone,
  recipientId,
  message
}: CardPaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const { setModalOpen } = useModal()
  const initializedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [canRenderElements, setCanRenderElements] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      setModalOpen(true)
      nextFrameTick().then(() => {
        setCanRenderElements(true)
      })
    } else {
      setCanRenderElements(false)
      setModalOpen(false)
    }
  }, [isOpen, setModalOpen])

  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null)
      setStripePromise(null)
      setError(null)
      initializedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      return
    }

    if (initializedRef.current) {
      return
    }

    initializedRef.current = true
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const initializeStripe = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch Stripe publishable key
        const keyResponse = await axios.get(`${API_URL}/payments/stripe-key`, { signal })
        
        if (signal.aborted) return
        
        if (keyResponse.status === 503 || !keyResponse.data.configured) {
          throw new Error('Payment processing is not available. Stripe needs to be configured.')
        }
        
        const publishableKey = keyResponse.data.publishableKey
        if (!publishableKey) {
          throw new Error('Stripe publishable key not available')
        }

        // Initialize Stripe
        const stripe = loadStripe(publishableKey)
        setStripePromise(stripe)

        // Create PaymentIntent for the amount
        const intentResponse = await axios.post(
          `${API_URL}/payments/create-intent`,
          { 
            amount: amount,
            savePaymentMethod: false // Don't save for one-time payments
          },
          { 
            headers: { Authorization: `Bearer ${token}` },
            signal
          }
        )

        if (signal.aborted) return

        const { clientSecret: secret } = intentResponse.data
        
        if (!secret) {
          throw new Error('Failed to create payment intent')
        }

        setClientSecret(secret)
      } catch (err: any) {
        if (signal.aborted || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return
        }
        
        console.error('Stripe initialization error:', err)
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to initialize payment.'
        
        if (errorMessage.includes('not configured') || errorMessage.includes('not available')) {
          setError('Payment processing is not set up yet. Please contact support.')
        } else {
          setError(errorMessage)
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    initializeStripe()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isOpen, token, API_URL, amount])

  if (!isOpen) return null

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
          <div>
            <h2 className="text-2xl font-semibold text-primary-500">Pay with Card</h2>
            <p className="text-sm text-primary-400 mt-1">Send ${amount.toFixed(2)} to recipient</p>
          </div>
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

        {loading && !clientSecret ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-primary-500" />
            <span className="ml-2 text-primary-400">Loading payment form...</span>
          </div>
        ) : clientSecret && stripePromise && elementsOptions ? (
          <Elements 
            stripe={stripePromise} 
            options={elementsOptions}
          >
            <CheckoutForm 
              amount={amount} 
              onSuccess={onSuccess} 
              onClose={onClose} 
              canRender={canRenderElements}
              recipientPhone={recipientPhone}
              recipientId={recipientId}
              message={message}
            />
          </Elements>
        ) : error ? (
          <div className="text-center py-8 text-red-400">
            {error}
          </div>
        ) : (
          <div className="text-center py-8 text-primary-400">
            <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>Initializing payment form...</p>
          </div>
        )}
      </div>
    </div>
  )
}

