'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  }

  const styles = {
    success: 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300',
    error: 'bg-red-900/30 border-red-500/50 text-red-300',
    info: 'bg-blue-900/30 border-blue-500/50 text-blue-300',
    warning: 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300',
  }

  const Icon = icons[toast.type]

  return (
    <div
      className={`${styles[toast.type]} border rounded-lg px-4 py-3 flex items-start gap-3 shadow-lg animate-fade-in min-w-[300px] max-w-md`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 hover:bg-black/20 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

