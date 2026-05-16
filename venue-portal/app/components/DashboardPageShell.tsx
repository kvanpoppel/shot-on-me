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
    value: 'text-white',
    card: ''
  },
  success: {
    value: 'text-emerald-300',
    card: ''
  },
  info: {
    value: 'text-cyan-300',
    card: ''
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
      <section className="glass-glow rounded-3xl p-6 md:p-7">
        <div className="space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,168,75,0.20), rgba(212,168,75,0.08))', border: '1px solid rgba(212,168,75,0.25)' }}>
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
          </div>
          <p className="text-sm text-white/50">{subtitle}</p>
        </div>
        {actions ? (
          <div className="mt-4 rounded-lg border border-primary-500/25 bg-gradient-to-r from-black/45 via-[#24152e]/35 to-[#0d2727]/30 p-2">
            {actions}
          </div>
        ) : null}
        {metrics.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {metrics.map((metric) => {
              const tone = toneClassMap[metric.tone || 'default']
              return (
              <div key={metric.label} className="glass-elevated rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{metric.label}</p>
                <p className={`mt-1.5 text-xl font-bold ${tone.value}`}>
                  {metric.value}
                </p>
                {metric.detail ? <p className="mt-1 text-xs text-white/40">{metric.detail}</p> : null}
              </div>
            )})}
          </div>
        ) : null}
      </section>
      {children}
    </div>
  )
}
