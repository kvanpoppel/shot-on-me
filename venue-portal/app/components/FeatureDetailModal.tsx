'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface FeatureDetailModalProps {
  isOpen: boolean
  onClose: () => void
  feature: {
    icon: LucideIcon
    title: string
    description: string
    details: string
    integration: string
    benefits: string[]
  } | null
}

export default function FeatureDetailModal({ isOpen, onClose, feature }: FeatureDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Keyboard navigation: ESC to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    
    // Focus management: trap focus within modal
    if (closeButtonRef.current) {
      closeButtonRef.current.focus()
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !feature) return null

  const Icon = feature.icon

  return (
    <div 
      className="fixed inset-0 z-50 bg-black animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-modal-title"
    >
      <div 
        ref={modalRef}
        className="w-full h-full flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-primary-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-md">
              <Icon className="w-4 h-4 text-primary-500" />
            </div>
            <h2 id="feature-modal-title" className="text-lg font-semibold text-primary-500">{feature.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 hover:bg-primary-500/10 rounded-md transition-colors text-primary-400 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <div>
            <p className="text-sm text-primary-400/90 leading-relaxed">{feature.description}</p>
          </div>

          {/* Detailed Information */}
          <div>
            <h3 className="text-sm font-semibold text-primary-500 mb-2 uppercase tracking-wide">How It Works</h3>
            <p className="text-sm text-primary-300/90 leading-relaxed">{feature.details}</p>
          </div>

          {/* Integration with Shot on Me */}
          <div>
            <h3 className="text-sm font-semibold text-primary-500 mb-2 uppercase tracking-wide">Integration with Shot on Me App</h3>
            <p className="text-sm text-primary-300/90 leading-relaxed">{feature.integration}</p>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="text-sm font-semibold text-primary-500 mb-3 uppercase tracking-wide">Key Benefits</h3>
            <ul className="space-y-2.5">
              {feature.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-primary-300/90">
                  <span className="text-primary-500 mt-0.5 flex-shrink-0 text-xs">▸</span>
                  <span className="leading-relaxed">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

