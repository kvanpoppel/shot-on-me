'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Menu, X } from 'lucide-react'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  useEffect(() => {
    fetchVenueName()
  }, [token, user])

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
      
      // Improved venue matching: handle both populated owner object and owner ID string
      const myVenue = venues.find((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        const userId = user.id?.toString()
        return ownerId === userId
      })
      
      if (myVenue && myVenue.name) {
        setVenueName(myVenue.name)
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

  return (
    <div className="min-h-screen bg-black flex overflow-x-hidden">
      {/* Sidebar - Responsive */}
      <aside className="hidden md:flex w-48 bg-black/95 backdrop-blur-md border-r border-primary-500/10 min-h-screen flex-shrink-0">
        <div className="p-4 w-full">
          <h1 className="text-lg logo-script text-primary-500 mb-6 tracking-tight">Shot On Me</h1>
          <nav className="space-y-0.5">
            <Link 
              href="/dashboard" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/dashboard/promotions" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/promotions') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Promotions
            </Link>
            <Link 
              href="/dashboard/analytics" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/analytics') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Earnings
            </Link>
            <Link 
              href="/dashboard/redemptions" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/redemptions') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Redemptions
            </Link>
            <Link 
              href="/dashboard/settings" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/settings') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 text-primary-400/70 hover:bg-primary-500/5 rounded hover:text-primary-500 mt-6 text-sm font-light transition-all"
            >
              Logout
            </button>
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
              <Link 
                href="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                  isActive('/dashboard') 
                    ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                    : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/dashboard/promotions" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                  isActive('/dashboard/promotions') 
                    ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                    : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
                }`}
              >
                Promotions
              </Link>
              <Link 
                href="/dashboard/analytics" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                  isActive('/dashboard/analytics') 
                    ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                    : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
                }`}
              >
                Earnings
              </Link>
              <Link 
                href="/dashboard/redemptions" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                  isActive('/dashboard/redemptions') 
                    ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                    : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
                }`}
              >
                Redemptions
              </Link>
              <Link 
                href="/dashboard/settings" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                  isActive('/dashboard/settings') 
                    ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                    : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
                }`}
              >
                Settings
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="block w-full text-left px-3 py-2 text-primary-400/70 hover:bg-primary-500/5 rounded hover:text-primary-500 mt-6 text-sm font-light transition-all"
              >
                Logout
              </button>
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
            <Link
              href="/dashboard/settings"
              className="px-2 md:px-3 py-1.5 bg-primary-500 text-black rounded font-medium hover:bg-primary-600 text-xs transition-all whitespace-nowrap"
            >
              Notify
            </Link>
            <button 
              onClick={() => router.push('/dashboard/settings')}
              className="px-2 md:px-3 py-1.5 bg-black/40 border border-primary-500/20 text-primary-500 rounded hover:bg-primary-500/10 hover:border-primary-500/30 text-xs transition-all backdrop-blur-sm whitespace-nowrap"
            >
              Settings
            </button>
            <div className="relative ml-1 md:ml-2">
              <div className="w-7 h-7 border border-primary-500/30 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <span className="text-primary-500 text-xs font-medium">{userInitial}</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-black"></span>
            </div>
          </div>
        </div>
        <div className="p-3 md:p-6 flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="w-full max-w-full">
            {children}
          </div>ow I c
        </div>
      </main>
    </div>
  )
}

