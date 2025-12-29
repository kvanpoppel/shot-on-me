'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import { Activity, Database, CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react'

export default function SystemHealthPage() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    if (token) {
      fetchHealth()
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchHealth()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  const fetchHealth = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/owner/system-health`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHealth(response.data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch system health:', error)
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

  const dbStatus = health?.database?.status === 'connected'
  const successRate = parseFloat(health?.payments?.successRate || '100')

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-500">System Health</h1>
            <p className="text-primary-400/70 mt-1">Platform monitoring and status</p>
          </div>
          <button
            onClick={fetchHealth}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-500 hover:bg-primary-500/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="text-right text-primary-400/60 text-sm">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`border-2 rounded-lg p-6 ${
            dbStatus 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-primary-400/70 text-sm mb-1">Database</p>
                <p className={`text-2xl font-bold ${
                  dbStatus ? 'text-green-400' : 'text-red-400'
                }`}>
                  {dbStatus ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              {dbStatus ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <p className="text-primary-400/60 text-xs">
              Connection State: {health?.database?.connectionState || 'Unknown'}
            </p>
          </div>

          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-primary-400/70 text-sm mb-1">Payment Success Rate</p>
                <p className={`text-2xl font-bold ${
                  successRate >= 95 ? 'text-green-400' :
                  successRate >= 80 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {successRate}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-primary-500/50" />
            </div>
            <p className="text-primary-400/60 text-xs">
              Recent: {health?.payments?.recentCount || 0} payments
              {health?.payments?.failedCount > 0 && (
                <span className="text-red-400 ml-2">
                  ({health.payments.failedCount} failed)
                </span>
              )}
            </p>
          </div>

          <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-primary-400/70 text-sm mb-1">System Status</p>
                <p className="text-2xl font-bold text-primary-500">Operational</p>
              </div>
              <Database className="w-8 h-8 text-primary-500/50" />
            </div>
            <p className="text-primary-400/60 text-xs">
              Timestamp: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-primary-500 mb-4">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-primary-400/70 text-sm mb-2">Database Status</p>
              <p className="text-primary-500 font-semibold">
                {health?.database?.status || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-primary-400/70 text-sm mb-2">Connection State</p>
              <p className="text-primary-500 font-semibold">
                {health?.database?.connectionState || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-primary-400/70 text-sm mb-2">Recent Payments</p>
              <p className="text-primary-500 font-semibold">
                {health?.payments?.recentCount || 0}
              </p>
            </div>
            <div>
              <p className="text-primary-400/70 text-sm mb-2">Failed Payments</p>
              <p className="text-red-400 font-semibold">
                {health?.payments?.failedCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

