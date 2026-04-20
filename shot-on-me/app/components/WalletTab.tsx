'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, QrCode, History, Plus, Sparkles, CreditCard, Radio, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Loader2, CheckCircle2, XCircle, Clock, X, Search, User, MapPin, Phone, AlertTriangle, Lock } from 'lucide-react'
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
  prefilledRecipientId?: string
  prefilledRecipientName?: string
}

export default function WalletTab({ autoOpenSendForm = false, onSendFormOpened, autoOpenAddFunds = false, onAddFundsOpened, prefilledRecipientId, prefilledRecipientName }: WalletTabProps) {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const { socket } = useSocket()
  const router = useRouter()
  const [showSendForm, setShowSendForm] = useState(false)
  const [showRedeemForm, setShowRedeemForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'sent' | 'received' | null>('all')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [redemptionCode, setRedemptionCode] = useState('')
  const [sending, setSending] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [paymentsHasMore, setPaymentsHasMore] = useState(true)
  const [loadingMorePayments, setLoadingMorePayments] = useState(false)
  const paymentsContainerRef = useRef<HTMLDivElement>(null)
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

  // OTP flow
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  // Disputes
  const [disputePayment, setDisputePayment] = useState<any>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [disputeSuccess, setDisputeSuccess] = useState(false)

  // KYC
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'failed' | null>(null)
  const [kycLimits, setKycLimits] = useState<{ maxBalance: number; dailyAddFunds: number; label: string } | null>(null)
  const [kycStarting, setKycStarting] = useState(false)


  // Define functions BEFORE useEffects that use them
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


  const fetchKycStatus = useCallback(async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setKycStatus(res.data.kyc?.status || 'unverified')
      setKycLimits(res.data.limits)
    } catch {
      // Non-critical — don't show error
    }
  }, [token, API_URL])

  const handleStartKyc = async () => {
    if (!token) return
    setKycStarting(true)
    try {
      const res = await axios.post(`${API_URL}/kyc/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.alreadyVerified) {
        setKycStatus('verified')
        return
      }
      if (res.data.url) {
        window.location.href = res.data.url
      } else {
        setKycStatus('pending')
        setSuccess('Verification request submitted! We\'ll review within 1–2 business days.')
      }
    } catch {
      setError('Failed to start identity verification. Please try again.')
    } finally {
      setKycStarting(false)
    }
  }

  const handleDisputeSubmit = async () => {
    if (!disputePayment || !disputeReason) return
    setDisputeSubmitting(true)
    try {
      await axios.post(`${API_URL}/disputes`, {
        paymentId: disputePayment._id,
        reason: disputeReason,
        description: disputeDescription
      }, { headers: { Authorization: `Bearer ${token}` } })
      setDisputeSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to file dispute')
      setDisputePayment(null)
    } finally {
      setDisputeSubmitting(false)
    }
  }

  const fetchPayments = useCallback(async (pageNum: number = 1, reset: boolean = true) => {
    if (!token) return
    try {
      if (reset) {
        setLoadingPayments(true)
      } else {
        setLoadingMorePayments(true)
      }
      
      const limit = 20
      const skip = (pageNum - 1) * limit
      
      // Convert filter to backend filter parameter
      const filterParam = activeFilter === 'all' || !activeFilter ? null : activeFilter
      
      const response = await axios.get(`${API_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          limit, 
          skip,
          ...(filterParam && { filter: filterParam })
        },
        timeout: 10000
      })
      
      const newPayments = response.data.payments || []
      
      if (reset || pageNum === 1) {
        setPayments(newPayments)
      } else {
        // Filter out duplicates when appending payments
        setPayments(prev => {
          const existingIds = new Set(prev.map(p => p._id))
          const uniqueNewPayments = newPayments.filter((p: any) => !existingIds.has(p._id))
          return [...prev, ...uniqueNewPayments]
        })
      }
      
      setPaymentsHasMore(response.data.hasMore !== false && newPayments.length === limit)
      setError(null)
    } catch (error: any) {
      console.error('Failed to fetch payments:', error)
      if (reset || pageNum === 1) {
        setError('Failed to load transaction history')
        setPayments([])
      }
    } finally {
      setLoadingPayments(false)
      setLoadingMorePayments(false)
    }
  }, [token, activeFilter, API_URL])

  // Main useEffect - load data when token is available
  useEffect(() => {
    if (token) {
      setPaymentsPage(1)
      setPaymentsHasMore(true)
      fetchPayments(1, true)
      fetchPoints()
      fetchDefaultPaymentMethod()
      fetchKycStatus()
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
  }, [token, fetchPayments])

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

  // Auto-open send form if requested (e.g., from Home tab or Send Drink)
  useEffect(() => {
    if (autoOpenSendForm && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true
      setShowSendForm(true)
      setShowRedeemForm(false)
      // Pre-fill recipient if passed (e.g., from Send Drink fallback)
      if (prefilledRecipientId) {
        setSearchQuery(prefilledRecipientName || '')
      }
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

  // Listen for wallet updates from Socket.io
  useEffect(() => {
    const handleWalletUpdate = (event: CustomEvent) => {
      const data = event.detail
      console.log('Wallet updated:', data)
      if (updateUser) {
        updateUser({})
      }
      setPaymentsPage(1)
      setPaymentsHasMore(true)
      fetchPayments(1, true)
      // Refresh default payment method in case it changed
      fetchDefaultPaymentMethod()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('wallet-updated', handleWalletUpdate as EventListener)
      return () => {
        window.removeEventListener('wallet-updated', handleWalletUpdate as EventListener)
      }
    }
  }, [updateUser, token, fetchPayments, fetchDefaultPaymentMethod])

  // Refetch payments when filter changes
  useEffect(() => {
    if (token && activeFilter !== null) {
      setPaymentsPage(1)
      setPaymentsHasMore(true)
      fetchPayments(1, true)
    }
  }, [activeFilter, token, fetchPayments])

  // Infinite scroll for payments
  useEffect(() => {
    const handleScroll = () => {
      // Infinite scroll - load more when near bottom
      if (!loadingMorePayments && paymentsHasMore && paymentsContainerRef.current) {
        const scrollHeight = document.documentElement.scrollHeight
        const scrollTop = window.innerHeight + window.scrollY
        const threshold = 500 // Load when 500px from bottom
        
        if (scrollTop >= scrollHeight - threshold) {
          setLoadingMorePayments(true)
          setPaymentsPage(prev => {
            const nextPage = prev + 1
            fetchPayments(nextPage, false)
            return nextPage
          })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMorePayments, paymentsHasMore, fetchPayments])

  // Listen for real-time payment updates and points updates
  useEffect(() => {
    if (!socket) return

    const handlePaymentRedeemed = (data: any) => {
      setPaymentsPage(1)
      setPaymentsHasMore(true)
      fetchPayments(1, true)
      fetchPoints() // Refresh points in case they were earned
      if (updateUser) {
        updateUser({})
      }
      setSuccess('Payment redeemed successfully!')
      setTimeout(() => setSuccess(null), 5000)
    }

    const handlePaymentProcessed = (data: any) => {
      setPaymentsPage(1)
      setPaymentsHasMore(true)
      fetchPayments(1, true)
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
  }, [socket, updateUser, user, previousPoints, fetchPayments, fetchPoints])

  // Step 1 — validate form then request OTP
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!recipientPhone.trim()) {
      setError('Please enter a recipient phone number')
      return
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }

    setOtpLoading(true)
    try {
      await axios.post(
        `${API_URL}/payments/request-otp`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setOtpStep(true)
      setOtp('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Step 2 — submit payment with verified OTP
  const handleSendWithOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code sent to your phone.')
      return
    }
    // Biometric confirmation before sending money
    try {
      const { authenticateWithBiometrics, isBiometricAvailable } = await import('../services/native')
      const bioAvailable = await isBiometricAvailable()
      if (bioAvailable) {
        const passed = await authenticateWithBiometrics('Confirm payment with Face ID or fingerprint')
        if (!passed) return
      }
    } catch {}
    setSending(true)
    setError(null)
    setSuccess(null)

    const amountNum = parseFloat(amount)

    try {
      const response = await axios.post(
        `${API_URL}/payments/send`,
        {
          recipientPhone: recipientPhone.trim(),
          amount: amountNum,
          message: message.trim() || undefined,
          otp
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

      setOtpStep(false)
      setOtp('')
      setShowSendForm(false)
      setRecipientPhone('')
      setRecipientName('')
      setAmount('')
      setMessage('')
      setSelectedVenue(null)
      setPaymentsPage(1)
      setPaymentsHasMore(true)
      fetchPayments(1, true)
      fetchRecentRecipients()
      if (updateUser) {
        updateUser({})
      }
    } catch (error: any) {
      // Check if insufficient balance
      if (error.response?.status === 402 && error.response?.data?.canPayWithCard) {
        const shortfall = error.response?.data?.shortfall || amountNum
        const currentBalance = error.response?.data?.currentBalance || 0
        setOtpStep(false)
        setOtp('')
        
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
      setPaymentsPage(1)
      setPaymentsHasMore(true)
      fetchPayments(1, true)
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

  // Payments are already filtered by backend, no need for client-side filtering
  const filteredPayments = payments

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
    <div className="min-h-screen pb-14 bg-black max-w-4xl mx-auto pt-16">
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
            
            {/* Low balance warning */}
            {balance > 0 && balance < 10 && (
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span className="text-yellow-400 text-xs">Low balance — <button onClick={() => setShowAddFunds(true)} className="underline hover:text-yellow-300">Add funds</button></span>
              </div>
            )}

            {/* KYC verification banner */}
            {kycStatus && kycStatus !== 'verified' && (
              <div className={`mt-2 p-3 rounded-lg border flex items-center justify-between gap-3 ${
                kycStatus === 'pending'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : kycStatus === 'failed'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-primary-500/10 border-primary-500/30'
              }`}>
                <div>
                  <div className="flex items-center gap-1.5">
                    {kycStatus === 'pending' ? <Clock className="w-3.5 h-3.5 text-yellow-400" /> : kycStatus === 'failed' ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <Lock className="w-3.5 h-3.5 text-primary-400" />}
                    <p className="text-xs font-semibold text-primary-400">
                      {kycStatus === 'pending' ? 'Verification in progress' : kycStatus === 'failed' ? 'Verification failed' : 'Unverified — limits apply'}
                    </p>
                  </div>
                  {kycLimits && (
                    <p className="text-xs text-primary-400/60 mt-0.5">
                      ${kycLimits.dailyAddFunds}/day · ${kycLimits.maxBalance} max balance
                    </p>
                  )}
                </div>
                {kycStatus !== 'pending' && (
                  <button
                    onClick={handleStartKyc}
                    disabled={kycStarting}
                    className="text-xs bg-primary-500 text-black font-bold px-3 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-50"
                  >
                    {kycStarting ? '...' : 'Verify ID'}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Points Row — compact, outside the card */}
      <div className="px-4 mb-3">
        <div className="flex items-center justify-between bg-black/40 border border-primary-500/15 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <span className="text-primary-400 text-sm font-semibold">{points.toLocaleString()} pts</span>
            {points < 100 ? (
              <>
                <div className="w-16 bg-black/60 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all" style={{ width: `${(points / 100) * 100}%` }} />
                </div>
                <span className="text-primary-400/40 text-xs">{100 - points} to $5</span>
              </>
            ) : (
              <span className="text-yellow-400 text-xs font-semibold">· Ready to redeem!</span>
            )}
          </div>
          {points >= 100 && (
            <button
              onClick={async () => {
                try {
                  setRedeeming(true)
                  const response = await axios.post(`${API_URL}/rewards/redeem-cash`, { pointsToRedeem: 100 }, { headers: { Authorization: `Bearer ${token}` } })
                  await fetchPoints()
                  if (updateUser) await updateUser({})
                  setSuccess(`$${response.data.redemption.cashAmount.toFixed(2)} added to your wallet!`)
                  setTimeout(() => setSuccess(null), 5000)
                } catch (error: any) {
                  setError(error.response?.data?.message || 'Failed to redeem cash reward')
                  setTimeout(() => setError(null), 5000)
                } finally { setRedeeming(false) }
              }}
              disabled={redeeming}
              className="text-xs bg-yellow-500 text-black font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              <Sparkles className="w-3 h-3" />Redeem $5
            </button>
          )}
        </div>
      </div>

      {/* Primary Actions — balance-aware */}
      {balance === 0 && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowAddFunds(true)}
            className="w-full bg-primary-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/25 text-lg active:scale-[0.99]"
          >
            <Plus className="w-5 h-5" />
            Add Funds to Send Shots
          </button>
          <button
            data-send-money-button
            onClick={() => {
              setShowSendForm(!showSendForm)
              setShowRedeemForm(false)

              if (!showSendForm) {
                setSearchQuery('')
                setSearchResults([])
              }
            }}
            className="w-full mt-3 border border-primary-500/30 text-primary-500/60 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            Send Money
          </button>
        </div>
      )}

      {balance > 0 && (
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
                  className="w-full bg-black/60 border border-primary-500/30 rounded-lg pl-10 pr-10 py-3 text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {/* Import from Contacts — icon button inside search field */}
                <button
                  type="button"
                  title="Import from Contacts"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400/60 hover:text-primary-500 transition-colors"
              >
                <Phone className="w-4 h-4" />
              </button>
              </div>

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
            {!otpStep ? (
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
                      onClick={() => { setRecipientPhone(''); setRecipientName('') }}
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
                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[5, 10, 20, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                        amount === String(preset)
                          ? 'bg-primary-500 text-black border-primary-500'
                          : 'bg-primary-500/10 text-primary-500 border-primary-500/30 hover:bg-primary-500/20'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
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
                disabled={otpLoading || !amount || parseFloat(amount) <= 0 || !recipientPhone}
                className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-all flex items-center justify-center gap-2"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Continue — Send ${amount || '0.00'}</span>
                  </>
                )}
              </button>
            </form>
            ) : (
            /* OTP verification step */
            <div className="bg-black/50 border-2 border-primary-500/30 rounded-xl p-5 space-y-4">
              <div className="text-center mb-2">
                <p className="text-primary-500 font-semibold">Verify Payment</p>
                <p className="text-primary-400/70 text-sm mt-1">Enter the 6-digit code sent to your phone</p>
              </div>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 text-center text-2xl tracking-widest placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleSendWithOtp}
                disabled={sending || otp.length !== 6}
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
                    <span>Confirm & Send ${amount}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => { setOtpStep(false); setOtp('') }}
                disabled={sending}
                className="w-full text-primary-400/70 text-sm hover:text-primary-400 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSend as any}
                disabled={otpLoading}
                className="w-full text-primary-400/60 text-xs hover:text-primary-400 transition-colors"
              >
                {otpLoading ? 'Resending...' : 'Resend code'}
              </button>
            </div>
            )}
          </div>
        )}

      </div>
      )}

      {/* Quick Actions — balance-aware to avoid duplicate Add Funds */}
      <div className="px-4 mb-4">
        {balance > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowAddFunds(true)}
              className="group relative bg-primary-500/10 border-2 border-primary-500/40 text-primary-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-500/20 transition-all hover:border-primary-500/60 hover:scale-[1.02] active:scale-[0.98]"
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
        ) : (
          <button
            onClick={() => setShowTapAndPay(true)}
            className="w-full bg-primary-500/10 border-2 border-primary-500/40 text-primary-500 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-500/20 transition-all hover:border-primary-500/60 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Radio className="w-5 h-5" />
            <span>Tap & Pay</span>
          </button>
        )}
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
              onClick={() => {
                setActiveFilter(filter)
                setPaymentsPage(1)
                setPaymentsHasMore(true)
                fetchPayments(1, true)
              }}
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
        {loadingPayments ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-black/40 border border-primary-500/10 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-500/15 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-primary-500/15 rounded w-2/5" />
                    <div className="h-2.5 bg-primary-500/10 rounded w-1/4" />
                  </div>
                  <div className="h-4 w-14 bg-primary-500/15 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 bg-black/30 border border-primary-500/10 rounded-2xl px-6">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary-500/20">
              <Send className="w-7 h-7 text-primary-500/40" />
            </div>
            <p className="text-white font-semibold text-sm mb-1">No shots sent yet</p>
            <p className="text-primary-400/50 text-xs">Add funds and buy a drink for a friend — it'll show up here.</p>
          </div>
        ) : (
          <div className="space-y-2" ref={paymentsContainerRef}>
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
                      {payment.status === 'succeeded' && !payment.refunded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDisputePayment(payment)
                            setDisputeReason('')
                            setDisputeDescription('')
                            setDisputeSuccess(false)
                          }}
                          className="text-xs text-primary-400/40 hover:text-red-400 mt-1 underline transition-colors"
                        >
                          Dispute
                        </button>
                      )}
                      {payment.refunded && (
                        <span className="text-xs text-green-400/60 mt-1 block">Refunded</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {loadingMorePayments && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Secondary Actions — always visible */}
      <div className="px-4 mb-6 space-y-2">
        <button
          onClick={() => setShowRedeemForm(!showRedeemForm)}
          className="w-full bg-black/50 border border-primary-500/20 text-primary-400 py-3 rounded-xl font-semibold flex items-center gap-3 px-4 hover:bg-primary-500/10 hover:text-primary-500 transition-all"
        >
          <QrCode className="w-5 h-5" />
          <span>Redeem Reward Code</span>
        </button>

        {showRedeemForm && (
          <form onSubmit={handleRedeem} className="bg-black/50 border-2 border-primary-500/30 rounded-xl p-5 space-y-4">
            <input
              type="text"
              value={redemptionCode}
              onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
              placeholder="Enter reward code"
              required
              className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
            />
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

        <button
          onClick={() => setShowPaymentMethods(!showPaymentMethods)}
          className="w-full bg-black/50 border border-primary-500/20 text-primary-400 py-3 rounded-xl font-semibold flex items-center gap-3 px-4 hover:bg-primary-500/10 hover:text-primary-500 transition-all"
        >
          <CreditCard className="w-5 h-5" />
          <span>Manage Payment Methods</span>
        </button>

        {showPaymentMethods && (
          <div className="p-5 bg-black/50 border border-primary-500/20 rounded-xl">
            <PaymentMethodsManager />
          </div>
        )}
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
          setPaymentsPage(1)
          setPaymentsHasMore(true)
          fetchPayments(1, true)
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

      {/* Dispute Modal */}
      {disputePayment && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500/40 rounded-2xl p-6 max-w-md w-full backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-primary-500">Dispute Transaction</h2>
              <button onClick={() => setDisputePayment(null)} className="text-primary-400 hover:text-primary-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {disputeSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-primary-500 font-bold">Dispute Filed</p>
                <p className="text-primary-400/70 text-sm mt-1">We'll review within 3–5 business days and contact you by email.</p>
                <button
                  onClick={() => setDisputePayment(null)}
                  className="mt-4 w-full bg-primary-500 text-black font-bold py-3 rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 mb-4">
                  <p className="text-primary-400/60 text-xs">Transaction</p>
                  <p className="text-primary-500 font-bold">${disputePayment.amount?.toFixed(2)} · {new Date(disputePayment.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-primary-400 text-sm font-semibold mb-2">Reason *</label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full bg-black/60 border border-primary-500/30 text-primary-400 rounded-xl p-3 text-sm"
                  >
                    <option value="">Select a reason</option>
                    <option value="unauthorized">Unauthorized charge</option>
                    <option value="not_received">Shot not received</option>
                    <option value="duplicate">Duplicate transaction</option>
                    <option value="wrong_amount">Wrong amount charged</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="mb-5">
                  <label className="block text-primary-400 text-sm font-semibold mb-2">Additional details (optional)</label>
                  <textarea
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value.slice(0, 500))}
                    placeholder="Describe what happened..."
                    rows={3}
                    className="w-full bg-black/60 border border-primary-500/30 text-primary-400 placeholder-primary-400/30 rounded-xl p-3 text-sm resize-none"
                  />
                  <p className="text-primary-400/40 text-xs mt-1 text-right">{disputeDescription.length}/500</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDisputePayment(null)}
                    className="flex-1 bg-black/40 border border-primary-500/30 text-primary-400 py-3 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisputeSubmit}
                    disabled={!disputeReason || disputeSubmitting}
                    className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {disputeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {disputeSubmitting ? 'Filing...' : 'File Dispute'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
