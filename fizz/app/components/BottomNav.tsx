'use client'

import { Home, Newspaper, Coffee, Wallet, MessageSquare, Send } from 'lucide-react'
import { Tab } from '../types'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'home',     icon: Home,          label: 'Home' },
  { id: 'feed',     icon: Newspaper,     label: 'Feed' },
  { id: 'sips',     icon: Coffee,        label: 'Discover' },
  { id: 'wallet',   icon: Wallet,        label: 'Wallet' },
  { id: 'messages', icon: MessageSquare, label: 'Messages' },
  { id: 'send',     icon: Send,          label: 'Send' },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t safe-bottom"
      style={{ background: '#1A1A2E', borderColor: 'rgba(200,241,53,0.08)' }}
    >
      <div className="flex justify-center items-center h-14 px-2">
        <div
          className="flex items-center px-0.5 py-0.5 overflow-x-auto"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(200,241,53,0.12)',
            borderRadius: 9999,
            backdropFilter: 'blur(8px)',
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            const isSend = tab.id === 'send'
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center px-2.5 py-1.5 transition-all flex-shrink-0"
                style={{
                  minWidth: 52,
                  borderRadius: 9999,
                  background: isActive
                    ? '#C8F135'
                    : isSend
                    ? 'rgba(200,241,53,0.12)'
                    : 'transparent',
                  color: isActive
                    ? '#1A1A2E'
                    : isSend
                    ? '#C8F135'
                    : 'rgba(255,255,255,0.38)',
                }}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span
                  className="font-semibold leading-none"
                  style={{ fontSize: 9 }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
