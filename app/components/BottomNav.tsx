'use client'

import { Home, MapPin, Wallet, User, MessageSquare, Send } from 'lucide-react'

type Tab = 'home' | 'feed' | 'map' | 'wallet' | 'profile'

interface BottomNavProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'home' as Tab, icon: Home, label: 'Home' },
    { id: 'feed' as Tab, icon: MessageSquare, label: 'Feed' },
    { id: 'map' as Tab, icon: MapPin, label: 'Venues' },
    { id: 'wallet' as Tab, icon: Send, label: 'Send Shot', action: 'send-shot' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-primary-500/10 z-50">
      <div className="flex justify-center items-center h-16 px-2 pointer-events-auto">
        <div className="flex items-center space-x-1 bg-black/40 border border-primary-500/15 rounded-full px-1 py-1 pointer-events-auto max-w-full overflow-x-auto scrollbar-hide backdrop-blur-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Tab clicked:', tab.id)
                  
                  // If it's the Send Shot button, go to wallet tab
                  if (tab.action === 'send-shot') {
                    setActiveTab('wallet')
                  } else {
                    setActiveTab(tab.id)
                  }
                }}
                type="button"
                className={`flex items-center justify-center px-2.5 py-2 rounded-full transition-all cursor-pointer flex-shrink-0 ${
                  (isActive || (tab.action === 'send-shot' && activeTab === 'wallet'))
                    ? 'bg-primary-500 text-black' 
                    : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className={`ml-1.5 text-xs font-medium ${isActive ? 'block' : 'hidden sm:block'}`}>
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

