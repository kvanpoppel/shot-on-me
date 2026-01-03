'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useRouter } from 'next/navigation'
import { Menu, X, User, Wallet, Bell, MapPin, Settings, LogOut, Camera, Users, Trophy, Calendar, Gift, Share2, Sparkles, Building2, MessageSquare, ArrowRight, ChevronDown, Mail, Phone, Search } from 'lucide-react'
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
  const [showMenu, setShowMenu] = useState(false)
  
  // Ensure menu closes on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false)
        setShowProfileDropdown(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])
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
      setShowMenu(false)
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
      title: 'Discover',
      items: [
        { icon: Calendar, label: 'Tonight', action: () => { setShowMenu(false); setActiveTab('tonight'); }, description: 'See what\'s happening tonight' },
        { icon: Building2, label: 'My Venues', action: () => { setShowMenu(false); setActiveTab('venues'); }, description: 'Your favorite venues' },
        { icon: Users, label: 'Find Friends', action: () => { setShowMenu(false); setShowFindFriends(true); }, description: 'Discover new connections' },
        { icon: MapPin, label: 'Friend Locations', action: () => { setShowMenu(false); setShowLocationFinder(true); }, description: 'See where friends are' },
      ]
    },
    {
      title: 'Rewards & Achievements',
      items: [
        { icon: Trophy, label: 'Badges', action: () => { setShowMenu(false); setActiveTab('badges'); }, description: 'Your achievements' },
        { icon: Sparkles, label: 'Leaderboards', action: () => { setShowMenu(false); setActiveTab('leaderboards'); }, description: 'Compete with friends' },
        { icon: Gift, label: 'Rewards', action: () => { setShowMenu(false); setActiveTab('rewards'); }, description: 'Redeem your points' },
        { icon: Share2, label: 'Referrals', action: () => { setShowMenu(false); setActiveTab('referrals'); }, description: 'Invite & earn rewards' },
      ]
    },
    {
      title: 'Account',
      items: [
        { icon: Bell, label: 'Notifications', action: () => { setShowMenu(false); setShowActivityFeed(true); }, description: 'Activity & updates', badge: notificationCount > 0 ? notificationCount : undefined },
        { icon: Settings, label: 'Settings', action: () => { setShowMenu(false); setShowSettings(true); }, description: 'Preferences & privacy' },
        { icon: LogOut, label: 'Log Out', action: handleLogout, description: 'Sign out of your account', isDestructive: true },
      ]
    }
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
      <header className="fixed top-0 left-0 right-0 z-30 bg-transparent backdrop-blur-none border-0 outline-none shadow-none pointer-events-none">
        <div className="flex items-center justify-between px-4 py-3 border-0 outline-none pointer-events-auto">
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
                  setShowMenu(false) // Close hamburger menu if open
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
              
              {/* Search Icon - Next to Profile */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Dispatch custom event to trigger search in HomeTab
                  window.dispatchEvent(new CustomEvent('open-search'))
                }}
                className="p-2 text-primary-500 hover:bg-primary-500/10 active:bg-primary-500/20 rounded-lg transition-all touch-manipulation pointer-events-auto"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileDropdown && (
                <div 
                  className="absolute left-0 top-full mt-2 w-80 bg-black/95 backdrop-blur-md border-2 border-primary-500/30 rounded-2xl shadow-2xl shadow-black/50 z-[60] overflow-hidden"
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

                    <button
                      onClick={() => {
                        setShowProfileDropdown(false)
                        setShowSettings(true)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-primary-400/80 hover:bg-primary-500/10 active:bg-primary-500/20 hover:text-primary-500 rounded-xl transition-all group"
                    >
                      <Settings className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Settings</p>
                        <p className="text-xs text-primary-400/60">Preferences & privacy</p>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
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

            {/* Hamburger Menu Button - Moved next to profile */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
                if (showProfileDropdown) {
                  setShowProfileDropdown(false) // Close profile dropdown when opening menu
                }
              }}
              className="p-2 text-primary-500 hover:bg-primary-500/10 active:bg-primary-500/20 rounded-lg transition-all touch-manipulation pointer-events-auto"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Wallet Balance Display - Elegant and Prominent */}
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
              className="flex items-center gap-2 sm:gap-2.5 bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-primary-500/5 border border-primary-500/30 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 cursor-pointer hover:from-primary-500/25 hover:via-primary-500/15 hover:to-primary-500/10 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all group backdrop-blur-sm"
            >
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                {(user?.wallet?.balance || 0) > 0 ? (
                  <span className="text-base sm:text-xl font-bold text-primary-500 leading-none truncate">
                    ${Math.round(user?.wallet?.balance || 0)}
                  </span>
                ) : (
                  <span className="text-base sm:text-xl font-bold text-primary-500 leading-none truncate">
                    Deposit $
                  </span>
                )}
              </div>
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

      {/* Hamburger Menu Sidebar */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 z-50 transition-opacity duration-300"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(false)
              setShowProfileDropdown(false) // Also close profile dropdown
            }}
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(false)
              setShowProfileDropdown(false) // Also close profile dropdown
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
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

              {/* Menu Items - Organized by Category */}
              <div className="space-y-4">
                {menuCategories.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <h3 className="text-xs uppercase tracking-wider text-primary-400/60 font-semibold mb-2 px-4">
                      {category.title}
                    </h3>
                    <div className="space-y-0.5">
                      {category.items.map((item, itemIndex) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={itemIndex}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              item.action()
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-lg transition-all touch-manipulation group ${
                              item.isDestructive
                                ? 'text-red-400/80 hover:bg-red-500/10 active:bg-red-500/20 hover:text-red-400'
                                : 'text-primary-400/80 hover:bg-primary-500/10 active:bg-primary-500/20 hover:text-primary-500'
                            }`}
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <Icon className={`w-5 h-5 flex-shrink-0 ${
                                item.isDestructive ? 'text-red-400' : 'text-primary-500'
                              }`} />
                              <span className="text-sm sm:text-base font-medium flex-1">{item.label}</span>
                              {item.badge && item.badge > 0 && (
                                <span className="bg-primary-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                  {item.badge > 9 ? '9+' : item.badge}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

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

