'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import CollapsibleSection from '../../components/CollapsibleSection'
import AIAnalyticsSummary from '../../components/AIAnalyticsSummary'
import CheckInsHistory from '../../components/CheckInsHistory'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { Sparkles, RefreshCcw, Search, Users } from 'lucide-react'

export default function RedemptionsPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [loadingRedemptions, setLoadingRedemptions] = useState(true)
  const [followerCount, setFollowerCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'processing' | 'other'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState<'checkins' | 'payments'>('checkins')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) {
      fetchRedemptions()
    }
  }, [token, user])

  const fetchRedemptions = async () => {
    if (!token) return
    setLoadingRedemptions(true)
    try {
      // Get venue ID first
      const apiUrl = getApiUrl()
      const venuesResponse = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle both response formats: { venues: [...] } or direct array
      let venues: any[] = []
      if (Array.isArray(venuesResponse.data)) {
        venues = venuesResponse.data
      } else if (venuesResponse.data?.venues) {
        venues = venuesResponse.data.venues
      }
      
      // Improved venue matching: handle both populated owner object and owner ID string
      const myVenue = venues.find((v: any) => {
        if (!user) return false
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        const userId = user.id?.toString()
        return ownerId === userId
      })
      
      if (!myVenue) {
        setRedemptions([])
        return
      }

      setFollowerCount(Number(myVenue.followerCount) || 0)

      // Get payments redeemed at this venue (type: shot_redeemed or transfer, with venueId)
      const response = await axios.get(`${apiUrl}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const allPayments = response.data.payments || []
      const venueRedemptions = allPayments.filter((p: any) => 
        (p.venueId?.toString() === myVenue._id.toString() || 
         p.venue?._id?.toString() === myVenue._id.toString() ||
         p.venue?.toString() === myVenue._id.toString()) &&
        (p.type === 'shot_redeemed' || p.type === 'transfer' || p.type === 'tap_and_pay')
      )
      
      setRedemptions(venueRedemptions)
    } catch (error: any) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development') {
        console.debug('Failed to fetch redemptions:', error.message || error)
      }
    } finally {
      setLoadingRedemptions(false)
    }
  }

  const stats = useMemo(() => {
    const totalAmount = redemptions.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    const today = new Date()
    const todayCount = redemptions.filter((r) => {
      const date = new Date(r.createdAt || r.updatedAt || Date.now())
      return date.toDateString() === today.toDateString()
    }).length
    const avgAmount = redemptions.length > 0 ? totalAmount / redemptions.length : 0
    return {
      totalAmount,
      todayCount,
      avgAmount
    }
  }, [redemptions])

  const filteredRedemptions = useMemo(() => {
    return redemptions.filter((redemption) => {
      const status = redemption.status || ''
      const statusMatches =
        statusFilter === 'all' ||
        (statusFilter === 'other' && status !== 'succeeded' && status !== 'processing') ||
        status === statusFilter

      const customerName = redemption.senderId?.firstName && redemption.senderId?.lastName
        ? `${redemption.senderId.firstName} ${redemption.senderId.lastName}`
        : redemption.senderId?.name || 'Customer'
      const searchMatches =
        !searchTerm ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase())

      return statusMatches && searchMatches
    })
  }, [redemptions, statusFilter, searchTerm])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <DashboardPageShell
        icon={<Users className="w-5 h-5 text-primary-500" />}
        title="Guests"
        subtitle="Track followers, monitor check-ins, and review payment activity."
        actions={(
          <div className="inline-flex rounded-lg border border-primary-500/25 bg-black/40 p-1">
            <button
              onClick={() => setActiveSection('checkins')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeSection === 'checkins'
                  ? 'bg-primary-500 text-black'
                  : 'text-primary-400 hover:text-primary-500'
              }`}
            >
              Check-ins
            </button>
            <button
              onClick={() => setActiveSection('payments')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeSection === 'payments'
                  ? 'bg-primary-500 text-black'
                  : 'text-primary-400 hover:text-primary-500'
              }`}
            >
              Payments
            </button>
          </div>
        )}
        metrics={[
          { label: 'Followers', value: `${followerCount}`, detail: 'Current audience following your venue.' },
          { label: 'Payments Today', value: `${stats.todayCount}`, detail: 'Completed events for today.' },
          { label: 'Total Processed', value: `$${stats.totalAmount.toFixed(2)}`, detail: `Avg ticket $${stats.avgAmount.toFixed(2)}` }
        ]}
      >
        {activeSection === 'checkins' ? (
          <div className="bg-black/40 border border-primary-500/20 rounded-xl p-4 md:p-6 overflow-x-hidden">
            <CheckInsHistory />
          </div>
        ) : null}

        {/* AI Insights - Redemption Patterns */}
        <CollapsibleSection
          title="AI Activity Insights"
          subtitle="AI-powered analysis of follower and check-in behavior"
          defaultOpen={false}
          icon={<Sparkles className="w-4 h-4" />}
        >
          <div className="pt-2">
            <AIAnalyticsSummary />
          </div>
        </CollapsibleSection>

        {activeSection === 'payments' ? (
        <div className="bg-black/40 border border-primary-500/20 rounded-xl p-4 md:p-6 overflow-x-hidden">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-primary-500">Payment Activity History</h2>
              <p className="text-xs text-primary-500/70 mt-1">
                {filteredRedemptions.length} shown of {redemptions.length} total payment events
              </p>
            </div>
            <button
              onClick={fetchRedemptions}
              className="text-xs text-primary-500/70 hover:text-primary-500 transition-colors px-3 py-1.5 bg-black/40 rounded-lg hover:bg-black/60"
            >
              <span className="inline-flex items-center gap-1">
                <RefreshCcw className="h-3 w-3" />
                Refresh
              </span>
            </button>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary-500/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer"
                className="w-full rounded-lg border border-primary-500/25 bg-black/50 py-2 pl-8 pr-3 text-xs text-primary-400 placeholder-primary-500/45 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-primary-500/25 bg-black/50 px-3 py-2 text-xs text-primary-400 focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="processing">Processing</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {loadingRedemptions ? (
              <div className="text-center py-12 text-primary-400 text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-3"></div>
                Loading redemptions...
              </div>
            ) : filteredRedemptions.length === 0 ? (
              <div className="text-center py-12 bg-black/20 rounded-lg border border-primary-500/10">
                <span className="text-4xl mb-3 block">💳</span>
                <p className="text-primary-400 text-sm font-medium">No payment activity yet</p>
                <p className="text-primary-400/70 text-xs mt-1">Events will appear here as guests complete transactions</p>
              </div>
            ) : (
              filteredRedemptions.map((redemption, idx) => (
                <div 
                  key={redemption._id || idx} 
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/40 hover:bg-black/60 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-500 font-semibold text-xs md:text-sm">
                            {redemption.senderId?.firstName?.charAt(0) || 'C'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary-500 truncate">
                            {redemption.senderId?.firstName && redemption.senderId?.lastName
                              ? `${redemption.senderId.firstName} ${redemption.senderId.lastName}`
                              : redemption.senderId?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-primary-400/70">
                            {new Date(redemption.createdAt || redemption.updatedAt || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                          redemption.type === 'tap_and_pay' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        }`}>
                          {redemption.type === 'tap_and_pay' ? 'Tap & Pay' : 
                           redemption.type === 'shot_redeemed' ? 'Shot Redeemed' : 
                           redemption.type === 'transfer' ? 'Transfer' : 
                           redemption.type || 'Payment'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right sm:text-right ml-0 sm:ml-4 flex-shrink-0">
                      <p className="text-lg md:text-xl font-bold text-primary-500 mb-1">${redemption.amount?.toFixed(2) || '0.00'}</p>
                      {redemption.metadata?.venueReceives && (
                        <p className="text-xs text-primary-400/80 mb-2">
                          Net: ${parseFloat(redemption.metadata.venueReceives).toFixed(2)}
                        </p>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                        redemption.status === 'succeeded' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        redemption.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {redemption.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        ) : null}
      </DashboardPageShell>
    </DashboardLayout>
  )
}
