'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useRouter } from 'next/navigation'
import { User, Wallet, Bell, MapPin, Settings, LogOut, Camera, Users, Trophy, Calendar, Gift, Share2, Sparkles, Building2, MessageSquare, ArrowRight, ChevronDown, Mail, Phone, Search } from 'lucide-react'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import LocationFinder from './LocationFinder'
import SettingsMenu from './SettingsMenu'
import FindFriends from './FindFriends'
import ActivityFeed from './ActivityFeed'
import NotificationCenter from './NotificationCenter'
import MessagesModal from './MessagesModal'
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
  
  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
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
  const [showLocationFinder, setShowLocationFinder] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { token } = useAuth()
  const API_URL = useApiUrl()

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

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
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
      title: 'Rewards & Achievements',
      items: [
        { icon: Trophy, label: 'Achievements', action: () => { setActiveTab('badges'); }, description: 'Badges & leaderboards' },
        { icon: Gift, label: 'Rewards', action: () => { setActiveTab('rewards'); }, description: 'Redeem points & referrals' },
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
      {/* Header - Opaque to prevent overlap */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md border-b border-primary-500/10 shadow-lg pointer-events-none" suppressHydrationWarning>
        <div className="flex items-center justify-between px-4 py-3 pointer-events-auto">
          {/* Left Side: Profile Picture/Name - Interactive */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Profile Dropdown - Top Left */}
            <div 
              className="relative" 
              ref={profileDropdownRef}
              onMouseEnter={() => {
                // Clear any pending close timeout
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current)
                  hoverTimeoutRef.current = null
                }
                // Show dropdown on hover (desktop)
                if (window.innerWidth >= 768) {
                  setShowProfileDropdown(true)
                }
              }}
              onMouseLeave={() => {
                // Close dropdown when mouse leaves the entire area (desktop)
                if (window.innerWidth >= 768) {
                  // Small delay to allow moving to dropdown
                  hoverTimeoutRef.current = setTimeout(() => {
                    setShowProfileDropdown(false)
                    hoverTimeoutRef.current = null
                  }, 300)
                }
              }}
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
              

              {/* Profile Dropdown Menu - Now includes all menu items */}
              {showProfileDropdown && (
                <div 
                  className="absolute left-0 top-full mt-2 w-80 bg-black/95 backdrop-blur-md border-2 border-primary-500/30 rounded-2xl shadow-2xl shadow-black/50 z-[60] overflow-y-auto max-h-[85vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Account Header */}
                  <div className="p-5 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border-b border-primary-500/20">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 border-2 border-primary-500/40 rounded-full flex items-center justify-center overflow-hidden bg-primary-500/10">
                        {user?.profilePicture ? (
                          <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary-500 font-bold text-lg">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-primary-500 truncate">
                          {user?.firstName} {user?.lastName}
                        </h3>
                        <p className="text-primary-400/70 text-sm truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-3 space-y-1">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false)
                        setActiveTab('profile')
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-primary-400/80 hover:bg-primary-500/10 active:bg-primary-500/20 hover:text-primary-500 rounded-xl transition-all group"
                    >
                      <User className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">View Profile</p>
                        <p className="text-xs text-primary-400/60">See your posts and activity</p>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-primary-500/10 my-2"></div>

                  {/* All Menu Items from Hamburger Menu */}
                  <div className="p-3 space-y-4">
                    {menuCategories.map((category, categoryIndex) => (
                      <div key={categoryIndex}>
                        <h3 className="text-xs uppercase tracking-wider text-primary-400/60 font-semibold mb-2 px-2">
                          {category.title}
                        </h3>
                        <div className="space-y-1">
                          {category.items.map((item, itemIndex) => {
                            const Icon = item.icon
                            return (
                              <button
                                key={itemIndex}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setShowProfileDropdown(false)
                                  item.action()
                                }}
                                className={`w-full flex items-center space-x-3 px-3 py-2.5 text-left rounded-xl transition-all group ${
                                  (item as any).isDestructive
                                    ? 'text-red-400/80 hover:bg-red-500/10 active:bg-red-500/20 hover:text-red-400'
                                    : 'text-primary-400/80 hover:bg-primary-500/10 active:bg-primary-500/20 hover:text-primary-500'
                                }`}
                              >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${
                                  (item as any).isDestructive ? 'text-red-400' : 'text-primary-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{item.label}</p>
                                  <p className="text-xs text-primary-400/60">{item.description}</p>
                                </div>
                                {item.badge && item.badge > 0 && (
                                  <span className="bg-primary-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                    {item.badge > 9 ? '9+' : item.badge}
                                  </span>
                                )}
                                <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-primary-500/10 my-2"></div>

                  {/* Logout */}
                  <div className="p-3">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-400/80 hover:bg-red-500/10 active:bg-red-500/20 hover:text-red-400 rounded-xl transition-all"
                    >
                      <LogOut className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Log Out</p>
                        <p className="text-xs text-red-400/60">Sign out of your account</p>
                      </div>
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
    </>
  )
}

