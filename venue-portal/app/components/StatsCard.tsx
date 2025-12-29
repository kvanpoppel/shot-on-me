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
      className={`bg-black/40 border border-primary-500/15 rounded-lg p-3 transition-all backdrop-blur-sm ${
        isClickable 
          ? 'hover:border-primary-500/40 hover:bg-black/60 cursor-pointer group' 
          : 'hover:border-primary-500/25 hover:bg-black/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary-400/70 uppercase tracking-wider truncate mb-1">{title}</p>
          <p className="text-lg font-semibold text-primary-500 tracking-tight">{value}</p>
          {change && <p className="text-xs text-primary-400/70 mt-0.5 font-light">{change}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xl opacity-70 flex-shrink-0">{icon}</div>
          {isClickable && (
            <ArrowRight className="w-4 h-4 text-primary-500/50 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          )}
        </div>
      </div>
    </div>
  )
}

