'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { X, Send, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useApiUrl } from '../utils/api'

interface QuickSendDrinkSheetProps {
  recipientId: string
  recipientName: string
  recipientFirstName?: string
  recipientAvatar?: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: (amount: number) => void
}

const QUICK_AMOUNTS = [
  { value: 5,  label: '$5',  tagline: 'A drink',    emoji: '🍺', drinkWord: 'a drink',    successWord: 'Cheers!' },
  { value: 10, label: '$10', tagline: 'A round',    emoji: '🍻', drinkWord: 'a round',    successWord: 'Round on you!' },
  { value: 25, label: '$25', tagline: 'Bubbly',     emoji: '🥂', drinkWord: 'some bubbly', successWord: 'Living large!' },
]

type Step = 'amount' | 'otp' | 'success'

export default function QuickSendDrinkSheet({
  recipientId,
  recipientName,
  recipientFirstName,
  recipientAvatar,
  isOpen,
  onClose,
  onSuccess,
}: QuickSendDrinkSheetProps) {
  const { token, user, updateUser } = useAuth()
  const API_URL = useApiUrl()

  const [step, setStep] = useState<Step>('amount')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [note, setNote] = useState('Cheers! 🥂')
  const [postToFeed, setPostToFeed] = useState(true)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [celebrationActive, setCelebrationActive] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const customAmountRef = useRef<HTMLInputElement>(null)

  const balance = (user as any)?.wallet?.balance || 0
  const displayName = recipientFirstName || recipientName.split(' ')[0]
  const finalAmount = isCustom ? parseFloat(customAmount) : selectedAmount
  const activeDrink = QUICK_AMOUNTS.find(a => a.value === selectedAmount && !isCustom)
  const drinkLabel = activeDrink ? `${activeDrink.drinkWord} ${activeDrink.emoji}` : isCustom ? '💸' : '🍺'
  const successLabel = activeDrink ? activeDrink.successWord : 'Cheers!'

  // iOS-safe scroll lock: use position:fixed trick so background doesn't scroll
  // while the sheet's inner div stays scrollable
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      const top = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (top) window.scrollTo(0, parseInt(top) * -1)
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setStep('amount')
      setSelectedAmount(null)
      setCustomAmount('')
      setIsCustom(false)
      setNote('Cheers! 🥂')
      setOtp(['', '', '', '', '', ''])
      setOtpError('')
      setError('')
      setSending(false)
      setCelebrationActive(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isCustom && customAmountRef.current) {
      customAmountRef.current.focus()
    }
  }, [isCustom])

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value)
    setIsCustom(false)
    setCustomAmount('')
  }

  const handleCustomSelect = () => {
    setIsCustom(true)
    setSelectedAmount(null)
  }

  const handleRequestOtp = async () => {
    if (!finalAmount || finalAmount <= 0) return
    setError('')
    setRequestingOtp(true)
    try {
      await axios.post(`${API_URL}/payments/request-otp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStep('otp')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send verification code. Try again.')
    } finally {
      setRequestingOtp(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    setOtpError('')
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
    if (index === 5 && value) {
      const full = [...next.slice(0, 5), value.slice(-1)].join('')
      if (full.length === 6) handleSend(full)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleSend = async (otpCode?: string) => {
    const code = otpCode || otp.join('')
    if (code.length !== 6) {
      setOtpError('Enter the 6-digit code from your text.')
      return
    }
    if (!finalAmount) return

    setSending(true)
    setOtpError('')
    setError('')

    try {
      await axios.post(
        `${API_URL}/payments/send`,
        { recipientId, amount: finalAmount, message: note.trim() || undefined, otp: code },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (postToFeed) {
        try {
          const fd = new FormData()
          fd.append('content', `${activeDrink?.emoji || '🍺'} Just sent ${displayName} ${activeDrink?.drinkWord || 'a drink'}! ${note || 'Cheers 🥂'}`)
          await axios.post(`${API_URL}/feed/posts`, fd, {
            headers: { Authorization: `Bearer ${token}` }
          })
        } catch {
          // non-fatal
        }
      }

      if (updateUser) updateUser({})
      setCelebrationActive(true)
      setStep('success')
      onSuccess?.(finalAmount)
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Payment failed. Try again.'
      if (err.response?.status === 400 && msg.toLowerCase().includes('otp')) {
        setOtpError('Incorrect code. Try again.')
        setOtp(['', '', '', '', '', ''])
        setTimeout(() => otpRefs.current[0]?.focus(), 50)
      } else {
        setError(msg)
      }
    } finally {
      setSending(false)
    }
  }

  const canSend = finalAmount && finalAmount > 0 && finalAmount <= balance

  if (!isOpen) return null

  return (
    <>
      {/* Full-screen backdrop — tap outside to close */}
      <div
        className="fixed inset-0 z-[100] flex flex-col justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        onClick={onClose}
      >
        {/* Sheet panel */}
        <div
          className="relative w-full bg-gray-950 border border-primary-500/20 border-b-0 rounded-t-2xl shadow-2xl flex flex-col"
          style={{
            maxHeight: '88dvh',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Recipient row — pinned */}
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-1 flex-shrink-0">
            <div className="w-9 h-9 rounded-full border border-primary-500/40 overflow-hidden flex-shrink-0">
              {recipientAvatar ? (
                <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-500/20 flex items-center justify-center">
                  <span className="text-primary-400 font-bold text-sm">{recipientName[0]}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-primary-400/60 font-medium uppercase tracking-widest leading-tight">Sending to</p>
              <p className="text-base font-bold text-white leading-tight">{recipientName}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 bg-primary-500/10 border border-primary-500/20 rounded-full px-2.5 py-1">
              <span className="text-[10px] text-primary-400/60">Bal</span>
              <span className={`text-xs font-bold ${balance < 10 ? 'text-yellow-400' : 'text-primary-400'}`}>
                ${balance.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="h-px bg-primary-500/10 mx-4 flex-shrink-0" />

          {/* Scrollable body */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            onTouchMove={(e) => e.stopPropagation()}
          >

            {/* ─── STEP: Amount ─── */}
            {step === 'amount' && (
              <div className="px-4 pt-3 pb-6">

                <p className="text-xs text-primary-400/60 font-medium mb-2.5">Pick an amount</p>

                {/* Quick amounts — compact 3-col */}
                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => handleAmountSelect(a.value)}
                      className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${
                        selectedAmount === a.value && !isCustom
                          ? 'bg-primary-500 border-primary-400 text-black'
                          : 'bg-white/5 border-primary-500/20 text-primary-300 active:bg-white/10'
                      }`}
                    >
                      <span className="text-xl mb-0.5">{a.emoji}</span>
                      <span className="text-sm font-bold">{a.label}</span>
                      <span className={`text-[10px] font-medium ${selectedAmount === a.value && !isCustom ? 'text-black/70' : 'text-primary-400/50'}`}>
                        {a.tagline}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <button
                  onClick={handleCustomSelect}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all mb-3 ${
                    isCustom
                      ? 'bg-primary-500/10 border-primary-500/50'
                      : 'bg-white/5 border-primary-500/20 active:bg-white/10'
                  }`}
                >
                  <span className={`text-sm font-medium ${isCustom ? 'text-primary-400' : 'text-primary-400/60'}`}>
                    💸 Custom amount
                  </span>
                  {isCustom ? (
                    <div className="flex items-center gap-1">
                      <span className="text-primary-400 font-bold text-sm">$</span>
                      <input
                        ref={customAmountRef}
                        type="number"
                        min="1"
                        max="500"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0"
                        className="bg-transparent text-primary-400 font-bold text-sm w-14 text-right focus:outline-none placeholder-primary-400/40"
                      />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-primary-500/40" />
                  )}
                </button>

                {/* Note */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={80}
                  placeholder="Add a note... (optional)"
                  className="w-full bg-white/5 border border-primary-500/20 rounded-xl px-3.5 py-2.5 text-sm text-primary-300 placeholder-primary-400/40 focus:outline-none focus:border-primary-500/50 mb-3"
                />

                {/* Post to feed toggle */}
                <div className="flex items-center justify-between mb-4 px-0.5">
                  <div>
                    <p className="text-sm font-medium text-primary-300 leading-tight">Post to feed</p>
                    <p className="text-[11px] text-primary-400/50">Let friends see the good vibes</p>
                  </div>
                  <button
                    onClick={() => setPostToFeed(!postToFeed)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${postToFeed ? 'bg-primary-500' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${postToFeed ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs mb-3 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {balance < (finalAmount || 0) && finalAmount && (
                  <div className="flex items-center gap-2 text-yellow-400 text-xs mb-3 bg-yellow-500/10 rounded-lg px-3 py-2 border border-yellow-500/20">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Not enough balance — add funds first
                  </div>
                )}

                <button
                  onClick={handleRequestOtp}
                  disabled={!canSend || requestingOtp}
                  className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold text-base active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {requestingOtp ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Send {drinkLabel}</span>
                      {finalAmount && finalAmount > 0 && <span className="font-semibold">${finalAmount.toFixed(2)}</span>}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ─── STEP: OTP ─── */}
            {step === 'otp' && (
              <div className="px-4 pt-4 pb-8">
                <div className="text-center mb-5">
                  <p className="text-base font-semibold text-white mb-1">Verify it's you</p>
                  <p className="text-xs text-primary-400/70">We texted you a 6-digit code</p>
                </div>

                <div className="flex justify-center gap-2 mb-4">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-10 h-12 text-center text-xl font-bold rounded-xl border bg-white/5 text-white focus:outline-none transition-all ${
                        digit ? 'border-primary-500 bg-primary-500/10' : 'border-primary-500/25 focus:border-primary-500/60'
                      }`}
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="text-center text-red-400 text-xs mb-3">{otpError}</p>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs mb-3 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={() => handleSend()}
                  disabled={otp.join('').length !== 6 || sending}
                  className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold text-base active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Confirm ${finalAmount?.toFixed(2)}
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep('amount')}
                  className="w-full text-primary-400/60 text-sm py-2 active:text-primary-400 transition-colors"
                >
                  ← Back
                </button>

                <button
                  onClick={handleRequestOtp}
                  disabled={requestingOtp}
                  className="w-full text-primary-500/50 text-xs py-1.5 active:text-primary-500 transition-colors"
                >
                  {requestingOtp ? 'Sending...' : 'Resend code'}
                </button>
              </div>
            )}

            {/* ─── STEP: Success ─── */}
            {step === 'success' && (
              <div className="px-4 pt-4 pb-8 text-center relative overflow-hidden">
                {celebrationActive && (
                  <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    {[activeDrink?.emoji || '🍺', '🎉', activeDrink?.emoji || '🍺', '✨', activeDrink?.emoji || '🍺'].map((emoji, i) => (
                      <span
                        key={i}
                        className="absolute text-2xl animate-float-up"
                        style={{
                          left: `${15 + i * 18}%`,
                          bottom: '0',
                          animationDelay: `${i * 0.15}s`,
                          animationDuration: '1.4s',
                          animationFillMode: 'forwards',
                        }}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/15 border-2 border-primary-500/40 mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-primary-500" />
                </div>

                <p className="text-xl font-bold text-white mb-1">{successLabel} {activeDrink?.emoji || '🥂'}</p>
                <p className="text-primary-400/80 text-sm mb-1">
                  Sent {displayName} {activeDrink?.drinkWord || 'a drink'} —{' '}
                  <span className="text-primary-400 font-semibold">${finalAmount?.toFixed(2)}</span>
                </p>
                {postToFeed && (
                  <p className="text-primary-500/60 text-xs mb-5">Posted to your feed 🍺</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-white/5 border border-primary-500/20 text-primary-400 py-3 rounded-xl font-medium text-sm active:bg-white/10 transition-all"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setStep('amount')
                      setSelectedAmount(null)
                      setOtp(['', '', '', '', '', ''])
                    }}
                    className="flex-1 bg-primary-500 text-black py-3 rounded-xl font-bold text-sm active:bg-primary-400 transition-all"
                  >
                    Send Another 🍺
                  </button>
                </div>
              </div>
            )}

          </div>{/* end scrollable */}
        </div>{/* end sheet */}
      </div>{/* end backdrop */}

      <style jsx global>{`
        @keyframes float-up {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          80%  { transform: translateY(-120px) scale(1.3); opacity: 0.8; }
          100% { transform: translateY(-160px) scale(0.8); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 1.4s ease-out forwards;
        }
      `}</style>
    </>
  )
}
