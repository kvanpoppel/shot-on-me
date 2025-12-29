'use client'

import { Clock, Zap, Calendar, Gift } from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  action: () => void
  color: string
}

interface QuickActionsProps {
  onStartHappyHour: () => void
  onFlashDeal: () => void
  onWeekendSpecial: () => void
  onVipExclusive: () => void
}

export default function QuickActions({
  onStartHappyHour,
  onFlashDeal,
  onWeekendSpecial,
  onVipExclusive
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: 'happy-hour',
      label: 'Start Happy Hour',
      description: 'Activate now (4-7 PM)',
      icon: <Clock className="w-5 h-5" />,
      action: onStartHappyHour,
      color: 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-blue-500'
    },
    {
      id: 'flash-deal',
      label: 'Flash Deal',
      description: '1-hour limited offer',
      icon: <Zap className="w-5 h-5" />,
      action: onFlashDeal,
      color: 'bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30 text-yellow-500'
    },
    {
      id: 'weekend',
      label: 'Weekend Special',
      description: 'All weekend long',
      icon: <Calendar className="w-5 h-5" />,
      action: onWeekendSpecial,
      color: 'bg-green-500/20 border-green-500/30 hover:bg-green-500/30 text-green-500'
    },
    {
      id: 'vip',
      label: 'VIP Exclusive',
      description: 'For VIP customers',
      icon: <Gift className="w-5 h-5" />,
      action: onVipExclusive,
      color: 'bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 text-purple-500'
    }
  ]

  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-4 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-primary-500 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`p-3 rounded-lg border transition-all ${action.color} flex flex-col items-center gap-2`}
          >
            {action.icon}
            <div className="text-center">
              <div className="text-xs font-medium">{action.label}</div>
              <div className="text-xs opacity-70">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}



