'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PaymentElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import { X, Loader, Check, CreditCard, ShieldCheck } from 'lucide-react'

const QUICK_AMOUNTS = [10, 25, 50, 100]

// ----- Inner checkout form (must be inside <Elements>) -----
function CheckoutForm({
  amount,
  onSuccess,
  onClose,
}: {
  amount: number
  onSuccess: () => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 5-second fallback in case onReady never fires
  useEffect(() => {
    readyTimeoutRef.current = setTimeout(() => setReady(true), 5000)
    return () => { if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current) }
  }, [])

  const handlePay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)
    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/?funds=added` : '/',
        },
        redirect: 'if_required',
      })
      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        setLoading(false)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement
        onReady={() => {
          if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current)
          setReady(true)
        }}
        onLoadError={() => setError('Failed to load payment form. Please refresh.')}
      />
      {!ready && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-white/40">
          <Loader className="w-4 h-4 animate-spin" /> Loading form...
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
          {error}
        </div>
      )}
      <button
        onClick={handlePay}
        disabled={loading || !ready}
        className="revig-btn-primary w-full py-4 text-base disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader className="w-4 h-4 animate-spin" /> Processing...</> : `Add $${amount.toFixed(2)}`}
      </button>
    </div>
  )
}

// ----- Modal shell -----
interface AddFundsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddFundsModal({ isOpen, onClose, onSuccess }: AddFundsModalProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()

  const [amount, setAmount] = useState(25)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // SOM shared-cards permission
  const [hasSOMCards, setHasSOMCards] = useState(false)
  const [somCardsDismissed, setSomCardsDismissed] = useState(false)
  const [somCardsAllowed, setSomCardsAllowed] = useState<boolean | null>(null)

  const init = useCallback(async (selectedAmount: number) => {
    if (!token) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    setLoading(true)
    setError(null)
    setClientSecret(null)

    try {
      // 1. Fetch Stripe key
      const keyRes = await axios.get(`${API_URL}/payments/stripe-key`, { signal })
      if (signal.aborted) return
      const key = keyRes.data.publishableKey
      if (!key) throw new Error('Payment not configured')

      const stripe = loadStripe(key)
      setStripePromise(stripe)

      // 2. Create PaymentIntent
      const intentRes = await axios.post(
        `${API_URL}/payments/create-intent`,
        { amount: selectedAmount },
        { headers: { Authorization: `Bearer ${token}` }, signal }
      )
      if (signal.aborted) return
      setClientSecret(intentRes.data.clientSecret)
    } catch (err: any) {
      if (signal.aborted || err.name === 'CanceledError') return
      setError(err.response?.data?.error || err.message || 'Could not start payment')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [API_URL, token])

  // Check if user has saved SOM payment methods
  const checkSOMCards = useCallback(async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const methods = res.data.paymentMethods || res.data || []
      setHasSOMCards(methods.length > 0)
    } catch { /* ignore */ }
  }, [API_URL, token])

  // Initialise when modal opens
  useEffect(() => {
    if (isOpen) {
      setSucceeded(false)
      setSomCardsDismissed(false)
      setSomCardsAllowed(null)
      checkSOMCards()
      init(amount)
    } else {
      abortRef.current?.abort()
      setClientSecret(null)
      setStripePromise(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleAmountChange = (a: number) => {
    setAmount(a)
    init(a)
  }

  const handleSuccess = () => {
    setSucceeded(true)
    onSuccess()
    setTimeout(onClose, 1800)
  }

  if (!isOpen) return null

  const elementsOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: { colorPrimary: '#C8F135', colorBackground: '#252540', colorText: '#ffffff', borderRadius: '12px' },
    },
  } : undefined

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 safe-bottom animate-slide-up" style={{ background: '#1A1A2E', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Add Funds</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {succeeded ? (
          <div className="py-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(200,241,53,0.2)' }}>
              <Check className="w-8 h-8" style={{ color: '#C8F135' }} />
            </div>
            <p className="text-xl font-black text-white">Funds Added!</p>
            <p className="text-white/40 text-sm mt-1">${amount.toFixed(2)} added to your Revig wallet</p>
          </div>
        ) : (
          <>
            {/* SOM shared-cards permission banner */}
            {hasSOMCards && !somCardsDismissed && somCardsAllowed === null && (
              <div className="mb-4 p-4 rounded-2xl" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#00D4FF' }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Use your Shot On Me cards?</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      You have saved payment methods on Shot On Me. Allow Revig to use the same cards, or add a new one.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => { setSomCardsAllowed(true); setSomCardsDismissed(true) }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)' }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Allow
                      </button>
                      <button
                        onClick={() => { setSomCardsAllowed(false); setSomCardsDismissed(true) }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      >
                        Use new card
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Amount selector */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => handleAmountChange(a)}
                  className="py-3 rounded-2xl font-black text-sm transition-all"
                  style={amount === a
                    ? { background: '#C8F135', color: '#1A1A2E', transform: 'scale(1.04)' }
                    : { background: '#252540', color: 'white' }
                  }
                >
                  ${a}
                </button>
              ))}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-white/40">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="text-sm">Preparing payment...</span>
              </div>
            )}

            {!loading && clientSecret && stripePromise && elementsOptions && (
              <Elements stripe={stripePromise} options={elementsOptions}>
                <CheckoutForm amount={amount} onSuccess={handleSuccess} onClose={onClose} />
              </Elements>
            )}
          </>
        )}
      </div>
    </>
  )
}
