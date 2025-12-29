'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import { Search, Filter, Download, Loader, DollarSign } from 'lucide-react'

export default function TransactionsPage() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })

  useEffect(() => {
    if (token) {
      fetchTransactions()
    }
  }, [token, filters, pagination.page])

  const fetchTransactions = async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })
      
      const response = await axios.get(`${API_URL}/owner/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTransactions(response.data.transactions || [])
      setPagination(response.data.pagination || pagination)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Commission', 'Venue Receives', 'Sender', 'Recipient', 'Status']
    const rows = transactions.map(tx => [
      new Date(tx.createdAt).toLocaleString(),
      tx.type || 'N/A',
      `$${(tx.amount || 0).toFixed(2)}`,
      `$${(parseFloat(tx.commission || '0')).toFixed(2)}`,
      `$${(tx.venueReceives || tx.amount || 0).toFixed(2)}`,
      tx.sender?.email || 'N/A',
      tx.recipient?.email || 'N/A',
      tx.status || 'N/A'
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500">Transactions</h1>
            <p className="text-primary-400/70 mt-1">Monitor all platform transactions</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-500 hover:bg-primary-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-primary-400 text-sm mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
              >
                <option value="">All Types</option>
                <option value="tap_and_pay">Tap & Pay</option>
                <option value="shot_sent">Shot Sent</option>
                <option value="shot_redeemed">Shot Redeemed</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-primary-400 text-sm mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
              >
                <option value="">All Status</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-primary-400 text-sm mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
              />
            </div>
            <div>
              <label className="block text-primary-400 text-sm mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
              />
            </div>
            <div>
              <label className="block text-primary-400 text-sm mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20 text-primary-400/60">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-500/10 border-b border-primary-500/20">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Commission</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Venue Receives</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Venue</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-500/10">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-primary-500/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-primary-400">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            tx.type === 'tap_and_pay' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-primary-500/20 text-primary-400'
                          }`}>
                            {tx.type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-primary-500">
                          ${(tx.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-400">
                          ${(parseFloat(tx.commission || '0')).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-green-400">
                          ${(tx.venueReceives || tx.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-400">
                          {tx.venueId?.name || tx.venue?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            tx.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                            tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {tx.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-primary-500/20 flex items-center justify-between">
                  <p className="text-primary-400 text-sm">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-500/20"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-500/20"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

