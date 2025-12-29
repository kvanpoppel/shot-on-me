'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import { BarChart3, TrendingUp, Loader } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchTrends()
    }
  }, [token])

  const fetchTrends = async () => {
    try {
      const response = await axios.get(`${API_URL}/owner/revenue-trends?period=30`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTrends(response.data.trends || [])
    } catch (error) {
      console.error('Failed to fetch trends:', error)
    } finally {
      setLoading(false)
    }
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

  const chartData = trends.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(t.revenue),
    commissions: parseFloat(t.commissions),
    transactions: t.transactions
  }))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-500">Analytics</h1>
          <p className="text-primary-400/70 mt-1">Advanced analytics and insights</p>
        </div>

        {/* Revenue Chart */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary-500">Revenue & Commissions</h3>
              <p className="text-primary-400/70 text-sm mt-1">Last 30 days</p>
            </div>
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary-500" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e920" />
              <XAxis 
                dataKey="date" 
                stroke="#0ea5e960"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#0ea5e960"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: '1px solid #0ea5e950',
                  borderRadius: '8px',
                  color: '#0ea5e9'
                }}
                formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <Legend 
                wrapperStyle={{ color: '#0ea5e9' }}
              />
              <Bar 
                dataKey="revenue" 
                fill="#0ea5e9" 
                name="Revenue"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="commissions" 
                fill="#10b981" 
                name="Commissions"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Volume Chart */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary-500">Transaction Volume</h3>
              <p className="text-primary-400/70 text-sm mt-1">Last 30 days</p>
            </div>
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary-500" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e920" />
              <XAxis 
                dataKey="date" 
                stroke="#0ea5e960"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#0ea5e960"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: '1px solid #0ea5e950',
                  borderRadius: '8px',
                  color: '#0ea5e9'
                }}
              />
              <Bar 
                dataKey="transactions" 
                fill="#8b5cf6" 
                name="Transactions"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  )
}

