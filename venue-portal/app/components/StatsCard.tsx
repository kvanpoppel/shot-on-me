'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  change?: string
  icon: string
  onClick?: () => void
  href?: string
}

export default function StatsCard({ title, value, change, icon, onClick, href }: StatsCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (href) {
      router.push(href)
    }
  }

  const isClickable = onClick || href

  return (
    <div 
      onClick={isClickable ? handleClick : undefined}
      className={`glass-elevated rounded-2xl p-4 transition-all ${
        isClickable
          ? 'hover:border-primary-500/25 cursor-pointer group'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider truncate mb-1.5">{title}</p>
          <p className="text-xl font-bold text-white tracking-tight">{value}</p>
          {change && <p className="text-xs text-primary-400 mt-1 font-medium">{change}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-2xl flex-shrink-0">{icon}</div>
          {isClickable && (
            <ArrowRight className="w-4 h-4 text-primary-500/50 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          )}
        </div>
      </div>
    </div>
  )
}

