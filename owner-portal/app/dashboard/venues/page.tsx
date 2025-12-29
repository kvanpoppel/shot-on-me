'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import { Building2, Search, Download, Loader, DollarSign, TrendingUp, CheckCircle, XCircle } from 'lucide-react'

export default function VenuesPage() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (token) {
      fetchVenues()
    }
  }, [token])

  const fetchVenues = async () => {
    if (!token) return
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/owner/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setVenues(response.data.venues || [])
    } catch (error) {
      console.error('Failed to fetch venues:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVenues = venues.filter(venue => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const addressStr = venue.address?.street 
      ? `${venue.address.street} ${venue.address.city || ''} ${venue.address.state || ''}`.toLowerCase()
      : (typeof venue.address === 'string' ? venue.address.toLowerCase() : '')
    return (
      venue.name?.toLowerCase().includes(query) ||
      venue.owner?.email?.toLowerCase().includes(query) ||
      addressStr.includes(query)
    )
  })

  const totalRevenue = venues.reduce((sum, v) => sum + parseFloat(v.revenue || '0'), 0)
  const totalTransactions = venues.reduce((sum, v) => sum + (v.transactionCount || 0), 0)
  const venuesWithStripe = venues.filter(v => v.hasStripe).length

  const exportToCSV = () => {
    const headers = ['Name', 'Owner Email', 'Address', 'Revenue', 'Transactions', 'Active Promotions', 'Stripe Connected']
    const rows = filteredVenues.map(v => {
      const addressStr = v.address?.street 
        ? `${v.address.street}${v.address.city ? `, ${v.address.city}` : ''}${v.address.state ? `, ${v.address.state}` : ''}`
        : (typeof v.address === 'string' ? v.address : 'N/A')
      return [
        v.name || 'N/A',
        v.owner?.email || 'N/A',
        addressStr,
        `$${parseFloat(v.revenue || '0').toFixed(2)}`,
        v.transactionCount || 0,
        v.activePromotions || 0,
        v.hasStripe ? 'Yes' : 'No'
      ]
    })
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `venues-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500">Venues</h1>
            <p className="text-primary-400/70 mt-1">Venue performance and analytics</p>
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
                <p className="text-primary-400/70 text-sm">Total Venues</p>
                <p className="text-2xl font-bold text-primary-500">{venues.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-primary-500/50" />
            </div>
          </div>
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-400/70 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400/50" />
            </div>
          </div>
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-400/70 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-400">{totalTransactions.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-400/70 text-sm">Stripe Connected</p>
                <p className="text-2xl font-bold text-purple-400">{venuesWithStripe}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-400/50" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, owner email, or address..."
              className="w-full pl-10 pr-4 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500"
            />
          </div>
        </div>

        {/* Venues Table */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-20 text-primary-400/60">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No venues found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-500/10 border-b border-primary-500/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Venue Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Promotions</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-500/10">
                  {filteredVenues.map((venue) => (
                    <tr key={venue._id} className="hover:bg-primary-500/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-primary-500">{venue.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-primary-400">{venue.owner?.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-primary-400">
                        {venue.address?.street 
                          ? `${venue.address.street}${venue.address.city ? `, ${venue.address.city}` : ''}${venue.address.state ? `, ${venue.address.state}` : ''}`
                          : venue.address && typeof venue.address === 'string'
                          ? venue.address
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">
                        ${parseFloat(venue.revenue || '0').toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-400">{venue.transactionCount || 0}</td>
                      <td className="px-6 py-4 text-sm text-primary-400">{venue.activePromotions || 0}</td>
                      <td className="px-6 py-4">
                        {venue.hasStripe ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            Not Connected
                          </span>
                        )}
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

