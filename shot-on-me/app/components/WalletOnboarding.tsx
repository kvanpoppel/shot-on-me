'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'
import { CreditCard, Wallet, CheckCircle2, Loader2, ArrowRight, Sparkles, Radio, Shield, Zap } from 'lucide-react'
import { useApiUrl } from '../utils/api'
import EnhancedPermissions from './EnhancedPermissions'

interface WalletOnboardingProps {
  onComplete?: () => void
  showOnMount?: boolean
}

export default function WalletOnboarding({ onComplete, showOnMount = true }: WalletOnboardingProps) {
  const { user, token, updateUser } = useAuth()
  const { socket, connected } = useSocket()
  const API_URL = useApiUrl()
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState<'card' | 'funds' | 'permissions' | 'complete'>('card')
  const [creatingCard, setCreatingCard] = useState(false)
  const [cardStatus, setCardStatus] = useState<any>(null)
  const [checkingCard, setCheckingCard] = useState(true)
  const [showPermissions, setShowPermissions] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)

  const checkCardStatus = useCallback(async () => {
    if (!token) return
    
    setCheckingCard(true)
    try {
      const response = await axios.get(`${API_URL}/virtual-cards/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCardStatus(response.data)
      
      // Determine current step
      if (response.data.hasCard) {
        const balance = user?.wallet?.balance || 0
        if (balance > 0) {
          setStep('permissions')
        } else {
          setStep('funds')
        }
      } else {
        setStep('card')
      }
    } catch (error) {
      console.error('Failed to check card status:', error)
      setStep('card')
    } finally {
      setCheckingCard(false)
    }
  }, [token, API_URL, user?.wallet?.balance])

  useEffect(() => {
    if (showOnMount && token) {
      // Check if onboarding has been completed
      let onboardingComplete = null
      try {
        onboardingComplete = localStorage.getItem('wallet-onboarding-complete')
      } catch (err) {
        onboardingComplete = null
      }
      
      if (!onboardingComplete) {
        checkCardStatus()
        setShowModal(true)
      }
    }
  }, [showOnMount, token, checkCardStatus])

  // Monitor Socket.io connection
  useEffect(() => {
    if (socket) {
      setSocketConnected(connected)
      
      // Listen for wallet updates
      const handleWalletUpdate = (data: any) => {
        console.log('Wallet updated via Socket:', data)
        if (updateUser) {
          updateUser({})
        }
        checkCardStatus()
      }

      socket.on('wallet-updated', handleWalletUpdate)
      socket.on('card-created', handleWalletUpdate)
      socket.on('payment-processed', handleWalletUpdate)

      return () => {
        socket.off('wallet-updated', handleWalletUpdate)
        socket.off('card-created', handleWalletUpdate)
        socket.off('payment-processed', handleWalletUpdate)
      }
    }
  }, [socket, connected, updateUser, checkCardStatus])

  const handleCreateCard = async () => {
    if (!token) return
    
    setCreatingCard(true)
    try {
      const response = await axios.post(`${API_URL}/virtual-cards/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Wait a moment for card to be fully created
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh card status
      await checkCardStatus()
      
      // Move to next step
      setStep('funds')
    } catch (error: any) {
      console.error('Failed to create card:', error)
      alert(error.response?.data?.message || 'Failed to create card. Please try again.')
    } finally {
      setCreatingCard(false)
    }
  }

  const handleSkipFunds = () => {
    // Move to permissions step
    setStep('permissions')
  }

  const handleCompleteOnboarding = () => {
    try {
      localStorage.setItem('wallet-onboarding-complete', 'true')
    } catch (err) {
      // Continue anyway
    }
    setShowModal(false)
    if (onComplete) onComplete()
  }

  const handlePermissionsComplete = () => {
    setShowPermissions(false)
    setStep('complete')
    handleCompleteOnboarding()
  }

  if (!showModal) return null

  const balance = user?.wallet?.balance || 0
  const hasCard = cardStatus?.hasCard || false

  return (
    <>
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-2xl w-full backdrop-blur-md my-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500/30 to-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-primary-500/40">
              <Wallet className="w-10 h-10 text-primary-500" />
            </div>
            <h2 className="text-3xl font-bold text-primary-500 tracking-tight mb-2">
              Welcome to Shot On Me!
            </h2>
            <p className="text-primary-400/80 text-sm font-light">
              Let's set up your tap-and-pay card to get started
            </p>
          </div>

          {/* Socket Connection Status */}
          <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
            socketConnected
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-yellow-500/10 border-yellow-500/20'
          }`}>
            {socketConnected ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm">Real-time updates connected</span>
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                <span className="text-yellow-400 text-sm">Connecting to real-time services...</span>
              </>
            )}
          </div>

          {/* Step 1: Create Card */}
          {step === 'card' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary-500/30">
                    <CreditCard className="w-6 h-6 text-primary-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-primary-500 mb-2">Create Your Tap & Pay Card</h3>
                    <p className="text-primary-400/80 text-sm mb-4 font-light leading-relaxed">
                      Your virtual card enables seamless payments at venues. It's free to create and takes just a few seconds.
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-primary-400/70 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        <span>Works at all participating venues</span>
                      </div>
                      <div className="flex items-center gap-2 text-primary-400/70 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        <span>Add to Apple Wallet or Google Pay</span>
                      </div>
                      <div className="flex items-center gap-2 text-primary-400/70 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        <span>Secure and encrypted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {checkingCard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  <span className="ml-3 text-primary-400">Checking card status...</span>
                </div>
              ) : (
                <button
                  onClick={handleCreateCard}
                  disabled={creatingCard || hasCard}
                  className="w-full bg-primary-500 text-black py-4 rounded-xl font-bold text-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25"
                >
                  {creatingCard ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Your Card...</span>
                    </>
                  ) : hasCard ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Card Created!</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Create Tap & Pay Card</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}

              {hasCard && (
                <button
                  onClick={() => setStep('funds')}
                  className="w-full bg-primary-500/10 border-2 border-primary-500/40 text-primary-500 py-3 rounded-xl font-semibold hover:bg-primary-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Continue to Add Funds
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Step 2: Add Funds */}
          {step === 'funds' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary-500/30">
                    <Wallet className="w-6 h-6 text-primary-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-primary-500 mb-2">Add Funds to Your Wallet</h3>
                    <p className="text-primary-400/80 text-sm mb-4 font-light leading-relaxed">
                      Add money to your wallet to start using your tap-and-pay card at venues. You can add funds anytime from the Wallet tab.
                    </p>
                    <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-primary-400 text-sm">Current Balance:</span>
                        <span className="text-2xl font-bold text-primary-500">${balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipFunds}
                  className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-3 rounded-xl font-semibold hover:bg-primary-500/10 transition-all"
                >
                  Skip for Now
                </button>
                <button
                  onClick={() => {
                    // Open wallet tab or add funds modal
                    // For now, just move to permissions
                    handleSkipFunds()
                  }}
                  className="flex-1 bg-primary-500 text-black py-3 rounded-xl font-bold hover:bg-primary-600 transition-all flex items-center justify-center gap-2"
                >
                  Add Funds
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Permissions */}
          {step === 'permissions' && !showPermissions && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary-500/30">
                    <Shield className="w-6 h-6 text-primary-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-primary-500 mb-2">Enable App Features</h3>
                    <p className="text-primary-400/80 text-sm mb-4 font-light leading-relaxed">
                      Enable location, camera, and notifications to get the most out of Shot On Me. You can change these anytime in Settings.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPermissions(true)}
                className="w-full bg-primary-500 text-black py-4 rounded-xl font-bold text-lg hover:bg-primary-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25"
              >
                <Shield className="w-5 h-5" />
                <span>Set Up Permissions</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/40">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-primary-500">You're All Set!</h3>
              <p className="text-primary-400/80 text-sm">
                Your tap-and-pay card is ready to use. Start exploring venues and making payments!
              </p>
              <button
                onClick={handleCompleteOnboarding}
                className="w-full bg-primary-500 text-black py-4 rounded-xl font-bold text-lg hover:bg-primary-600 transition-all"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-primary-500/10 text-center">
            <p className="text-primary-400/60 text-xs font-light">
              Step {step === 'card' ? '1' : step === 'funds' ? '2' : step === 'permissions' ? '3' : '4'} of 4
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissions && (
        <EnhancedPermissions
          showOnMount={true}
          onComplete={handlePermissionsComplete}
        />
      )}
    </>
  )
}

