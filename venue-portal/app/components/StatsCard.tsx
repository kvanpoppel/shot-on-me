'use client'

interface StatsCardProps {
  title: string
  value: string
  change: string
  icon: string
}

export default function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 hover:border-primary-500/25 hover:bg-black/50 transition-all backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary-400/70 uppercase tracking-wider truncate mb-1">{title}</p>
          <p className="text-lg font-semibold text-primary-500 tracking-tight">{value}</p>
          {change && <p className="text-xs text-primary-400/70 mt-0.5 font-light">{change}</p>}
        </div>
        <div className="text-xl opacity-70 ml-2 flex-shrink-0">{icon}</div>
      </div>
    </div>
  )
}

