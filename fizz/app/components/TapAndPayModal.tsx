'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { X, Smartphone, QrCode, Zap } from 'lucide-react'

interface TapAndPayModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TapAndPayModal({ isOpen, onClose }: TapAndPayModalProps) {
  const { user } = useAuth()
  const userId = user?.id || (user as any)?._id || ''
  const balance = user?.wallet?.balance ?? 0

  if (!isOpen) return null

  const qrData = JSON.stringify({ userId, type: 'fizz-pay', timestamp: Date.now() })

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

        {/* Balance */}
        <div className="fizz-card p-4 flex items-center justify-between mb-6">
          <span className="text-white/50 text-sm">Wallet balance</span>
          <span className="text-2xl font-black" style={{ color: '#C8F135' }}>${balance.toFixed(2)}</span>
        </div>

        {/* QR section */}
        <div className="text-center mb-6">
          <div
            className="w-48 h-48 rounded-3xl mx-auto flex items-center justify-center mb-4 relative overflow-hidden"
            style={{ background: '#fff', padding: 16 }}
          >
            {/* Simplified QR visual */}
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode className="w-32 h-32 text-black opacity-30" />
            </div>
            <div className="relative z-10 text-center">
              <div className="text-4xl mb-1">🫧</div>
              <p className="text-xs font-black text-black">Fizz Pay</p>
              <p className="text-[9px] text-black/50 font-mono mt-1 truncate max-w-[120px]">{userId.slice(-8)}</p>
            </div>
          </div>
          <p className="text-sm text-white/50 mb-1">Show this to the venue cashier</p>
          <p className="text-xs text-white/30">They'll scan your code to accept payment</p>
        </div>

        {/* Instructions */}
        <div className="flex flex-col gap-3">
          {[
            { icon: <QrCode className="w-4 h-4" style={{ color: '#C8F135' }} />, text: 'Venue scans your Fizz Pay QR code' },
            { icon: <Zap className="w-4 h-4" style={{ color: '#00D4FF' }} />, text: 'Amount is deducted from your wallet instantly' },
            { icon: <Smartphone className="w-4 h-4" style={{ color: '#FF5F57' }} />, text: 'You get a real-time confirmation' },
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
