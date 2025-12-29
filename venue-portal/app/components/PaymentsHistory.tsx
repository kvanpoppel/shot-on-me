'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { DollarSign, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getApiUrl } from '../utils/api'

interface Payment {
  _id: string
  amount: number
  type: string
  status: string
  createdAt: string
  senderId?: {
    name?: string
    email?: string
  }
  recipientId?: {
    name?: string
    email?: string
  }
  metadata?: any
}

export default function PaymentsHistory() {
  const { token } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [venueId, setVenueId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchVenueId()
    }
  }, [token])

  useEffect(() => {
    if (venueId && token) {
      fetchPayments()
    }
  }, [venueId, token])

  const fetchVenueId = async () => {
    if (!token) return
    
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const venueId = Array.isArray(response.data) 
        ? response.data[0]?._id 
        : response.data?.venues?.[0]?._id
      
      setVenueId(venueId)
    } catch (error) {
      console.error('Error fetching venue:', error)
    }
  }

  const fetchPayments = async () => {
    if (!venueId || !token) return

    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const allPayments = response.data.payments || []
      const venuePayments = allPayments.filter((p: any) => 
        p.venueId?.toString() === venueId || 
        p.venue?._id?.toString() === venueId ||
        p.venue?.toString() === venueId
      )
      
      setPayments(venuePayments.slice(0, 100)) // Limit to 100 most recent
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'processing':
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
        <h2 className="text-lg font-semibold text-primary-500">Payment History</h2>
        <button
          onClick={fetchPayments}
          className="text-xs text-primary-500/70 hover:text-primary-500 transition-colors"
        >
          Refresh
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-lg border border-primary-500/10">
          <DollarSign className="w-12 h-12 text-primary-500/50 mx-auto mb-3" />
          <p className="text-primary-400 text-sm">No payments yet</p>
          <p className="text-primary-400/70 text-xs mt-1">Payment history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {payments.map((payment) => (
            <div
              key={payment._id}
              className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/40 hover:bg-black/60 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-500">
                      {payment.type === 'shot_redeemed' ? 'Shot Redeemed' :
                       payment.type === 'tap_and_pay' ? 'Tap & Pay' :
                       payment.type === 'transfer' ? 'Transfer' :
                       payment.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Payment'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3 text-primary-400/70" />
                      <p className="text-xs text-primary-400/70">
                        {new Date(payment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {payment.senderId?.name && (
                      <p className="text-xs text-primary-400/60 mt-1">
                        From: {payment.senderId.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-500">${payment.amount?.toFixed(2) || '0.00'}</p>
                  <div className={`flex items-center space-x-1 mt-1 px-2 py-1 rounded border text-xs ${getStatusColor(payment.status)}`}>
                    {getStatusIcon(payment.status)}
                    <span className="capitalize">{payment.status}</span>
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

