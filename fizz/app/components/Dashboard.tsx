'use client'

import { Bell, Search, LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'

interface DashboardProps {
  onOpenSearch?: () => void
  onOpenNotifications?: () => void
  onOpenProfile?: () => void
  title?: string
  notificationCount?: number
}

export default function Dashboard({ onOpenSearch, onOpenNotifications, onOpenProfile, title, notificationCount = 0 }: DashboardProps) {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [liveCount, setLiveCount] = useState(notificationCount)

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

  const balance = user?.wallet?.balance ?? 0

  return (
    <div className="relative z-20 px-5 py-4 flex items-center justify-between safe-top" style={{ background: '#1A1A2E' }}>
      {/* Logo / Title */}
      <div>
        {title ? (
          <h1 className="text-lg font-bold text-white">{title}</h1>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <span style={{ color: '#C8F135' }}>Fi</span><span style={{ color: '#FF5F57' }}>zz</span>
            </span>
          </div>
        )}
        <p className="text-xs text-white/40 mt-0.5">
          Hey {user?.firstName} 👋
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Balance chip */}
        <div className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}>
          ${balance.toFixed(2)}
        </div>

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

        {/* Avatar / menu */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-xl overflow-hidden border-2" style={{ borderColor: 'rgba(200,241,53,0.3)' }}>
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)', color: '#1A1A2E' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-12 z-50 rounded-2xl border border-white/10 py-2 shadow-2xl" style={{ background: '#252540', minWidth: 160 }}>
                {onOpenProfile && (
                  <button
                    onClick={() => { onOpenProfile(); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <UserCircle className="w-4 h-4" />
                    My Profile
                  </button>
                )}
                <button
                  onClick={() => { logout(); setShowMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
