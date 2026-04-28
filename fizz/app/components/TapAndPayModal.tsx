'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { X, Smartphone, Wallet, Copy, Check, Zap } from 'lucide-react'

interface TapAndPayModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Derive a short alphanumeric payment code from the user ID + today's date */
function derivePaymentCode(userId: string): string {
  // Simple hash: combine userId chars into a numeric seed, then base-36 encode
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const raw = userId + today
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
  }
  // Convert to positive 6-char uppercase alphanumeric
  const code = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)
  return `FZ-${code}`
}

export default function TapAndPayModal({ isOpen, onClose }: TapAndPayModalProps) {
  const { user } = useAuth()
  const userId = user?.id || (user as any)?._id || ''
  const balance = user?.wallet?.balance ?? 0
  const [copied, setCopied] = useState(false)

  const paymentCode = useMemo(() => derivePaymentCode(userId), [userId])

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API may fail in some contexts
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 safe-bottom animate-slide-up"
        style={{ background: '#1A1A2E', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.15)' }} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Tap & Pay</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Balance — large and prominent */}
        <div className="rounded-3xl p-6 mb-6 text-center" style={{ background: 'linear-gradient(135deg, #252540 0%, #1A1A2E 100%)', border: '1px solid rgba(200,241,53,0.2)' }}>
          <p className="text-white/50 text-sm mb-1">Your Fizz Balance</p>
          <p className="text-5xl font-black mb-1" style={{ color: '#C8F135', fontFamily: 'Poppins, sans-serif' }}>
            ${balance.toFixed(2)}
          </p>
          <p className="text-white/30 text-xs">Available to spend</p>
        </div>

        {/* Payment code card */}
        <div className="rounded-3xl p-5 mb-4 text-center" style={{ background: '#252540' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wallet className="w-5 h-5" style={{ color: '#C8F135' }} />
            <p className="text-white/80 text-sm font-semibold">Your Payment Code</p>
          </div>

          {/* The code */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl mb-3 transition-all active:scale-95"
            style={{ background: 'rgba(200,241,53,0.1)', border: '2px dashed rgba(200,241,53,0.4)' }}
          >
            <span className="text-2xl font-black tracking-[0.2em]" style={{ color: '#C8F135', fontFamily: 'monospace' }}>
              {paymentCode}
            </span>
            {copied ? (
              <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#C8F135' }} />
            ) : (
              <Copy className="w-4 h-4 flex-shrink-0 text-white/30" />
            )}
          </button>

          <p className="text-white font-bold text-base mb-1">Show this to your cashier</p>
          <p className="text-white/40 text-xs">They will enter your code to process payment from your Fizz wallet</p>
        </div>

        {/* NFC coming soon */}
        <div className="rounded-2xl px-4 py-3 mb-6 flex items-center gap-3" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
          <Smartphone className="w-5 h-5 flex-shrink-0" style={{ color: '#00D4FF' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#00D4FF' }}>NFC Tap coming soon</p>
            <p className="text-xs text-white/30">Tap your phone to pay at supported venues</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="flex flex-col gap-3">
          {[
            { icon: <Wallet className="w-4 h-4" style={{ color: '#C8F135' }} />, text: 'Show your payment code to the cashier' },
            { icon: <Zap className="w-4 h-4" style={{ color: '#00D4FF' }} />, text: 'Amount is deducted from your Fizz wallet instantly' },
            { icon: <Smartphone className="w-4 h-4" style={{ color: '#FF5F57' }} />, text: 'You get a real-time balance update' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#252540' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {step.icon}
              </div>
              <p className="text-sm text-white/60">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
