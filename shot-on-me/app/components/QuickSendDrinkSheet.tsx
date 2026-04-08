'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  { value: 5,  label: '$5',  tagline: 'Buy a drink',    emoji: '🍺', drinkWord: 'a drink',    successWord: 'Cheers!' },
  { value: 10, label: '$10', tagline: "Round's on you",  emoji: '🍻', drinkWord: 'a round',    successWord: 'Round on you!' },
  { value: 25, label: '$25', tagline: 'Big night out',   emoji: '🥂', drinkWord: 'some bubbly', successWord: 'Living large!' },
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
  const [mounted, setMounted] = useState(false)

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
  const shareToSocial = (() => {
    try { return localStorage.getItem('som_share_to_social') === 'true' } catch { return false }
  })()

  const shareNow = async () => {
    const params = new URLSearchParams({
      sender: (user?.firstName || '').trim(),
      recipient: displayName,
      emoji: activeDrink?.emoji || '🥃',
    })
    try {
      const res = await fetch(`/api/og/shot?${params}`)
      const blob = await res.blob()
      const file = new File([blob], 'shot-on-me.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Shot On Me', text: `I just bought ${displayName} a shot on Shot On Me 🥃 shotonme.com` })
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url; a.download = 'shot-on-me.png'; a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* cancelled */ }
  }

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const customAmountRef = useRef<HTMLInputElement>(null)

  // Portal needs document to be available
  useEffect(() => { setMounted(true) }, [])

  const balance = (user as any)?.wallet?.balance || 0
  const displayName = recipientFirstName || recipientName.split(' ')[0]
  const finalAmount = isCustom ? parseFloat(customAmount) : selectedAmount
  const activeDrink = QUICK_AMOUNTS.find(a => a.value === selectedAmount && !isCustom)
  const drinkLabel = activeDrink ? `${activeDrink.drinkWord} ${activeDrink.emoji}` : isCustom ? '💸' : '🍺'
  const successLabel = activeDrink ? activeDrink.successWord : 'Cheers!'

  // Lock ALL scrollable containers so nothing moves behind the sheet
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.style.overflow = 'hidden'
    } else {
      const top = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.style.overflow = ''
      if (top) window.scrollTo(0, parseInt(top) * -1)
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.style.overflow = ''
    }
  }, [isOpen])

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
    if (isCustom && customAmountRef.current) customAmountRef.current.focus()
  }, [isCustom])

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value)
    setIsCustom(false)
    setCustomAmount('')
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
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    if (index === 5 && value) {
      const full = [...next.slice(0, 5), value.slice(-1)].join('')
      if (full.length === 6) handleSend(full)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  const handleSend = async (otpCode?: string) => {
    const code = otpCode || otp.join('')
    if (code.length !== 6) { setOtpError('Enter the 6-digit code.'); return }
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
          await axios.post(`${API_URL}/feed/posts`, fd, { headers: { Authorization: `Bearer ${token}` } })
        } catch { /* non-fatal */ }
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

  if (!mounted || !isOpen) return null

  // Portal directly to document.body — bypasses any overflow/transform ancestor
  return createPortal(
    <>
      {/* Full-screen overlay — itself is the scroll container, always works on iOS */}
      <div
        className="fixed inset-0 overflow-y-auto"
        style={{ zIndex: 9999, WebkitOverflowScrolling: 'touch' }}
        onClick={onClose}
      >
        {/* Dark area above sheet — tap to close. min-h pushes sheet to bottom */}
        <div className="min-h-[30vh]" />

        {/* Sheet panel */}
        <div
          className="relative w-full max-w-lg mx-auto bg-gradient-to-b from-gray-950 to-black border border-primary-500/20 border-b-0 rounded-t-2xl shadow-2xl"
          style={{ marginBottom: '60px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-primary-500/30" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary-400 hover:text-primary-300 hover:bg-white/10 transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Recipient */}
          <div className="flex items-center gap-3 px-5 pb-4 pt-2">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500/40 overflow-hidden flex-shrink-0">
              {recipientAvatar ? (
                <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-500/20 flex items-center justify-center">
                  <span className="text-primary-400 font-bold text-lg">{recipientName[0]}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-primary-400/70 font-medium uppercase tracking-widest">Sending a drink to</p>
              <p className="text-lg font-bold text-white tracking-tight">{recipientName}</p>
            </div>
          </div>

          <div className="h-px bg-primary-500/10 mx-5" />

          {/* ─── STEP: Amount ─── */}
          {step === 'amount' && (
            <div className="px-5 pt-4 pb-8">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-primary-400/70 font-medium">Pick an amount</p>
                <div className="flex items-center gap-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full px-3 py-1">
                  <span className="text-xs text-primary-400/70">Balance</span>
                  <span className={`text-sm font-bold ${balance < 10 ? 'text-yellow-400' : 'text-primary-400'}`}>
                    ${balance.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => handleAmountSelect(a.value)}
                    className={`flex flex-col items-center justify-center py-4 rounded-xl border transition-all ${
                      selectedAmount === a.value && !isCustom
                        ? 'bg-primary-500 border-primary-400 text-black'
                        : 'bg-white/5 border-primary-500/20 text-primary-300'
                    }`}
                  >
                    <span className="text-2xl mb-1">{a.emoji}</span>
                    <span className="text-base font-bold">{a.label}</span>
                    <span className={`text-[11px] font-medium mt-0.5 ${selectedAmount === a.value && !isCustom ? 'text-black/70' : 'text-primary-400/60'}`}>
                      {a.tagline}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setIsCustom(true); setSelectedAmount(null) }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all mb-4 ${
                  isCustom ? 'bg-primary-500/10 border-primary-500/50' : 'bg-white/5 border-primary-500/20'
                }`}
              >
                <span className={`text-sm font-medium ${isCustom ? 'text-primary-400' : 'text-primary-400/70'}`}>
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
                      className="bg-transparent text-primary-400 font-bold text-sm w-16 text-right focus:outline-none placeholder-primary-400/40"
                    />
                  </div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-primary-500/40" />
                )}
              </button>

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={80}
                placeholder="Add a note... (optional)"
                className="w-full bg-white/5 border border-primary-500/20 rounded-xl px-4 py-3 text-sm text-primary-300 placeholder-primary-400/40 focus:outline-none focus:border-primary-500/50 mb-4"
              />

              <div className="flex items-center justify-between mb-5 px-1">
                <div>
                  <p className="text-sm font-medium text-primary-300">Post to feed</p>
                  <p className="text-xs text-primary-400/50">Let your friends see the good vibes</p>
                </div>
                <button
                  onClick={() => setPostToFeed(v => !v)}
                  className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors flex-shrink-0 ${postToFeed ? 'bg-primary-500' : 'bg-white/20'}`}
                >
                  <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${postToFeed ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-3 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              {balance < (finalAmount || 0) && finalAmount && (
                <div className="flex items-center gap-2 text-yellow-400 text-sm mb-3 bg-yellow-500/10 rounded-lg px-3 py-2 border border-yellow-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />Not enough balance — add funds first
                </div>
              )}

              <button
                onClick={handleRequestOtp}
                disabled={!canSend || requestingOtp}
                className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold text-base active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {requestingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : (
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
            <div className="px-5 pt-4 pb-8">
              <div className="text-center mb-6">
                <p className="text-base font-semibold text-white mb-1">Verify it's you</p>
                <p className="text-sm text-primary-400/70">We sent a 6-digit code to your phone</p>
              </div>
              <div className="flex justify-center gap-2.5 mb-4">
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
                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-white/5 text-white focus:outline-none transition-all ${
                      digit ? 'border-primary-500 bg-primary-500/10' : 'border-primary-500/25 focus:border-primary-500/60'
                    }`}
                  />
                ))}
              </div>
              {otpError && <p className="text-center text-red-400 text-sm mb-3">{otpError}</p>}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-3 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <button
                onClick={() => handleSend()}
                disabled={otp.join('').length !== 6 || sending}
                className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold text-base active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" />Confirm ${finalAmount?.toFixed(2)}</>}
              </button>
              <button onClick={() => setStep('amount')} className="w-full text-primary-400/60 text-sm py-2 hover:text-primary-400 transition-colors">← Back</button>
              <button onClick={handleRequestOtp} disabled={requestingOtp} className="w-full text-primary-500/60 text-xs py-1.5 hover:text-primary-500 transition-colors">
                {requestingOtp ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          )}

          {/* ─── STEP: Success ─── */}
          {step === 'success' && (
            <div className="px-5 pt-4 pb-8 text-center relative overflow-hidden">
              {celebrationActive && (
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                  {[activeDrink?.emoji || '🍺', '🎉', activeDrink?.emoji || '🍺', '✨', activeDrink?.emoji || '🍺'].map((emoji, i) => (
                    <span key={i} className="absolute text-2xl animate-float-up"
                      style={{ left: `${15 + i * 18}%`, bottom: 0, animationDelay: `${i * 0.15}s`, animationDuration: '1.4s', animationFillMode: 'forwards' }}>
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/15 border-2 border-primary-500/40 mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-primary-500" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{successLabel} {activeDrink?.emoji || '🥂'}</p>
              <p className="text-primary-400/80 text-sm mb-1">
                Sent {displayName} {activeDrink?.drinkWord || 'a drink'} — <span className="text-primary-400 font-semibold">${finalAmount?.toFixed(2)}</span>
              </p>
              {postToFeed && <p className="text-primary-500/60 text-xs mb-4">Posted to your feed 🍺</p>}

              {shareToSocial ? (
                /* Sharing enabled — prominent single button */
                <>
                  <button
                    onClick={shareNow}
                    className="w-full mb-3 py-3.5 rounded-xl font-bold text-sm bg-primary-500 text-black hover:bg-primary-400 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20"
                  >
                    Share 📲
                  </button>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-white/5 border border-primary-500/20 text-primary-400 py-3 rounded-xl font-medium text-sm hover:bg-white/10 transition-all">Done</button>
                    <button onClick={() => { setStep('amount'); setSelectedAmount(null); setOtp(['','','','','','']) }}
                      className="flex-1 bg-white/8 border border-primary-500/15 text-primary-400 py-3 rounded-xl font-bold text-sm hover:bg-white/12 transition-all">
                      Send Another 🍺
                    </button>
                  </div>
                </>
              ) : (
                /* Sharing not enabled — soft prompt, then normal actions */
                <>
                  <div className="flex items-center justify-between bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 mb-3">
                    <p className="text-white/50 text-xs">Share on Instagram or Facebook?</p>
                    <div className="flex gap-2">
                      <button onClick={shareNow} className="text-primary-400 text-xs font-semibold hover:text-primary-300 transition-colors">Share</button>
                      <span className="text-white/20 text-xs">·</span>
                      <button onClick={() => {}} className="text-white/30 text-xs hover:text-white/50 transition-colors">Not now</button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-white/5 border border-primary-500/20 text-primary-400 py-3 rounded-xl font-medium text-sm hover:bg-white/10 transition-all">Done</button>
                    <button onClick={() => { setStep('amount'); setSelectedAmount(null); setOtp(['','','','','','']) }}
                      className="flex-1 bg-primary-500 text-black py-3 rounded-xl font-bold text-sm hover:bg-primary-400 transition-all">
                      Send Another 🍺
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>{/* end sheet panel */}
      </div>{/* end full-screen scroll overlay */}

      <style jsx global>{`
        @keyframes float-up {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          80%  { transform: translateY(-120px) scale(1.3); opacity: 0.8; }
          100% { transform: translateY(-160px) scale(0.8); opacity: 0; }
        }
        .animate-float-up { animation: float-up 1.4s ease-out forwards; }
      `}</style>
    </>,
    document.body
  )
}
