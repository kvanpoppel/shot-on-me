'use client'

import { Plus, FileText, Calendar, Bell, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QuickAccessBarProps {
  onNewPromotion?: () => void
  onShowTemplates?: () => void
  onQuickAction?: (action: string) => void
}

export default function QuickAccessBar({ 
  onNewPromotion, 
  onShowTemplates,
  onQuickAction 
}: QuickAccessBarProps) {
  const router = useRouter()

  const quickLinks = [
    { 
      label: 'New Promotion', 
      icon: <Plus className="w-4 h-4" />, 
      action: () => onNewPromotion?.() || router.push('/dashboard/promotions'),
      primary: true
    },
    { 
      label: 'Templates', 
      icon: <FileText className="w-4 h-4" />, 
      action: () => onShowTemplates?.() || router.push('/dashboard/promotions'),
      primary: false
    },
    { 
      label: 'Analytics', 
      icon: <TrendingUp className="w-4 h-4" />, 
      action: () => router.push('/dashboard/analytics'),
      primary: false
    },
    { 
      label: 'Schedule', 
      icon: <Calendar className="w-4 h-4" />, 
      action: () => router.push('/dashboard/settings'),
      primary: false
    },
    { 
      label: 'Notifications', 
      icon: <Bell className="w-4 h-4" />, 
      action: () => router.push('/dashboard/analytics?tab=notifications'),
      primary: false
    }
  ]

  return (
    <div className="bg-black/60 backdrop-blur-md border border-primary-500/20 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Primary Actions */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {quickLinks.map((link, index) => (
            <button
              key={index}
              onClick={link.action}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all whitespace-nowrap ${
                link.primary
                  ? 'bg-primary-500 text-black hover:bg-primary-600 shadow-lg shadow-primary-500/20'
                  : 'bg-black/40 border border-primary-500/20 text-primary-500 hover:bg-primary-500/10 hover:border-primary-500/30'
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Promotion Actions - Compact inline version */}
        {onQuickAction && (
          <div className="flex items-center gap-1.5 border-l border-primary-500/20 pl-2 ml-2">
            <button
              onClick={() => onQuickAction('happy-hour')}
              className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-500 rounded text-xs hover:bg-blue-500/30 transition-all"
              title="Start Happy Hour"
            >
              🍺 HH
            </button>
            <button
              onClick={() => onQuickAction('flash-deal')}
              className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 rounded text-xs hover:bg-yellow-500/30 transition-all"
              title="Flash Deal"
            >
              ⚡ Flash
            </button>
            <button
              onClick={() => onQuickAction('weekend')}
              className="px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-500 rounded text-xs hover:bg-green-500/30 transition-all"
              title="Weekend Special"
            >
              📅 Weekend
            </button>
            <button
              onClick={() => onQuickAction('vip')}
              className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-500 rounded text-xs hover:bg-purple-500/30 transition-all"
              title="VIP Exclusive"
            >
              👑 VIP
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

