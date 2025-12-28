'use client'

import { useStripe, useElements, PaymentElement, Elements, CardElement as StripeCardElement } from '@stripe/react-stripe-js'
import { useState, useMemo, useEffect } from 'react'
import { getStripeInstance } from '../utils/stripe-instance'
import { getApiUrl } from '../utils/api'

interface CardElementProps {
  onSuccess: (paymentMethodId: string) => void
  onError: (error: string) => void
  disabled?: boolean
  clientSecret?: string // For Setup Intent
}

// Internal component that uses root Elements context - SIMPLIFIED VERSION
function PaymentForm({ onSuccess, onError, disabled, clientSecret }: CardElementProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const [hasInput, setHasInput] = useState(false)
  const [useSimpleCard, setUseSimpleCard] = useState(true) // Try simple card element first

  // Listen for changes in the PaymentElement to detect when user enters card details
  useEffect(() => {
    if (!elements || !paymentElementReady) return

    const paymentElement = elements.getElement('payment')
    if (!paymentElement) return

    // Listen for change events to detect when user enters card details
    const handleChange = (event: any) => {
      // Check if the form has valid input
      if (event.complete) {
        setHasInput(true)
      } else if (event.empty) {
        setHasInput(false)
      } else {
        // Form has some input but may not be complete
        setHasInput(true)
      }
    }

    paymentElement.on('change', handleChange)

    return () => {
      paymentElement.off('change', handleChange)
    }
  }, [elements, paymentElementReady])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      onError('Payment form not ready. Please refresh and try again.')
      return
    }

    setProcessing(true)

    try {
      console.log('🔄 Starting payment method submission...')
      
      // Try simple CardElement first (more reliable)
      const cardElement = elements.getElement(StripeCardElement)
      
      if (cardElement && clientSecret) {
        console.log('✅ Using simple CardElement with confirmCardSetup')
        // Use confirmCardSetup directly with the card element
        const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElement,
          }
        })

        if (confirmError) {
          console.error('❌ confirmCardSetup error:', confirmError)
          onError(confirmError.message || 'Failed to save payment method')
          setProcessing(false)
          return
        }

        if (setupIntent && setupIntent.payment_method) {
          const paymentMethodId = typeof setupIntent.payment_method === 'string' 
            ? setupIntent.payment_method 
            : setupIntent.payment_method.id
          
          console.log('✅ Payment method saved successfully:', paymentMethodId)
          onSuccess(paymentMethodId)
          setProcessing(false)
          return
        }
      }
      
      // Fallback to PaymentElement if CardElement not available
      console.log('⚠️ CardElement not found, trying PaymentElement...')
      
      if (!paymentElementReady) {
        onError('Payment form is still loading. Please wait a moment.')
        setProcessing(false)
        return
      }

      const paymentElement = elements.getElement('payment')
      if (!paymentElement) {
        onError('Payment form is still loading. Please wait a moment and try again.')
        setProcessing(false)
        return
      }
      
      // CRITICAL: Must call elements.submit() before confirmSetup()
      console.log('📝 Calling elements.submit()...')
      const submitResult = await elements.submit()
      console.log('✅ elements.submit() result:', submitResult)
      
      // Check if submit returned a validation error
      if (submitResult && typeof submitResult === 'object') {
        const submitError = (submitResult as any).error
        
        if (submitError && typeof submitError === 'object' && submitError.type) {
          const errorType = submitError.type
          const errorCode = submitError.code
          const errorMessage = submitError.message || submitError.msg || ''
          
          console.error('❌ Validation error from elements.submit():', {
            type: errorType,
            code: errorCode,
            message: errorMessage
          })
          
          // Handle incomplete payment method error specifically
          if (errorCode === 'incomplete_payment_method' || 
              errorMessage.toLowerCase().includes('select a payment method') ||
              errorMessage.toLowerCase().includes('please select')) {
            console.error('❌ Payment method not selected. User may need to:')
            console.error('   1. Click on the "Card" tab in the payment form')
            console.error('   2. Enter complete card details (number, expiry, CVC)')
            console.error('   3. Wait for the form to show as complete')
            onError('Please click on the "Card" tab and enter your complete card details (card number, expiry, and CVC) before submitting.')
            setProcessing(false)
            return
          }
          
          // Block on validation or card errors
          if (errorType === 'validation_error' || errorType === 'card_error') {
            const userMessage = errorMessage || 
              (errorType === 'card_error' ? 'Card validation failed. Please check your card details.' :
               'Please check your card information and try again.')
            onError(userMessage)
            setProcessing(false)
            return
          }
        }
      }
      
      console.log('✅ Form validation passed, proceeding to confirmSetup...')
      
      // Now confirm the Setup Intent
      const confirmOptions: any = {
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/wallet?success=true` : undefined,
        },
        redirect: 'if_required',
      }
      
      // Explicitly pass clientSecret if available
      if (clientSecret) {
        confirmOptions.clientSecret = clientSecret
      }
      
      console.log('🔄 Calling stripe.confirmSetup()...')
      const { error: confirmError, setupIntent } = await stripe.confirmSetup(confirmOptions)
      console.log('✅ confirmSetup result:', { error: confirmError, setupIntent: setupIntent?.id })

      if (confirmError) {
        console.error('❌ Stripe confirmSetup error:', {
          type: confirmError.type,
          code: confirmError.code,
          message: confirmError.message,
          fullError: confirmError
        })
        
        let errorMessage = confirmError.message || 'Failed to save payment method. Please try again.'
        
        // Provide more specific error messages
        if (confirmError.code === 'incomplete_payment_method') {
          errorMessage = 'Please enter your complete card details before submitting.'
        } else if (confirmError.type === 'card_error') {
          errorMessage = 'Card validation failed. Please check your card details.'
        } else if (confirmError.type === 'validation_error') {
          errorMessage = 'Invalid card information. Please try again.'
        }
        
        onError(errorMessage)
        setProcessing(false)
        return
      }

      if (setupIntent && setupIntent.payment_method) {
        // Payment method is now attached to customer via Setup Intent
        const paymentMethodId = typeof setupIntent.payment_method === 'string' 
          ? setupIntent.payment_method 
          : setupIntent.payment_method.id
        
        console.log('✅ Payment method saved successfully:', paymentMethodId)
        onSuccess(paymentMethodId)
        setProcessing(false)
      } else {
        console.error('❌ Setup Intent missing payment_method:', setupIntent)
        onError('Payment method not found after setup. Please try again.')
        setProcessing(false)
      }
    } catch (err: any) {
      console.error('Error confirming setup:', {
        message: err.message,
        type: err.type,
        code: err.code,
        fullError: err
      })
      
      let errorMessage = err.message || 'An error occurred. Please try again.'
      
      if (err.code === 'incomplete_payment_method' || 
          err.message?.toLowerCase().includes('select a payment method')) {
        errorMessage = 'Please enter your complete card details before submitting.'
      } else if (err.type === 'StripeCardError') {
        errorMessage = 'Card validation failed. Please check your card details.'
      } else if (err.type === 'StripeInvalidRequestError') {
        errorMessage = 'Invalid payment information. Please try again.'
      }
      
      onError(errorMessage)
      setProcessing(false)
    }
  }

  // If Stripe is not available, show a message
  if (!stripe || !elements) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
          <p className="text-yellow-400 text-sm font-medium mb-2">Payment Processing Not Available</p>
          <p className="text-yellow-400/70 text-xs">
            Stripe payment processing is not configured. To enable credit card payments, Stripe API keys need to be set up in the backend configuration.
          </p>
        </div>
      </div>
    )
  }

  // Try simple CardElement first - it's more reliable
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#B8945A',
        '::placeholder': {
          color: '#8B7500',
        },
        backgroundColor: '#000000',
      },
      invalid: {
        color: '#EF4444',
        iconColor: '#EF4444',
      },
    },
    hidePostalCode: true,
  }

  return (
    <form 
      onSubmit={(e) => {
        console.log('📝 Form onSubmit triggered!')
        handleSubmit(e)
      }} 
      className="space-y-4"
    >
      <div className="p-4 bg-black border border-primary-500 rounded-lg">
        {/* Try simple CardElement first - more reliable */}
        {useSimpleCard ? (
          <div>
            <StripeCardElement 
              options={cardElementOptions}
              onChange={(event) => {
                console.log('📝 CardElement onChange:', {
                  complete: event.complete,
                  empty: event.empty,
                  error: event.error
                })
                setHasInput(!event.empty)
                if (event.complete) {
                  setPaymentElementReady(true)
                }
              }}
              onReady={() => {
                console.log('✅ Simple CardElement ready')
                setPaymentElementReady(true)
              }}
            />
          </div>
        ) : (
          <PaymentElement 
            onReady={() => {
              console.log('✅ PaymentElement ready')
              setPaymentElementReady(true)
            }}
            onChange={(event) => {
              console.log('📝 PaymentElement onChange:', {
                complete: event.complete,
                empty: event.empty,
                value: event.value,
                elementType: event.elementType
              })
              
              if (event.complete) {
                console.log('✅ Form is complete!')
                setHasInput(true)
              } else if (event.empty) {
                console.log('⚠️ Form is empty')
                setHasInput(false)
              } else {
                console.log('📝 Form has input (not complete yet)')
                setHasInput(true)
              }
            }}
            onLoadError={(errorEvent) => {
              console.error('❌ PaymentElement load error:', errorEvent)
              // Fallback to simple card element
              console.log('🔄 Falling back to simple CardElement...')
              setUseSimpleCard(true)
            }}
            options={{
              layout: 'accordion',
              fields: {
                billingDetails: 'never'
              }
            }}
          />
        )}
      </div>
      {!paymentElementReady && (
        <div className="text-xs text-primary-400 text-center py-1">
          ⏳ Loading payment form...
        </div>
      )}
      {paymentElementReady && !hasInput && (
        <div className="text-xs text-primary-400/70 text-center py-2 px-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <p className="font-semibold mb-1">💡 Instructions:</p>
          <p>1. Click on "Card" in the payment form above</p>
          <p>2. Enter your card number, expiry date, and CVC</p>
          <p>3. Wait for the form to show all fields are complete</p>
          <p>4. Then click "Add Card" button below</p>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !paymentElementReady || processing || disabled}
        onClick={(e) => {
          console.log('🖱️ Add Card button clicked!', {
            stripe: !!stripe,
            paymentElementReady,
            processing,
            disabled,
            buttonDisabled: !stripe || !paymentElementReady || processing || disabled
          })
          // Don't prevent default - let form submit normally
        }}
        className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {processing ? (
          <>
            <span className="inline-block animate-spin mr-2">⏳</span>
            Processing...
          </>
        ) : (
          'Add Card'
        )}
      </button>
      <div className="text-xs text-primary-400/50 text-center">
        Debug: stripe={stripe ? '✅' : '❌'}, ready={paymentElementReady ? '✅' : '❌'}, hasInput={hasInput ? '✅' : '❌'}
      </div>
    </form>
  )
}

// Wrapper - Creates Elements provider if clientSecret is provided
export default function SecureCardElement({ clientSecret, onSuccess, onError, disabled }: CardElementProps) {
  const [stripeKey, setStripeKey] = useState<string | null>(null)
  
  useEffect(() => {
    if (clientSecret && !stripeKey) {
      const fetchKey = async () => {
        try {
          const API_URL = getApiUrl()
          const response = await fetch(`${API_URL}/payments/stripe-key?_=${Date.now()}`)
          const data = await response.json()
          if (data.publishableKey) {
            setStripeKey(data.publishableKey)
          }
        } catch (error) {
          console.error('Failed to fetch Stripe key:', error)
        }
      }
      fetchKey()
    }
  }, [clientSecret, stripeKey])
  
  const stripePromise = useMemo(() => {
    if (clientSecret && stripeKey) {
      return getStripeInstance(stripeKey)
    }
    return null
  }, [stripeKey])
  
  // If clientSecret provided, create Elements with it
  if (clientSecret && stripePromise) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#B8945A',
              colorBackground: '#000000',
              colorText: '#B8945A',
            }
          }
        }}
      >
        <PaymentForm
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
          disabled={disabled}
        />
      </Elements>
    )
  }
  
  if (clientSecret && !stripePromise) {
    return (
      <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 text-center">
        <p className="text-primary-400 text-sm">Loading payment form...</p>
      </div>
    )
  }
  
  // No clientSecret - use root Elements provider
  return (
    <PaymentForm
      clientSecret={clientSecret}
      onSuccess={onSuccess}
      onError={onError}
      disabled={disabled}
    />
  )
}
