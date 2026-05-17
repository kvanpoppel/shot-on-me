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
  const { venueName, tier, isOwner, loading: venueLoading } = useVenue()
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

  const allNav = [
    { href: '/dashboard',            label: 'Home',     icon: LayoutDashboard, ownerOnly: false },
    { href: '/dashboard/promotions', label: 'Deals',    icon: Sparkles,        ownerOnly: false },
    { href: '/dashboard/guests',     label: 'Guests',   icon: Users,           ownerOnly: false },
    { href: '/dashboard/money',      label: 'Money',    icon: DollarSign,      ownerOnly: true },
    { href: '/dashboard/settings',   label: 'Settings', icon: Settings,        ownerOnly: false },
  ]
  const nav = allNav.filter(n => !n.ownerOnly || isOwner || venueLoading)

  const active = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href)

  const NavLinks = ({ close }: { close?: () => void }) => (
    <nav className="space-y-1">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={close}
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all min-h-[48px] relative overflow-hidden ${
            active(href)
              ? 'text-white'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
          style={active(href) ? {
            background: 'linear-gradient(135deg, rgba(212,168,75,0.18), rgba(212,168,75,0.08))',
            border: '1px solid rgba(212,168,75,0.25)',
            boxShadow: '0 0 20px rgba(212,168,75,0.10), inset 0 1px 0 rgba(255,255,255,0.06)',
          } : undefined}
        >
          {active(href) && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#D4A84B', boxShadow: '0 0 8px #D4A84B' }} />
          )}
          <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active(href) ? 'text-primary-500' : ''}`} />
          {label}
        </Link>
      ))}
    </nav>
  )

  const PlanBadge = ({ close }: { close?: () => void }) => isPaid ? (
    <Link
      href="/dashboard/settings"
      onClick={close}
      className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-3 transition hover:border-emerald-500/40 min-h-[44px]"
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
      className="flex items-center gap-2 rounded-2xl px-3 py-3 text-black font-bold text-sm hover:opacity-90 transition-all min-h-[44px]"
      style={{ background: 'linear-gradient(135deg, #D4A84B, #E5C17A)', boxShadow: '0 4px 20px rgba(212,168,75,0.25)' }}
    >
      <Crown className="w-4 h-4 flex-shrink-0" />
      <div>
        <p className="text-xs font-bold leading-none">Upgrade — $79/mo</p>
        <p className="text-[10px] opacity-60 mt-0.5 font-normal">Unlock AI + automation</p>
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen flex overflow-x-hidden relative" style={{ background: '#0C0A07' }}>
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #D4A84B, transparent 70%)' }} />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, #D4A84B, transparent 70%)' }} />
        <div className="absolute -bottom-40 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, #E5C17A, transparent 70%)' }} />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col relative z-10" style={{ background: 'linear-gradient(180deg, rgba(18,16,12,0.95), rgba(14,12,10,0.90))', backdropFilter: 'blur(24px) saturate(1.4)', WebkitBackdropFilter: 'blur(24px) saturate(1.4)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex flex-col h-full px-4 py-5 gap-6">
          {/* Brand */}
          <div className="px-2 pt-1">
            <h1 className="text-lg logo-script text-primary-500 tracking-tight leading-none">Shot On Me</h1>
            <p className="text-[10px] text-white/30 mt-1 font-medium tracking-widest uppercase">Venue Portal</p>
          </div>

          {/* Nav */}
          <div className="flex-1">
            <NavLinks />
          </div>

          {/* Plan — owner only */}
          {isOwner && <PlanBadge />}
        </div>
      </aside>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 glass-modal" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 flex flex-col px-4 py-5 gap-6 h-full shadow-2xl" style={{ background: 'rgba(14,12,10,0.92)', backdropFilter: 'blur(32px) saturate(1.3)', WebkitBackdropFilter: 'blur(32px) saturate(1.3)', borderRight: '1px solid rgba(212,168,75,0.08)' }}>
            <div className="flex items-center justify-between min-h-[44px] px-2">
              <h1 className="text-lg logo-script text-primary-500">Shot On Me</h1>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white/40 hover:text-white/70 p-2 -mr-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks close={() => setMobileOpen(false)} />
            </div>
            {isOwner && <PlanBadge close={() => setMobileOpen(false)} />}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative z-10">

        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 min-h-[60px]"
          style={{ background: 'rgba(14,12,10,0.80)', backdropFilter: 'blur(24px) saturate(1.3)', WebkitBackdropFilter: 'blur(24px) saturate(1.3)', borderBottom: '1px solid rgba(212,168,75,0.08)', boxShadow: '0 1px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(212,168,75,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-white/60 p-2 -ml-2 rounded-xl hover:bg-white/5 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-white truncate max-w-[200px]">{venueName}</span>
          </div>

          <div className="flex items-center gap-2" ref={accountRef}>
            <button
              onClick={() => setAccountOpen(o => !o)}
              className="flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5 hover:border-white/15 hover:bg-white/[0.06] transition-all min-h-[44px]"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.25), rgba(212,168,75,0.10))', border: '1px solid rgba(212,168,75,0.30)' }}>
                <span className="text-primary-500 text-xs font-bold">{initial}</span>
              </div>
              <span className="hidden sm:block text-xs text-white/60 max-w-[100px] truncate font-medium">
                {user?.email?.split('@')[0]}
              </span>
            </button>

            {accountOpen && (
              <div className="absolute top-[62px] right-4 w-52 rounded-2xl p-2.5 z-50 shadow-2xl" style={{ background: 'rgba(14,12,10,0.92)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(212,168,75,0.12)' }}>
                <p className="px-3 py-2 text-[11px] text-white/40 truncate font-medium">{user?.email}</p>
                <div className="border-t border-white/5 my-1" />
                <button
                  onClick={() => { setAccountOpen(false); logout(); router.push('/') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {children}
        </main>

        {/* ── Bottom nav ── */}
        <nav
          className="lg:hidden sticky bottom-0 z-30 flex items-center"
          style={{ background: 'rgba(14,12,10,0.88)', backdropFilter: 'blur(24px) saturate(1.3)', WebkitBackdropFilter: 'blur(24px) saturate(1.3)', borderTop: '1px solid rgba(212,168,75,0.08)' }}
        >
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 min-h-[60px] transition-all relative ${
                active(href) ? 'text-primary-500' : 'text-white/55 hover:text-white/80'
              }`}
            >
              {active(href) && (
                <>
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D4A84B, transparent)', boxShadow: '0 0 12px rgba(212,168,75,0.6), 0 0 4px rgba(212,168,75,0.3)' }} />
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-6 rounded-full opacity-20 blur-xl" style={{ background: '#D4A84B' }} />
                </>
              )}
              <Icon className={`w-[22px] h-[22px] transition-transform ${active(href) ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-semibold ${active(href) ? 'text-primary-500' : ''}`}>{label}</span>
            </Link>
          ))}
        </nav>

      </div>
    </div>
  )
}
