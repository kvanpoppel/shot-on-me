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

const toneClassMap: Record<MetricTone, { value: string; card: string }> = {
  default: {
    value: 'text-primary-400',
    card: 'border-primary-500/25 bg-gradient-to-br from-primary-500/12 to-black/50'
  },
  success: {
    value: 'text-emerald-300',
    card: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-black/50'
  },
  info: {
    value: 'text-cyan-300',
    card: 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/15 to-black/50'
  }
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
      <section className="glass-glow rounded-2xl p-5 md:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg border border-primary-500/35 bg-gradient-to-br from-primary-500/20 to-[#6b2c91]/20">
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-primary-300">{title}</h1>
          </div>
          <p className="text-sm text-primary-400/80">{subtitle}</p>
        </div>
        {actions ? (
          <div className="mt-4 rounded-lg border border-primary-500/25 bg-gradient-to-r from-black/45 via-[#24152e]/35 to-[#0d2727]/30 p-2">
            {actions}
          </div>
        ) : null}
        {metrics.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {metrics.map((metric, index) => {
              const tone = toneClassMap[metric.tone || 'default']
              const accentClass =
                metric.tone === 'default' && index % 3 === 1
                  ? 'border-violet-500/30 bg-gradient-to-br from-violet-500/14 to-black/50'
                  : metric.tone === 'default' && index % 3 === 2
                    ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/14 to-black/50'
                    : tone.card
              return (
              <div key={metric.label} className={`glass rounded-lg px-3 py-2 ${accentClass}`}>
                <p className="text-[11px] uppercase tracking-wide text-primary-300/70">{metric.label}</p>
                <p className={`mt-1 text-lg font-semibold ${tone.value}`}>
                  {metric.value}
                </p>
                {metric.detail ? <p className="mt-0.5 text-xs text-primary-300/70">{metric.detail}</p> : null}
              </div>
            )})}
          </div>
        ) : null}
      </section>
      {children}
    </div>
  )
}
