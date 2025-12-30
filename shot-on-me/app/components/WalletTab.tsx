'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, QrCode, History, Plus, Sparkles, CreditCard, Radio, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Loader2, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import AddFundsModal from './AddFundsModal'
import PaymentMethodsManager from './PaymentMethodsManager'
import VirtualCardManager from './VirtualCardManager'
import TapAndPayModal from './TapAndPayModal'
import { useApiUrl } from '../utils/api'

export default function WalletTab() {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const { socket } = useSocket()
  const router = useRouter()
  const [showSendForm, setShowSendForm] = useState(false)
  const [showRedeemForm, setShowRedeemForm] = useState(false)
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchPayments()
      fetchPoints()
    }
  }, [token])

  const fetchPoints = async () => {
    try {
      const response = await axios.get(`${API_URL}/gamification/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPoints(response.data.points || 0)
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
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('wallet-updated', handleWalletUpdate as EventListener)
      return () => {
        window.removeEventListener('wallet-updated', handleWalletUpdate as EventListener)
      }
    }
  }, [updateUser])

  // Listen for real-time payment updates
  useEffect(() => {
    if (!socket) return

    const handlePaymentRedeemed = (data: any) => {
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
      setSuccess('Payment redeemed successfully!')
      setTimeout(() => setSuccess(null), 5000)
    }

    const handlePaymentProcessed = (data: any) => {
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
      setSuccess('Payment processed successfully!')
      setTimeout(() => setSuccess(null), 5000)
    }

    socket.on('payment-redeemed', handlePaymentRedeemed)
    socket.on('payment-processed', handlePaymentProcessed)

    return () => {
      socket.off('payment-redeemed', handlePaymentRedeemed)
      socket.off('payment-processed', handlePaymentProcessed)
    }
  }, [socket, updateUser])

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

      setSuccess(`Payment sent! Redemption code: ${response.data.payment.redemptionCode}`)
      setShowSendForm(false)
      setRecipientPhone('')
      setAmount('')
      setMessage('')
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
      setTimeout(() => setSuccess(null), 8000)
    } catch (error: any) {
      // Check if insufficient balance and card payment is available
      if (error.response?.status === 402 && error.response?.data?.canPayWithCard) {
        // Show card payment modal
        setCardPaymentAmount(amountNum)
        setCardPaymentRecipient({
          phone: recipientPhone.trim(),
          message: message.trim() || undefined
        })
        setShowCardPayment(true)
        setSending(false)
      } else {
        setError(error.response?.data?.error || error.response?.data?.message || 'Failed to send payment')
        setTimeout(() => setError(null), 5000)
        setSending(false)
      }
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
    <div className="min-h-screen pb-20 bg-black max-w-4xl mx-auto">
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
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-primary-500/10">
        <div className="px-4 py-5">
          <h2 className="text-2xl font-bold text-primary-500 mb-1">Wallet</h2>
          <p className="text-primary-400/70 text-sm">Manage your balance and payments</p>
        </div>
      </div>

      {/* Balance Card - Hero Section */}
      <div className="px-4 pt-6 pb-5">
        <div className="relative bg-gradient-to-br from-primary-500/25 via-primary-500/15 to-primary-500/5 border-2 border-primary-500/40 rounded-3xl p-6 shadow-2xl shadow-primary-500/10 overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-500/30 rounded-2xl flex items-center justify-center border border-primary-500/40 shadow-lg">
                  <WalletIcon className="w-7 h-7 text-primary-500" />
                </div>
                <div>
                  <p className="text-primary-400/60 text-xs uppercase tracking-widest font-semibold mb-1.5">Available Balance</p>
                  <p className="text-5xl font-bold text-primary-500 tracking-tight">${balance.toFixed(2)}</p>
                </div>
              </div>
              {pendingBalance > 0 && (
                <div className="text-right bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2.5">
                  <p className="text-yellow-400/70 text-xs uppercase tracking-wider font-semibold mb-1">Pending</p>
                  <p className="text-xl font-bold text-yellow-500">${pendingBalance.toFixed(2)}</p>
                </div>
              )}
            </div>
            
            {/* Points Display */}
            <div className="flex items-center gap-2.5 pt-4 border-t border-primary-500/20">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-primary-400/60 text-xs uppercase tracking-wider font-semibold">Reward Points</p>
                <p className="text-yellow-500 font-bold text-lg">{points.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAddFunds(true)}
            className="group relative bg-primary-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2.5 hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Add Funds</span>
          </button>
          <button
            onClick={() => setShowTapAndPay(true)}
            className="group bg-primary-500/10 border-2 border-primary-500/40 text-primary-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2.5 hover:bg-primary-500/20 transition-all hover:border-primary-500/60 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Radio className="w-5 h-5" />
            <span>Tap & Pay</span>
          </button>
        </div>
      </div>

      {/* Virtual Card Manager */}
      <div className="px-4 mb-5">
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

      {/* Secondary Actions */}
      <div className="px-4 mb-6 space-y-3">
        <button
          onClick={() => {
            setShowSendForm(!showSendForm)
            setShowRedeemForm(false)
          }}
          className="w-full bg-black/50 border-2 border-primary-500/30 text-primary-500 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-500/10 hover:border-primary-500/50 transition-all"
        >
          <Send className="w-5 h-5" />
          <span>{showSendForm ? 'Cancel Send' : 'Send Money'}</span>
        </button>

        {showSendForm && (
          <form onSubmit={handleSend} className="bg-black/50 border-2 border-primary-500/30 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-primary-500 text-sm font-semibold mb-2">Recipient Phone</label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+1234567890"
                required
                className="w-full px-4 py-3 bg-black/60 border border-primary-500/30 rounded-lg text-primary-300 placeholder-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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
            <button
              type="submit"
              disabled={sending || !amount || parseFloat(amount) <= 0}
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
        )}

        <button 
          onClick={() => {
            setShowRedeemForm(!showRedeemForm)
            setShowSendForm(false)
          }}
          className="w-full bg-black/50 border-2 border-primary-500/30 text-primary-500 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-500/10 hover:border-primary-500/50 transition-all"
        >
          <QrCode className="w-5 h-5" />
          <span>{showRedeemForm ? 'Cancel Redeem' : 'Redeem Code'}</span>
        </button>

        {showRedeemForm && (
          <form onSubmit={handleRedeem} className="bg-black/50 border-2 border-primary-500/30 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-primary-500 text-sm font-semibold mb-2">Redemption Code</label>
              <input
                type="text"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                placeholder="Enter redemption code"
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

        <button
          onClick={() => setShowPaymentMethods(!showPaymentMethods)}
          className="w-full bg-black/50 border-2 border-primary-500/30 text-primary-500 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-500/10 hover:border-primary-500/50 transition-all"
        >
          <CreditCard className="w-5 h-5" />
          <span>{showPaymentMethods ? 'Hide' : 'Manage'} Payment Methods</span>
        </button>

        {showPaymentMethods && (
          <div className="mt-3 p-5 bg-black/50 border border-primary-500/20 rounded-xl">
            <PaymentMethodsManager />
          </div>
        )}
      </div>

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
    </div>
  )
}
