'use client'

import { Clock, Zap, Calendar, Crown } from 'lucide-react'

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
  const actions = [
    {
      id: 'happy-hour',
      label: 'Happy Hour',
      emoji: '🍻',
      description: 'Activate now',
      action: onStartHappyHour,
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.20), rgba(59,130,246,0.06))',
      border: 'rgba(59,130,246,0.30)',
      glow: 'rgba(59,130,246,0.15)',
      iconColor: '#60A5FA',
      Icon: Clock,
    },
    {
      id: 'flash-deal',
      label: 'Flash Deal',
      emoji: '⚡',
      description: '1-hour offer',
      action: onFlashDeal,
      gradient: 'linear-gradient(135deg, rgba(234,179,8,0.20), rgba(234,179,8,0.06))',
      border: 'rgba(234,179,8,0.30)',
      glow: 'rgba(234,179,8,0.15)',
      iconColor: '#FBBF24',
      Icon: Zap,
    },
    {
      id: 'weekend',
      label: 'Weekend Special',
      emoji: '🎉',
      description: 'All weekend',
      action: onWeekendSpecial,
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.20), rgba(34,197,94,0.06))',
      border: 'rgba(34,197,94,0.30)',
      glow: 'rgba(34,197,94,0.15)',
      iconColor: '#4ADE80',
      Icon: Calendar,
    },
    {
      id: 'vip',
      label: 'VIP Night',
      emoji: '👑',
      description: 'Exclusive access',
      action: onVipExclusive,
      gradient: 'linear-gradient(135deg, rgba(168,85,247,0.20), rgba(168,85,247,0.06))',
      border: 'rgba(168,85,247,0.30)',
      glow: 'rgba(168,85,247,0.15)',
      iconColor: '#C084FC',
      Icon: Crown,
    },
  ]

  return (
    <div className="glass-elevated rounded-2xl p-5">
      <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Quick Launch</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={a.action}
            className="group relative rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            style={{ background: a.gradient, border: `1px solid ${a.border}`, boxShadow: `0 4px 20px ${a.glow}` }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xl">{a.emoji}</span>
              <a.Icon className="w-4 h-4" style={{ color: a.iconColor }} />
            </div>
            <p className="text-sm font-bold text-white mb-0.5">{a.label}</p>
            <p className="text-[11px] text-white/40">{a.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
