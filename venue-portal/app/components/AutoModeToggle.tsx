'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, Settings, Zap } from 'lucide-react'
import { useToast } from './ToastContainer'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

interface AutoModeSettings {
  enabled: boolean
  autoPostThreshold: number
  autoNotify: boolean
  autoGenerate: boolean
  checkInterval: number // in hours
}

export default function AutoModeToggle() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const [settings, setSettings] = useState<AutoModeSettings>({
    enabled: false,
    autoPostThreshold: 0.85,
    autoNotify: true,
    autoGenerate: true,
    checkInterval: 24
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [token])

  const loadSettings = async () => {
    if (!token) return
    
    try {
      // Load from localStorage for now (can be moved to backend)
      const saved = localStorage.getItem('ai-auto-mode-settings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async (newSettings: AutoModeSettings) => {
    if (!token) return

    try {
      setLoading(true)
      localStorage.setItem('ai-auto-mode-settings', JSON.stringify(newSettings))
      setSettings(newSettings)
      
      if (newSettings.enabled) {
        // Start automation if enabled
        await startAutomation(newSettings)
        showSuccess('AI Auto Mode enabled! I\'ll handle promotions automatically.')
      } else {
        showSuccess('AI Auto Mode disabled.')
      }
    } catch (error: any) {
      showError(error.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const startAutomation = async (settings: AutoModeSettings) => {
    if (!token) return

    try {
      const apiUrl = getApiUrl()
      
      // Get venue ID
      const venuesRes = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venueId = Array.isArray(venuesRes.data) 
        ? venuesRes.data[0]?._id 
        : venuesRes.data?.venues?.[0]?._id

      if (!venueId) throw new Error('Venue not found')

      // Process initial automation
      await axios.post(
        `${apiUrl}/ai-automation/process-all`,
        { venueId, threshold: settings.autoPostThreshold },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Set up interval for periodic checks
      if (typeof window !== 'undefined') {
        const intervalMs = settings.checkInterval * 60 * 60 * 1000
        const intervalId = setInterval(async () => {
          try {
            await axios.post(
              `${apiUrl}/ai-automation/process-all`,
              { venueId, threshold: settings.autoPostThreshold },
              { headers: { Authorization: `Bearer ${token}` } }
            )
          } catch (error) {
            console.error('Automated check failed:', error)
          }
        }, intervalMs)

        // Store interval ID to clear later
        localStorage.setItem('ai-auto-interval-id', intervalId.toString())
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to start automation')
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
        <div className="space-y-2 text-xs text-primary-400/70">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3 h-3 text-primary-500" />
            <span>Auto-generating promotions based on patterns</span>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3 h-3 text-primary-500" />
            <span>Auto-posting high-confidence suggestions ({settings.autoPostThreshold * 100}%+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3 h-3 text-primary-500" />
            <span>Auto-sending notifications at optimal times</span>
          </div>
        </div>
      )}
    </div>
  )
}

