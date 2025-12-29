'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Users, Target, Send, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'

interface TargetUser {
  userId: string
  email: string
  name: string
  preferences: any
  matchScore: number
}

export default function PersonalizedPromotions() {
  const { token } = useAuth()
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [criteria, setCriteria] = useState({
    promotionType: '',
    timeframe: '',
    minVisits: 0,
    activeOnly: true
  })
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [promotionId, setPromotionId] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const findTargetUsers = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/personalized-promotions/target-users`,
        criteria,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTargetUsers(response.data.targetUsers)
    } catch (error: any) {
      console.error('Failed to find target users:', error)
      alert(error.response?.data?.message || 'Failed to find target users')
    } finally {
      setLoading(false)
    }
  }

  const sendExclusivePromotion = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user')
      return
    }
    if (!promotionId) {
      alert('Please enter a promotion ID')
      return
    }

    try {
      setSending(true)
      const apiUrl = getApiUrl()
      const response = await axios.post(
        `${apiUrl}/personalized-promotions/send-exclusive`,
        {
          promotionId,
          targetUserIds: Array.from(selectedUsers),
          message: message || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(`Exclusive promotion sent to ${response.data.notificationsSent} users!`)
      setTimeout(() => setSuccess(null), 5000)
      setSelectedUsers(new Set())
      setMessage('')
    } catch (error: any) {
      console.error('Failed to send exclusive promotion:', error)
      alert(error.response?.data?.message || 'Failed to send exclusive promotion')
    } finally {
      setSending(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  return (
    <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-primary-500" />
        <div>
          <h2 className="text-2xl font-bold text-primary-500">Personalized Promotions</h2>
          <p className="text-primary-400 text-sm">Target users based on their preferences and behavior</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 bg-primary-500/20 border border-primary-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary-500" />
          <p className="text-primary-500 font-semibold">{success}</p>
        </div>
      )}

      {/* Criteria Selection */}
      <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-primary-500 mb-4">Targeting Criteria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-primary-400 text-sm mb-2">Promotion Type</label>
            <select
              value={criteria.promotionType}
              onChange={(e) => setCriteria({ ...criteria, promotionType: e.target.value })}
              className="w-full bg-black border border-primary-500/30 text-primary-400 rounded-lg px-3 py-2"
            >
              <option value="">Any Type</option>
              <option value="happy-hour">Happy Hour</option>
              <option value="special">Special</option>
              <option value="event">Event</option>
              <option value="flash-deal">Flash Deal</option>
              <option value="exclusive">Exclusive</option>
            </select>
          </div>
          <div>
            <label className="block text-primary-400 text-sm mb-2">Timeframe</label>
            <select
              value={criteria.timeframe}
              onChange={(e) => setCriteria({ ...criteria, timeframe: e.target.value })}
              className="w-full bg-black border border-primary-500/30 text-primary-400 rounded-lg px-3 py-2"
            >
              <option value="">Any Timeframe</option>
              <option value="morning">Morning (6 AM - 12 PM)</option>
              <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
              <option value="evening">Evening (5 PM - 10 PM)</option>
              <option value="night">Night (10 PM - 6 AM)</option>
            </select>
          </div>
          <div>
            <label className="block text-primary-400 text-sm mb-2">Minimum Visits</label>
            <input
              type="number"
              value={criteria.minVisits}
              onChange={(e) => setCriteria({ ...criteria, minVisits: parseInt(e.target.value) || 0 })}
              className="w-full bg-black border border-primary-500/30 text-primary-400 rounded-lg px-3 py-2"
              min="0"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={criteria.activeOnly}
              onChange={(e) => setCriteria({ ...criteria, activeOnly: e.target.checked })}
              className="mr-2"
            />
            <label className="text-primary-400 text-sm">Active users only (last 30 days)</label>
          </div>
        </div>
        <button
          onClick={findTargetUsers}
          disabled={loading}
          className="mt-4 w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Finding Users...
            </>
          ) : (
            <>
              <Target className="w-5 h-5" />
              Find Target Users
            </>
          )}
        </button>
      </div>

      {/* Target Users List */}
      {targetUsers.length > 0 && (
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary-500">
              Matched Users ({targetUsers.length})
            </h3>
            <button
              onClick={() => {
                if (selectedUsers.size === targetUsers.length) {
                  setSelectedUsers(new Set())
                } else {
                  setSelectedUsers(new Set(targetUsers.map(u => u.userId)))
                }
              }}
              className="text-sm text-primary-500 hover:text-primary-400"
            >
              {selectedUsers.size === targetUsers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {targetUsers.map((user) => (
              <div
                key={user.userId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedUsers.has(user.userId)
                    ? 'bg-primary-500/20 border-primary-500/50'
                    : 'bg-black/60 border-primary-500/20'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.userId)}
                    onChange={() => toggleUserSelection(user.userId)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-primary-500 font-semibold">{user.name}</p>
                    <p className="text-primary-400 text-xs">{user.email}</p>
                    {user.preferences && (
                      <div className="flex gap-2 mt-1">
                        {user.preferences.favoritePromotionTypes?.slice(0, 2).map((type: string) => (
                          <span key={type} className="text-xs bg-primary-500/20 text-primary-500 px-2 py-0.5 rounded">
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-primary-500 font-semibold text-sm">Match: {user.matchScore}%</p>
                  <p className="text-primary-400 text-xs">
                    {user.preferences?.visitFrequency || 0} visits
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Exclusive Promotion */}
      {targetUsers.length > 0 && selectedUsers.size > 0 && (
        <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-primary-500 mb-4">Send Exclusive Promotion</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-primary-400 text-sm mb-2">Promotion ID</label>
              <input
                type="text"
                value={promotionId}
                onChange={(e) => setPromotionId(e.target.value)}
                placeholder="Enter promotion ID"
                className="w-full bg-black border border-primary-500/30 text-primary-400 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-primary-400 text-sm mb-2">Custom Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                className="w-full bg-black border border-primary-500/30 text-primary-400 rounded-lg px-3 py-2 h-24"
              />
            </div>
            <button
              onClick={sendExclusivePromotion}
              disabled={sending || !promotionId}
              className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send to {selectedUsers.size} Selected Users
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

