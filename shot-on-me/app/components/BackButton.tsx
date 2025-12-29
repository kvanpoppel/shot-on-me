'use client'

import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  onClick?: () => void
  label?: string
  className?: string
}

export default function BackButton({ onClick, label, className = '' }: BackButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Default: go back in history or to home
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back()
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 text-primary-500 hover:text-primary-400 transition-colors ${className}`}
      aria-label={label || 'Go back'}
    >
      <ArrowLeft className="w-5 h-5" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  )
}

