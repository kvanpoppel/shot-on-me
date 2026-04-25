'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Menu, X, LogOut, LayoutDashboard, Sparkles, Users, Settings,
  Crown, BarChart2, Bot, Star, Building2, CheckCircle2
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { venueName, tier } = useVenue()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  const userInitial = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? 'V'

  const handleLogout = () => {
    logout()
    router.push('/')
  }

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

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(path)
  }

  const navItems = [
    { href: '/dashboard',               label: 'Home',         icon: LayoutDashboard },
    { href: '/dashboard/promotions',    label: 'Deals',        icon: Sparkles },
    { href: '/dashboard/redemptions',   label: 'Guests',       icon: Users },
    { href: '/dashboard/analytics',     label: 'Analytics',    icon: BarChart2 },
    { href: '/dashboard/influencers',   label: 'Influencers',  icon: Star },
    { href: '/dashboard/automation',    label: 'Automation',   icon: Bot },
    { href: '/dashboard/profile',       label: 'Profile',      icon: Building2 },
    { href: '/dashboard/settings',      label: 'Settings',     icon: Settings },
  ]

  const isPaidTier = tier !== 'free'

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

  const SidebarFooter = ({ onClick }: { onClick?: () => void }) => {
    if (isPaidTier) {
      return (
        <Link
          href="/dashboard/profile"
          onClick={onClick}
          className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 transition-all hover:border-emerald-500/50"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-300 capitalize leading-none">{tier} Plan</p>
            <p className="text-[10px] text-emerald-400/60 mt-0.5 font-normal">AI &amp; automation unlocked</p>
          </div>
        </Link>
      )
    }
    return (
      <Link
        href="/dashboard/profile"
        onClick={onClick}
        className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-4 py-3 text-black font-bold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02]"
      >
        <Crown className="w-4 h-4 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-bold leading-none">Upgrade Plan</p>
          <p className="text-[10px] opacity-70 mt-0.5 font-normal">Unlock AI + automation</p>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-black flex overflow-x-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-52 bg-black/95 backdrop-blur-md border-r border-primary-500/10 min-h-screen flex-shrink-0 flex-col">
        <div className="p-5 flex flex-col h-full">
          <h1 className="text-xl logo-script text-primary-500 mb-8 tracking-tight">Shot On Me</h1>
          <NavLinks />
          <SidebarFooter />
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 bg-black/97 backdrop-blur-md border-r border-primary-500/10 h-full p-5 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl logo-script text-primary-500 tracking-tight">Shot On Me</h1>
              <button onClick={() => setMobileMenuOpen(false)} className="text-primary-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavLinks onClick={() => setMobileMenuOpen(false)} />
            <SidebarFooter onClick={() => setMobileMenuOpen(false)} />
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
