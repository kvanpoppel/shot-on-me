'use client'

import { useState, useEffect } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create payment intent
      const response = await axios.post(
        `${API_URL}/payments/create-intent`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const { clientSecret } = response.data

      // Confirm payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/wallet?success=true` : undefined,
        },
        redirect: 'if_required', // Don't redirect, handle in app
      })

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        setLoading(false)
      } else {
        // Payment succeeded - webhook will update wallet
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.response?.data?.message || 'Failed to process payment')
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
        disabled={!stripe || loading}
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
  const quickAmounts = [10, 25, 50, 100, 200]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-primary-500">Add Funds</h2>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Amount Buttons */}
        <div className="mb-6">
          <label className="block text-primary-500 text-sm font-medium mb-3">Select Amount</label>
          <div className="grid grid-cols-5 gap-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setSelectedAmount(quickAmount)}
                className={`py-2 px-3 rounded-lg border-2 transition-all ${
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
              className="w-full px-4 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Stripe Payment Element - now uses global Elements context */}
        <CheckoutForm amount={selectedAmount} onSuccess={onSuccess} onClose={onClose} />
      </div>
    </div>
  )
}

