'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
  icon?: ReactNode
  actionButton?: ReactNode
}

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
  icon,
  actionButton
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-black/40 border border-primary-500/20 rounded-lg overflow-hidden">
      <div className="w-full flex items-center justify-between p-4 hover:bg-black/20 transition-colors">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center space-x-3 text-left"
        >
          {icon && <div className="text-primary-500">{icon}</div>}
          <div>
            <h3 className="text-sm font-semibold text-primary-500">{title}</h3>
            {subtitle && <p className="text-xs text-primary-400/70 mt-0.5">{subtitle}</p>}
          </div>
        </button>
        <div className="flex items-center space-x-2">
          {actionButton}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-primary-500/10 rounded transition-colors"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-primary-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary-500" />
            )}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-primary-500/10 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  )
}

