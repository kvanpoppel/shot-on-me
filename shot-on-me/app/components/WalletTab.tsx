'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Send, QrCode, History } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'

import { useApiUrl } from '../utils/api'

export default function WalletTab() {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const { socket } = useSocket()
  const router = useRouter()
  const [showSendForm, setShowSendForm] = useState(false)
  const [showRedeemForm, setShowRedeemForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'sent' | 'received'>('sent')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [redemptionCode, setRedemptionCode] = useState('')
  const [sending, setSending] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    if (token) {
      fetchPayments()
    }
  }, [token])

  // Listen for real-time payment updates
  useEffect(() => {
    if (!socket) return

    const handlePaymentRedeemed = (data: any) => {
      fetchPayments()
      // Refresh user data to update wallet balance
      if (updateUser) {
        updateUser({})
      }
    }

    socket.on('payment-redeemed', handlePaymentRedeemed)

    return () => {
      socket.off('payment-redeemed', handlePaymentRedeemed)
    }
  }, [socket, updateUser])

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const response = await axios.post(
        `${API_URL}/payments/send`,
        {
          recipientPhone,
          amount: parseFloat(amount),
          message
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      alert(`Payment sent! Redemption code: ${response.data.payment.redemptionCode}`)
      setShowSendForm(false)
      setRecipientPhone('')
      setAmount('')
      setMessage('')
      fetchPayments()
      // Refresh user data to update wallet balance
      if (updateUser) {
        updateUser({})
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send payment')
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

      alert(`Payment redeemed! Amount: $${response.data.payment.amount.toFixed(2)}`)
      setShowRedeemForm(false)
      setRedemptionCode('')
      fetchPayments()
      // Refresh user data to update wallet balance
      if (updateUser) {
        updateUser({})
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to redeem code')
    } finally {
      setRedeeming(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    if (activeFilter === 'sent') {
      return payment.sender?._id === user?.id || payment.sender === user?.id
    } else {
      return payment.recipient?._id === user?.id || payment.recipient === user?.id
    }
  })

  return (
    <div className="min-h-screen pb-16 bg-black max-w-4xl mx-auto px-4 py-4">
      {/* Wallet Header */}
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-primary-500 mb-4 tracking-tight">Wallet</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-400/70 text-xs uppercase tracking-wider font-medium mb-1">Balance</p>
            <p className="text-2xl font-semibold text-primary-500">${(user?.wallet?.balance || 0).toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-primary-400/70 text-xs uppercase tracking-wider font-medium mb-1">Pending</p>
            <p className="text-lg font-medium text-primary-400/80">${(user?.wallet?.pendingBalance || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Wallet Tabs */}
      <div className="flex border-b border-primary-500/10 mb-4">
        <button 
          onClick={() => setActiveFilter('sent')}
          className={`px-4 py-3 border-b-2 transition-all ${
            activeFilter === 'sent'
              ? 'border-primary-500 text-primary-500 font-medium'
              : 'border-transparent text-primary-400/70 hover:text-primary-500'
          }`}
        >
          Sent
        </button>
        <button 
          onClick={() => setActiveFilter('received')}
          className={`px-4 py-3 border-b-2 transition-all ${
            activeFilter === 'received'
              ? 'border-primary-500 text-primary-500 font-medium'
              : 'border-transparent text-primary-400/70 hover:text-primary-500'
          }`}
        >
          Receives
        </button>
      </div>

      {/* Wallet Balance Card */}
      <div className="m-4 p-6 bg-black border-2 border-primary-500 rounded-lg">
        <p className="text-primary-500 text-sm mb-2">Available Balance</p>
        <p className="text-4xl font-bold text-primary-500 mb-2">
          ${user?.wallet?.balance?.toFixed(2) || '0.00'}
        </p>
        {(user?.wallet?.pendingBalance ?? 0) > 0 && (
          <p className="text-primary-400 text-sm">
            Unredeemed: ${(user?.wallet?.pendingBalance ?? 0).toFixed(2)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 space-y-3">
        {showSendForm && (
          <form onSubmit={handleSend} className="bg-black border-2 border-primary-500 rounded-lg p-4 space-y-4 mb-3">
            <div>
              <label className="block text-primary-500 text-sm font-medium mb-1">Recipient Phone</label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+1234567890"
                required
                className="w-full px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600"
              />
            </div>
            <div>
              <label className="block text-primary-500 text-sm font-medium mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600"
              />
            </div>
            <div>
              <label className="block text-primary-500 text-sm font-medium mb-1">Message (optional)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Happy birthday!"
                className="w-full px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
        <button
          onClick={() => setShowSendForm(!showSendForm)}
          className="w-full bg-primary-500 text-black py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-primary-600 transition-colors"
        >
          <Send className="w-5 h-5" />
          <span>Send Money</span>
        </button>

        <button 
          onClick={() => setShowRedeemForm(!showRedeemForm)}
          className="w-full bg-black border-2 border-primary-500 text-primary-500 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-primary-500/10 transition-colors"
        >
          <QrCode className="w-5 h-5" />
          <span>Redeem Code</span>
        </button>

        {showRedeemForm && (
          <form onSubmit={handleRedeem} className="bg-black border-2 border-primary-500 rounded-lg p-4 space-y-4 mt-3">
            <div>
              <label className="block text-primary-500 text-sm font-medium mb-1">Redemption Code</label>
              <input
                type="text"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                placeholder="Enter redemption code"
                required
                className="w-full px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600"
              />
            </div>
            <button
              type="submit"
              disabled={redeeming}
              className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRedeemForm(false)
                setRedemptionCode('')
              }}
              className="w-full bg-black border border-primary-500 text-primary-500 py-3 rounded-lg font-semibold hover:bg-primary-500/10"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Transaction Table */}
      <div className="px-4 mt-6">
        <div className="border border-primary-500/20 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-3 bg-primary-500/10 border-b border-primary-500/20 text-xs text-primary-500 font-semibold">
            <div className="col-span-3">User</div>
            <div className="col-span-3">Venue</div>
            <div className="col-span-3">Drink/Message</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1">Status</div>
          </div>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-primary-400">
              No {activeFilter} transactions yet
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment._id} className="grid grid-cols-12 gap-2 p-3 border-b border-primary-500/10 text-sm text-primary-400">
                <div className="col-span-3 flex items-center space-x-2">
                  <div className="w-6 h-6 border-2 border-primary-500 rounded-full"></div>
                  <span>
                    {activeFilter === 'sent' 
                      ? (payment.recipient?.firstName || payment.recipient?.phone || 'Recipient')
                      : (payment.sender?.firstName || payment.sender?.phone || 'Sender')
                    }
                  </span>
                </div>
                <div className="col-span-3 text-primary-400">{payment.venue?.name || 'Any Venue'}</div>
                <div className="col-span-3 text-primary-400">"{payment.message || 'Cheers!'}"</div>
                <div className={`col-span-2 font-semibold ${
                  activeFilter === 'sent' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {activeFilter === 'sent' ? '-' : '+'}${payment.amount.toFixed(2)}
                </div>
                <div className="col-span-1 text-primary-400 capitalize text-xs">{payment.status}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

