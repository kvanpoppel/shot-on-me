'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useRouter } from 'next/navigation'
import { User, Wallet, Bell, MapPin, Settings, LogOut, Camera, Users, Calendar, Gift, Share2, Sparkles, Building2, MessageSquare, ArrowRight, ChevronDown, Mail, Phone, Search } from 'lucide-react'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import LocationFinder from './LocationFinder'
import SettingsMenu from './SettingsMenu'
import FindFriends from './FindFriends'
import ActivityFeed from './ActivityFeed'
import NotificationCenter from './NotificationCenter'
import MessagesModal from './MessagesModal'
import SearchModal from './SearchModal'
import { Tab } from '@/app/types'

interface DashboardProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  viewingProfile?: string | null
  setViewingProfile?: (userId: string | null) => void
  onOpenAddFunds?: () => void
}

export default function Dashboard({ activeTab, setActiveTab, viewingProfile, setViewingProfile, onOpenAddFunds }: DashboardProps) {
  const { user, logout, updateUser } = useAuth()
  const { socket } = useSocket()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [showLocationFinder, setShowLocationFinder] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const prevActiveTabRef = useRef<Tab>(activeTab)
  const { token } = useAuth()
  const API_URL = useApiUrl()
  
  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Close search modal when switching tabs (but allow search to stay open)
  useEffect(() => {
    // Only close if we actually switched to a different tab (not just opening search)
    if (showSearchModal && prevActiveTabRef.current !== activeTab && activeTab !== 'home') {
      setShowSearchModal(false)
      window.dispatchEvent(new CustomEvent('close-search'))
    }
    prevActiveTabRef.current = activeTab
  }, [activeTab, showSearchModal])
  
  // Listen for settings open event
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    const handleOpenSettings = () => {
      setShowSettings(true)
    }
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [isMounted])

  // Listen for find friends event
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    const handleOpenFindFriends = () => {
      setShowFindFriends(true)
    }
    window.addEventListener('open-find-friends', handleOpenFindFriends)
    return () => window.removeEventListener('open-find-friends', handleOpenFindFriends)
  }, [isMounted])

  // Listen for search modal open event
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    const handleOpenSearch = () => {
      setShowSearchModal(true)
    }
    const handleCloseSearch = () => {
      setShowSearchModal(false)
    }
    window.addEventListener('open-search', handleOpenSearch)
    window.addEventListener('close-search', handleCloseSearch)
    return () => {
      window.removeEventListener('open-search', handleOpenSearch)
      window.removeEventListener('close-search', handleCloseSearch)
    }
  }, [isMounted])
  
  // Ensure menu closes on escape key
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProfileDropdown(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMounted])

  // Real-time wallet balance updates
  useEffect(() => {
    if (!socket || !user) return

    const handleWalletUpdate = (data: { userId: string; balance: number }) => {
      const userId = user?.id || (user as any)?._id
      if (data.userId === userId && updateUser) {
        // Update user object with new balance
        updateUser({
          wallet: {
            balance: data.balance,
            pendingBalance: user?.wallet?.pendingBalance || 0
          }
        })
      }
    }

    socket.on('wallet-updated', handleWalletUpdate)

    return () => {
      socket.off('wallet-updated', handleWalletUpdate)
    }
  }, [socket, user, updateUser])

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

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown && profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the hamburger menu backdrop
        const target = event.target as HTMLElement
        if (target.closest('.fixed.inset-0.bg-black')) {
          // This is likely the hamburger menu backdrop, don't interfere
          return
        }
        setShowProfileDropdown(false)
      }
    }

    if (showProfileDropdown) {
      // Use a slight delay to avoid conflicts with other click handlers
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true)
      }, 0)
      
      return () => {
        clearTimeout(timeout)
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [showProfileDropdown])

  // Ensure menu closes on component unmount or route change
  useEffect(() => {
    return () => {
      setShowProfileDropdown(false)
    }
  }, [])


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

  // Organized menu items by category for better UX
  const menuCategories = [
    {
      title: 'Settings',
      items: [
        { icon: Settings, label: 'Settings', action: () => { setShowSettings(true); }, description: 'Preferences & privacy' },
      ]
    },
    {
      title: 'Account',
      items: [
        { icon: Bell, label: 'Notifications', action: () => { setShowActivityFeed(true); }, description: 'Activity & updates', badge: notificationCount > 0 ? notificationCount : undefined },
      ]
    },
    {
      title: 'Discover',
      items: [
        { icon: Calendar, label: 'Tonight', action: () => { setActiveTab('tonight'); }, description: 'See what\'s happening tonight' },
        { icon: Building2, label: 'My Venues', action: () => { setActiveTab('venues'); }, description: 'Your favorite venues' },
        { icon: Users, label: 'Find Friends', action: () => { setShowFindFriends(true); }, description: 'Discover new connections' },
        { icon: MapPin, label: 'Friend Locations', action: () => { setShowLocationFinder(true); }, description: 'See where friends are' },
      ]
    },
         {
           title: 'Rewards',
           items: [
             { icon: Gift, label: 'Rewards Program', action: () => { setActiveTab('rewards'); }, description: 'Engagement incentives: 100 pts = $5' },
           ]
         }
  ]

  function handleLogout() {
    logout()
    router.push('/')
  }

  // Don't render until mounted
  if (!isMounted) {
    return null
  }

  return (
    <>
      {/* Header - Opaque to prevent overlap - Compact */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md border-b border-primary-500/10 shadow-lg pointer-events-none" suppressHydrationWarning>
        <div className="flex items-center justify-between px-3 py-2 pointer-events-auto">
          {/* Left Side: Profile Picture/Name - Interactive */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Profile Dropdown - Top Left */}
            <div
              className="relative"
              ref={profileDropdownRef}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowProfileDropdown(!showProfileDropdown)
                }}
              className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-primary-500/10 transition-all group pointer-events-auto"
              aria-label="Account"
            >
                <div className="w-10 h-10 border-2 border-primary-500/30 rounded-full flex items-center justify-center overflow-hidden group-hover:border-primary-500/50 transition-colors flex-shrink-0">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-500 font-medium text-sm">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-primary-500 group-hover:text-primary-400 transition-colors">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-primary-400/60 group-hover:text-primary-400/80 transition-colors">
                    {user?.email}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-primary-400/60 transition-transform flex-shrink-0 ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>
              

              {showProfileDropdown && (
                <div
                  className="absolute left-0 top-full mt-2 w-52 bg-zinc-950 border border-primary-500/20 rounded-2xl shadow-xl shadow-black/60 z-[60] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Compact header */}
                  <div className="px-4 py-3 border-b border-primary-500/10">
                    <p className="text-sm font-semibold text-white/85 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-white/35 truncate">{user?.email}</p>
                  </div>

                  {/* Items */}
                  <div className="p-1.5 space-y-0.5">
                    {[
                      { icon: User,     label: 'Profile',       action: () => setActiveTab('profile') },
                      { icon: Settings, label: 'Settings',      action: () => setShowSettings(true) },
                      { icon: Bell,     label: 'Notifications', action: () => setShowActivityFeed(true), badge: notificationCount },
                      { icon: Gift,     label: 'Rewards',       action: () => setActiveTab('rewards') },
                    ].map(({ icon: Icon, label, action, badge }) => (
                      <button
                        key={label}
                        onClick={() => { setShowProfileDropdown(false); action() }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:bg-white/5 hover:text-primary-400 transition-all text-sm text-left"
                      >
                        <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        <span className="flex-1">{label}</span>
                        {badge && badge > 0 && (
                          <span className="bg-primary-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-primary-500/10 p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm text-left"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Wallet Balance Display - Simplified and Clean */}
            <div 
              onClick={() => {
                setActiveTab('wallet')
                // If balance is non-positive, trigger add funds modal
                if ((user?.wallet?.balance || 0) <= 0 && onOpenAddFunds) {
                  setTimeout(() => {
                    onOpenAddFunds()
                  }, 100)
                }
              }}
              className="flex items-center bg-primary-500/15 border border-primary-500/30 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-primary-500/20 hover:border-primary-500/50 transition-all pointer-events-auto"
            >
              {(user?.wallet?.balance || 0) > 0 ? (
                <span className="text-sm sm:text-base font-semibold text-primary-500 leading-none">
                  ${Math.round(user?.wallet?.balance || 0)}
                </span>
              ) : (
                <span className="text-sm sm:text-base font-semibold text-primary-500 leading-none">
                  Deposit
                </span>
              )}
            </div>

            {/* Messages Button */}
            <button
              onClick={() => {
                setShowMessages(true)
                fetchUnreadMessageCount()
              }}
              className="relative p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all pointer-events-auto"
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
              className="relative p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all pointer-events-auto"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>


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
      
      {/* Activity Feed / Notification Center */}
      <ActivityFeed 
        isOpen={showActivityFeed} 
        onClose={() => {
          setShowActivityFeed(false)
          fetchNotificationCount()
        }}
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

      {/* Global Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onViewProfile={(userId) => {
          setShowSearchModal(false)
          setViewingProfile?.(userId)
        }}
        onViewVenue={(venueId) => {
          setShowSearchModal(false)
          setActiveTab('map')
        }}
        onViewPost={(postId) => {
          setShowSearchModal(false)
          setActiveTab('feed')
        }}
        setActiveTab={setActiveTab}
      />
    </>
  )
}

