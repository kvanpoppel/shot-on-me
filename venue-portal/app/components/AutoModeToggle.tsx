'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, Zap } from 'lucide-react'
import { useToast } from './ToastContainer'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

interface AutoModeSettings {
  enabled: boolean
  autoPostThreshold: number
  autoNotifyFollowers: boolean
  autoGenerateSpecials: boolean
  checkIntervalHours: number
  maxPromotionsPerCycle: number
  lastRunAt?: string | null
}

export default function AutoModeToggle() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const [settings, setSettings] = useState<AutoModeSettings>({
    enabled: false,
    autoPostThreshold: 0.85,
    autoNotifyFollowers: true,
    autoGenerateSpecials: true,
    checkIntervalHours: 24,
    maxPromotionsPerCycle: 2,
    lastRunAt: null
  })
  const [loading, setLoading] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      bootstrap()
    }
  }, [token])

  const bootstrap = async () => {
    if (!token) return

    try {
      const apiUrl = getApiUrl()
      const venuesRes = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const foundVenueId = Array.isArray(venuesRes.data)
        ? venuesRes.data[0]?._id
        : venuesRes.data?.venues?.[0]?._id

      if (!foundVenueId) {
        return
      }

      setVenueId(foundVenueId)

      const settingsRes = await axios.get(`${apiUrl}/ai-automation/settings?venueId=${foundVenueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (settingsRes.data?.settings) {
        setSettings(settingsRes.data.settings)
      }
    } catch (error: any) {
      showError(error?.response?.data?.error || 'Failed to load AI automation settings')
    }
  }

  const saveSettings = async (newSettings: AutoModeSettings) => {
    if (!token || !venueId) return

    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const saveRes = await axios.put(
        `${apiUrl}/ai-automation/settings`,
        { venueId, settings: newSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setSettings(saveRes.data.settings || newSettings)

      if (newSettings.enabled) {
        await runCycle(true)
        showSuccess('AI Auto Mode enabled. Specials and follower notifications are now automated.')
      } else {
        showSuccess('AI Auto Mode disabled.')
      }
    } catch (error: any) {
      showError(error?.response?.data?.error || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const runCycle = async (force = false) => {
    if (!token || !venueId) return

    try {
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/ai-automation/run-cycle`,
        { venueId, force },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data?.skipped) {
        if (response.data?.reason === 'interval_not_elapsed') {
          showSuccess(`Next AI cycle in ~${response.data.nextRunInMinutes} minutes.`)
        }
        return
      }

      setSettings((prev) => ({
        ...prev,
        lastRunAt: new Date().toISOString()
      }))
    } catch (error) {
      // handled at caller
    }
  }

  const toggleAutoMode = () => {
    saveSettings({ ...settings, enabled: !settings.enabled })
  }

  return (
    <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary-500/10 rounded-lg">
            <Zap className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary-500">AI Auto Mode</h3>
            <p className="text-xs text-primary-400/70">Let AI handle promotions automatically</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={toggleAutoMode}
            disabled={loading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-primary-500/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
        </label>
      </div>

      {settings.enabled && (
        <div className="space-y-3 text-xs text-primary-400/70">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="block">Auto-post threshold ({Math.round(settings.autoPostThreshold * 100)}%)</span>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={settings.autoPostThreshold}
                onChange={(e) => setSettings({ ...settings, autoPostThreshold: Number(e.target.value) })}
                disabled={loading}
                className="w-full"
              />
            </label>

            <label className="space-y-1">
              <span className="block">Auto-update interval (hours)</span>
              <input
                type="number"
                min={1}
                max={168}
                value={settings.checkIntervalHours}
                onChange={(e) => setSettings({ ...settings, checkIntervalHours: Number(e.target.value || 24) })}
                disabled={loading}
                className="w-full bg-black/30 border border-primary-500/20 rounded px-2 py-1 text-primary-300"
              />
            </label>
            <label className="space-y-1">
              <span className="block">Max specials per cycle</span>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.maxPromotionsPerCycle}
                onChange={(e) => setSettings({ ...settings, maxPromotionsPerCycle: Number(e.target.value || 2) })}
                disabled={loading}
                className="w-full bg-black/30 border border-primary-500/20 rounded px-2 py-1 text-primary-300"
              />
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.autoGenerateSpecials}
              onChange={(e) => setSettings({ ...settings, autoGenerateSpecials: e.target.checked })}
              className="rounded"
            />
            <span>Automatically generate new specials from AI suggestions</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.autoNotifyFollowers}
              onChange={(e) => setSettings({ ...settings, autoNotifyFollowers: e.target.checked })}
              className="rounded"
            />
            <span>Auto-notify venue followers when AI publishes specials</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3 h-3 text-primary-500" />
              <span>
                Last run:{' '}
                {settings.lastRunAt ? new Date(settings.lastRunAt).toLocaleString() : 'Not run yet'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => runCycle(true)}
                disabled={loading}
                className="px-2.5 py-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded transition-colors"
              >
                Run now
              </button>
              <button
                onClick={() => saveSettings(settings)}
                disabled={loading}
                className="px-2.5 py-1 bg-primary-500 text-black font-medium rounded hover:bg-primary-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

