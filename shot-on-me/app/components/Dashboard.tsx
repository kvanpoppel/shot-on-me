'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Menu, X, User, Wallet, Bell, MapPin, Settings, LogOut, Camera, Users } from 'lucide-react'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import LocationFinder from './LocationFinder'
import SettingsMenu from './SettingsMenu'
import FindFriends from './FindFriends'
import ActivityFeed from './ActivityFeed'
import { Tab } from '../types'

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
  const [notificationCount, setNotificationCount] = useState(0)
  const { token } = useAuth()
  const API_URL = useApiUrl()

  useEffect(() => {
    if (token) {
      fetchNotificationCount()
      const interval = setInterval(fetchNotificationCount, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

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
    { icon: Settings, label: 'Settings', action: () => { setShowMenu(false); setShowSettings(true); } },
    { icon: Bell, label: 'Notifications', action: () => { setShowMenu(false); setShowActivityFeed(true); } },
    { icon: Users, label: 'Find Friends', action: () => { setShowMenu(false); setShowFindFriends(true); } },
    { icon: MapPin, label: 'Friend Locations', action: () => { setShowMenu(false); setShowLocationFinder(true); } },
    { icon: LogOut, label: 'Log Out', action: handleLogout },
  ]

  function handleMenuAction(action: string) {
    setShowMenu(false)
    if (action === 'notifications') {
      alert('Notifications feature coming soon!')
    }
  }

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <>
      {/* Header with Hamburger Menu */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-sm border-b border-primary-500/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-xl logo-script text-primary-500 tracking-tight">Shot On Me</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowActivityFeed(true)
                fetchNotificationCount()
              }}
              className="relative p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
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
            className="fixed inset-0 bg-black/80 z-50"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-black/95 backdrop-blur-md border-r border-primary-500/10 z-50 overflow-y-auto">
            <div className="p-4">
              {/* Close button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-primary-500">Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 text-primary-400 hover:text-primary-500 rounded-lg"
                >
                  <X className="w-5 h-5" />
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
                      onClick={item.action}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-primary-400/80 hover:bg-primary-500/10 hover:text-primary-500 rounded-lg transition-all font-light"
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
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
    </>
  )
}

