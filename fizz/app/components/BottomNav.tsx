'use client'

import { useEffect, useState } from 'react'
import { Home, Compass, Send, MessageSquare, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Tab } from '../types'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; icon: React.ElementType; label: string; isFab?: boolean }[] = [
  { id: 'home',      icon: Home,          label: 'Home' },
  { id: 'discover',  icon: Compass,       label: 'Spots' },
  { id: 'send',      icon: Send,          label: 'Fizz',    isFab: true },
  { id: 'messages',  icon: MessageSquare, label: 'Messages' },
  { id: 'profile',   icon: User,          label: 'Profile' },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (!token || !API_URL) return
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_URL}/messages/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUnreadMessages(res.data.unreadCount || 0)
      } catch { /* ignore */ }
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [token, API_URL])

  // Also listen to socket for instant badge updates
  useEffect(() => {
    const handleNew = () => setUnreadMessages(c => c + 1)
    window.addEventListener('new-message', handleNew)
    return () => window.removeEventListener('new-message', handleNew)
  }, [])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/5 safe-bottom"
      style={{ background: '#1A1A2E' }}
    >
      <div className="flex items-center justify-around px-1 pt-2 pb-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          const badge = tab.id === 'messages' ? unreadMessages : 0

          if (tab.isFab) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center gap-0.5"
                style={{ minWidth: 56 }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #C8F135, #00D4FF)',
                    color: '#1A1A2E',
                    transform: 'translateY(-10px)',
                    boxShadow: '0 8px 24px rgba(200,241,53,0.35)',
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold" style={{ color: '#C8F135', marginTop: -8 }}>
                  {tab.label}
                </span>
              </button>
            )
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 relative"
              style={{ minWidth: 52 }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative"
                style={isActive
                  ? { background: 'rgba(200,241,53,0.15)', color: '#C8F135' }
                  : { color: 'rgba(255,255,255,0.35)' }
                }
              >
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black"
                    style={{ background: '#FF5F57', color: '#fff' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-semibold"
                style={isActive ? { color: '#C8F135' } : { color: 'rgba(255,255,255,0.30)' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
