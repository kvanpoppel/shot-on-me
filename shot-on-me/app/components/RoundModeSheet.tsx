'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Users, Check, ChevronRight, Loader2 } from 'lucide-react'
import SpinnerS from './SpinnerS'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import { createPortal } from 'react-dom'

interface Friend {
  _id: string
  firstName?: string
  name?: string
  profilePicture?: string
}

interface RoundModeSheetProps {
  isOpen: boolean
  onClose: () => void
}

const DRINK_OPTIONS = [
  { emoji: '🍺', label: 'Beer', amount: 5 },
  { emoji: '🍻', label: 'Draft', amount: 10 },
  { emoji: '🥂', label: 'Champagne', amount: 25 },
  { emoji: '🥃', label: 'Spirit', amount: 15 },
]

export default function RoundModeSheet({ isOpen, onClose }: RoundModeSheetProps) {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [friends, setFriends] = useState<Friend[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drinkIdx, setDrinkIdx] = useState(0)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<'select' | 'otp' | 'success'>('select')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [requesting, setRequesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [successCount, setSuccessCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOpen || !token) return
    axios.get(`${API_URL}/users/friends`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setFriends(res.data.friends || res.data || []))
      .catch(() => {})
  }, [isOpen, token, API_URL])

  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set())
      setStep('select')
      setOtp(['', '', '', '', '', ''])
      setError('')
      setMessage('')
      setUseCustom(false)
      setCustomAmount('')
    }
  }, [isOpen])

  const friendName = (f: Friend) => f.firstName || f.name?.split(' ')[0] || 'Friend'

  const toggleFriend = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const amount = useCustom ? parseFloat(customAmount) || 0 : DRINK_OPTIONS[drinkIdx].amount
  const emoji = useCustom ? '🥂' : DRINK_OPTIONS[drinkIdx].emoji
  const total = amount * selected.size

  const handleRequestOtp = async () => {
    if (selected.size === 0) { setError('Select at least one friend.'); return }
    if (amount <= 0) { setError('Enter a valid amount.'); return }
    setError('')
    setRequesting(true)
    try {
      await axios.post(`${API_URL}/payments/request-otp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStep('otp')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send code.')
    } finally {
      setRequesting(false)
    }
  }

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus()
  }

  const handleSendRound = async () => {
    const code = otp.join('')
    if (code.length !== 6) { setError('Enter the 6-digit code.'); return }
    setError('')
    setSending(true)
    try {
      const res = await axios.post(`${API_URL}/payments/send-round`, {
        recipientIds: [...selected],
        amount,
        emoji,
        message,
        otp: code,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setSuccessCount(res.data.results?.filter((r: any) => r.success).length || selected.size)
      setStep('success')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send round.')
    } finally {
      setSending(false)
    }
  }

  if (!mounted || !isOpen) return null

  const sheet = (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end" style={{ touchAction: 'none' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 border-t border-primary-500/30 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-primary-500/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-primary-500/15">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥂</span>
            <div>
              <p className="text-white font-bold text-base">Round Mode</p>
              <p className="text-primary-400/60 text-xs">Send a drink to everyone at once</p>
            </div>
          </div>
          <button onClick={onClose} className="text-primary-400/60 hover:text-primary-400 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">

          {step === 'select' && (
            <>
              {/* Drink picker */}
              <div>
                <p className="text-xs font-semibold text-primary-400/60 uppercase tracking-wider mb-2">Choose a drink</p>
                <div className="grid grid-cols-4 gap-2">
                  {DRINK_OPTIONS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => { setDrinkIdx(i); setUseCustom(false) }}
                      className={`flex flex-col items-center gap-1 rounded-xl p-3 border transition-all ${
                        !useCustom && drinkIdx === i
                          ? 'border-primary-500 bg-primary-500/20'
                          : 'border-primary-500/20 bg-black/40 hover:border-primary-500/40'
                      }`}
                    >
                      <span className="text-2xl">{d.emoji}</span>
                      <span className="text-primary-400 text-xs font-medium">${d.amount}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setUseCustom(true)}
                  className={`mt-2 w-full flex items-center justify-between rounded-xl px-4 py-2.5 border text-sm transition-all ${
                    useCustom ? 'border-primary-500 bg-primary-500/20 text-primary-300' : 'border-primary-500/20 bg-black/40 text-primary-400/60 hover:border-primary-500/40'
                  }`}
                >
                  <span>Custom amount</span>
                  {useCustom && (
                    <input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="0"
                      min="1"
                      max="500"
                      className="w-20 bg-transparent text-right text-primary-300 font-bold focus:outline-none"
                    />
                  )}
                  {!useCustom && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Friend picker */}
              <div>
                <p className="text-xs font-semibold text-primary-400/60 uppercase tracking-wider mb-2">
                  Select friends <span className="text-primary-500">({selected.size} selected)</span>
                </p>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {friends.length === 0 && (
                    <p className="text-primary-400/40 text-sm text-center py-4">No friends yet. Add some!</p>
                  )}
                  {friends.map(f => (
                    <button
                      key={f._id}
                      onClick={() => toggleFriend(f._id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all ${
                        selected.has(f._id)
                          ? 'border-primary-500 bg-primary-500/20'
                          : 'border-transparent bg-black/30 hover:bg-black/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        selected.has(f._id) ? 'bg-primary-500 text-black' : 'bg-primary-500/20 text-primary-400'
                      }`}>
                        {selected.has(f._id) ? <Check className="w-4 h-4" /> : friendName(f)[0]?.toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium flex-1 text-left">{friendName(f)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional message */}
              <div>
                <p className="text-xs font-semibold text-primary-400/60 uppercase tracking-wider mb-2">Message (optional)</p>
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={80}
                  placeholder="Cheers! 🎉"
                  className="w-full bg-black/40 border border-primary-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-primary-400/40 focus:outline-none focus:border-primary-500/60"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {/* Summary + CTA */}
              {selected.size > 0 && amount > 0 && (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-primary-400">Friends</span>
                    <span className="text-white font-semibold">{selected.size}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-primary-400">Per drink</span>
                    <span className="text-white font-semibold">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-primary-500/20 pt-3">
                    <span className="text-primary-400">Total</span>
                    <span className="text-primary-500">${total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleRequestOtp}
                disabled={requesting || selected.size === 0 || amount <= 0}
                className="w-full bg-primary-500 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary-400 active:scale-[0.98] transition-all"
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Send Round {emoji}</span><span className="text-black/60">· ${total.toFixed(2)}</span></>}
              </button>
            </>
          )}

          {step === 'otp' && (
            <div className="text-center space-y-6">
              <div>
                <p className="text-white font-bold text-lg mb-1">Verify to send round</p>
                <p className="text-primary-400/60 text-sm">Enter the 6-digit code sent to your phone</p>
              </div>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-black/60 border border-primary-500/30 rounded-xl text-white focus:outline-none focus:border-primary-500 focus:bg-primary-500/10 transition-all"
                  />
                ))}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSendRound}
                  disabled={sending || otp.join('').length !== 6}
                  className="w-full bg-primary-500 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary-400 active:scale-[0.98] transition-all"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Send Round to ${selected.size} friend${selected.size !== 1 ? 's' : ''} ${emoji}`}
                </button>
                <button onClick={() => { setStep('select'); setOtp(['','','','','','']); setError('') }} className="text-primary-400/60 text-sm hover:text-primary-400 transition-colors">← Back</button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <SpinnerS size={64} animation="toss" className="mx-auto" />
              <div>
                <p className="text-white font-bold text-xl mb-1">Round sent!</p>
                <p className="text-primary-400/70 text-sm">
                  {successCount} drink{successCount !== 1 ? 's' : ''} on their way — cheers! 🎉
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-primary-500 text-black font-bold py-3.5 rounded-xl hover:bg-primary-400 active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
