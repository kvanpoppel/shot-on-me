'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, QrCode, History, Plus, Sparkles, CreditCard, Radio, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Loader2, CheckCircle2, XCircle, Clock, TrendingUp, MoreVertical, X, Search, User, Users, MapPin, Phone } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import AddFundsModal from './AddFundsModal'
import PaymentMethodsManager from './PaymentMethodsManager'
import VirtualCardManager from './VirtualCardManager'
import CardPaymentModal from './CardPaymentModal'
import TapAndPayModal from './TapAndPayModal'
import PointsBooster from './PointsBooster'
import { useApiUrl } from '../utils/api'
import { QRCodeSVG } from 'qrcode.react'

interface WalletTabProps {
  autoOpenSendForm?: boolean
  onSendFormOpened?: () => void
  autoOpenAddFunds?: boolean
  onAddFundsOpened?: () => void
}

export default function WalletTab({ autoOpenSendForm = false, onSendFormOpened, autoOpenAddFunds = false, onAddFundsOpened }: WalletTabProps) {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const { socket } = useSocket()
  const router = useRouter()
  const [showSendForm, setShowSendForm] = useState(false)
  const [showRedeemForm, setShowRedeemForm] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'sent' | 'received' | null>(null)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [redemptionCode, setRedemptionCode] = useState('')
  const [sending, setSending] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [showTapAndPay, setShowTapAndPay] = useState(false)
  const [showCardPayment, setShowCardPayment] = useState(false)
  const [cardPaymentAmount, setCardPaymentAmount] = useState(0)
  const [cardPaymentRecipient, setCardPaymentRecipient] = useState<{ phone?: string; id?: string; message?: string } | null>(null)
  const [points, setPoints] = useState(0)
  const [previousPoints, setPreviousPoints] = useState(0)
  const [showPointsBooster, setShowPointsBooster] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [insufficientBalanceData, setInsufficientBalanceData] = useState<{ shortfall: number; recipientPhone: string; amount: number; message?: string } | null>(null)
  const [addingFunds, setAddingFunds] = useState(false)
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<any>(null)
  const [addFundsAmount, setAddFundsAmount] = useState<string>('')
  const hasAutoOpenedRef = useRef(false)
  const hasAutoOpenedAddFundsRef = useRef(false)
  
  // Enhanced features from SendShotTab
  const [recentRecipients, setRecentRecipients] = useState<any[]>([])
  const [favoriteVenues, setFavoriteVenues] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [recipientName, setRecipientName] = useState('')
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeData, setQrCodeData] = useState('')

  useEffect(() => {
    if (token) {
      fetchPayments()
      fetchPoints()
      fetchDefaultPaymentMethod()
      fetchRecentRecipients()
      fetchFavoriteVenues()
      
      // Check for pre-selected venue from MapTab or other components
      const storedVenue = localStorage.getItem('selectedVenue')
      const profileAction = localStorage.getItem('profileAction')
      
      if (storedVenue && (profileAction === 'send-shot' || profileAction === 'send-money')) {
        try {
          const venue = JSON.parse(storedVenue)
          setSelectedVenue(venue)
          // Clear the stored data after reading
          localStorage.removeItem('selectedVenue')
          localStorage.removeItem('profileAction')
        } catch (error) {
          console.error('Failed to parse stored venue:', error)
        }
      }
    }
  }, [token])

  // Auto-open add funds modal if requested
  useEffect(() => {
    if (autoOpenAddFunds && !hasAutoOpenedAddFundsRef.current) {
      hasAutoOpenedAddFundsRef.current = true
      setShowAddFunds(true)
      if (onAddFundsOpened) {
        onAddFundsOpened()
      }
    } else if (!autoOpenAddFunds) {
      hasAutoOpenedAddFundsRef.current = false
    }
  }, [autoOpenAddFunds, onAddFundsOpened])

  const fetchDefaultPaymentMethod = async () => {
    try {
      const response = await axios.get(`${API_URL}/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const defaultPM = response.data.paymentMethods?.find((pm: any) => pm.isDefault)
      setDefaultPaymentMethod(defaultPM || null)
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    }
  }

  const fetchRecentRecipients = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/payments/recent-recipients`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRecentRecipients(response.data.recipients || [])
    } catch (error) {
      console.error('Failed to fetch recent recipients:', error)
    }
  }

  const fetchFavoriteVenues = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/favorites/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFavoriteVenues(response.data.venues || [])
    } catch (error) {
      console.error('Failed to fetch favorite venues:', error)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || !token) {
      setSearchResults([])
      return
    }
    try {
      const response = await axios.get(`${API_URL}/users/search/${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSearchResults(response.data.users || [])
    } catch (error) {
      console.error('Failed to search users:', error)
      setSearchResults([])
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const handleSelectRecipient = (recipient: any) => {
    setRecipientPhone(recipient.phoneNumber || '')
    setRecipientName(`${recipient.firstName} ${recipient.lastName}`)
    setShowSendForm(true)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleQuickAmount = (value: string) => {
    setAmount(value)
    setShowSendForm(true)
  }

  // Auto-open send form if requested (e.g., from Home tab)
  useEffect(() => {
    if (autoOpenSendForm && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true
      setShowSendForm(true)
      setShowRedeemForm(false)
      setShowMoreMenu(false)
      // Scroll to send form after a brief delay to ensure DOM is ready
      setTimeout(() => {
        const sendButton = document.querySelector('[data-send-money-button]')
        if (sendButton) {
          sendButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 200)
      // Notify parent that form is opened
      if (onSendFormOpened) {
        onSendFormOpened()
      }
    } else if (!autoOpenSendForm) {
      // Reset the ref when flag is cleared
      hasAutoOpenedRef.current = false
    }
  }, [autoOpenSendForm, onSendFormOpened])

  const fetchPoints = async () => {
    try {
      const response = await axios.get(`${API_URL}/gamification/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const newPoints = response.data.points || 0
      
      // Check if points increased (user earned points)
      if (previousPoints > 0 && newPoints > previousPoints) {
        const earned = newPoints - previousPoints
        setPointsEarned(earned)
        setShowPointsBooster(true)
      }
      
      setPreviousPoints(newPoints)
      setPoints(newPoints)
    } catch (error) {
      console.error('Failed to fetch points:', error)
    }
  }

  // Listen for wallet updates from Socket.io
  useEffect(() => {
    const handleWalletUpdate = (event: CustomEvent) => {
      const data = event.detail
      console.log('Wallet updated:', data)
      if (updateUser) {
        updateUser({})
      }
      fetchPayments()
      // Refresh default payment method in case it changed
      fetchDefaultPaymentMethod()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('wallet-updated', handleWalletUpdate as EventListener)
      return () => {
        window.removeEventListener('wallet-updated', handleWalletUpdate as EventListener)
      }
    }
  }, [updateUser, token])

  // Listen for real-time payment updates and points updates
  useEffect(() => {
    if (!socket) return

    const handlePaymentRedeemed = (data: any) => {
      fetchPayments()
      fetchPoints() // Refresh points in case they were earned
      if (updateUser) {
        updateUser({})
      }
      setSuccess('Payment redeemed successfully!')
      setTimeout(() => setSuccess(null), 5000)
    }

    const handlePaymentProcessed = (data: any) => {
      fetchPayments()
      fetchPoints() // Refresh points in case they were earned
      if (updateUser) {
        updateUser({})
      }
      setSuccess('Payment processed successfully!')
      setTimeout(() => setSuccess(null), 5000)
    }

    // Listen for points updates
    const handlePointsUpdated = (data: any) => {
      if (data.userId === user?.id || data.userId === (user as any)?._id) {
        fetchPoints()
      }
    }

    socket.on('payment-redeemed', handlePaymentRedeemed)
    socket.on('payment-processed', handlePaymentProcessed)
    socket.on('points-updated', handlePointsUpdated)

    return () => {
      socket.off('payment-redeemed', handlePaymentRedeemed)
      socket.off('payment-processed', handlePaymentProcessed)
      socket.off('points-updated', handlePointsUpdated)
    }
  }, [socket, updateUser, user, previousPoints])

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true)
      const response = await axios.get(`${API_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPayments(response.data.payments || [])
      setError(null)
    } catch (error: any) {
      console.error('Failed to fetch payments:', error)
      setError('Failed to load transaction history')
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setSuccess(null)

    // Frontend validation
    if (!recipientPhone.trim()) {
      setError('Please enter a recipient phone number')
      setSending(false)
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0')
      setSending(false)
      return
    }

    try {
      const response = await axios.post(
        `${API_URL}/payments/send`,
        {
          recipientPhone: recipientPhone.trim(),
          amount: amountNum,
          message: message.trim() || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Show QR code if redemption code is returned
      if (response.data.redemptionCode) {
        setQrCodeData(response.data.redemptionCode)
        setShowQRCode(true)
      } else {
        setSuccess(`Payment sent! Recipient can use their tap-and-pay card at venues.`)
        setTimeout(() => setSuccess(null), 8000)
      }
      
      setShowSendForm(false)
      setRecipientPhone('')
      setRecipientName('')
      setAmount('')
      setMessage('')
      setSelectedVenue(null)
      fetchPayments()
      fetchRecentRecipients()
      if (updateUser) {
        updateUser({})
      }
    } catch (error: any) {
      // Check if insufficient balance
      if (error.response?.status === 402 && error.response?.data?.canPayWithCard) {
        const shortfall = error.response?.data?.shortfall || amountNum
        const currentBalance = error.response?.data?.currentBalance || 0
        
        // If user has a default payment method, offer quick "Add Funds"
        if (defaultPaymentMethod) {
          // Calculate suggested amount (round up to nearest $5, minimum $5)
          const suggestedAmount = Math.max(5, Math.ceil(shortfall / 5) * 5)
          setInsufficientBalanceData({
            shortfall: shortfall,
            recipientPhone: recipientPhone.trim(),
            amount: amountNum,
            message: message.trim() || undefined
          })
          setAddFundsAmount(suggestedAmount.toFixed(2)) // Set suggested amount
          setSending(false)
        } else {
          // No default payment method - show full card payment modal
          setCardPaymentAmount(amountNum)
          setCardPaymentRecipient({
            phone: recipientPhone.trim(),
            message: message.trim() || undefined
          })
          setShowCardPayment(true)
          setSending(false)
        }
      } else {
        setError(error.response?.data?.error || error.response?.data?.message || 'Failed to send payment')
        setTimeout(() => setError(null), 5000)
        setSending(false)
      }
    }
  }

  const handleQuickAddFunds = async () => {
    if (!insufficientBalanceData || !defaultPaymentMethod) return

    // Validate amount input
    const amountToAdd = parseFloat(addFundsAmount)
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      setError('Please enter a valid amount to add')
      return
    }
    if (amountToAdd < insufficientBalanceData.shortfall) {
      setError(`Amount must be at least $${insufficientBalanceData.shortfall.toFixed(2)} to cover the shortfall`)
      return
    }
    if (amountToAdd < 5) {
      setError('Minimum amount to add is $5.00')
      return
    }

    setAddingFunds(true)
    setError(null)

    try {
      // Create payment intent with default payment method
      const response = await axios.post(
        `${API_URL}/payments/create-intent`,
        {
          amount: amountToAdd,
          paymentMethodId: defaultPaymentMethod.id,
          savePaymentMethod: false // Already saved
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // If payment succeeded immediately (saved payment method)
      if (response.data.status === 'succeeded') {
        // Wait a moment for wallet to update
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Refresh user data to get updated balance
        if (updateUser) {
          await updateUser({})
        }

        // Now retry the send transaction
        await retrySendAfterAddFunds()
      } else if (response.data.requiresAction) {
        // Payment requires additional action (3D Secure, etc.)
        setError('Payment requires additional verification. Please use the full payment form.')
        setAddingFunds(false)
        // Fall back to full card payment modal
        setCardPaymentAmount(insufficientBalanceData.amount)
        setCardPaymentRecipient({
          phone: insufficientBalanceData.recipientPhone,
          message: insufficientBalanceData.message
        })
        setShowCardPayment(true)
        setInsufficientBalanceData(null)
      } else {
        setError('Payment is processing. Please wait...')
        setAddingFunds(false)
      }
    } catch (error: any) {
      console.error('Error adding funds:', error)
      setError(error.response?.data?.message || 'Failed to add funds. Please try again.')
      setAddingFunds(false)
    }
  }

  const retrySendAfterAddFunds = async () => {
    if (!insufficientBalanceData) return

    try {
      const response = await axios.post(
        `${API_URL}/payments/send`,
        {
          recipientPhone: insufficientBalanceData.recipientPhone,
          amount: insufficientBalanceData.amount,
          message: insufficientBalanceData.message || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setSuccess(`Funds added and payment sent! Recipient can use their tap-and-pay card at venues.`)
      setShowSendForm(false)
      setRecipientPhone('')
      setAmount('')
      setMessage('')
      setInsufficientBalanceData(null) // This closes the modal
      setAddFundsAmount('') // Clear the amount input
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
      setTimeout(() => setSuccess(null), 8000)
    } catch (error: any) {
      // If still insufficient, show error
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to send payment after adding funds')
      setTimeout(() => setError(null), 5000)
    } finally {
      setAddingFunds(false)
    }
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    setRedeeming(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await axios.post(
        `${API_URL}/payments/redeem`,
        { code: redemptionCode },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setSuccess(`Payment redeemed! Amount: $${response.data.payment.amount.toFixed(2)}`)
      setShowRedeemForm(false)
      setRedemptionCode('')
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
      setTimeout(() => setSuccess(null), 5000)
    } catch (error: any) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Failed to redeem code')
      setTimeout(() => setError(null), 5000)
    } finally {
      setRedeeming(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    if (!activeFilter || activeFilter === 'all') return true
    if (activeFilter === 'sent') {
      return payment.senderId?._id === user?.id || payment.senderId === user?.id || payment.sender?._id === user?.id || payment.sender === user?.id
    } else if (activeFilter === 'received') {
      return payment.recipientId?._id === user?.id || payment.recipientId === user?.id || payment.recipient?._id === user?.id || payment.recipient === user?.id
    }
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'succeeded':
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-primary-400" />
    }
  }

  const balance = user?.wallet?.balance || 0
  const pendingBalance = user?.wallet?.pendingBalance || 0

  return (
    <div className="min-h-screen pb-20 bg-black max-w-4xl mx-auto pt-20">
      {/* Success/Error Messages */}
      {success && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-3 text-green-400 text-sm max-w-md mx-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{success}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-400 text-sm max-w-md mx-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="sticky top-20 z-10 bg-black backdrop-blur-md border-b border-primary-500/10">
        <div className="px-4 py-4">
          <h2 className="text-2xl font-bold text-primary-500 mb-0.5 text-center">Wallet</h2>
          <p className="text-primary-400/70 text-sm text-center">Manage your balance and payments</p>
        </div>
      </div>

      {/* Balance Card - Hero Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="relative bg-gradient-to-br from-primary-500/25 via-primary-500/15 to-primary-500/5 border-2 border-primary-500/40 rounded-2xl p-5 shadow-2xl shadow-primary-500/10 overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-500/30 rounded-lg flex items-center justify-center border border-primary-500/40 shadow-lg flex-shrink-0">
                  <WalletIcon className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-primary-400/60 text-xs uppercase tracking-widest font-semibold mb-0.5">Available Balance</p>
                  <p className="text-3xl font-bold text-primary-500 tracking-tight">${balance.toFixed(2)}</p>
                </div>
              </div>
              {pendingBalance > 0 && (
                <div className="text-right bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex-shrink-0">
                  <p className="text-yellow-400/70 text-xs uppercase tracking-wider font-semibold mb-0.5">Pending</p>
                  <p className="text-lg font-bold text-yellow-500">${pendingBalance.toFixed(2)}</p>
                </div>
              )}
            </div>
            
            {/* Points Display with Redemption */}
            <div className="pt-3 border-t border-primary-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-7 h-7 bg-primary-500/20 rounded-lg flex items-center justify-center border border-primary-500/30 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-primary-400/60 text-xs uppercase tracking-wider font-semibold">Reward Points</p>
                    <p className="text-primary-500 font-bold text-lg">{points.toLocaleString()}</p>
                  </div>
                </div>
                {points >= 100 && (
                  <button
                    onClick={async () => {
                      try {
                        setRedeeming(true)
                        const response = await axios.post(
                          `${API_URL}/rewards/redeem-cash`,
                          { pointsToRedeem: 100 },
                          { headers: { Authorization: `Bearer ${token}` } }
                        )
                        await fetchPoints()
                        if (updateUser) {
                          await updateUser({})
                        }
                        setSuccess(`🎉 $${response.data.redemption.cashAmount.toFixed(2)} added to your wallet!`)
                        setTimeout(() => setSuccess(null), 5000)
                      } catch (error: any) {
                        setError(error.response?.data?.message || 'Failed to redeem cash reward')
                        setTimeout(() => setError(null), 5000)
                      } finally {
                        setRedeeming(false)
                      }
                    }}
                    disabled={redeeming || points < 100}
                    className="bg-yellow-500 text-black px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Redeem $5</span>
                  </button>
                )}
              </div>
              
              {/* Progress to $5 */}
              {points < 100 && (
                <div className="bg-black/40 rounded-lg p-2.5 border border-primary-500/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-primary-400/70 font-medium">Progress to $5 Cash</p>
                    <p className="text-xs text-purple-400 font-bold">{points}/100 pts</p>
                  </div>
                  <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((points / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-primary-400/60 mt-1.5 text-center">
                    {100 - points} more points needed for $5 cash reward
                  </p>
                </div>
              )}
              
              {/* Info Text */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                <p className="text-xs text-primary-400/80 leading-relaxed">
                  <span className="text-yellow-500 font-semibold">⭐ Earn 2 points</span> per Tap n Pay, <span className="text-yellow-500 font-semibold">1 point</span> per check-in. 
                  <span className="text-yellow-500 font-semibold"> 100 points = $5 cash</span> added to wallet. 
                  Different from <span className="text-primary-500 font-semibold">Badges</span> (non-monetary achievements).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action: Send Money */}
      <div className="px-4 mb-4">
        <button
          data-send-money-button
          onClick={() => {
            setShowSendForm(!showSendForm)
            setShowRedeemForm(false)
            setShowMoreMenu(false)
            if (!showSendForm) {
              setSearchQuery('')
              setSearchResults([])
            }
          }}
          className="w-full bg-primary-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.01] active:scale-[0.99] text-lg"
        >
          <Send className="w-5 h-5" />
          <span>{showSendForm ? 'Cancel' : 'Send Money'}</span>
        </button>

        {showSendForm && (
          <div className="mt-4 space-y-4">
            {/* Selected Venue Display */}
            {selectedVenue && (
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    <span className="text-sm text-primary-500 font-medium">
                      Sending to: {selectedVenue.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedVenue(null)}
                    className="text-primary-400/70 hover:text-primary-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedVenue.address && (
                  <p className="text-xs text-primary-400/70 mt-1 ml-6">
                    {selectedVenue.address}
                  </p>
                )}
              </div>
            )}

            {/* Quick Amount Buttons */}
            <div>
              <p className="text-primary-400/70 text-sm mb-2 font-medium">Quick Amount</p>
              <div className="grid grid-cols-4 gap-2">
                {['5', '10', '20', '50'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQuickAmount(value)}
                    className="bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 rounded-lg py-2.5 px-3 text-center transition-colors text-primary-500 font-semibold"
                  >
                    ${value}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Recipients */}
            {recentRecipients.length > 0 && !recipientPhone && (
              <div>
                <p className="text-primary-400/70 text-sm mb-2 font-medium">Recent</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {recentRecipients.map((recipient) => (
                    <button
                      key={recipient._id}
                      type="button"
                      onClick={() => handleSelectRecipient(recipient)}
                      className="flex-shrink-0 flex flex-col items-center gap-2 bg-black/40 border border-primary-500/20 hover:bg-primary-500/10 hover:border-primary-500/40 rounded-lg p-3 min-w-[80px] transition-all"
                    >
                      {recipient.profilePicture ? (
                        <img
                          src={recipient.profilePicture}
                          alt={`${recipient.firstName} ${recipient.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary-500" />
                        </div>
                      )}
                      <span className="text-xs text-primary-400 text-center truncate w-full">
                        {recipient.firstName} {recipient.lastName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* User Search */}
            <div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400/60" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-primary-500/30 rounded-lg pl-10 pr-4 py-3 text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Import from Contacts Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    if ('contacts' in navigator && 'ContactsManager' in window) {
                      const contacts = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
                      if (contacts && contacts.length > 0) {
                        // Find the first contact with a phone number
                        const contactWithPhone = contacts.find((c: any) => c.tel && (c.tel[0] || c.tel))
                        if (contactWithPhone) {
                          const phoneNumber = contactWithPhone.tel[0] || contactWithPhone.tel
                          // Search for user by phone number
                          setSearchQuery(phoneNumber)
                          searchUsers(phoneNumber)
                        } else {
                          alert('Selected contact does not have a phone number')
                        }
                      }
                    } else {
                      alert('Contacts access is not available on this device. Please search manually or use the Find Friends feature.')
                    }
                  } catch (error: any) {
                    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                      alert('Contacts permission denied. Please enable contacts access in Settings → App Permissions.')
                    } else {
                      alert('Unable to access contacts. Please search manually.')
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-primary-500/10 border border-primary-500/30 text-primary-500 py-2.5 rounded-lg font-medium hover:bg-primary-500/20 transition-all mb-3"
              >
                <Phone className="w-4 h-4" />
                <span>Import from Contacts</span>
              </button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-black/60 border border-primary-500/30 rounded-lg overflow-hidden">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleSelectRecipient(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-primary-500/10 transition-colors text-left"
                    >
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary-400">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.phoneNumber && (
                          <p className="text-xs text-primary-400/60">{user.phoneNumber}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send Form */}
            <form onSubmit={handleSend} className="bg-black/50 border-2 border-primary-500/30 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-primary-500 text-sm font-semibold mb-2">
                  {recipientName ? 'Recipient' : 'Recipient Phone'}
                </label>
                {recipientName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={recipientName}
                      readOnly
                      className="flex-1 px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientPhone('')
                        setRecipientName('')
                      }}
                      className="px-3 py-3 bg-primary-500/20 border border-primary-500/30 rounded-lg text-primary-500 hover:bg-primary-500/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+1234567890"
                    required
                    className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              </div>
              <div>
                <label className="block text-primary-500 text-sm font-semibold mb-2">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-primary-500 text-sm font-semibold mb-2">Message (optional)</label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Happy birthday!"
                  className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {/* Optional Venue Selection */}
              {favoriteVenues.length > 0 && !selectedVenue && (
                <div>
                  <label className="block text-primary-500 text-sm font-semibold mb-2">Venue (optional)</label>
                  <select
                    value={selectedVenue?._id || ''}
                    onChange={(e) => {
                      const venue = favoriteVenues.find(v => v._id === e.target.value)
                      setSelectedVenue(venue || null)
                    }}
                    className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select a venue (optional)</option>
                    {favoriteVenues.map((venue) => (
                      <option key={venue._id} value={venue._id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                disabled={sending || !amount || parseFloat(amount) <= 0 || !recipientPhone}
                className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-all flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Payment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAddFunds(true)}
            className="group relative bg-primary-500 text-black py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Add Funds</span>
          </button>
          <button
            onClick={() => setShowTapAndPay(true)}
            className="group bg-primary-500/10 border-2 border-primary-500/40 text-primary-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-500/20 transition-all hover:border-primary-500/60 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Radio className="w-5 h-5" />
            <span>Tap & Pay</span>
          </button>
        </div>
      </div>

      {/* Virtual Card Manager */}
      <div className="px-4 mb-4">
        <VirtualCardManager />
      </div>

      {/* Transaction History Section */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-primary-500 flex items-center gap-2">
            <History className="w-5 h-5" />
            Transactions
          </h3>
        </div>

        {/* Filter Tabs - Compact Design */}
        <div className="flex gap-1.5 mb-3 bg-black/60 rounded-xl p-1 border border-primary-500/20">
          {(['all', 'sent', 'received'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                activeFilter === filter
                  ? 'bg-primary-500 text-black shadow-lg'
                  : 'text-primary-400/70 hover:text-primary-500 hover:bg-primary-500/10'
              }`}
            >
              {filter === 'all' ? 'All' : filter}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {activeFilter === null ? (
          <div className="text-center py-16 bg-black/30 border border-primary-500/10 rounded-2xl">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary-500/20">
              <History className="w-8 h-8 text-primary-500/40" />
            </div>
          </div>
        ) : loadingPayments ? (
          <div className="flex items-center justify-center py-16 bg-black/30 border border-primary-500/10 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            <span className="ml-3 text-primary-400">Loading transactions...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-16 bg-black/30 border border-primary-500/10 rounded-2xl">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary-500/20">
              <History className="w-8 h-8 text-primary-500/40" />
            </div>
            <p className="text-primary-400/60 text-sm">No {activeFilter === 'all' ? '' : activeFilter} transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredPayments.map((payment) => {
              const isSent = payment.senderId?._id === user?.id || payment.senderId === user?.id || payment.sender?._id === user?.id || payment.sender === user?.id
              const otherUser = isSent 
                ? (payment.recipient || payment.recipientId)
                : (payment.sender || payment.senderId)
              const otherUserName = otherUser?.firstName || otherUser?.phone || (isSent ? 'Recipient' : 'Sender')

              return (
                <div
                  key={payment._id}
                  className="group bg-black/40 border border-primary-500/20 rounded-xl p-4 hover:bg-black/60 hover:border-primary-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                        isSent ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'
                      }`}>
                        {isSent ? (
                          <ArrowUpRight className="w-5 h-5 text-red-400" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-primary-500 truncate text-sm">
                            {isSent ? 'Sent to' : 'Received from'} {otherUserName}
                          </p>
                          {getStatusIcon(payment.status)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {payment.venue?.name && (
                            <p className="text-primary-400/70 text-xs truncate">
                              {payment.venue.name}
                            </p>
                          )}
                          {payment.type === 'tap_and_pay' && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/30">
                              Tap & Pay
                            </span>
                          )}
                        </div>
                        {payment.message && (
                          <p className="text-primary-400/50 text-xs italic truncate mt-1">
                            "{payment.message}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-bold ${
                        isSent ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {isSent ? '-' : '+'}${payment.amount.toFixed(2)}
                      </p>
                      <p className="text-primary-400/50 text-xs mt-1">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* More Menu - Secondary Actions */}
      <div className="px-4 mb-6">
        <div className="relative">
          <button
            onClick={() => {
              setShowMoreMenu(!showMoreMenu)
              setShowSendForm(false)
            }}
            className="w-full bg-black/50 border-2 border-primary-500/30 text-primary-500 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-500/10 hover:border-primary-500/50 transition-all"
          >
            <MoreVertical className="w-5 h-5" />
            <span>More Options</span>
          </button>

          {showMoreMenu && (
            <div className="mt-2 bg-black/90 border-2 border-primary-500/30 rounded-xl overflow-hidden shadow-xl">
              <button
                onClick={() => {
                  setShowRedeemForm(!showRedeemForm)
                  setShowMoreMenu(false)
                }}
                className="w-full px-4 py-3 text-left text-primary-400 hover:bg-primary-500/10 hover:text-primary-500 transition-colors flex items-center gap-3 border-b border-primary-500/10"
              >
                <QrCode className="w-5 h-5" />
                <span>{showRedeemForm ? 'Hide' : 'Redeem'} Reward Code</span>
              </button>
              <button
                onClick={() => {
                  setShowPaymentMethods(!showPaymentMethods)
                  setShowMoreMenu(false)
                }}
                className="w-full px-4 py-3 text-left text-primary-400 hover:bg-primary-500/10 hover:text-primary-500 transition-colors flex items-center gap-3"
              >
                <CreditCard className="w-5 h-5" />
                <span>{showPaymentMethods ? 'Hide' : 'Manage'} Payment Methods</span>
              </button>
            </div>
          )}

          {showRedeemForm && (
            <form onSubmit={handleRedeem} className="mt-4 bg-black/50 border-2 border-primary-500/30 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-primary-500 text-sm font-semibold mb-2">Reward Code (Points/Rewards)</label>
                <p className="text-xs text-primary-400/70 mb-2">Enter a reward code from venue promotions or point system</p>
                <input
                  type="text"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  placeholder="Enter reward code"
                  required
                  className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={redeeming || !redemptionCode.trim()}
                className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-all flex items-center justify-center gap-2"
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Redeeming...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    <span>Redeem</span>
                  </>
                )}
              </button>
            </form>
          )}

          {showPaymentMethods && (
            <div className="mt-4 p-5 bg-black/50 border border-primary-500/20 rounded-xl">
              <PaymentMethodsManager />
            </div>
          )}
        </div>
      </div>

      {/* Points Booster Animation */}
      <PointsBooster
        points={pointsEarned}
        show={showPointsBooster}
        onComplete={() => {
          setShowPointsBooster(false)
          setPointsEarned(0)
        }}
      />

      {/* Modals */}
      <AddFundsModal
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        onSuccess={async () => {
          // Wait a moment for backend to process
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Force refresh user data to get updated balance
          if (updateUser) {
            try {
              await updateUser({})
              console.log('✅ User data refreshed after adding funds')
            } catch (err) {
              console.error('❌ Error refreshing user:', err)
            }
          }
          
          // Also fetch payments to show the new transaction
          await fetchPayments()
          
          setSuccess('Funds added successfully! Balance updated.')
          setTimeout(() => setSuccess(null), 5000)
        }}
      />

      <TapAndPayModal
        isOpen={showTapAndPay}
        onClose={() => setShowTapAndPay(false)}
        onSuccess={(payment) => {
          if (updateUser) {
            updateUser({})
          }
          fetchPayments()
          setSuccess(`Payment successful! $${payment.payment?.amount?.toFixed(2) || '0.00'} paid to ${payment.venue?.name || 'venue'}`)
          setTimeout(() => setSuccess(null), 5000)
        }}
      />

      {/* Insufficient Balance - Quick Add Funds Modal */}
      {insufficientBalanceData && defaultPaymentMethod && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500/40 rounded-2xl p-6 max-w-md w-full backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center border border-primary-500/40">
                  <WalletIcon className="w-5 h-5 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-primary-500">Insufficient Balance</h2>
              </div>
              <button
                onClick={() => {
                  setInsufficientBalanceData(null)
                  setAddFundsAmount('')
                  setError(null)
                }}
                className="text-primary-400 hover:text-primary-500 transition-colors"
                disabled={addingFunds}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <p className="text-primary-400/80 text-sm">
                You need <span className="font-bold text-primary-500">${insufficientBalanceData.shortfall.toFixed(2)}</span> more to send <span className="font-bold text-primary-500">${insufficientBalanceData.amount.toFixed(2)}</span>.
              </p>

              {/* Default Payment Method Display */}
              <div className="bg-black/40 rounded-lg p-4 border border-primary-500/20">
                <p className="text-primary-400/70 text-xs mb-2 uppercase tracking-wider font-semibold">Quick Add Funds</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center border border-primary-500/30">
                    <CreditCard className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-primary-500 font-bold text-sm">
                      {defaultPaymentMethod.card?.brand?.toUpperCase()} •••• {defaultPaymentMethod.card?.last4}
                    </p>
                    <p className="text-primary-400/60 text-xs">Default payment method</p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-primary-500 text-sm font-semibold mb-2">
                  Amount to Add ($)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 text-lg font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={insufficientBalanceData.shortfall}
                    value={addFundsAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty, numbers, and one decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setAddFundsAmount(value)
                        setError(null) // Clear error when user types
                      }
                    }}
                    placeholder={`${Math.max(5, Math.ceil(insufficientBalanceData.shortfall / 5) * 5).toFixed(2)}`}
                    disabled={addingFunds}
                    className="w-full pl-8 pr-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
                  />
                </div>
                <p className="text-primary-400/60 text-xs mt-1.5">
                  Minimum: ${Math.max(insufficientBalanceData.shortfall, 5).toFixed(2)}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleQuickAddFunds}
                  disabled={addingFunds || !addFundsAmount || parseFloat(addFundsAmount) < Math.max(insufficientBalanceData.shortfall, 5)}
                  className="flex-1 bg-primary-500 text-black py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                >
                  {addingFunds ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Adding Funds...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Add Funds & Send</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setInsufficientBalanceData(null)
                    setAddFundsAmount('')
                    setError(null)
                    setCardPaymentAmount(insufficientBalanceData.amount)
                    setCardPaymentRecipient({
                      phone: insufficientBalanceData.recipientPhone,
                      message: insufficientBalanceData.message
                    })
                    setShowCardPayment(true)
                  }}
                  disabled={addingFunds}
                  className="px-4 bg-black/40 border border-primary-500/30 text-primary-500 py-3.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-500/10 transition-all"
                >
                  Different Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Payment Modal for Insufficient Balance */}
      <CardPaymentModal
        isOpen={showCardPayment}
        onClose={() => {
          setShowCardPayment(false)
          setCardPaymentRecipient(null)
          setCardPaymentAmount(0)
        }}
        onSuccess={async () => {
          // Refresh user data and payments
          if (updateUser) {
            await updateUser({})
          }
          await fetchPayments()
          setSuccess('Payment sent successfully via card!')
          setTimeout(() => setSuccess(null), 8000)
          setShowCardPayment(false)
          setShowSendForm(false)
          setRecipientPhone('')
          setAmount('')
          setMessage('')
          setCardPaymentRecipient(null)
          setCardPaymentAmount(0)
        }}
        amount={cardPaymentAmount}
        recipientPhone={cardPaymentRecipient?.phone}
        recipientId={cardPaymentRecipient?.id}
        message={cardPaymentRecipient?.message}
      />

      {/* QR Code Modal */}
      {showQRCode && qrCodeData && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary-500">Redemption Code</h3>
              <button
                onClick={() => {
                  setShowQRCode(false)
                  setQrCodeData('')
                }}
                className="text-primary-400 hover:text-primary-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={qrCodeData} size={200} />
              </div>
              <div className="text-center">
                <p className="text-primary-400/70 text-sm mb-2">Share this code with the recipient</p>
                <div className="bg-black/40 border border-primary-500/30 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary-500 font-mono">{qrCodeData}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeData)
                  setSuccess('Code copied to clipboard!')
                  setTimeout(() => setSuccess(null), 3000)
                }}
                className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all"
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
