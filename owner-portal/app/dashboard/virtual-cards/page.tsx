'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import { CreditCard, Download, Loader, DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function VirtualCardsPage() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [stats, setStats] = useState<any>(null)
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchCards()
    }
  }, [token])

  const fetchCards = async () => {
    if (!token) return
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/owner/virtual-cards`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(response.data.stats)
      setCards(response.data.cards || [])
    } catch (error) {
      console.error('Failed to fetch virtual cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['User', 'Last 4', 'Status', 'Balance', 'Expiration', 'Created']
    const rows = cards.map(c => [
      c.userId?.email || c.userId?.firstName || 'N/A',
      c.last4 || 'N/A',
      c.status || 'N/A',
      `$${parseFloat(c.balance || '0').toFixed(2)}`,
      c.expirationMonth && c.expirationYear ? `${c.expirationMonth}/${c.expirationYear}` : 'N/A',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `virtual-cards-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500">Virtual Cards</h1>
            <p className="text-primary-400/70 mt-1">Virtual card statistics and management</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-500 hover:bg-primary-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-400/70 text-sm">Total Cards</p>
                  <p className="text-2xl font-bold text-primary-500">{stats.total}</p>
                </div>
                <CreditCard className="w-8 h-8 text-primary-500/50" />
              </div>
            </div>
            <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-400/70 text-sm">Active Cards</p>
                  <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400/50" />
              </div>
            </div>
            <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-400/70 text-sm">Total Balance</p>
                  <p className="text-2xl font-bold text-blue-400">${parseFloat(stats.totalBalance || '0').toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400/50" />
              </div>
            </div>
            <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-400/70 text-sm">Average Balance</p>
                  <p className="text-2xl font-bold text-purple-400">${parseFloat(stats.averageBalance || '0').toFixed(2)}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-purple-400/50" />
              </div>
            </div>
          </div>
        )}

        {/* Cards Table */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg overflow-hidden">
          {cards.length === 0 ? (
            <div className="text-center py-20 text-primary-400/60">
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No virtual cards found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-500/10 border-b border-primary-500/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Card Number</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Expiration</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-500/10">
                  {cards.map((card) => (
                    <tr key={card._id} className="hover:bg-primary-500/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-primary-400">
                        {card.userId?.email || card.userId?.firstName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-primary-500">
                        •••• •••• •••• {card.last4 || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          card.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          card.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {card.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">
                        ${parseFloat(card.balance || '0').toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-400">
                        {card.expirationMonth && card.expirationYear 
                          ? `${card.expirationMonth}/${card.expirationYear}` 
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-400">
                        {card.createdAt ? new Date(card.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

