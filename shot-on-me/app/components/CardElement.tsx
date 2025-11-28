'use client'

import { useStripe, useElements, CardElement as StripeCardElement } from '@stripe/react-stripe-js'
import { useState } from 'react'

interface CardElementProps {
  onSuccess: (paymentMethodId: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

export default function SecureCardElement({ onSuccess, onError, disabled }: CardElementProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      onError('Stripe not initialized')
      return
    }

    const cardElement = elements.getElement(StripeCardElement)
    if (!cardElement) {
      onError('Card element not found')
      return
    }

    setProcessing(true)

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (error) {
        onError(error.message || 'Failed to create payment method')
        setProcessing(false)
        return
      }

      if (paymentMethod) {
        onSuccess(paymentMethod.id)
        setProcessing(false)
      }
    } catch (err: any) {
      onError(err.message || 'An error occurred')
      setProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#D4AF37',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-black border border-primary-500 rounded-lg">
        <StripeCardElement options={cardElementOptions} />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing || disabled}
        className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : 'Add Card'}
      </button>
    </form>
  )
}

