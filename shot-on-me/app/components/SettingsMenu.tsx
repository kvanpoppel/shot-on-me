'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { X, Camera, CreditCard, Settings, User, Shield, Trash2, Check, Plus } from 'lucide-react'
import SecureCardElement from './CardElement'
import PermissionsManager from './PermissionsManager'
import { useModal } from '../contexts/ModalContext'
import { useApiUrl } from '../utils/api'

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const { setModalOpen } = useModal()
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showCreditCard, setShowCreditCard] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  
  // Update modal context when credit card modal opens/closes
  useEffect(() => {
    if (showCreditCard) {
      setModalOpen(true)
    } else {
      setModalOpen(false)
    }
  }, [showCreditCard, setModalOpen])
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [saving, setSaving] = useState(false)
  const [locationVisible, setLocationVisible] = useState((user as any)?.location?.isVisible ?? true)
  const [stripeAvailable, setStripeAvailable] = useState<boolean>(false)
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null)
  
  // NO separate Stripe instance - use root Elements provider

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setLocationVisible((user as any).location?.isVisible ?? true)
    }
  }, [user])

  // Fetch payment methods when settings menu opens or payment methods modal opens
  useEffect(() => {
    if ((isOpen || showPaymentMethods) && token) {
      fetchPaymentMethods()
    }
  }, [isOpen, showPaymentMethods, token])

  const fetchPaymentMethods = async () => {
    if (!token) return
    try {
      setLoadingPaymentMethods(true)
      const response = await axios.get(`${API_URL}/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPaymentMethods(response.data.paymentMethods || [])
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    } finally {
      setLoadingPaymentMethods(false)
    }
  }

  const handleDeleteCard = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) {
      return
    }
    if (!token) return
    try {
      await axios.delete(`${API_URL}/payment-methods/${paymentMethodId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to delete card:', error)
      alert('Failed to delete card. Please try again.')
    }
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    if (!token) return
    try {
      await axios.post(
        `${API_URL}/payment-methods/${paymentMethodId}/set-default`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to set default card:', error)
      alert('Failed to set default card. Please try again.')
    }
  }

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand?.toLowerCase() || ''
    if (brandLower.includes('visa')) return '💳'
    if (brandLower.includes('mastercard')) return '💳'
    if (brandLower.includes('amex') || brandLower.includes('american')) return '💳'
    if (brandLower.includes('discover')) return '💳'
    return '💳'
  }

  // Check if Stripe is available and initialize
  // Only check once on mount, and optionally when modal opens
  const stripeCheckedRef = useRef(false)
  const checkingRef = useRef(false)
  
  useEffect(() => {
    // Skip if already checked or currently checking
    if (stripeCheckedRef.current || checkingRef.current) {
      return
    }
    
    const checkStripe = async () => {
      checkingRef.current = true
      try {
        // Force fresh fetch - add timestamp to bypass cache
        const response = await axios.get(`${API_URL}/payments/stripe-key`, {
          params: { _t: Date.now() } // Cache buster
        })
        
        // CRITICAL: If we get 200 and have a key, we're good
        const hasKey = response.data?.publishableKey && typeof response.data.publishableKey === 'string' && response.data.publishableKey.length > 50
        const isConfigured = response.status === 200 && hasKey
        
        if (isConfigured) {
          const key = response.data.publishableKey
          // Verify key format
          if (!key || key.length < 50 || key.includes('0000') || key.includes('placeholder')) {
            setStripeAvailable(false)
            stripeCheckedRef.current = true
            checkingRef.current = false
            return
          }
          
          setStripeAvailable(true)
          stripeCheckedRef.current = true
        } else {
          setStripeAvailable(false)
          stripeCheckedRef.current = true
        }
      } catch (error: any) {
        // Silently handle 503 (Stripe not configured) - this is expected behavior
        if (error.response?.status !== 503) {
          console.error('Error checking Stripe availability:', error)
        }
        setStripeAvailable(false)
        stripeCheckedRef.current = true
      } finally {
        checkingRef.current = false
      }
    }
    
    // Check on mount
    checkStripe()
  }, [API_URL]) // Only depend on API_URL - check once on mount

  // Track if we've already created a Setup Intent for this modal session
  const setupIntentCreatedRef = useRef(false)

  // Create Setup Intent when credit card modal opens
  useEffect(() => {
    // Reset when modal closes
    if (!showCreditCard) {
      setupIntentCreatedRef.current = false
      setSetupIntentSecret(null)
      setSaving(false)
      return
    }

    // Only create Setup Intent once per modal open
    // Check 4-card limit before allowing new card
    if (showCreditCard && token && stripeAvailable && !setupIntentCreatedRef.current) {
      setupIntentCreatedRef.current = true
      
      // Wait for Stripe to be fully loaded before creating Setup Intent
      const initializePayment = async () => {
        // First, refresh payment methods to get current count
        await fetchPaymentMethods()
        
        // Check limit after fetching (use a fresh fetch to get accurate count)
        try {
          const methodsResponse = await axios.get(`${API_URL}/payment-methods`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const currentMethods = methodsResponse.data.paymentMethods || []
          
          if (currentMethods.length >= 4) {
            alert('You can only have up to 4 payment methods. Please delete a card first.')
            setShowCreditCard(false)
            setupIntentCreatedRef.current = false
            return
          }
        } catch (error) {
          // If fetch fails, continue anyway (non-critical check)
          console.log('Could not check payment methods count:', error)
        }
        
        try {
          console.log('🔄 Creating Setup Intent...')
          // Create a fresh Setup Intent for each new card
          const response = await axios.post(
            `${API_URL}/payment-methods/setup-intent`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
          
          console.log('✅ Setup Intent response received:', {
            hasClientSecret: !!response.data.clientSecret,
            setupIntentId: response.data.setupIntentId
          })
          
          if (!response.data.clientSecret) {
            throw new Error('No client secret returned from backend')
          }
          
          // CRITICAL: Verify client secret format
          if (!response.data.clientSecret.startsWith('seti_')) {
            console.error('❌ Invalid client secret format:', response.data.clientSecret.substring(0, 20))
            throw new Error('Invalid client secret format from backend')
          }
          
          console.log('✅ Setting setupIntentSecret...')
          setSetupIntentSecret(response.data.clientSecret)
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error'
          const errorDetails = error.response?.data?.details || error.response?.data?.error || ''
          
          console.error('❌ Failed to initialize payment:', error)
          console.error('   Status:', error.response?.status)
          console.error('   Message:', errorMessage)
          console.error('   Details:', errorDetails)
          console.error('   Full Response:', error.response?.data)
          
          // Show user-friendly error message
          const userMessage = errorMessage.includes('No such customer') 
            ? 'Payment account needs to be refreshed. Please try again.'
            : errorMessage.includes('Stripe is not configured')
            ? 'Payment processing is temporarily unavailable. Please try again later.'
            : errorMessage
            
          alert(`Failed to initialize payment form: ${userMessage}`)
          // Don't close modal on error - let user see the error and try again
          // Keep modal open so user can retry
          setSetupIntentSecret(null)
          setupIntentCreatedRef.current = false // Allow retry
        }
      }
      initializePayment()
    } else if (!showCreditCard) {
      setSetupIntentSecret(null)
    }
  }, [showCreditCard, token, API_URL, stripeAvailable])

  const handleProfilePicture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (file) {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          alert('File size must be less than 10MB')
          return
        }

        try {
          const reader = new FileReader()
          reader.onloadend = async () => {
            try {
              const base64String = reader.result as string
              const response = await axios.put(
                `${API_URL}/users/me/profile-picture`,
                { profilePicture: base64String },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 60000 // 60 second timeout for upload
                }
              )
              
              // Update user state with the complete user object from response
              if (response.data.user) {
                await updateUser(response.data.user)
              } else if (response.data.profilePicture) {
                // Fallback: just update profile picture if full user object not returned
                await updateUser({ profilePicture: response.data.profilePicture })
              }
              
              alert('Profile picture updated successfully!')
            } catch (error: any) {
              console.error('Profile picture upload error:', error)
              const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update profile picture'
              alert(errorMessage)
            }
          }
          reader.readAsDataURL(file)
        } catch (error: any) {
          console.error('File read error:', error)
          alert(error.message || 'Failed to read file')
        }
      }
    }
    input.click()
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)

    try {
      await axios.put(
        `${API_URL}/users/me`,
        { firstName, lastName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await updateUser({ firstName, lastName })
      alert('Profile updated successfully!')
      setShowEditProfile(false)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCreditCardSecure = async (paymentMethodId: string) => {
    console.log('✅ handleAddCreditCardSecure called with paymentMethodId:', paymentMethodId)
    
    if (!token) {
      alert('Please log in to add a payment method')
      return
    }
    
    setSaving(true)

    try {
      console.log('🔄 Processing payment method addition...')
      
      // Setup Intent already attached the payment method to the customer
      // We just need to set it as default if user has no default
      try {
        const userResponse = await axios.get(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const user = userResponse.data.user || userResponse.data
        
        // If user has no default payment method, set this one as default
        if (!user.defaultPaymentMethodId) {
          try {
            console.log('🔄 Setting as default payment method...')
            await axios.post(
              `${API_URL}/payment-methods/${paymentMethodId}/set-default`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            )
            console.log('✅ Set as default payment method')
          } catch (setDefaultError: any) {
            // Non-critical - payment method is already saved
            console.log('Could not set default payment method (non-critical):', setDefaultError?.response?.data || setDefaultError?.message)
          }
        }
      } catch (userError: any) {
        // Non-critical - payment method is already saved
        console.log('Could not fetch user (non-critical):', userError?.response?.data || userError?.message)
      }

      // Refresh payment methods list FIRST to get updated count
      console.log('🔄 Refreshing payment methods list...')
      await fetchPaymentMethods()
      
      // Get updated count for success message
      const updatedMethods = await axios.get(`${API_URL}/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.data.paymentMethods || []).catch(() => paymentMethods)
      
      console.log('✅ Payment method added successfully. Total cards:', updatedMethods.length)
      
      // Close modal and reset state
      setShowCreditCard(false)
      setSetupIntentSecret(null)
      setSaving(false)
      setupIntentCreatedRef.current = false // Reset so new card can be added
      
      alert(`Credit card added successfully! You now have ${updatedMethods.length} card(s).`)
      
      // Refresh user data
      if (updateUser) {
        try {
          await updateUser({})
        } catch (updateError) {
          console.log('Could not refresh user data:', updateError)
        }
      }
    } catch (error: any) {
      console.error('❌ Error in handleAddCreditCardSecure:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to add credit card'
      alert(errorMsg)
      setSaving(false)
    }
  }

  const handleAddCreditCardError = (error: string) => {
    console.error('❌ handleAddCreditCardError:', error)
    alert(error)
    setSaving(false)
    // Don't close modal on error - let user try again
    // setShowCreditCard(false)
    // setSetupIntentSecret(null)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-black/95 border border-primary-500/20 rounded-lg p-6 max-w-md w-full backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-500 tracking-tight">Edit Profile</h3>
              <button
                onClick={() => setShowEditProfile(false)}
                className="text-primary-400/70 hover:text-primary-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-primary-500 text-sm font-medium mb-1 tracking-tight">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light"
                />
              </div>
              <div>
                <label className="block text-primary-500 text-sm font-medium mb-1 tracking-tight">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary-500 text-black py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/10 transition-all backdrop-blur-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Credit Card Modal - Portal to avoid nested Elements */}
      {showCreditCard && typeof window !== 'undefined' ? createPortal(
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            // Close modal if clicking backdrop (not the modal content)
            if (e.target === e.currentTarget) {
              setShowCreditCard(false)
              setSetupIntentSecret(null)
            }
          }}
        >
          <div 
            className="bg-black/95 border border-primary-500/20 rounded-lg p-6 max-w-md w-full backdrop-blur-md my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-500 tracking-tight">Add Credit Card</h3>
              <button
                onClick={() => {
                  setShowCreditCard(false)
                  setSaving(false)
                }}
                className="text-primary-400/70 hover:text-primary-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 -mr-2">
              {!stripeAvailable ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <p className="text-yellow-400 text-sm font-medium mb-2">Payment Processing Not Available</p>
                  <p className="text-yellow-400/70 text-xs">
                    Stripe payment processing is not configured. Please contact support.
                  </p>
                </div>
              ) : !setupIntentSecret ? (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 text-center">
                  <p className="text-primary-400 text-sm">Creating payment form...</p>
                </div>
              ) : setupIntentSecret ? (
                // CRITICAL: Render Elements directly here (Portal makes it independent)
                // This avoids nested Elements issues
                <SecureCardElement
                  clientSecret={setupIntentSecret}
                  onSuccess={handleAddCreditCardSecure}
                  onError={handleAddCreditCardError}
                  disabled={saving}
                />
              ) : (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 text-center">
                  <p className="text-primary-400 text-sm">Preparing payment form...</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-primary-500/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreditCard(false)
                  setSaving(false)
                  setSetupIntentSecret(null)
                }}
                className="w-full bg-black/40 border border-primary-500/20 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/10 transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Settings Options */}
      <div 
        className="fixed inset-0 bg-black/80 z-[55]" 
        onClick={(e) => {
          // Don't close if credit card modal is open
          if (showCreditCard) {
            return
          }
          // Only close if clicking the backdrop itself, not children
          if (e.target === e.currentTarget) {
            onClose()
          }
        }} 
      />
      <div 
        className="fixed left-0 top-0 bottom-0 w-80 bg-black/95 backdrop-blur-md border-r border-primary-500/10 z-[56] overflow-y-auto"
        onClick={(e) => {
          // Stop propagation so clicks inside menu don't close it
          e.stopPropagation()
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-primary-500 tracking-tight">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-primary-400/70 hover:text-primary-500 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <User className="w-5 h-5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={handleProfilePicture}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <Camera className="w-5 h-5" />
              <span>Change Profile Picture</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowPaymentMethods(true)
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5" />
                <span>Credit Cards</span>
              </div>
              {paymentMethods.length > 0 && (
                <span className="text-xs text-primary-500/70 bg-primary-500/10 px-2 py-0.5 rounded">
                  {paymentMethods.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowPermissions(true)}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <Shield className="w-5 h-5" />
              <span>App Permissions</span>
            </button>

            <button
              onClick={async () => {
                try {
                  // Open notification settings - use browser's native notification settings if available
                  if ('Notification' in window && Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission()
                    const toast = document.createElement('div')
                    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                    toast.textContent = permission === 'granted' 
                      ? 'Notifications enabled! You\'ll receive updates.' 
                      : 'Notifications blocked. Enable them in your browser settings.'
                    document.body.appendChild(toast)
                    setTimeout(() => toast.remove(), 4000)
                  } else {
                    const toast = document.createElement('div')
                    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                    toast.textContent = 'Notification settings: Check your browser settings or device settings to customize notifications.'
                    document.body.appendChild(toast)
                    setTimeout(() => toast.remove(), 4000)
                  }
                } catch (error) {
                  console.error('Error accessing notification settings:', error)
                  const toast = document.createElement('div')
                  toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
                  toast.textContent = 'Unable to access notification settings. Please check your browser settings.'
                  document.body.appendChild(toast)
                  setTimeout(() => toast.remove(), 4000)
                }
              }}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
            >
              <Settings className="w-5 h-5" />
              <span>Notification Settings</span>
            </button>
          </div>

          {/* Location Sharing Toggle */}
          <div className="mt-6 pt-6 border-t border-primary-500/10">
            <h3 className="text-sm font-semibold text-primary-500 mb-3 tracking-tight">Location Sharing</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 bg-black/40 border border-primary-500/15 rounded-lg backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-all">
                <div>
                  <p className="text-sm font-medium text-primary-500">Share Location with Friends</p>
                  <p className="text-xs text-primary-400/70 font-light">Let friends see where you are</p>
                </div>
                <input
                  type="checkbox"
                  checked={locationVisible}
                  onChange={async (e) => {
                    if (!token) return
                    const newVisibility = e.target.checked
                    setLocationVisible(newVisibility)
                    try {
                      // Only update if user has location
                      if ((user as any)?.location?.latitude && (user as any)?.location?.longitude) {
                        await axios.put(
                          `${API_URL}/location/update`,
                          { 
                            latitude: (user as any).location.latitude,
                            longitude: (user as any).location.longitude,
                            isVisible: newVisibility
                          },
                          { headers: { Authorization: `Bearer ${token}` } }
                        )
                        if (updateUser) {
                          await updateUser({ location: { ...(user as any).location, isVisible: newVisibility } } as any)
                        }
                      }
                    } catch (error) {
                      console.error('Failed to update location visibility:', error)
                      setLocationVisible(!newVisibility) // Revert on error
                    }
                  }}
                  className="w-5 h-5 border-primary-500/30 text-primary-500 focus:ring-primary-500 bg-black/40 rounded"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Modal */}
      {showPaymentMethods && typeof window !== 'undefined' ? createPortal(
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentMethods(false)
            }
          }}
        >
          <div 
            className="bg-black/95 border border-primary-500/20 rounded-lg max-w-md w-full max-h-[85vh] flex flex-col backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-primary-500/10 flex-shrink-0">
              <h3 className="text-lg font-semibold text-primary-500 tracking-tight">Payment Methods</h3>
              <button
                onClick={() => setShowPaymentMethods(false)}
                className="p-1 text-primary-400/70 hover:text-primary-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingPaymentMethods ? (
                <div className="text-center py-8 text-primary-400 text-sm">Loading cards...</div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-primary-500/30" />
                  <p className="text-sm text-primary-400/70 mb-4">No cards saved</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentMethods(false)
                      setShowCreditCard(true)
                    }}
                    className="px-4 py-2 bg-primary-500 text-black rounded-lg font-medium hover:bg-primary-400 transition-all text-sm"
                  >
                    Add Your First Card
                  </button>
                </div>
              ) : (
                <>
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-4 bg-black/40 border border-primary-500/15 rounded-lg hover:border-primary-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">{getCardBrandIcon(pm.card?.brand || '')}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-primary-500">
                              {pm.card?.brand ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1) : 'Card'} •••• {pm.card?.last4 || '****'}
                            </p>
                            {pm.isDefault && (
                              <span className="px-2 py-0.5 bg-primary-500/20 text-primary-500 text-[10px] rounded font-medium">Default</span>
                            )}
                          </div>
                          <p className="text-xs text-primary-400/70 mt-1">
                            Expires {String(pm.card?.expMonth || 'MM').padStart(2, '0')}/{String(pm.card?.expYear || 'YY').slice(-2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!pm.isDefault && (
                          <button
                            onClick={() => handleSetDefault(pm.id)}
                            className="p-2 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
                            title="Set as default"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCard(pm.id)}
                          className="p-2 text-red-400/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-primary-500/10 flex-shrink-0">
              {paymentMethods.length < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    console.log('🔄 Add New Card button clicked. Current cards:', paymentMethods.length)
                    setShowPaymentMethods(false)
                    setShowCreditCard(true)
                    console.log('✅ Credit card modal should open now')
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-black rounded-lg font-medium hover:bg-primary-400 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add New Card ({paymentMethods.length}/4)</span>
                </button>
              ) : (
                <p className="text-xs text-primary-400/50 text-center py-2">
                  Maximum of 4 cards reached
                </p>
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Permissions Manager */}
      {showPermissions && (
        <PermissionsManager 
          showOnMount={false}
          onComplete={() => setShowPermissions(false)}
        />
      )}
    </>
  )
}

