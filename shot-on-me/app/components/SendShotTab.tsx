'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, Search, User, Users, MapPin, Clock, DollarSign, QrCode, History, TrendingUp, Sparkles, X } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { useApiUrl } from '../utils/api'
import { QRCodeSVG } from 'qrcode.react'
import RedeemQRCode from './RedeemQRCode'

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
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [redemptionCode, setRedemptionCode] = useState('')
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([])
  const [favoriteVenues, setFavoriteVenues] = useState<FavoriteVenue[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RecentRecipient[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeData, setQrCodeData] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<any>(null)

  useEffect(() => {
    if (token) {
      fetchRecentRecipients()
      fetchFavoriteVenues()
      fetchPaymentHistory()
      
      // Check for pre-selected venue from MapTab or other components
      const storedVenue = localStorage.getItem('selectedVenue')
      const profileAction = localStorage.getItem('profileAction')
      
      if (storedVenue && profileAction === 'send-shot') {
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

  const fetchPaymentHistory = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPaymentHistory(response.data.payments || [])
    } catch (error) {
      console.error('Failed to fetch payment history:', error)
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

  const handleQuickAmount = (value: string) => {
    setAmount(value)
    setShowSendForm(true)
  }

  const handleSelectRecipient = (recipient: RecentRecipient) => {
    setRecipientPhone(recipient.phoneNumber || '')
    setRecipientName(`${recipient.firstName} ${recipient.lastName}`)
    setShowSendForm(true)
  }

  const handleSendPayment = async () => {
    if (!recipientPhone || !amount || !token) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post(
        `${API_URL}/payments/send`,
        {
          recipientPhone,
          amount: parseFloat(amount),
          message: message || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        const code = response.data.redemptionCode
        setQrCodeData(code)
        setShowQRCode(true)
        setShowSendForm(false)
        setRecipientPhone('')
        setRecipientName('')
        setAmount('')
        setMessage('')
        await fetchRecentRecipients()
        await fetchPaymentHistory()
        if (updateUser) {
          await updateUser({})
        }
      }
    } catch (error: any) {
      console.error('Failed to send payment:', error)
      setError(error.response?.data?.message || 'Failed to send payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemCode = async () => {
    if (!redemptionCode || !token) {
      setError('Please enter a redemption code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post(
        `${API_URL}/payments/redeem`,
        { code: redemptionCode },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.success) {
        setRedemptionCode('')
        setShowRedeemForm(false)
        await fetchPaymentHistory()
        if (updateUser) {
          await updateUser({})
        }
        alert('Payment redeemed successfully!')
      }
    } catch (error: any) {
      console.error('Failed to redeem code:', error)
      setError(error.response?.data?.message || 'Invalid redemption code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Send Shot</h1>
        <p className="text-gray-400 text-sm">Send money to friends instantly</p>
        {selectedVenue && (
          <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-primary-500 font-medium">
                Sending to: {selectedVenue.name}
              </span>
            </div>
            {selectedVenue.address && (
              <p className="text-xs text-primary-400/70 mt-1 ml-6">
                {selectedVenue.address}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick Amount Buttons */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-3">Quick Amount</p>
        <div className="grid grid-cols-4 gap-2">
          {['5', '10', '20', '50'].map((value) => (
            <button
              key={value}
              onClick={() => handleQuickAmount(value)}
              className="bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 rounded-lg py-3 px-4 text-center transition-colors"
            >
              <span className="text-lg font-semibold">${value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Recipients */}
      {recentRecipients.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3">Recent</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {recentRecipients.map((recipient) => (
              <button
                key={recipient._id}
                onClick={() => handleSelectRecipient(recipient)}
                className="flex-shrink-0 flex flex-col items-center gap-2 bg-gray-900/50 hover:bg-gray-800/50 rounded-lg p-3 min-w-[80px] transition-colors"
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
                <span className="text-xs text-center truncate w-full">
                  {recipient.firstName} {recipient.lastName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Users */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-gray-900/80 border border-gray-700 rounded-lg overflow-hidden">
            {searchResults.map((user) => (
              <button
                key={user._id}
                onClick={() => {
                  setRecipientPhone(user.phoneNumber || '')
                  setRecipientName(`${user.firstName} ${user.lastName}`)
                  setSearchQuery('')
                  setSearchResults([])
                  setShowSendForm(true)
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors text-left"
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
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  {user.phoneNumber && (
                    <p className="text-xs text-gray-400">{user.phoneNumber}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Send Payment Form Modal */}
      {showSendForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Send Payment</h2>
              <button
                onClick={() => {
                  setShowSendForm(false)
                  setError('')
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Recipient</label>
                <input
                  type="text"
                  value={recipientName || recipientPhone}
                  readOnly
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Message (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message..."
                  rows={3}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <button
                onClick={handleSendPayment}
                disabled={loading || !amount || !recipientPhone}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : `Send $${amount || '0.00'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Redemption Code</h2>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={qrCodeData} size={200} />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Share this code with the recipient</p>
                <p className="text-2xl font-mono font-bold text-primary-500">{qrCodeData}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeData)
                  alert('Code copied to clipboard!')
                }}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Code Section */}
      <div className="mb-6">
        <button
          onClick={() => setShowRedeemForm(!showRedeemForm)}
          className="w-full bg-gray-900/50 hover:bg-gray-800/50 border border-gray-700 rounded-lg py-3 px-4 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <QrCode className="w-5 h-5 text-primary-500" />
            <span>Redeem Code</span>
          </div>
          <Sparkles className="w-5 h-5 text-primary-500" />
        </button>

        {showRedeemForm && (
          <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Redemption Code</label>
                <input
                  type="text"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  placeholder="Enter code..."
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>
              <button
                onClick={handleRedeemCode}
                disabled={loading || !redemptionCode}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Redeeming...' : 'Redeem'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-primary-500" />
              Recent Activity
            </h2>
          </div>
          <div className="space-y-2">
            {paymentHistory.slice(0, 5).map((payment: any) => (
              <div
                key={payment._id}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                    {payment.type === 'shot_sent' ? (
                      <Send className="w-5 h-5 text-primary-500" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {payment.type === 'shot_sent'
                        ? `Sent to ${payment.recipientId?.firstName || 'User'}`
                        : 'Received'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      payment.type === 'shot_sent' ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {payment.type === 'shot_sent' ? '-' : '+'}${payment.amount.toFixed(2)}
                  </p>
                  {payment.redemptionCode && (
                    <p className="text-xs text-gray-500 font-mono">{payment.redemptionCode}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
