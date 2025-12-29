'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Menu, X, User, Wallet, Bell, MapPin, Settings, LogOut, Camera, Users, Trophy, Calendar, Gift, Share2, Sparkles, Building2, MessageSquare, Home } from 'lucide-react'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import LocationFinder from './LocationFinder'
import SettingsMenu from './SettingsMenu'
import FindFriends from './FindFriends'
import ActivityFeed from './ActivityFeed'
import MessagesModal from './MessagesModal'
import { Tab } from '@/app/types'

interface DashboardProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  viewingProfile?: string | null
  setViewingProfile?: (userId: string | null) => void
}

export default function Dashboard({ activeTab, setActiveTab, viewingProfile, setViewingProfile }: DashboardProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showLocationFinder, setShowLocationFinder] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const { token } = useAuth()
  const API_URL = useApiUrl()

  useEffect(() => {
    if (token) {
      // Delay initial fetch slightly to not block page load
      const initialTimeout = setTimeout(() => {
        fetchNotificationCount()
        fetchUnreadMessageCount()
      }, 500) // Wait 500ms after page load
      
      const interval = setInterval(() => {
        fetchNotificationCount()
        fetchUnreadMessageCount()
      }, 30000)
      return () => {
        clearTimeout(initialTimeout)
        clearInterval(interval)
      }
    }
  }, [token])

  const fetchUnreadMessageCount = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/messages/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUnreadMessageCount(response.data.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch unread message count:', error)
    }
  }

  const fetchNotificationCount = async () => {
    if (!token) return
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotificationCount(response.data.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch notification count:', error)
    }
  }

  const menuItems = [
    { icon: Calendar, label: 'Tonight', action: () => { setShowMenu(false); setActiveTab('tonight'); } },
    { icon: Building2, label: 'My Venues', action: () => { setShowMenu(false); setActiveTab('venues'); } },
    { icon: Trophy, label: 'Badges', action: () => { setShowMenu(false); setActiveTab('badges'); } },
    { icon: Sparkles, label: 'Leaderboards', action: () => { setShowMenu(false); setActiveTab('leaderboards'); } },
    { icon: Gift, label: 'Rewards', action: () => { setShowMenu(false); setActiveTab('rewards'); } },
    { icon: Share2, label: 'Referrals', action: () => { setShowMenu(false); setActiveTab('referrals'); } },
    { icon: Settings, label: 'Settings', action: () => { setShowMenu(false); setShowSettings(true); } },
    { icon: Bell, label: 'Notifications', action: () => { setShowMenu(false); setShowActivityFeed(true); } },
    { icon: Users, label: 'Find Friends', action: () => { setShowMenu(false); setShowFindFriends(true); } },
    { icon: MapPin, label: 'Friend Locations', action: () => { setShowMenu(false); setShowLocationFinder(true); } },
    { icon: LogOut, label: 'Log Out', action: handleLogout },
  ]

  function handleMenuAction(action: string) {
    setShowMenu(false)
    // All menu actions are handled directly in menuItems array
  }

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <>
      {/* Header with Hamburger Menu */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-primary-500 hover:bg-primary-500/10 active:bg-primary-500/20 rounded-lg transition-all touch-manipulation"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6 sm:w-5 sm:h-5" />
          </button>

          <h1 className="text-lg sm:text-xl logo-script text-primary-500 tracking-tight">Shot On Me</h1>

          <div className="flex items-center gap-2">
            {/* Home Button */}
            <button
              onClick={() => setActiveTab('home')}
              className={`relative p-2 rounded-lg transition-all ${
                activeTab === 'home'
                  ? 'bg-primary-500 text-black'
                  : 'text-primary-500 hover:bg-primary-500/10'
              }`}
              aria-label="Home"
              title="Home"
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            {/* Messages Button */}
            <button
              onClick={() => {
                setShowMessages(true)
                fetchUnreadMessageCount()
              }}
              className="relative p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
              aria-label="Messages"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setShowActivityFeed(true)
                fetchNotificationCount()
              }}
              className="relative p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            <div className="w-9 h-9 border border-primary-500/30 rounded-full flex items-center justify-center overflow-hidden">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-500 font-medium text-xs">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Sidebar */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 z-50 transition-opacity duration-300"
            onClick={() => setShowMenu(false)}
            onTouchStart={() => setShowMenu(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 w-72 sm:w-80 bg-black/95 backdrop-blur-md border-r border-primary-500/10 z-50 overflow-y-auto transform transition-transform duration-300 ease-out">
            <div className="p-4 sm:p-6">
              {/* Close button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-primary-500">Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 text-primary-400 hover:text-primary-500 active:bg-primary-500/10 rounded-lg transition-all touch-manipulation"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-primary-500/10">
                <div className="w-14 h-14 border border-primary-500/30 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-500 font-medium text-base">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-primary-500 font-medium tracking-tight">{user?.firstName} {user?.lastName}</p>
                  <p className="text-primary-400/70 text-xs font-light">{user?.email}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                {menuItems.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        item.action()
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 sm:py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 active:bg-primary-500/20 hover:text-primary-500 rounded-lg transition-all font-light touch-manipulation"
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{item.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Wallet Balance */}
              <button
                onClick={() => {
                  setShowMenu(false)
                  setActiveTab('wallet')
                }}
                className="mt-8 w-full p-4 bg-primary-500/5 border border-primary-500/15 rounded-lg hover:bg-primary-500/10 transition-all text-left backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-primary-400/70 text-xs uppercase tracking-wider font-medium">Wallet Balance</span>
                  <Wallet className="w-4 h-4 text-primary-500" />
                </div>
                <p className="text-xl font-semibold text-primary-500 mt-2">
                  ${(user?.wallet?.balance || 0).toFixed(2)}
                </p>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Location Finder - Snapchat Style */}
      <LocationFinder 
        isOpen={showLocationFinder} 
        onClose={() => setShowLocationFinder(false)}
        onViewProfile={(userId) => {
          setShowLocationFinder(false)
          setViewingProfile?.(userId)
        }}
      />
      
      {/* Find Friends */}
      <FindFriends 
        isOpen={showFindFriends} 
        onClose={() => setShowFindFriends(false)}
        onViewProfile={(userId) => {
          setShowFindFriends(false)
          setViewingProfile?.(userId)
        }}
      />
      
      {/* Settings Menu */}
      <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Activity Feed */}
      <ActivityFeed 
        isOpen={showActivityFeed} 
        onClose={() => setShowActivityFeed(false)}
        onViewProfile={setViewingProfile}
      />
      
      {/* Messages Modal */}
      <MessagesModal
        isOpen={showMessages}
        onClose={() => {
          setShowMessages(false)
          fetchUnreadMessageCount()
        }}
        onViewProfile={setViewingProfile}
      />
    </>
  )
}

