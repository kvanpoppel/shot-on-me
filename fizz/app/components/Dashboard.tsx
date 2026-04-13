'use client'

import { Bell, LogOut, UserCircle, Settings, Gift, ChevronDown, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface DashboardProps {
  onOpenProfile?: () => void
  onOpenWallet?: () => void
  onOpenSettings?: () => void
  onOpenNotifications?: () => void
  onOpenRewards?: () => void
  notificationCount?: number
}

export default function Dashboard({
  onOpenProfile,
  onOpenWallet,
  onOpenSettings,
  onOpenNotifications,
  onOpenRewards,
  notificationCount = 0,
}: DashboardProps) {
  const { user, token, logout } = useAuth()
  const API_URL = useApiUrl()
  const [showMenu, setShowMenu] = useState(false)
  const [liveCount, setLiveCount] = useState(notificationCount)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLiveCount(notificationCount) }, [notificationCount])

  // Live notification count
  useEffect(() => {
    if (!token || !API_URL) return
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_URL}/fizz/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const notifs = res.data.notifications || res.data || []
        setLiveCount(notifs.filter((n: any) => !n.read).length)
      } catch { /* ignore */ }
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [token, API_URL])

  useEffect(() => {
    const handleNew = () => setLiveCount(c => c + 1)
    window.addEventListener('new-notification', handleNew)
    window.addEventListener('socket-notification', handleNew)
    return () => {
      window.removeEventListener('new-notification', handleNew)
      window.removeEventListener('socket-notification', handleNew)
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const balance = user?.fizzWallet?.balance ?? user?.wallet?.balance ?? 0
  const firstName = user?.fizzProfile?.firstName || user?.firstName || ''
  const lastName = user?.fizzProfile?.lastName || user?.lastName || ''
  const profilePic = user?.fizzProfile?.profilePicture || user?.profilePicture

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 safe-top"
      style={{ background: 'rgba(26,26,46,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(200,241,53,0.07)' }}
    >
      <div className="flex items-center justify-between px-3 py-2">

        {/* ── LEFT: Avatar + name + dropdown ── */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(o => !o)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/5"
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2"
              style={{ borderColor: 'rgba(200,241,53,0.3)' }}
            >
              {profilePic ? (
                <img src={profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)', color: '#1A1A2E' }}
                >
                  {firstName?.[0]}{lastName?.[0]}
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold leading-none" style={{ color: '#C8F135' }}>
                {firstName} {lastName}
              </p>
              <p className="text-xs mt-0.5 leading-none" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {user?.email}
              </p>
            </div>

            <ChevronDown
              className="w-4 h-4 transition-transform flex-shrink-0"
              style={{
                color: 'rgba(255,255,255,0.4)',
                transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div
              className="absolute left-0 top-full mt-2 rounded-2xl border overflow-hidden shadow-2xl z-50"
              style={{ background: '#1C1C32', borderColor: 'rgba(200,241,53,0.15)', minWidth: 210 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-semibold text-white truncate">{firstName} {lastName}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="p-1.5 space-y-0.5">
                {[
                  { icon: UserCircle, label: 'Profile',       action: onOpenProfile },
                  { icon: Settings,   label: 'Settings',      action: onOpenSettings },
                  { icon: Bell,       label: 'Notifications', action: onOpenNotifications, badge: liveCount },
                  { icon: Gift,       label: 'Rewards',       action: onOpenRewards },
                ].map(({ icon: Icon, label, action, badge }) => (
                  <button
                    key={label}
                    onClick={() => { setShowMenu(false); action?.() }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#C8F135' }} />
                    <span className="flex-1">{label}</span>
                    {badge && badge > 0 ? (
                      <span
                        className="text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                        style={{ background: '#C8F135', color: '#1A1A2E' }}
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="border-t p-1.5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => { setShowMenu(false); logout() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                  style={{ color: 'rgba(239,68,68,0.7)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Wallet chip + Bell ── */}
        <div className="flex items-center gap-2">
          {/* Wallet chip */}
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all"
            style={{
              background: 'rgba(200,241,53,0.10)',
              borderColor: 'rgba(200,241,53,0.25)',
              color: '#C8F135',
            }}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="text-sm font-semibold leading-none">
              {balance > 0 ? `$${balance.toFixed(2)}` : 'Add Funds'}
            </span>
          </button>

          {/* Bell */}
          <button
            onClick={() => { onOpenNotifications?.(); setLiveCount(0) }}
            className="relative p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: '#C8F135' }}
          >
            <Bell className="w-5 h-5" />
            {liveCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: '#C8F135', color: '#1A1A2E' }}
              >
                {liveCount > 9 ? '9+' : liveCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
