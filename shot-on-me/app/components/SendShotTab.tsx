'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import axios from 'axios'
import { Send, Search, User, Users, MapPin, Clock, DollarSign, QrCode, History, TrendingUp, Sparkles, X } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { useApiUrl } from '../utils/api'

interface RecentRecipient {
  _id: string
  firstName: string
  lastName: string
  profilePicture?: string
  phoneNumber?: string
  lastSent?: string
  totalSent?: number
}

interface FavoriteVenue {
  _id: string
  name: string
  address?: any
  location?: any
}

export default function SendShotTab() {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const { socket } = useSocket()
  const router = useRouter()
  const [showSendForm, setShowSendForm] = useState(false)
  const [showRedeemForm, setShowRedeemForm] = useState(false)
  const [activeView, setActiveView] = useState<'send' | 'history'>('send')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [redemptionCode, setRedemptionCode] = useState('')
  const [sending, setSending] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([])
  const [favoriteVenues, setFavoriteVenues] = useState<FavoriteVenue[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Quick amount buttons
  const quickAmounts = [5, 10, 20, 50, 100]

  useEffect(() => {
    if (token) {
      fetchRecentRecipients()
      fetchFavoriteVenues()
      fetchPayments()
    }
  }, [token])

  // Listen for real-time payment updates
  useEffect(() => {
    if (!socket) return

    const handlePaymentRedeemed = (data: any) => {
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
    }

    socket.on('payment-redeemed', handlePaymentRedeemed)

    return () => {
      socket.off('payment-redeemed', handlePaymentRedeemed)
    }
  }, [socket, updateUser])

  const fetchRecentRecipients = async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const payments = response.data.payments || []
      
      // Extract unique recipients from payment history
      const recipientMap = new Map<string, RecentRecipient>()
      
      payments.forEach((payment: any) => {
        if (payment.recipient && payment.recipient._id) {
          const recipientId = payment.recipient._id
          if (!recipientMap.has(recipientId)) {
            recipientMap.set(recipientId, {
              _id: recipientId,
              firstName: payment.recipient.firstName || payment.recipient.name?.split(' ')[0] || '',
              lastName: payment.recipient.lastName || payment.recipient.name?.split(' ').slice(1).join(' ') || '',
              profilePicture: payment.recipient.profilePicture,
              phoneNumber: payment.recipient.phoneNumber,
              lastSent: payment.createdAt,
              totalSent: 1
            })
          } else {
            const existing = recipientMap.get(recipientId)!
            existing.totalSent = (existing.totalSent || 0) + 1
            if (new Date(payment.createdAt) > new Date(existing.lastSent || 0)) {
              existing.lastSent = payment.createdAt
            }
          }
        }
      })
      
      // Sort by most recent
      const recipients = Array.from(recipientMap.values())
        .sort((a, b) => new Date(b.lastSent || 0).getTime() - new Date(a.lastSent || 0).getTime())
        .slice(0, 10)
      
      setRecentRecipients(recipients)
    } catch (error) {
      console.error('Failed to fetch recent recipients:', error)
    }
  }

  const fetchFavoriteVenues = async () => {
    try {
      const response = await axios.get(`${API_URL}/favorites/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFavoriteVenues(response.data.venues || [])
    } catch (error) {
      console.error('Failed to fetch favorite venues:', error)
    }
  }

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPayments(response.data.payments || [])
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
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
    if (searchQuery) {
      const debounce = setTimeout(() => {
        searchUsers(searchQuery)
      }, 300)
      return () => clearTimeout(debounce)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString())
    if (!showSendForm) {
      setShowSendForm(true)
    }
  }

  const handleSelectRecipient = (recipient: RecentRecipient | any) => {
    if (recipient.phoneNumber) {
      setRecipientPhone(recipient.phoneNumber)
    }
    if (recipient._id) {
      setRecipientId(recipient._id)
    }
    setSearchQuery('')
    setSearchResults([])
    setShowSendForm(true)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const response = await axios.post(
        `${API_URL}/payments/send`,
        {
          recipientPhone: recipientPhone || undefined,
          recipientId: recipientId || undefined,
          amount: parseFloat(amount),
          message: message || 'Here\'s a shot on me! 🍻'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      alert(`✅ Shot sent! ${response.data.message || 'Recipient will receive a notification.'}`)
      
      // Reset form
      setRecipientPhone('')
      setRecipientId('')
      setAmount('')
      setMessage('')
      setShowSendForm(false)
      
      // Refresh data
      fetchRecentRecipients()
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
    } catch (error: any) {
      console.error('Failed to send shot:', error)
      alert(error.response?.data?.message || 'Failed to send shot. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    setRedeeming(true)

    try {
      const response = await axios.post(
        `${API_URL}/payments/redeem`,
        { code: redemptionCode },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      alert(`✅ ${response.data.message || 'Payment redeemed successfully!'}`)
      setRedemptionCode('')
      setShowRedeemForm(false)
      
      fetchPayments()
      if (updateUser) {
        updateUser({})
      }
    } catch (error: any) {
      console.error('Failed to redeem:', error)
      alert(error.response?.data?.message || 'Invalid redemption code. Please try again.')
    } finally {
      setRedeeming(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  return (
    <div className="min-h-screen pb-20 bg-black max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary-500/10 via-transparent to-transparent border-b border-primary-500/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary-500 mb-1 tracking-tight">Send Shot</h1>
            <p className="text-primary-400/80 text-sm font-light">Buy someone a drink instantly</p>
          </div>
          <div className="text-right">
            <p className="text-primary-400/70 text-xs uppercase tracking-wider font-medium mb-0.5">Balance</p>
            <p className="text-xl font-semibold text-primary-500">${(user?.wallet?.balance || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-2 bg-black/40 border border-primary-500/20 rounded-lg p-1 backdrop-blur-sm">
          <button
            onClick={() => setActiveView('send')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeView === 'send'
                ? 'bg-primary-500 text-black'
                : 'text-primary-400 hover:text-primary-500'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Send
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeView === 'history'
                ? 'bg-primary-500 text-black'
                : 'text-primary-400 hover:text-primary-500'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            History
          </button>
        </div>
      </div>

      {activeView === 'send' ? (
        <div className="p-4 space-y-6">
          {/* Quick Amount Buttons */}
          <div>
            <h2 className="text-sm font-semibold text-primary-500 mb-3 tracking-tight">Quick Send</h2>
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-3 hover:border-primary-500/50 hover:bg-black/60 transition-all backdrop-blur-sm"
                >
                  <DollarSign className="w-5 h-5 text-primary-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-primary-500">${quickAmount}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Recipients */}
          {recentRecipients.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-primary-500 mb-3 tracking-tight">Recent</h2>
              <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-2">
                {recentRecipients.map((recipient) => (
                  <button
                    key={recipient._id}
                    onClick={() => handleSelectRecipient(recipient)}
                    className="flex flex-col items-center space-y-2 bg-black/40 border border-primary-500/15 rounded-lg p-3 flex-shrink-0 min-w-[80px] backdrop-blur-sm hover:border-primary-500/50 transition-all"
                  >
                    <div className="w-12 h-12 border-2 border-primary-500/30 rounded-full overflow-hidden">
                      {recipient.profilePicture ? (
                        <img
                          src={recipient.profilePicture}
                          alt={recipient.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                          <span className="text-primary-500 font-medium text-sm">
                            {recipient.firstName[0]}{recipient.lastName[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-primary-500 text-center">
                      {recipient.firstName}
                    </p>
                    {recipient.totalSent && recipient.totalSent > 1 && (
                      <p className="text-xs text-primary-400/70">{recipient.totalSent}x</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Recipients */}
          <div>
            <h2 className="text-sm font-semibold text-primary-500 mb-3 tracking-tight">Search</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-500"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result._id || result.id}
                    onClick={() => handleSelectRecipient(result)}
                    className="w-full flex items-center space-x-3 bg-black/40 border border-primary-500/15 rounded-lg p-3 hover:border-primary-500/50 transition-all backdrop-blur-sm"
                  >
                    <div className="w-10 h-10 border border-primary-500/30 rounded-full overflow-hidden flex-shrink-0">
                      {result.profilePicture ? (
                        <img
                          src={result.profilePicture}
                          alt={result.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/10">
                          <span className="text-primary-500 font-medium text-xs">
                            {result.firstName?.[0]}{result.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-primary-500 text-sm">
                        {result.firstName} {result.lastName}
                      </p>
                      {result.phoneNumber && (
                        <p className="text-xs text-primary-400/70">{result.phoneNumber}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Send Form */}
          {showSendForm && (
            <form onSubmit={handleSend} className="bg-black/40 border border-primary-500/20 rounded-lg p-4 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary-500">Send Shot</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowSendForm(false)
                    setRecipientPhone('')
                    setRecipientId('')
                    setAmount('')
                    setMessage('')
                  }}
                  className="text-primary-400 hover:text-primary-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-primary-500 text-sm font-medium mb-2">
                  Recipient Phone or ID
                </label>
                <input
                  type="text"
                  value={recipientPhone || recipientId}
                  onChange={(e) => {
                    if (e.target.value.match(/^\d/)) {
                      setRecipientPhone(e.target.value)
                      setRecipientId('')
                    } else {
                      setRecipientId(e.target.value)
                      setRecipientPhone('')
                    }
                  }}
                  placeholder="Phone number or user ID"
                  className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-primary-500 text-sm font-medium mb-2">Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-primary-500 text-sm font-medium mb-2">Message (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={sending || !amount || (!recipientPhone && !recipientId)}
                className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : `Send $${amount || '0.00'}`}
              </button>
            </form>
          )}

          {/* Redeem Code */}
          <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-3">
              <QrCode className="w-5 h-5 text-primary-500" />
              <h3 className="text-sm font-semibold text-primary-500">Redeem Code</h3>
            </div>
            {!showRedeemForm ? (
              <button
                onClick={() => setShowRedeemForm(true)}
                className="w-full bg-primary-500/10 border border-primary-500/20 text-primary-500 py-2 rounded-lg font-medium hover:bg-primary-500/20 transition-all"
              >
                Enter Redemption Code
              </button>
            ) : (
              <form onSubmit={handleRedeem} className="space-y-3">
                <input
                  type="text"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="w-full px-4 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
                  required
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRedeemForm(false)
                      setRedemptionCode('')
                    }}
                    className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-2 rounded-lg font-medium hover:bg-black/60 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={redeeming || !redemptionCode}
                    className="flex-1 bg-primary-500 text-black py-2 rounded-lg font-medium hover:bg-primary-600 transition-all disabled:opacity-50"
                  >
                    {redeeming ? 'Redeeming...' : 'Redeem'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Payment History */
        <div className="p-4">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-primary-500/40 mx-auto mb-3" />
              <p className="text-primary-400/80 font-light">No payment history yet</p>
              <p className="text-primary-400/60 text-sm mt-1 font-light">Send your first shot to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment._id}
                  className="bg-black/40 border border-primary-500/15 rounded-lg p-4 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-2">
                        <Send className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-primary-500">
                          {payment.recipient?.firstName || 'Unknown'} {payment.recipient?.lastName || ''}
                        </p>
                        <p className="text-xs text-primary-400/70 font-light">
                          {formatTimeAgo(payment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-500">${payment.amount?.toFixed(2) || '0.00'}</p>
                      {payment.status && (
                        <p className={`text-xs ${
                          payment.status === 'redeemed' ? 'text-green-500' : 'text-primary-400/70'
                        }`}>
                          {payment.status}
                        </p>
                      )}
                    </div>
                  </div>
                  {payment.message && (
                    <p className="text-sm text-primary-400/80 mt-2 font-light">"{payment.message}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

