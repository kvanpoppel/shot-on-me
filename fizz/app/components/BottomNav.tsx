'use client'

import { Home, Compass, Send, Rss, User } from 'lucide-react'
import { Tab } from '../types'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home' },
  { id: 'discover', icon: <Compass className="w-5 h-5" />, label: 'Discover' },
  { id: 'send', icon: <Send className="w-5 h-5" />, label: 'Send Fizz' },
  { id: 'feed', icon: <Rss className="w-5 h-5" />, label: 'Feed' },
  { id: 'profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/5 safe-bottom"
      style={{ background: '#1A1A2E' }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const isSend = tab.id === 'send'
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 relative"
              style={{ minWidth: 56 }}
            >
              {isSend ? (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95"
                  style={isActive
                    ? { background: 'linear-gradient(135deg, #C8F135, #00D4FF)', color: '#1A1A2E', transform: 'translateY(-8px)' }
                    : { background: 'linear-gradient(135deg, #C8F135, #00D4FF)', color: '#1A1A2E', transform: 'translateY(-8px)' }
                  }
                >
                  {tab.icon}
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={isActive
                    ? { background: 'rgba(200,241,53,0.15)', color: '#C8F135' }
                    : { color: 'rgba(255,255,255,0.35)' }
                  }
                >
                  {tab.icon}
                </div>
              )}
              {!isSend && (
                <span
                  className="text-xs font-semibold"
                  style={isActive ? { color: '#C8F135' } : { color: 'rgba(255,255,255,0.35)' }}
                >
                  {tab.label}
                </span>
              )}
              {isSend && (
                <span className="text-xs font-semibold" style={{ color: '#C8F135' }}>
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
