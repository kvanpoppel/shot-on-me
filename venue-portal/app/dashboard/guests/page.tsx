'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useVenue } from '../../contexts/VenueContext'
import DashboardLayout from '../../components/DashboardLayout'
import LiveActivityDashboard from '../../components/LiveActivityDashboard'
import CheckInsHistory from '../../components/CheckInsHistory'
import AIAnalyticsSummary from '../../components/AIAnalyticsSummary'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { Users, Sparkles, RefreshCcw, Search, Activity, ClipboardList } from 'lucide-react'

type Tab = 'live' | 'checkins' | 'insights'

export default function GuestsPage() {
  const { user, loading, token } = useAuth()
  const { followerCount } = useVenue()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('live')
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [loadingRedemptions, setLoadingRedemptions] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'processing' | 'other'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) fetchRedemptions()
  }, [token, user])

  const fetchRedemptions = async () => {
    if (!token) return
    setLoadingRedemptions(true)
    try {
      const apiUrl = getApiUrl()
      const venuesResponse = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      let venues: any[] = Array.isArray(venuesResponse.data)
        ? venuesResponse.data
        : venuesResponse.data?.venues || []

      const myVenue = venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        return ownerId === user?.id?.toString()
      })
      if (!myVenue) { setRedemptions([]); return }

      const response = await axios.get(`${apiUrl}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const all = response.data.payments || []
      const venueOnes = all.filter((p: any) =>
        (p.venueId?.toString() === myVenue._id.toString() ||
          p.venue?._id?.toString() === myVenue._id.toString() ||
          p.venue?.toString() === myVenue._id.toString()) &&
        (p.type === 'shot_redeemed' || p.type === 'transfer' || p.type === 'tap_and_pay')
      )
      setRedemptions(venueOnes)
    } catch {
      // silent
    } finally {
      setLoadingRedemptions(false)
    }
  }

  const stats = useMemo(() => {
    const totalAmount = redemptions.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    const today = new Date()
    const todayCount = redemptions.filter(r =>
      new Date(r.createdAt || Date.now()).toDateString() === today.toDateString()
    ).length
    return { totalAmount, todayCount, avgAmount: redemptions.length > 0 ? totalAmount / redemptions.length : 0 }
  }, [redemptions])

  const filtered = useMemo(() => redemptions.filter(r => {
    const status = r.status || ''
    const statusOk = statusFilter === 'all' ||
      (statusFilter === 'other' && status !== 'succeeded' && status !== 'processing') ||
      status === statusFilter
    const name = r.senderId?.firstName && r.senderId?.lastName
      ? `${r.senderId.firstName} ${r.senderId.lastName}`
      : r.senderId?.name || ''
    return statusOk && (!searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()))
  }), [redemptions, statusFilter, searchTerm])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  )
  if (!user) return null

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'live',     label: 'Live',      icon: Activity },
    { id: 'checkins', label: 'Check-ins', icon: ClipboardList },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" /> Guests
          </h1>
          <p className="text-xs text-primary-400/50 mt-0.5">Live activity, check-in history, and AI insights for your audience.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Followers',      value: `${followerCount}`,            sub: 'following your venue' },
            { label: 'Payments Today', value: `${stats.todayCount}`,         sub: 'completed today' },
            { label: 'Total Processed', value: `$${stats.totalAmount.toFixed(2)}`, sub: `avg $${stats.avgAmount.toFixed(2)}` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl border border-primary-500/15 bg-black/40 p-3">
              <p className="text-[11px] text-primary-400/50 font-medium">{label}</p>
              <p className="text-xl font-bold text-primary-500 mt-0.5">{value}</p>
              <p className="text-[10px] text-primary-400/30 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/5 bg-black/40 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === id
                  ? 'bg-primary-500 text-black shadow'
                  : 'text-primary-400/60 hover:text-primary-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'live' && (
          <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
            <LiveActivityDashboard />
          </div>
        )}

        {activeTab === 'checkins' && (
          <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
            <CheckInsHistory />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
              <AIAnalyticsSummary />
            </div>

            {/* Payment activity inside insights */}
            <div className="rounded-xl border border-primary-500/20 bg-black/40 p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-primary-500">Payment Activity</h2>
                  <p className="text-[11px] text-primary-400/50 mt-0.5">{filtered.length} of {redemptions.length} events</p>
                </div>
                <button
                  onClick={fetchRedemptions}
                  className="inline-flex items-center gap-1 text-xs text-primary-400/60 hover:text-primary-400 transition-colors px-2.5 py-1.5 rounded-lg border border-primary-500/20 hover:border-primary-500/40"
                >
                  <RefreshCcw className="h-3 w-3" /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <div className="sm:col-span-2 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary-500/50" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search customer"
                    className="w-full rounded-lg border border-primary-500/20 bg-black/50 py-2 pl-8 pr-3 text-xs text-primary-400 placeholder-primary-500/35 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-lg border border-primary-500/20 bg-black/50 px-3 py-2 text-xs text-primary-400 focus:border-primary-500 focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="processing">Processing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {loadingRedemptions ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-500 mx-auto mb-2" />
                    <p className="text-xs text-primary-400/50">Loading...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 rounded-lg border border-primary-500/10">
                    <p className="text-2xl mb-2">💳</p>
                    <p className="text-xs text-primary-400/60 font-medium">No payment activity yet</p>
                  </div>
                ) : filtered.map((r, idx) => (
                  <div key={r._id || idx} className="rounded-lg border border-primary-500/15 bg-black/40 p-3 hover:border-primary-500/30 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-primary-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-500 font-semibold text-xs">{r.senderId?.firstName?.charAt(0) || 'C'}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary-400 truncate">
                            {r.senderId?.firstName && r.senderId?.lastName
                              ? `${r.senderId.firstName} ${r.senderId.lastName}`
                              : r.senderId?.name || 'Customer'}
                          </p>
                          <p className="text-[10px] text-primary-400/40">
                            {new Date(r.createdAt || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary-500">${r.amount?.toFixed(2) || '0.00'}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          r.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-400' :
                          r.status === 'processing' ? 'bg-yellow-500/15 text-yellow-400' :
                          'bg-gray-500/15 text-gray-400'
                        }`}>{r.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
