'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Menu, X, LogOut, LayoutDashboard, Sparkles,
  Users, DollarSign, Settings, Crown, CheckCircle2
} from 'lucide-react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { venueName, tier } = useVenue()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const initial = user?.firstName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'V'
  const isPaid = tier !== 'free'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    if (accountOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountOpen])

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const nav = [
    { href: '/dashboard',            label: 'Home',     icon: LayoutDashboard },
    { href: '/dashboard/promotions', label: 'Deals',    icon: Sparkles },
    { href: '/dashboard/guests',     label: 'Guests',   icon: Users },
    { href: '/dashboard/money',      label: 'Money',    icon: DollarSign },
    { href: '/dashboard/settings',   label: 'Settings', icon: Settings },
  ]

  const active = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href)

  const NavLinks = ({ close }: { close?: () => void }) => (
    <nav className="space-y-0.5">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={close}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px] relative ${
            active(href)
              ? 'bg-primary-500/15 text-primary-500 border border-primary-500/25 shadow-[0_0_12px_rgba(212,168,75,0.15)]'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )

  const PlanBadge = ({ close }: { close?: () => void }) => isPaid ? (
    <Link
      href="/dashboard/settings"
      onClick={close}
      className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-3 transition hover:border-emerald-500/40 min-h-[44px]"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      <div>
        <p className="text-xs font-bold text-emerald-300 capitalize leading-none">{tier} Plan</p>
        <p className="text-[10px] text-emerald-400/50 mt-0.5">All features unlocked</p>
      </div>
    </Link>
  ) : (
    <Link
      href="/dashboard/settings"
      onClick={close}
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-3 py-3 text-black font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20 min-h-[44px]"
    >
      <Crown className="w-4 h-4 flex-shrink-0" />
      <div>
        <p className="text-xs font-bold leading-none">Upgrade — $79/mo</p>
        <p className="text-[10px] opacity-70 mt-0.5 font-normal">Unlock AI + automation</p>
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #0A0908 0%, #0F0D0A 50%, #0A0908 100%)' }}>

      {/* ── Desktop Sidebar (lg: 1024px+ only — tablets get full-width content) ── */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 flex-col glass border-r-0" style={{ borderRadius: 0, borderRight: '1px solid rgba(212,168,75,0.08)' }}>
        <div className="flex flex-col h-full p-4 gap-6">
          <div className="px-1 pt-2">
            <h1 className="text-lg logo-script text-primary-500 tracking-tight leading-none">Shot On Me</h1>
            <p className="text-[10px] text-primary-500/40 mt-0.5 font-medium tracking-wide uppercase">Venue Portal</p>
          </div>
          <div className="flex-1">
            <NavLinks />
          </div>
          <PlanBadge />
        </div>
      </aside>

      {/* ── Mobile/Tablet Drawer (shown below lg: 1024px) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 glass-modal" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 glass flex flex-col p-4 gap-6 h-full" style={{ borderRadius: 0, borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>
            <div className="flex items-center justify-between min-h-[44px]">
              <h1 className="text-lg logo-script text-primary-500">Shot On Me</h1>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-primary-400/60 hover:text-primary-400 p-2 -mr-2 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks close={() => setMobileOpen(false)} />
            </div>
            <PlanBadge close={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 glass min-h-[56px]" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: '1px solid rgba(212,168,75,0.10)', boxShadow: '0 1px 20px rgba(212,168,75,0.04)' }}>
          <div className="flex items-center gap-3">
            {/* Hamburger — visible below lg: */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-primary-400 p-2 -ml-2 rounded-xl hover:bg-primary-500/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white truncate max-w-[200px]">{venueName}</span>
          </div>

          <div className="flex items-center gap-2" ref={accountRef}>
            <button
              onClick={() => setAccountOpen(o => !o)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 hover:border-white/20 transition-colors min-h-[44px]"
            >
              <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                <span className="text-primary-400 text-xs font-bold">{initial}</span>
              </div>
              <span className="hidden sm:block text-xs text-white/60 max-w-[100px] truncate">
                {user?.email?.split('@')[0]}
              </span>
            </button>

            {accountOpen && (
              <div className="absolute top-[58px] right-4 w-48 rounded-xl glass shadow-2xl p-2 z-50">
                <p className="px-3 py-1.5 text-[10px] text-white/30 truncate">{user?.email}</p>
                <div className="border-t border-white/5 my-1" />
                <button
                  onClick={() => { setAccountOpen(false); logout(); router.push('/') }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
          {children}
        </main>

        {/* ── Bottom nav (tablet/mobile — shown below lg:) ── */}
        <nav className="lg:hidden sticky bottom-0 z-30 flex items-center glass" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', borderTop: '1px solid rgba(212,168,75,0.10)' }}>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-all relative ${
                active(href) ? 'text-primary-500' : 'text-white/50 hover:text-white/70'
              }`}
            >
              {active(href) && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D4A84B, transparent)', boxShadow: '0 0 8px rgba(212,168,75,0.5)' }} />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          ))}
        </nav>

      </div>
    </div>
  )
}
