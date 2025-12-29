'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { X, MapPin, CreditCard, DollarSign, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { useApiUrl } from '../utils/api'

interface Venue {
  _id: string
  name: string
  address?: {
    street?: string
    city?: string
    state?: string
  }
  location?: {
    coordinates: [number, number]
  }
}

interface TapAndPayModalProps {
  isOpen: boolean
  onClose: () => void
  venue?: Venue
  onSuccess?: (payment: any) => void
}

export default function TapAndPayModal({ isOpen, onClose, venue, onSuccess }: TapAndPayModalProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [amount, setAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(venue || null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [showVenueSelector, setShowVenueSelector] = useState(!venue)
  const [cardStatus, setCardStatus] = useState<any>(null)

  useEffect(() => {
    if (isOpen && token) {
      fetchCardStatus()
      if (!venue) {
        fetchVenues()
      }
    }
  }, [isOpen, token, venue])

  const fetchCardStatus = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/virtual-cards/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCardStatus(response.data)
    } catch (error) {
      console.error('Failed to fetch card status:', error)
    }
  }

  const fetchVenues = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setVenues(response.data.venues || [])
    } catch (error) {
      console.error('Failed to fetch venues:', error)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVenue || !amount || !token) return

    const paymentAmount = parseFloat(amount)
    
    // Validate amount
    if (isNaN(paymentAmount) || paymentAmount < 5) {
      setError('Minimum payment amount is $5.00')
      return
    }
    if (paymentAmount > 500) {
      setError('Maximum payment amount is $500.00')
      return
    }

    // Check balance
    const balance = user?.wallet?.balance || 0
    if (paymentAmount > balance) {
      setError(`Insufficient balance. Available: $${balance.toFixed(2)}`)
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await axios.post(
        `${API_URL}/tap-and-pay/process`,
        {
          venueId: selectedVenue._id,
          amount: paymentAmount
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Success!
      if (onSuccess) {
        onSuccess(response.data)
      }
      
      // Close modal after short delay to show success
      setTimeout(() => {
        setAmount('')
        setProcessing(false)
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('Payment failed:', error)
      setError(error.response?.data?.message || 'Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  const balance = user?.wallet?.balance || 0
  const hasCard = cardStatus?.hasCard || false
  const canPay = hasCard && balance >= 5

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-black border-2 border-primary-500/30 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary-500" />
            </div>
            <h2 className="text-xl font-semibold text-primary-500">Tap & Pay</h2>
          </div>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-500 transition-colors"
            disabled={processing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Card Status Warning */}
        {!hasCard && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-400 text-sm font-medium mb-1">No Virtual Card</p>
              <p className="text-yellow-400/80 text-xs">
                Create a virtual card in your Wallet tab to use tap-and-pay.
              </p>
            </div>
          </div>
        )}

        {/* Venue Selector */}
        {showVenueSelector && (
          <div className="mb-4">
            <label className="block text-primary-500 text-sm font-medium mb-2">
              Select Venue
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {venues.map((v) => (
                <button
                  key={v._id}
                  onClick={() => {
                    setSelectedVenue(v)
                    setShowVenueSelector(false)
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedVenue?._id === v._id
                      ? 'bg-primary-500/20 border-primary-500/50'
                      : 'bg-black/40 border-primary-500/20 hover:border-primary-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-primary-500 font-semibold truncate">{v.name}</p>
                      {v.address && (
                        <p className="text-primary-400/70 text-xs truncate">
                          {[v.address.street, v.address.city, v.address.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {venues.length === 0 && (
              <p className="text-primary-400/60 text-sm text-center py-4">
                No venues available
              </p>
            )}
          </div>
        )}

        {/* Selected Venue Display */}
        {selectedVenue && !showVenueSelector && (
          <div className="mb-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-primary-500 font-semibold truncate">{selectedVenue.name}</p>
                  {selectedVenue.address && (
                    <p className="text-primary-400/70 text-xs truncate">
                      {[selectedVenue.address.street, selectedVenue.address.city, selectedVenue.address.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowVenueSelector(true)}
                className="text-primary-400 hover:text-primary-500 text-xs ml-2"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {selectedVenue && (
          <form onSubmit={handlePayment} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-primary-500 text-sm font-medium mb-2">
                Payment Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
                      setAmount(val)
                      setError(null)
                    }
                  }}
                  placeholder="0.00"
                  min="5"
                  max="500"
                  step="0.01"
                  required
                  disabled={processing || !canPay}
                  className="w-full pl-10 pr-4 py-3 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-primary-400/60 text-xs">
                  Min: $5.00 • Max: $500.00
                </p>
                <p className="text-primary-400/60 text-xs">
                  Balance: ${balance.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Commission Preview */}
            {amount && parseFloat(amount) >= 5 && (
              <div className="p-3 bg-primary-500/5 border border-primary-500/10 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-primary-400">Amount:</span>
                  <span className="text-primary-500 font-semibold">${parseFloat(amount || '0').toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-primary-400/70">
                  <span>Commission:</span>
                  <span>
                    {parseFloat(amount || '0') < 20 
                      ? '$0.50' 
                      : `$${(parseFloat(amount || '0') * 0.025).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-primary-500/10">
                  <span className="text-primary-400">Venue Receives:</span>
                  <span className="text-primary-500 font-semibold">
                    ${(parseFloat(amount || '0') - (parseFloat(amount || '0') < 20 ? 0.50 : parseFloat(amount || '0') * 0.025)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm flex-1">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {processing && !error && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                <Loader className="w-5 h-5 text-green-400 animate-spin" />
                <p className="text-green-400 text-sm">Processing payment...</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing || !canPay || !amount || parseFloat(amount) < 5 || parseFloat(amount) > 500 || parseFloat(amount) > balance}
              className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Pay ${amount || '0.00'}</span>
                </>
              )}
            </button>

            {/* Balance Warning */}
            {balance < 5 && (
              <p className="text-center text-primary-400/60 text-xs">
                Add funds to your wallet to make payments
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

