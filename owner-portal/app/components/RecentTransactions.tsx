'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import Link from 'next/link'
import { ArrowRight, Loader, DollarSign } from 'lucide-react'

export default function RecentTransactions() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchTransactions()
    }
  }, [token])

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_URL}/owner/transactions?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTransactions(response.data.transactions || [])
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-primary-500">Recent Transactions</h3>
          <p className="text-primary-400/70 text-sm mt-1">Latest activity</p>
        </div>
        <Link
          href="/dashboard/transactions"
          className="text-primary-500 hover:text-primary-400 text-sm font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-primary-400/60">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx._id}
              className="flex items-center justify-between p-3 bg-primary-500/5 border border-primary-500/10 rounded-lg hover:border-primary-500/30 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-primary-500 font-semibold text-sm truncate">
                    {tx.venueId?.name || tx.venue?.name || 'Any Venue'}
                  </p>
                  {tx.type === 'tap_and_pay' && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                      Tap & Pay
                    </span>
                  )}
                </div>
                <p className="text-primary-400/70 text-xs truncate">
                  {tx.sender?.firstName || tx.sender?.email || 'User'} → {tx.recipient?.firstName || tx.recipient?.email || 'Recipient'}
                </p>
                <p className="text-primary-400/50 text-xs mt-1">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-primary-500 font-bold">
                  ${(tx.amount || 0).toFixed(2)}
                </p>
                {tx.commission && (
                  <p className="text-primary-400/60 text-xs">
                    Fee: ${parseFloat(tx.commission).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

