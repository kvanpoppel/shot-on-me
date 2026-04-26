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

  const nav = [
    { href: '/dashboard',             label: 'Home',     icon: LayoutDashboard },
    { href: '/dashboard/promotions',  label: 'Deals',    icon: Sparkles },
    { href: '/dashboard/guests',      label: 'Guests',   icon: Users },
    { href: '/dashboard/money',       label: 'Money',    icon: DollarSign },
    { href: '/dashboard/settings',    label: 'Settings', icon: Settings },
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            active(href)
              ? 'bg-primary-500 text-black'
              : 'text-primary-400/70 hover:bg-primary-500/10 hover:text-primary-400'
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
      className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 transition hover:border-emerald-500/40"
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
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-amber-400 px-3 py-2.5 text-black font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20"
    >
      <Crown className="w-4 h-4 flex-shrink-0" />
      <div>
        <p className="text-xs font-bold leading-none">Upgrade — $79/mo</p>
        <p className="text-[10px] opacity-70 mt-0.5 font-normal">Unlock AI + automation</p>
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen bg-black flex overflow-x-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-48 flex-shrink-0 flex-col border-r border-white/5 bg-black">
        <div className="flex flex-col h-full p-4 gap-6">
          {/* Logo */}
          <div className="px-1 pt-2">
            <h1 className="text-lg logo-script text-primary-500 tracking-tight leading-none">Shot On Me</h1>
            <p className="text-[10px] text-primary-500/40 mt-0.5 font-medium tracking-wide uppercase">Venue Portal</p>
          </div>

          {/* Nav */}
          <div className="flex-1">
            <NavLinks />
          </div>

          {/* Plan */}
          <PlanBadge />
        </div>
      </aside>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-56 bg-black border-r border-white/5 flex flex-col p-4 gap-6 h-full">
            <div className="flex items-center justify-between">
              <h1 className="text-lg logo-script text-primary-500">Shot On Me</h1>
              <button onClick={() => setMobileOpen(false)} className="text-primary-400/60 hover:text-primary-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              <NavLinks close={() => setMobileOpen(false)} />
            </div>
            <PlanBadge close={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-primary-400">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white truncate max-w-[160px]">{venueName}</span>
          </div>

          <div className="flex items-center gap-2" ref={accountRef}>
            <button
              onClick={() => setAccountOpen(o => !o)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 hover:border-white/20 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                <span className="text-primary-400 text-xs font-bold">{initial}</span>
              </div>
              <span className="hidden sm:block text-xs text-white/60">{user?.email?.split('@')[0]}</span>
            </button>

            {accountOpen && (
              <div className="absolute top-14 right-4 w-44 rounded-xl border border-white/10 bg-black shadow-2xl p-2 z-50">
                <p className="px-2 py-1 text-[10px] text-white/30 truncate">{user?.email}</p>
                <div className="border-t border-white/5 my-1" />
                <button
                  onClick={() => { setAccountOpen(false); logout(); router.push('/') }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
