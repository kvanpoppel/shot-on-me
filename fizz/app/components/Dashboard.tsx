'use client'

import { Bell, Search, LogOut, UserCircle, MessageSquare, Settings, Wallet, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface DashboardProps {
  onOpenSearch?: () => void
  onOpenNotifications?: () => void
  onOpenProfile?: () => void
  onOpenMessages?: () => void
  onOpenWallet?: () => void
  onOpenSettings?: () => void
  title?: string
  notificationCount?: number
}

export default function Dashboard({
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  onOpenMessages,
  onOpenWallet,
  onOpenSettings,
  title,
  notificationCount = 0,
}: DashboardProps) {
  const { user, token, logout } = useAuth()
  const API_URL = useApiUrl()
  const [showMenu, setShowMenu] = useState(false)
  const [liveCount, setLiveCount] = useState(notificationCount)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { setLiveCount(notificationCount) }, [notificationCount])

  useEffect(() => {
    const handleNew = () => setLiveCount(c => c + 1)
    window.addEventListener('new-notification', handleNew)
    window.addEventListener('socket-notification', handleNew)
    return () => {
      window.removeEventListener('new-notification', handleNew)
      window.removeEventListener('socket-notification', handleNew)
    }
  }, [])

  // Close menu on outside click
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

  // Unread message count
  useEffect(() => {
    if (!token || !API_URL) return
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_URL}/fizz/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
        setUnreadMessages(res.data.count ?? res.data.unreadCount ?? 0)
      } catch { /* ignore */ }
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [token, API_URL])

  useEffect(() => {
    const handleNewMsg = () => setUnreadMessages(c => c + 1)
    window.addEventListener('new-message', handleNewMsg)
    return () => window.removeEventListener('new-message', handleNewMsg)
  }, [])

  const balance = user?.fizzWallet?.balance ?? user?.wallet?.balance ?? 0
  const displayName = user?.fizzProfile?.firstName || user?.firstName || ''
  const lastName = user?.fizzProfile?.lastName || user?.lastName || ''
  const username = user?.fizzProfile?.username || user?.username || ''
  const profilePic = user?.fizzProfile?.profilePicture || user?.profilePicture

  return (
    <div className="relative z-20 px-5 py-3 flex items-center justify-between safe-top" style={{ background: '#1A1A2E' }}>

      {/* ── Left: Profile dropdown trigger ── */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(o => !o)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/5 active:bg-white/8"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1.5px solid rgba(200,241,53,0.35)' }}>
            {profilePic ? (
              <img src={profilePic} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)', color: '#1A1A2E' }}>
                {displayName?.[0]}{lastName?.[0]}
              </div>
            )}
          </div>

          {/* Name + wordmark */}
          <div className="text-left">
            {title ? (
              <p className="text-sm font-bold text-white leading-none">{title}</p>
            ) : (
              <p className="text-sm font-black tracking-tight leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <span style={{ color: '#C8F135' }}>Fi</span><span style={{ color: '#FF5F57' }}>zz</span>
              </p>
            )}
            <p className="text-[11px] text-white/40 mt-0.5 leading-none">
              Hey {displayName} 👋
            </p>
          </div>

          <ChevronDown
            className="w-3.5 h-3.5 text-white/30 transition-transform"
            style={{ transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {/* Dropdown */}
        {showMenu && (
          <div
            className="absolute left-0 top-full mt-2 rounded-2xl border py-2 shadow-2xl z-50"
            style={{ background: '#252540', borderColor: 'rgba(255,255,255,0.10)', minWidth: 200 }}
          >
            {/* User info header */}
            <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white">{displayName} {lastName}</p>
              {username && <p className="text-xs text-white/40 mt-0.5">@{username}</p>}
            </div>

            {/* Balance */}
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <span className="text-xs text-white/50">Fizz Wallet</span>
              <span className="text-sm font-bold" style={{ color: '#C8F135' }}>${balance.toFixed(2)}</span>
            </div>

            {/* Actions */}
            {onOpenProfile && (
              <button
                onClick={() => { onOpenProfile(); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <UserCircle className="w-4 h-4" />
                My Profile
              </button>
            )}
            {onOpenWallet && (
              <button
                onClick={() => { onOpenWallet(); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                My Wallet
              </button>
            )}
            {onOpenSettings && (
              <button
                onClick={() => { onOpenSettings(); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            )}

            <div className="border-t my-1" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />

            <button
              onClick={() => { logout(); setShowMenu(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{ color: '#FF5F57' }}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Right: icons ── */}
      <div className="flex items-center gap-1.5">
        {/* Messages */}
        <button
          onClick={() => { onOpenMessages?.(); setUnreadMessages(0) }}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <MessageSquare className="w-5 h-5 text-white/60" />
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: '#00D4FF', color: '#1A1A2E' }}>
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={() => { onOpenNotifications?.(); setLiveCount(0) }}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <Bell className="w-5 h-5 text-white/60" />
          {liveCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: '#FF5F57', color: '#fff' }}>
              {liveCount > 9 ? '9+' : liveCount}
            </span>
          )}
        </button>

        {/* Search */}
        {onOpenSearch && (
          <button onClick={onOpenSearch} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
            <Search className="w-5 h-5 text-white/60" />
          </button>
        )}
      </div>
    </div>
  )
}
