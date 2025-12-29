'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Banknote, Clock, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react'
import { getApiUrl } from '../utils/api'

interface Payout {
  _id: string
  amount: number
  status: string
  arrivalDate?: string
  createdAt: string
  stripePayoutId?: string
}

export default function PayoutsHistory() {
  const { token } = useAuth()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchPayouts()
    }
  }, [token])

  const fetchPayouts = async () => {
    if (!token) return

    setLoading(true)
    const apiUrl = getApiUrl()
    
    try {
      const response = await axios.get(`${apiUrl}/venue-payouts/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPayouts(response.data.payouts || [])
    } catch (error) {
      console.error('Failed to fetch payouts:', error)
      // If endpoint doesn't exist, try to get from earnings
      try {
        const earningsResponse = await axios.get(`${apiUrl}/venue-payouts/earnings`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setPayouts(earningsResponse.data.payouts || [])
      } catch (e) {
        console.error('Failed to fetch payouts from earnings:', e)
        // Set empty array if both fail
        setPayouts([])
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'succeeded':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-primary-500/20 text-primary-400 border-primary-500/30'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary-500">Payout History</h2>
        <button
          onClick={fetchPayouts}
          className="text-xs text-primary-500/70 hover:text-primary-500 transition-colors"
        >
          Refresh
        </button>
      </div>

      {payouts.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-lg border border-primary-500/10">
          <Banknote className="w-12 h-12 text-primary-500/50 mx-auto mb-3" />
          <p className="text-primary-400 text-sm">No payouts yet</p>
          <p className="text-primary-400/70 text-xs mt-1">Payout history will appear here once you request payouts</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {payouts.map((payout) => (
            <div
              key={payout._id}
              className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/40 hover:bg-black/60 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <Banknote className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-500">Payout</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3 text-primary-400/70" />
                      <p className="text-xs text-primary-400/70">
                        {new Date(payout.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {payout.arrivalDate && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="w-3 h-3 text-primary-400/70" />
                        <p className="text-xs text-primary-400/70">
                          Arrives: {new Date(payout.arrivalDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-500">${payout.amount?.toFixed(2) || '0.00'}</p>
                  <div className={`flex items-center space-x-1 mt-1 px-2 py-1 rounded border text-xs ${getStatusColor(payout.status)}`}>
                    {getStatusIcon(payout.status)}
                    <span className="capitalize">{payout.status || 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

