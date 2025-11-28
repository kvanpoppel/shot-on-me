'use client'

import { Home, MapPin, Wallet, User, MessageSquare, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'

type Tab = 'home' | 'feed' | 'map' | 'wallet' | 'profile' | 'messages'

interface BottomNavProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (token) {
      fetchUnreadCount()
      // Poll for unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  const fetchUnreadCount = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/messages/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUnreadCount(response.data.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const tabs = [
    { id: 'home' as Tab, icon: Home, label: 'Home' },
    { id: 'feed' as Tab, icon: MessageSquare, label: 'Feed' },
    { id: 'map' as Tab, icon: MapPin, label: 'Venues' },
    { id: 'messages' as Tab, icon: MessageSquare, label: 'Messages', badge: unreadCount },
    { id: 'wallet' as Tab, icon: Wallet, label: 'Wallet' },
    { id: 'profile' as Tab, icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-primary-500/10 z-50">
      <div className="flex justify-center items-center h-16 px-2 pointer-events-auto">
        <div className="flex items-center space-x-1 bg-black/40 border border-primary-500/15 rounded-full px-1 py-1 pointer-events-auto max-w-full overflow-x-auto scrollbar-hide backdrop-blur-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Tab clicked:', tab.id)
                  setActiveTab(tab.id)
                  // Clear badge when opening messages
                  if (tab.id === 'messages' && unreadCount > 0) {
                    fetchUnreadCount()
                  }
                }}
                type="button"
                className={`relative flex items-center justify-center px-2.5 py-2 rounded-full transition-all cursor-pointer flex-shrink-0 ${
                  isActive 
                    ? 'bg-primary-500 text-black' 
                    : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
                <span className={`ml-1.5 text-xs font-medium ${isActive ? 'block' : 'hidden sm:block'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

