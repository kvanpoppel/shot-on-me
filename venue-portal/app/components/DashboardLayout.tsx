'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Menu, X, ChevronDown } from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

import { getApiUrl } from '../utils/api'

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [venueName, setVenueName] = useState<string>('Venue')
  const [userInitial, setUserInitial] = useState<string>('V')
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'staff'>('owner')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleSwitchUser = () => {
    logout()
    router.push('/?tab=login')
  }

  useEffect(() => {
    fetchVenueName()
  }, [token, user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [accountMenuOpen])

  const fetchVenueName = async () => {
    if (!token || !user) return
    
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Handle both response formats: { venues: [...] } or direct array
      let venues: any[] = []
      if (Array.isArray(response.data)) {
        venues = response.data
      } else if (response.data?.venues) {
        venues = response.data.venues
      }
      
      const userId = user.id?.toString() || (user as any)?._id?.toString()

      const ownedVenue = venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        return ownerId === userId
      })

      const staffVenue = venues.find((v: any) =>
        Array.isArray(v.staff) && v.staff.some((s: any) => {
          const staffUserId = s.user?._id?.toString() || s.user?.toString() || s.user
          return staffUserId === userId
        })
      )
      const myVenue = ownedVenue || staffVenue
      
      if (myVenue && myVenue.name) {
        setVenueName(myVenue.name)
      }

      if (ownedVenue) {
        setUserRole('owner')
      } else if (staffVenue && userId) {
        const me = staffVenue.staff?.find((s: any) => {
          const staffUserId = s.user?._id?.toString() || s.user?.toString() || s.user
          return staffUserId === userId
        })
        setUserRole((me?.role || 'staff') as 'manager' | 'staff')
      } else {
        setUserRole('owner')
      }
      
      // Set user initial
      if (user.firstName) {
        setUserInitial(user.firstName.charAt(0).toUpperCase())
      } else if (user.email) {
        setUserInitial(user.email.charAt(0).toUpperCase())
      }
    } catch (error) {
      console.error('Failed to fetch venue name:', error)
    }
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(path)
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/promotions', label: 'Promotions' },
    { href: '/dashboard/analytics', label: 'Earnings' },
    { href: '/dashboard/redemptions', label: 'Activity' },
    { href: '/dashboard/profile', label: 'Profile' },
    { href: '/dashboard/settings', label: 'Settings' }
  ]

  return (
    <div className="min-h-screen bg-black flex overflow-x-hidden">
      {/* Sidebar - Responsive */}
      <aside className="hidden md:flex w-48 bg-black/95 backdrop-blur-md border-r border-primary-500/10 min-h-screen flex-shrink-0">
        <div className="p-4 w-full">
          <h1 className="text-lg logo-script text-primary-500 mb-6 tracking-tight">Shot On Me</h1>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                  isActive(item.href)
                    ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500'
                    : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-64 bg-black/95 backdrop-blur-md border-r border-primary-500/10 h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-lg logo-script text-primary-500 tracking-tight">Shot On Me</h1>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-primary-500 hover:text-primary-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                    isActive(item.href)
                      ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500'
                      : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 bg-black flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top Bar - Responsive */}
        <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-primary-500 hover:text-primary-400 flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base md:text-lg logo-script text-primary-500 tracking-tight truncate">{venueName}</h2>
          </div>
          <div className="flex items-center space-x-1.5 md:space-x-2 flex-shrink-0">
            <div className="relative ml-1 md:ml-2" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="flex items-center gap-1 rounded-lg border border-primary-500/25 bg-black/40 px-2 py-1 text-[11px] text-primary-400 hover:border-primary-500/45"
              >
                <div className="w-6 h-6 border border-primary-500/30 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <span className="text-primary-500 text-xs font-medium">{userInitial}</span>
                </div>
                <span className="hidden sm:inline capitalize">{userRole}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-primary-500/25 bg-black/95 p-2 shadow-xl z-30">
                  <p className="px-2 py-1 text-[11px] text-primary-400/70">Logged in as</p>
                  <p className="px-2 pb-2 text-xs font-semibold text-primary-500 capitalize">{userRole}</p>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false)
                      handleSwitchUser()
                    }}
                    className="w-full text-left rounded px-2 py-1.5 text-xs text-primary-400 hover:bg-primary-500/10 hover:text-primary-500"
                  >
                    Switch User
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full text-left rounded px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-3 md:p-6 flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="w-full max-w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

