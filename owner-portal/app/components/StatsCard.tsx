'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  subtitle?: string
  trend?: string
  color?: string
  href?: string
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  color = 'text-primary-500',
  href
}: StatsCardProps) {
  const content = (
    <div className="bg-black border-2 border-primary-500/30 rounded-lg p-6 hover:border-primary-500/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-primary-400/70 text-sm font-medium mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-primary-500/10 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {subtitle && (
        <p className="text-primary-400/60 text-sm mb-2">{subtitle}</p>
      )}
      {trend && (
        <p className="text-primary-500/80 text-xs font-medium">{trend}</p>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

