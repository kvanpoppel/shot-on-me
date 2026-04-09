'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Menu, X, LogOut, LayoutDashboard, Sparkles, Users, Settings, Crown } from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

import { getApiUrl } from '../utils/api'

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [venueName, setVenueName] = useState<string>('Your Venue')
  const [userInitial, setUserInitial] = useState<string>('V')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = () => {
    logout()
    router.push('/')
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
      let venues: any[] = []
      if (Array.isArray(response.data)) venues = response.data
      else if (response.data?.venues) venues = response.data.venues

      const myVenue = venues[0]
      if (myVenue?.name) setVenueName(myVenue.name)
      if (user.firstName) setUserInitial(user.firstName.charAt(0).toUpperCase())
      else if (user.email) setUserInitial(user.email.charAt(0).toUpperCase())
    } catch {
      // keep defaults
    }
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(path)
  }

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/dashboard/promotions', label: 'Promotions', icon: Sparkles },
    { href: '/dashboard/redemptions', label: 'Activity', icon: Users },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-0.5 flex-1">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
            isActive(href)
              ? 'text-black bg-primary-500 font-semibold'
              : 'text-primary-400/80 hover:bg-primary-500/8 hover:text-primary-500 font-light'
          }`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-black flex overflow-x-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-52 bg-black/95 backdrop-blur-md border-r border-primary-500/10 min-h-screen flex-shrink-0 flex-col">
        <div className="p-5 flex flex-col h-full">
          <h1 className="text-xl logo-script text-primary-500 mb-8 tracking-tight">Shot On Me</h1>
          <NavLinks />

          {/* Upgrade CTA */}
          <Link
            href="/dashboard/profile"
            className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-4 py-3 text-black font-bold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02]"
          >
            <Crown className="w-4 h-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-none">Upgrade Plan</p>
              <p className="text-[10px] opacity-70 mt-0.5 font-normal">Unlock AI + automation</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 bg-black/97 backdrop-blur-md border-r border-primary-500/10 h-full p-5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl logo-script text-primary-500 tracking-tight">Shot On Me</h1>
              <button onClick={() => setMobileMenuOpen(false)} className="text-primary-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavLinks onClick={() => setMobileMenuOpen(false)} />
            <Link
              href="/dashboard/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-4 py-3 text-black font-bold text-sm"
            >
              <Crown className="w-4 h-4" />
              <div>
                <p className="text-xs font-bold leading-none">Upgrade Plan</p>
                <p className="text-[10px] opacity-70 mt-0.5 font-normal">Unlock AI + automation</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 bg-black flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top Bar */}
        <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 px-3 md:px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-primary-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base logo-script text-primary-500 truncate">{venueName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-primary-500/25 bg-black/40 px-2.5 py-1.5 text-xs text-primary-400 hover:border-primary-500/45 transition-colors"
              >
                <div className="w-6 h-6 border border-primary-500/40 rounded-full flex items-center justify-center bg-primary-500/10">
                  <span className="text-primary-500 text-xs font-semibold">{userInitial}</span>
                </div>
                <span className="hidden sm:inline text-primary-400/80 text-xs">{user?.email?.split('@')[0]}</span>
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-primary-500/20 bg-black/97 p-2 shadow-xl z-30">
                  <p className="px-2 py-1 text-[10px] text-primary-400/50 truncate">{user?.email}</p>
                  <div className="border-t border-primary-500/10 my-1" />
                  <button
                    onClick={() => { setAccountMenuOpen(false); handleLogout() }}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
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
