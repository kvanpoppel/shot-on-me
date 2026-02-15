'use client'

import { ReactNode } from 'react'

type MetricTone = 'default' | 'success' | 'info'

interface DashboardMetric {
  label: string
  value: string
  detail?: string
  tone?: MetricTone
}

interface DashboardPageShellProps {
  icon: ReactNode
  title: string
  subtitle: string
  actions?: ReactNode
  metrics?: DashboardMetric[]
  children: ReactNode
}

const toneClassMap: Record<MetricTone, string> = {
  default: 'text-primary-500',
  success: 'text-emerald-400',
  info: 'text-blue-400'
}

export default function DashboardPageShell({
  icon,
  title,
  subtitle,
  actions,
  metrics = [],
  children
}: DashboardPageShellProps) {
  return (
    <div className="space-y-4 md:space-y-5 w-full max-w-full">
      <section className="rounded-2xl border border-primary-500/25 bg-gradient-to-br from-primary-500/10 via-black/70 to-black/80 p-5 md:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg border border-primary-500/20 bg-primary-500/10">
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-primary-400">{title}</h1>
          </div>
          <p className="text-sm text-primary-500/75">{subtitle}</p>
        </div>
        {actions ? (
          <div className="mt-4 rounded-lg border border-primary-500/15 bg-black/25 p-2">
            {actions}
          </div>
        ) : null}
        {metrics.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-primary-500/20 bg-black/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-primary-400/70">{metric.label}</p>
                <p className={`mt-1 text-lg font-semibold ${toneClassMap[metric.tone || 'default']}`}>
                  {metric.value}
                </p>
                {metric.detail ? <p className="mt-0.5 text-xs text-primary-400/70">{metric.detail}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {children}
    </div>
  )
}
