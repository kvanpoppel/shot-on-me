'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import StatsCard from '../components/StatsCard'
import RevenueChart from '../components/RevenueChart'
import RecentTransactions from '../components/RecentTransactions'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Loader, TrendingUp, Users, Building2, CreditCard, DollarSign, Activity } from 'lucide-react'

export default function Dashboard() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const API_URL = useApiUrl()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchDashboardData()
      // Refresh every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  const fetchDashboardData = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-primary-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  const { overview, financial, transactions } = dashboardData || {}

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500">Owner Dashboard</h1>
            <p className="text-primary-400/70 mt-1">Platform overview and analytics</p>
          </div>
          <div className="text-right">
            <p className="text-primary-400 text-sm">Last updated</p>
            <p className="text-primary-500 font-semibold">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Revenue"
            value={`$${parseFloat(financial?.totalRevenue || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            trend={financial?.monthRevenue ? `$${parseFloat(financial.monthRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month` : undefined}
            color="text-green-400"
          />
          <StatsCard
            title="Total Commissions"
            value={`$${parseFloat(financial?.totalCommissions || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            trend={financial?.monthCommissions ? `$${parseFloat(financial.monthCommissions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month` : undefined}
            color="text-primary-500"
          />
          <StatsCard
            title="Platform Float"
            value={`$${parseFloat(financial?.platformFloat || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={CreditCard}
            subtitle="Funds in user wallets"
            color="text-blue-400"
          />
          <StatsCard
            title="Today's Revenue"
            value={`$${parseFloat(financial?.todayRevenue || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Activity}
            trend={financial?.todayCommissions ? `$${parseFloat(financial.todayCommissions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} commissions` : undefined}
            color="text-yellow-400"
          />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={overview?.totalUsers?.toLocaleString() || '0'}
            icon={Users}
            subtitle={`${overview?.activeUsers || 0} active`}
            color="text-purple-400"
            href="/dashboard/users"
          />
          <StatsCard
            title="Total Venues"
            value={overview?.totalVenues?.toLocaleString() || '0'}
            icon={Building2}
            subtitle={`${overview?.activeVenues || 0} active`}
            color="text-orange-400"
            href="/dashboard/venues"
          />
          <StatsCard
            title="Virtual Cards"
            value={overview?.totalCards?.toLocaleString() || '0'}
            icon={CreditCard}
            subtitle={`${overview?.activeCards || 0} active`}
            color="text-cyan-400"
            href="/dashboard/virtual-cards"
          />
          <StatsCard
            title="Transactions"
            value={transactions?.total?.toLocaleString() || '0'}
            icon={Activity}
            subtitle={`${transactions?.today || 0} today`}
            color="text-pink-400"
            href="/dashboard/transactions"
          />
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart />
          <RecentTransactions />
        </div>
      </div>
    </DashboardLayout>
  )
}

