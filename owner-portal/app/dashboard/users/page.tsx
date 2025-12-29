'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import { Users, Search, Download, Loader, DollarSign, TrendingUp, Calendar } from 'lucide-react'

export default function UsersPage() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })

  useEffect(() => {
    if (token) {
      fetchUsers()
    }
  }, [token, pagination.page, sortBy])

  const fetchUsers = async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy
      })
      
      const response = await axios.get(`${API_URL}/owner/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data.users || [])
      setPagination(response.data.pagination || pagination)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.email?.toLowerCase().includes(query) ||
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query)
    )
  })

  const totalBalance = users.reduce((sum, u) => sum + parseFloat(u.walletBalance || '0'), 0)
  const avgBalance = users.length > 0 ? totalBalance / users.length : 0

  const exportToCSV = () => {
    const headers = ['Email', 'Name', 'Phone', 'Wallet Balance', 'Created At', 'Last Active']
    const rows = filteredUsers.map(u => [
      u.email || 'N/A',
      `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'N/A',
      u.phone || 'N/A',
      `$${parseFloat(u.walletBalance || '0').toFixed(2)}`,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
      u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'N/A'
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500">Users</h1>
            <p className="text-primary-400/70 mt-1">User analytics and management</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-400/70 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-primary-500">{pagination.total.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-primary-500/50" />
            </div>
          </div>
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-400/70 text-sm">Total Wallet Balance</p>
                <p className="text-2xl font-bold text-green-400">${totalBalance.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400/50" />
            </div>
          </div>
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-400/70 text-sm">Average Balance</p>
                <p className="text-2xl font-bold text-blue-400">${avgBalance.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-400/70 text-sm">Showing</p>
                <p className="text-2xl font-bold text-purple-400">{filteredUsers.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-400/50" />
            </div>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, name, or phone..."
                className="w-full pl-10 pr-4 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
            >
              <option value="createdAt">Newest First</option>
              <option value="-createdAt">Oldest First</option>
              <option value="walletBalance">Highest Balance</option>
              <option value="-walletBalance">Lowest Balance</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-primary-400/60">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-500/10 border-b border-primary-500/20">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Wallet Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-500/10">
                    {filteredUsers.map((user) => (
                      <tr key={user._id || user.id} className="hover:bg-primary-500/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-primary-400">{user.email || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-primary-500">
                          {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-400">{user.phone || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-400">
                          ${parseFloat(user.walletBalance || '0').toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-400">
                          {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

