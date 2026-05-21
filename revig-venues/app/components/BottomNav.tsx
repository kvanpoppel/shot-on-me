'use client'

import { LayoutDashboard, Receipt, Sparkles, Wallet, Settings } from 'lucide-react'

type Tab = 'dashboard' | 'deals' | 'redemptions' | 'payouts' | 'settings'

interface BottomNavProps {
  active: Tab
  onChange: (t: Tab) => void
}

const TABS = [
  { id: 'dashboard' as Tab,    icon: LayoutDashboard, label: 'Home' },
  { id: 'deals' as Tab,        icon: Sparkles,        label: 'Deals' },
  { id: 'redemptions' as Tab,  icon: Receipt,         label: 'Activity' },
  { id: 'payouts' as Tab,      icon: Wallet,          label: 'Money' },
  { id: 'settings' as Tab,     icon: Settings,        label: 'Settings' },
]

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="flex-shrink-0 flex items-stretch safe-bottom border-t"
      style={{ background: '#1A1A2E', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {TABS.map(tab => {
        const isActive = active === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-1 transition-colors"
          >
            <Icon
              className="w-5 h-5"
              style={{ color: isActive ? '#C8F135' : 'rgba(255,255,255,0.3)' }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: isActive ? '#C8F135' : 'rgba(255,255,255,0.3)' }}
            >
              {tab.label}
            </span>
            {isActive && (
              <div className="w-4 h-0.5 rounded-full absolute bottom-1" style={{ background: '#C8F135' }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}

export type { Tab }
