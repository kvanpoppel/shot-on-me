'use client'

import { useState } from 'react'
import { Send, Users, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function NotificationCenter() {
  const { token, user } = useAuth()
  const [message, setMessage] = useState('')
  const [type, setType] = useState('promotion')
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !message) return

    setSending(true)
    try {
      await axios.post(
        `${API_URL}/notifications/send`,
        {
          message,
          type,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setMessage('')
      alert('Notification sent successfully!')
    } catch (error: any) {
      console.error('Failed to send notification:', error)
      alert(error.response?.data?.error || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex items-center space-x-2 mb-3">
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
          <Send className="w-4 h-4 text-primary-500" />
        </div>
        <h2 className="text-base font-semibold text-primary-500 tracking-tight">Send Notification</h2>
      </div>

      <form onSubmit={handleSend} className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-primary-500 mb-0.5 uppercase tracking-wider">
            Notification Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-500 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 text-xs font-light backdrop-blur-sm"
          >
            <option value="promotion">Promotion</option>
            <option value="birthday">Birthday Special</option>
            <option value="anniversary">Anniversary Special</option>
            <option value="event">Event</option>
            <option value="general">General</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-primary-500 mb-0.5 uppercase tracking-wider">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-500 placeholder-primary-500/40 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 text-xs font-light backdrop-blur-sm"
            placeholder="Enter your notification message..."
            required
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-primary-400/70 font-light">
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>All customers</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Send immediately</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={sending || !message}
          className="w-full bg-primary-500 text-black py-1.5 rounded font-medium hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        >
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
    </div>
  )
}

