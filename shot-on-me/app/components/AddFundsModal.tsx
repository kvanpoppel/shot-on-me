'use client'

import { useState, useEffect, useRef } from 'react'
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import { useModal } from '../contexts/ModalContext'
import { nextFrameTick } from '../utils/elementsCoordinator'
import { X, Loader } from 'lucide-react'

interface AddFundsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount?: number
}

function CheckoutForm({ amount, onSuccess, onClose, canRender }: { amount: number; onSuccess: () => void; onClose: () => void; canRender: boolean }) {
  // ALWAYS call ALL hooks first - never conditionally call hooks
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset ready state when stripe/elements change
  useEffect(() => {
    if (stripe && elements && canRender) {
      setPaymentElementReady(false)
    }
  }, [stripe, elements, canRender])

  // Fallback timeout - enable after 5 seconds if onReady doesn't fire
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

  // Guard: Don't render if not ready
  if (!canRender) {
    return null
  }

  // Guard: Must have stripe and elements before proceeding
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
      // Wait for PaymentElement to be available (with timeout)
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

      // Confirm payment - Stripe will validate PaymentElement internally
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/wallet?success=true` : undefined,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        // Check for specific PaymentElement error
        if (confirmError.message?.includes('mounted Payment Element') || confirmError.message?.includes('Express Checkout Element')) {
          setError('Payment form is still loading. Please wait a few seconds and try again.')
        } else {
          setError(confirmError.message || 'Payment failed. Please try again.')
        }
        setLoading(false)
      } else {
        onSuccess()
        onClose()
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
          // Clear any loading errors when form becomes ready
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
          
          // Call handleSubmit directly
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
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [useSavedCard, setUseSavedCard] = useState(false)
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const { setModalOpen, isModalOpen } = useModal()
  const quickAmounts = [10, 25, 50, 100, 200]
  const initializedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [canRenderElements, setCanRenderElements] = useState(false)
  
  // Update modal context when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setModalOpen(true)
      // Ensure root Elements (if any) has unmounted and DOM next frame
      nextFrameTick().then(() => {
        setCanRenderElements(true) // Only now allow modal to create Elements
      })
    } else {
      setCanRenderElements(false)
      setModalOpen(false)
    }
  }, [isOpen, setModalOpen])

  // Initialize when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset everything when modal closes
      setClientSecret(null)
      setStripePromise(null)
      setError(null)
      setPaymentMethods([])
      setSelectedPaymentMethod(null)
      setUseSavedCard(false)
      initializedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      return
    }

    // Prevent multiple initializations
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

        // 1. Fetch Stripe publishable key
        const keyResponse = await axios.get(`${API_URL}/payments/stripe-key`, { signal })
        
        if (signal.aborted) return
        
        if (keyResponse.status === 503 || !keyResponse.data.configured) {
          throw new Error('Payment processing is not available. Stripe needs to be configured.')
        }
        
        const publishableKey = keyResponse.data.publishableKey
        if (!publishableKey) {
          throw new Error('Stripe publishable key not available')
        }

        // 2. Initialize Stripe
        const stripe = loadStripe(publishableKey)
        setStripePromise(stripe)

        // 3. Fetch saved payment methods
        let currentUseSavedCard = false
        let currentSelectedPaymentMethod: string | null = null
        
        try {
          const pmResponse = await axios.get(`${API_URL}/payment-methods`, {
            headers: { Authorization: `Bearer ${token}` },
            signal
          })
          
          if (signal.aborted) return
          
          const methods = pmResponse.data.paymentMethods || []
          setPaymentMethods(methods)
          if (methods.length > 0) {
            const defaultMethod = methods.find((pm: any) => pm.isDefault) || methods[0]
            currentSelectedPaymentMethod = defaultMethod.id
            currentUseSavedCard = true
            setSelectedPaymentMethod(currentSelectedPaymentMethod)
            setUseSavedCard(currentUseSavedCard)
          }
        } catch (err: any) {
          if (err.name !== 'CanceledError' && !signal.aborted) {
            console.error('Failed to fetch payment methods:', err)
          }
        }

        // 4. Create PaymentIntent only if amount is valid (> 0)
        // Validate amount before creating PaymentIntent to prevent 400 errors
        const amountToUse = parseFloat(String(selectedAmount)) || 0
        if (amountToUse > 0) {
          const intentResponse = await axios.post(
            `${API_URL}/payments/create-intent`,
            { 
              amount: amountToUse,
              paymentMethodId: currentUseSavedCard && currentSelectedPaymentMethod ? currentSelectedPaymentMethod : undefined,
              savePaymentMethod: !currentUseSavedCard
            },
            { 
              headers: { Authorization: `Bearer ${token}` },
              signal
            }
          )

          if (signal.aborted) return

          const { clientSecret: secret, status } = intentResponse.data
          
          // If using saved card and payment succeeded immediately
          if (status === 'succeeded' && currentUseSavedCard && currentSelectedPaymentMethod) {
            setTimeout(() => {
              onSuccess()
              onClose()
            }, 0)
            return
          }

          if (!secret) {
            throw new Error('Failed to create payment intent')
          }

          setClientSecret(secret)
        } else {
          // Amount is 0 or invalid - PaymentIntent will be created when user selects valid amount
          // This is OK - we'll create it when user clicks pay or selects an amount
          console.log('⏳ Amount is 0 or invalid. PaymentIntent will be created when user selects amount.')
        }
      } catch (err: any) {
        if (signal.aborted || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return
        }
        
        console.error('Stripe initialization error:', err)
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to initialize payment.'
        
        if (errorMessage.includes('not configured') || errorMessage.includes('not available')) {
          setError('Payment processing is not set up yet. Please contact support.')
        } else if (errorMessage.includes('Invalid API Key')) {
          setError(`Stripe error: ${errorMessage}. Please check backend configuration.`)
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
  }, [isOpen, token, API_URL]) // Only re-run when modal opens/closes or auth changes

  if (!isOpen) return null

  // Elements options
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

        {/* Saved Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="mb-6">
            <label className="block text-primary-500 text-sm font-medium mb-3">Payment Method</label>
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod(pm.id)
                    setUseSavedCard(true)
                    setClientSecret(null)
                    setError(null)
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedPaymentMethod === pm.id && useSavedCard
                      ? 'border-primary-500 bg-primary-500/20'
                      : 'border-primary-500/30 hover:border-primary-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-medium text-primary-500">
                          {pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)} •••• {pm.card.last4}
                        </p>
                        <p className="text-xs text-primary-400">
                          Expires {pm.card.expMonth}/{pm.card.expYear}
                        </p>
                      </div>
                    </div>
                    {pm.isDefault && (
                      <span className="px-2 py-1 bg-primary-500/20 text-primary-500 text-xs rounded">
                        Default
                      </span>
                    )}
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={async () => {
                  setUseSavedCard(false)
                  setSelectedPaymentMethod(null)
                  setClientSecret(null)
                  setError(null)
                  
                  try {
                    setLoading(true)
                    const intentResponse = await axios.post(
                      `${API_URL}/payments/create-intent`,
                      { 
                        amount: selectedAmount,
                        savePaymentMethod: true
                      },
                      { headers: { Authorization: `Bearer ${token}` } }
                    )
                    const { clientSecret: secret } = intentResponse.data
                    if (secret) {
                      setClientSecret(secret)
                    }
                  } catch (err: any) {
                    console.error('Failed to create payment intent:', err)
                    setError(err.response?.data?.message || 'Failed to initialize payment form')
                  } finally {
                    setLoading(false)
                  }
                }}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  !useSavedCard
                    ? 'border-primary-500 bg-primary-500/20'
                    : 'border-primary-500/30 hover:border-primary-500/50'
                }`}
              >
                <span className="text-primary-500">+ Use New Card</span>
              </button>
            </div>
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
              onChange={(e) => {
                const newAmount = parseFloat(e.target.value) || 0
                setSelectedAmount(newAmount)
                // Create PaymentIntent when user enters a valid amount
                if (newAmount > 0 && !clientSecret) {
                  // Debounce: wait a bit before creating PaymentIntent
                  setTimeout(async () => {
                    if (parseFloat(e.target.value) === newAmount && newAmount > 0) {
                      try {
                        setLoading(true)
                        const intentResponse = await axios.post(
                          `${API_URL}/payments/create-intent`,
                          { 
                            amount: newAmount,
                            paymentMethodId: useSavedCard && selectedPaymentMethod ? selectedPaymentMethod : undefined,
                            savePaymentMethod: !useSavedCard
                          },
                          { headers: { Authorization: `Bearer ${token}` } }
                        )
                        const { clientSecret: secret } = intentResponse.data
                        if (secret) {
                          setClientSecret(secret)
                        }
                      } catch (err: any) {
                        console.error('Failed to create payment intent:', err)
                        // Don't show error on input - only show when user tries to pay
                      } finally {
                        setLoading(false)
                      }
                    }
                  }, 500)
                }
              }}
              placeholder="Enter amount"
              disabled={loading}
              className="w-full px-4 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* One-click payment with saved card */}
        {useSavedCard && selectedPaymentMethod && paymentMethods.length > 0 ? (
          <button
            onClick={async () => {
              try {
                setLoading(true)
                setError(null)
                const intentResponse = await axios.post(
                  `${API_URL}/payments/create-intent`,
                  { 
                    amount: selectedAmount,
                    paymentMethodId: selectedPaymentMethod
                  },
                  { headers: { Authorization: `Bearer ${token}` } }
                )
                
                if (intentResponse.data.status === 'succeeded') {
                  onSuccess()
                  onClose()
                } else {
                  setError('Payment processing. Please wait...')
                }
              } catch (err: any) {
                setError(err.response?.data?.message || 'Payment failed')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="w-full bg-primary-500 text-black py-4 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Add ${selectedAmount.toFixed(2)}</span>
            )}
          </button>
        ) : (
          /* Stripe Payment Element */
          loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-primary-500" />
              <span className="ml-2 text-primary-400">Loading payment form...</span>
            </div>
          ) : clientSecret && stripePromise && elementsOptions ? (
            <Elements 
              stripe={stripePromise} 
              options={elementsOptions}
            >
              <CheckoutForm amount={selectedAmount} onSuccess={onSuccess} onClose={onClose} canRender={canRenderElements} />
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
          )
        )}
      </div>
    </div>
  )
}
