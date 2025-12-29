'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { CreditCard, Plus, X, AlertTriangle, CheckCircle, Wallet, Apple, Smartphone } from 'lucide-react'
import { useApiUrl } from '../utils/api'
import CustomCardDesign from './CustomCardDesign'

interface CardStatus {
  hasCard: boolean
  canCreate: boolean
  balance: number
  minimumRequired: number
  card?: {
    id: string
    last4: string
    brand: string
    status: string
    expirationMonth: number
    expirationYear: number
    addedToAppleWallet: boolean
    addedToGooglePay: boolean
  }
  issuingEnabled: boolean
}

export default function VirtualCardManager() {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [cardStatus, setCardStatus] = useState<CardStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [deleteWarningsShown, setDeleteWarningsShown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchCardStatus()
      // Poll for card status if user just registered (card might be creating in background)
      // Check every 2 seconds for up to 10 seconds after component mounts
      let pollCount = 0
      const maxPolls = 5 // 5 polls = 10 seconds total
      const pollInterval = setInterval(() => {
        if (pollCount < maxPolls && !cardStatus?.hasCard) {
          fetchCardStatus()
          pollCount++
        } else {
          clearInterval(pollInterval)
        }
      }, 2000)
      
      return () => clearInterval(pollInterval)
    }
  }, [token, user])

  const fetchCardStatus = async () => {
    if (!token) return
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/virtual-cards/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCardStatus(response.data)
      setError(null)
    } catch (error: any) {
      console.error('Failed to fetch card status:', error)
      setError(error.response?.data?.message || 'Failed to load card status')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCard = async () => {
    if (!token) {
      alert('Please log in to create a card')
      return
    }
    
    // No balance check - first card can be created with $0 balance
    // User can add funds after creating the card
    // This creates the wallet/virtual card for the user

    setCreating(true)
    setError(null)
    
    try {
      const response = await axios.post(`${API_URL}/virtual-cards/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Refresh card status
      await fetchCardStatus()
      
      // Show success message
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
      toast.textContent = 'Virtual card created! You can now add it to your mobile wallet.'
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 4000)
      // This will be implemented in next phase
      
    } catch (error: any) {
      console.error('Failed to create card:', error)
      if (error.response?.status === 503) {
        const errorData = error.response.data
        if (errorData?.code === 'ISSUING_NOT_ENABLED') {
          setError(
            'Stripe Issuing is not enabled. ' +
            'To enable virtual cards, Stripe Issuing must be activated in your Stripe Dashboard. ' +
            'Go to https://dashboard.stripe.com/issuing and click "Enable Issuing".'
          )
        } else {
          setError(errorData?.message || 'Virtual card creation is currently unavailable. Please contact support.')
        }
      } else if (error.response?.status === 400) {
        setError(error.response.data.message || 'Cannot create card. Please check your balance.')
      } else {
        setError('Failed to create virtual card. Please try again.')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteCard = async () => {
    if (!cardStatus?.card || !token) return

    // First warning
    if (deleteWarningsShown < 1) {
      setDeleteWarningsShown(1)
      setShowDeleteWarning(true)
      return
    }

    // Second warning
    if (deleteWarningsShown < 2) {
      setDeleteWarningsShown(2)
      setShowDeleteWarning(true)
      return
    }

    // Actually delete
    try {
      await axios.delete(`${API_URL}/virtual-cards/${cardStatus.card.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      await fetchCardStatus()
      setShowDeleteWarning(false)
      setDeleteWarningsShown(0)
      alert('Card removed successfully. You can re-add it anytime from this screen.')
    } catch (error: any) {
      console.error('Failed to delete card:', error)
      setError('Failed to remove card. Please try again.')
    }
  }

  const handleAddToWallet = async (walletType: 'apple' | 'google') => {
    if (!cardStatus?.card || !token) return

    try {
      // Update wallet status in backend
      await axios.put(
        `${API_URL}/virtual-cards/wallet-status/${cardStatus.card.id}`,
        {
          walletType,
          added: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      await fetchCardStatus()
      
      // Generate wallet pass file
      try {
        const passResponse = await axios.get(
          `${API_URL}/virtual-cards/${cardStatus.card.id}/wallet-pass/${walletType}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          }
        )
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([passResponse.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `shot-on-me-card.${walletType === 'apple' ? 'pkpass' : 'json'}`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
        toast.textContent = `${walletType === 'apple' ? 'Apple Wallet' : 'Google Pay'} pass downloaded! Open it to add to your wallet.`
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 5000)
      } catch (passError: any) {
        // If pass generation fails, still show success for status update
        console.warn('Pass generation not available, showing instructions:', passError)
        const instructions = walletType === 'apple' 
          ? 'To add to Apple Wallet:\n1. Open the card details\n2. Tap "Add to Apple Wallet"\n3. Follow the prompts'
          : 'To add to Google Pay:\n1. Open Google Pay app\n2. Tap "Add card"\n3. Enter card details manually'
        
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold max-w-md text-center'
        toast.textContent = `Card ready! ${instructions}`
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 5000)
      }
    } catch (error: any) {
      console.error('Failed to update wallet status:', error)
      setError('Failed to add to wallet. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="bg-black/40 border border-primary-500/15 rounded-lg p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-500/20 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-primary-500/20 rounded w-3/4"></div>
            <div className="h-3 bg-primary-500/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!cardStatus) {
    return (
      <div className="bg-black/40 border border-primary-500/15 rounded-lg p-4">
        <p className="text-primary-400 text-sm">Unable to load card information</p>
      </div>
    )
  }

  // No card - show creation prompt
  if (!cardStatus.hasCard) {
    // Always allow creation if issuing is enabled (we removed the balance requirement)
    const canCreate = cardStatus.issuingEnabled !== false
    const balance = cardStatus.balance || 0

    return (
      <div className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border-2 border-primary-500/30 rounded-lg p-5 space-y-4 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary-500/30">
            <Wallet className="w-7 h-7 text-primary-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-primary-500 font-bold text-lg mb-2">Your Tap & Pay Card</h3>
            <p className="text-primary-400/90 text-sm mb-4 leading-relaxed">
              Your virtual card is being set up automatically. This usually takes just a few seconds. You'll be able to use it at venues once it's ready!
            </p>
            
            {error && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                {error}
              </div>
            )}

            {!cardStatus.issuingEnabled && (
              <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Stripe Issuing Not Enabled</p>
                    <p className="text-xs mb-2">
                      Virtual card creation requires Stripe Issuing to be enabled in your Stripe Dashboard.
                    </p>
                    <p className="text-xs">
                      <strong>To enable:</strong> Go to{' '}
                      <a 
                        href="https://dashboard.stripe.com/issuing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-yellow-300"
                      >
                        https://dashboard.stripe.com/issuing
                      </a>
                      {' '}and click "Enable Issuing"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {canCreate && (
              <>
                {loading ? (
                  <div className="w-full bg-primary-500/20 border-2 border-primary-500/30 px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-primary-400">
                    <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                    <span className="text-sm">Setting up your card...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateCard}
                    disabled={creating}
                    className="w-full bg-primary-500 text-black px-4 py-3 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-base"
                  >
                    {creating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                        <span>Creating Your Card...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Create Tap & Pay Card</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
            
            {!canCreate && cardStatus.issuingEnabled && (
              <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 text-sm">
                <p className="font-semibold mb-1">💡 Get Started</p>
                <p className="text-xs mb-2">Create your Tap & Pay card to start using your wallet at venues!</p>
                <p className="text-xs">You can add funds after creating your card.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Has card - show card info
  const card = cardStatus.card!
  const brandNames: { [key: string]: string } = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover'
  }

  return (
    <div className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border-2 border-primary-500/30 rounded-lg p-5 space-y-3 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary-500/30">
            <CreditCard className="w-7 h-7 text-primary-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-primary-500 font-bold text-lg">Your Tap & Pay Card</h3>
              {card.status === 'active' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className="text-primary-400/90 text-base mb-2 font-medium">
              {brandNames[card.brand] || card.brand.toUpperCase()} •••• {card.last4}
            </p>
            <p className="text-primary-400/70 text-sm mb-3">
              Expires {card.expirationMonth.toString().padStart(2, '0')}/{card.expirationYear}
            </p>
            <p className="text-primary-400/80 text-xs bg-primary-500/10 border border-primary-500/20 rounded px-3 py-2 inline-block">
              ✅ Ready to use at venues! Add funds to start spending.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteWarning(true)}
          className="text-primary-400/60 hover:text-primary-500 p-1 transition-colors"
          aria-label="Remove card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Wallet Status */}
      <div className="flex items-center gap-2 pt-2 border-t border-primary-500/10">
        {!card.addedToAppleWallet && (
          <button
            onClick={() => handleAddToWallet('apple')}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-400 hover:bg-primary-500/10 text-xs transition-colors"
          >
            <Apple className="w-4 h-4" />
            <span>Add to Apple Wallet</span>
          </button>
        )}
        {!card.addedToGooglePay && (
          <button
            onClick={() => handleAddToWallet('google')}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-400 hover:bg-primary-500/10 text-xs transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Add to Google Pay</span>
          </button>
        )}
        {card.addedToAppleWallet && card.addedToGooglePay && (
          <div className="flex items-center gap-2 text-green-400 text-xs">
            <CheckCircle className="w-4 h-4" />
            <span>Added to mobile wallets</span>
          </div>
        )}
      </div>

      {/* Custom Card Design */}
      <div className="pt-3 border-t border-primary-500/10">
        <CustomCardDesign />
      </div>

      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteWarning(false)}>
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-primary-500 font-semibold text-lg">
                {deleteWarningsShown === 1 ? 'First Warning' : 'Final Warning'}
              </h3>
            </div>
            <p className="text-primary-300 mb-4 text-sm">
              {deleteWarningsShown === 1 ? (
                <>
                  Removing this card will disable tap-and-pay functionality. You can re-add it anytime from the app.
                </>
              ) : (
                <>
                  Are you sure you want to remove this card? You'll need to re-add it from the Shot On Me app to use tap-and-pay again.
                </>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteWarning(false)
                  if (deleteWarningsShown === 2) {
                    setDeleteWarningsShown(0)
                  }
                }}
                className="flex-1 px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-400 hover:bg-primary-500/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCard}
                className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
              >
                {deleteWarningsShown === 2 ? 'Remove Card' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

