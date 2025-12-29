'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { DollarSign, TrendingUp, Clock, CheckCircle, ArrowDown, Loader } from 'lucide-react'
import { getApiUrl } from '../utils/api'
import { StatsSkeleton } from './LoadingSkeleton'

interface EarningsData {
  connected: boolean
  venue: {
    id: string
    name: string
  }
  earnings: {
    total: number
    available: number
    pending: number
    period: {
      start: string
      end: string
    }
  }
  recentPayments: Array<{
    id: string
    amount: number
    createdAt: string
  }>
  payouts: Array<{
    id: string
    amount: number
    status: string
    arrivalDate: string
    createdAt: string
  }>
}

export default function EarningsDashboard() {
  const { token } = useAuth()
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [requestingPayout, setRequestingPayout] = useState(false)

  useEffect(() => {
    if (token) {
      fetchEarnings()
    }
  }, [token])

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venue-payouts/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      setRequestingPayout(true)
      await axios.post(
        `${getApiUrl()}/venue-payouts/request-payout`,
        { amount: parseFloat(payoutAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Payout requested successfully!')
      setPayoutAmount('')
      await fetchEarnings()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to request payout')
    } finally {
      setRequestingPayout(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Earnings Summary Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsSkeleton />
          <StatsSkeleton />
          <StatsSkeleton />
        </div>
        {/* Recent Payments Skeleton */}
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
          <div className="h-6 bg-primary-500/20 rounded w-1/3 mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-primary-500/10 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-primary-400">
        <p>Unable to load earnings data</p>
      </div>
    )
  }

  if (!data.connected) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-16 h-16 mx-auto mb-4 text-primary-500/50" />
        <h3 className="text-xl font-semibold text-primary-500 mb-2">Connect Stripe to Receive Payments</h3>
        <p className="text-primary-400 mb-6">
          Connect your Stripe account to start receiving payments from customers
        </p>
        <a
          href="/dashboard/settings"
          className="inline-block px-6 py-3 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-400 transition-all"
        >
          Connect Stripe Account
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary-400 text-sm">Total Earnings</span>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-3xl font-bold text-primary-500">
            ${data.earnings.total.toFixed(2)}
          </p>
          <p className="text-xs text-primary-400 mt-1">Last 30 days</p>
        </div>

        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary-400 text-sm">Available</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-500">
            ${data.earnings.available.toFixed(2)}
          </p>
          <p className="text-xs text-primary-400 mt-1">Ready for payout</p>
        </div>

        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary-400 text-sm">Pending</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-500">
            ${data.earnings.pending.toFixed(2)}
          </p>
          <p className="text-xs text-primary-400 mt-1">Processing</p>
        </div>
      </div>

      {/* Request Payout */}
      {data.earnings.available > 0 && (
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary-500 mb-4">Request Payout</h3>
          <div className="flex gap-3">
            <input
              type="number"
              min="1"
              max={data.earnings.available}
              step="0.01"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder={`Max: $${data.earnings.available.toFixed(2)}`}
              className="flex-1 px-4 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleRequestPayout}
              disabled={requestingPayout || !payoutAmount || parseFloat(payoutAmount) <= 0}
              className="px-6 py-2 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {requestingPayout ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" />
                  <span>Request Payout</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-primary-400 mt-2">
            Payouts typically arrive in 2-7 business days
          </p>
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary-500">Recent Payments</h3>
          {data.recentPayments.length > 0 && (
            <button
              onClick={() => {
                // Navigate to full payment history
                window.location.href = '/dashboard/analytics?tab=payments'
              }}
              className="text-xs text-primary-500 hover:text-primary-400 transition-colors underline"
            >
              View All
            </button>
          )}
        </div>
        {data.recentPayments.length === 0 ? (
          <div className="text-center py-8 text-primary-400">
            <p>No payments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentPayments.map(payment => (
              <div
                key={payment.id}
                onClick={() => {
                  // Show payment details
                  console.log('Payment details:', payment)
                }}
                className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-primary-500/10 hover:bg-black/60 hover:border-primary-500/30 cursor-pointer transition-all group"
              >
                <div>
                  <p className="font-medium text-primary-500">${payment.amount.toFixed(2)}</p>
                  <p className="text-xs text-primary-400">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-black/40 border border-primary-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary-500">Payout History</h3>
          {data.payouts.length > 0 && (
            <button
              onClick={() => {
                // Navigate to full payout history
                window.location.href = '/dashboard/analytics?tab=payouts'
              }}
              className="text-xs text-primary-500 hover:text-primary-400 transition-colors underline"
            >
              View All
            </button>
          )}
        </div>
        {data.payouts.length === 0 ? (
          <div className="text-center py-8 text-primary-400">
            <p>No payouts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.payouts.map(payout => (
              <div
                key={payout.id}
                onClick={() => {
                  // Show payout details
                  console.log('Payout details:', payout)
                }}
                className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-primary-500/10 hover:bg-black/60 hover:border-primary-500/30 cursor-pointer transition-all group"
              >
                <div>
                  <p className="font-medium text-primary-500">${payout.amount.toFixed(2)}</p>
                  <p className="text-xs text-primary-400">
                    Arrives: {new Date(payout.arrivalDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${
                    payout.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                    payout.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {payout.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

