'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Search, X, ChevronLeft, Sparkles, Check } from 'lucide-react'
import { OCCASION_TAGS, REVIG_CATEGORIES, EXCLUDED_CATEGORIES } from '../types'

const GIFT_AMOUNTS = [5, 10, 15, 25]

type Step = 'recipient' | 'amount' | 'occasion' | 'confirm' | 'success'

interface PrefillRecipient {
  id?: string; _id?: string
  firstName?: string; lastName?: string
  username?: string; profilePicture?: string
}

interface SendRevigProps {
  prefillVenueId?: string
  prefillRecipient?: PrefillRecipient
  onClose?: () => void
}

export default function SendRevig({ prefillVenueId, prefillRecipient, onClose }: SendRevigProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()

  const [step, setStep] = useState<Step>(prefillRecipient ? 'amount' : 'recipient')
  const [recipient, setRecipient] = useState<any>(prefillRecipient || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [amount, setAmount] = useState<number>(10)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [venue, setVenue] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revigPopped, setRevigPopped] = useState(false)

  // Load prefilled venue
  useEffect(() => {
    if (prefillVenueId && token) {
      axios.get(`${API_URL}/venues/${prefillVenueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setVenue(res.data.venue || res.data)
      }).catch(() => { setError('Could not load venue details') })
    }
  }, [prefillVenueId, API_URL, token])

  // Search users
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await axios.get(`${API_URL}/revig/users/search`, {
          params: { q: searchQuery },
          headers: { Authorization: `Bearer ${token}` }
        })
        setSearchResults(res.data.users || res.data || [])
      } catch {
        setError('Search failed — check your connection')
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, API_URL, token])

  const finalAmount = useCustom ? parseFloat(customAmount) || 0 : amount
  const balance = user?.revigWallet?.balance ?? user?.wallet?.balance ?? 0

  const handleSend = async () => {
    if (!recipient || finalAmount <= 0) return
    setError('')
    setLoading(true)
    try {
      await axios.post(`${API_URL}/revig/send`, {
        recipientId: recipient.id || recipient._id,
        amount: finalAmount,
        message: message || selectedOccasion ? `${selectedOccasion ? `[${selectedOccasion}] ` : ''}${message}` : undefined,
        venueId: venue?._id,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setStep('success')
      setRevigPopped(true)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send Revig')
    } finally {
      setLoading(false)
    }
  }

  const Bubble = ({ style }: { style: React.CSSProperties }) => (
    <div className="bubble rounded-full" style={style} />
  )

  if (step === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative overflow-hidden" style={{ background: '#1A1A2E' }}>
        {/* Burst bubbles */}
        {[...Array(8)].map((_, i) => (
          <Bubble key={i} style={{
            width: 8 + (i * 3),
            height: 8 + (i * 3),
            left: `${10 + i * 10}%`,
            bottom: '-20px',
            background: i % 3 === 0 ? 'rgba(200,241,53,0.7)' : i % 3 === 1 ? 'rgba(0,212,255,0.7)' : 'rgba(255,95,87,0.7)',
            animationDuration: `${2 + i * 0.5}s`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}

        <div className={`mb-6 ${revigPopped ? 'revig-pop' : ''}`}>
          <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-5xl shadow-2xl" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            🧋
          </div>
        </div>

        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(200,241,53,0.2)' }}>
          <Check className="w-5 h-5" style={{ color: '#C8F135' }} />
        </div>

        <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Revig Sent! 🎉
        </h2>
        <p className="text-white/50 text-base mb-1">
          You sent <span className="font-bold text-white">${finalAmount.toFixed(2)}</span> to
        </p>
        <p className="text-xl font-bold mb-2" style={{ color: '#C8F135' }}>
          {recipient?.firstName} {recipient?.lastName}
        </p>
        {venue && (
          <p className="text-white/40 text-sm mb-6">for use at {venue.name}</p>
        )}

        <button
          onClick={onClose}
          className="revig-btn-primary px-8 py-3 text-base"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#1A1A2E', minHeight: '100%' }}>
      <div className="max-w-2xl mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
        {step !== 'recipient' && (
          <button
            onClick={() => {
              const steps: Step[] = ['recipient', 'amount', 'occasion', 'confirm']
              const idx = steps.indexOf(step)
              if (idx > 0) setStep(steps[idx - 1])
            }}
            className="p-2 rounded-xl hover:bg-white/5"
          >
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>
        )}
        <div>
          <h1 className="font-black text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Send a Revig</h1>
          <p className="text-xs text-white/40">Step {['recipient','amount','occasion','confirm'].indexOf(step) + 1} of 4</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 mx-4 mt-3 rounded-full overflow-hidden" style={{ background: '#252540' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            background: 'linear-gradient(90deg, #C8F135, #00D4FF)',
            width: `${(['recipient','amount','occasion','confirm'].indexOf(step) + 1) * 25}%`
          }}
        />
      </div>

      {error && step !== 'confirm' && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
          <X className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="px-4 py-5 pb-8">

        {/* Step 1: Recipient */}
        {step === 'recipient' && (
          <div>
            <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Who gets the Revig?</h2>
            <p className="text-white/40 text-sm mb-4">Search by name, username, or email</p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full py-3.5 pl-10 pr-4 rounded-2xl text-sm border border-white/10 focus:border-lime-revig"
                style={{ background: '#252540' }}
                autoFocus
              />
            </div>

            {/* Selected recipient */}
            {recipient && (
              <div className="flex items-center gap-3 p-3 rounded-2xl mb-4 border" style={{ background: 'rgba(200,241,53,0.08)', borderColor: 'rgba(200,241,53,0.3)' }}>
                <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ background: '#C8F135', color: '#1A1A2E' }}>
                  {recipient.profilePicture ? (
                    <img src={recipient.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                      {recipient.firstName?.[0]}{recipient.lastName?.[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{recipient.firstName} {recipient.lastName}</p>
                  <p className="text-white/40 text-xs">@{recipient.username || 'user'}</p>
                </div>
                <button onClick={() => setRecipient(null)} className="p-1.5 rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
            )}

            {/* Results */}
            {searching && <p className="text-white/40 text-sm text-center py-4">Searching...</p>}
            {!searching && searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                {searchResults.map((u: any) => (
                  <button
                    key={u._id || u.id}
                    onClick={() => { setRecipient(u); setSearchQuery(''); setSearchResults([]) }}
                    className="flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-white/5 transition-colors"
                    style={{ background: '#252540' }}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
                      {u.profilePicture ? (
                        <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-sm" style={{ color: '#1A1A2E' }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{u.firstName} {u.lastName}</p>
                      <p className="text-white/40 text-xs">@{u.username || u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto pt-6">
              <button
                onClick={() => setStep('amount')}
                disabled={!recipient}
                className="revig-btn-primary w-full py-4 text-base disabled:opacity-30"
              >
                Next — Choose Amount
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Amount */}
        {step === 'amount' && (
          <div>
            <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>How much to Revig?</h2>
            <p className="text-white/40 text-sm mb-5">
              Balance: <span className="text-white font-semibold">${balance.toFixed(2)}</span>
            </p>

            {/* Venue chip */}
            {venue && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5" style={{ background: 'rgba(0,212,255,0.1)', borderColor: 'rgba(0,212,255,0.2)', border: '1px solid' }}>
                <span className="text-lg">🏪</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#00D4FF' }}>For use at</p>
                  <p className="text-sm font-semibold text-white">{venue.name}</p>
                </div>
                <button onClick={() => setVenue(null)} className="ml-auto">
                  <X className="w-4 h-4 text-white/30" />
                </button>
              </div>
            )}

            {/* Amount buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {GIFT_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setUseCustom(false) }}
                  className="py-5 rounded-2xl text-xl font-black transition-all"
                  style={!useCustom && amount === a
                    ? { background: '#C8F135', color: '#1A1A2E', transform: 'scale(1.02)' }
                    : { background: '#252540', color: 'white' }
                  }
                >
                  ${a}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div
              className="p-4 rounded-2xl mb-5 cursor-pointer border"
              style={useCustom
                ? { background: 'rgba(200,241,53,0.1)', borderColor: 'rgba(200,241,53,0.4)' }
                : { background: '#252540', borderColor: 'transparent' }
              }
              onClick={() => setUseCustom(true)}
            >
              <p className="text-xs text-white/40 font-semibold mb-1">Custom Amount</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white">$</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setUseCustom(true) }}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className="flex-1 bg-transparent text-xl font-black text-white focus:outline-none"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>

            <button
              onClick={() => setStep('occasion')}
              disabled={finalAmount <= 0 || finalAmount > balance}
              className="revig-btn-primary w-full py-4 text-base disabled:opacity-30"
            >
              {finalAmount > balance ? 'Insufficient balance' : `Next — Add a Note`}
            </button>
          </div>
        )}

        {/* Step 3: Occasion + message */}
        {step === 'occasion' && (
          <div>
            <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>What&apos;s the occasion?</h2>
            <p className="text-white/40 text-sm mb-5">Optional — make it personal</p>

            <div className="flex flex-wrap gap-2 mb-5">
              {OCCASION_TAGS.map(tag => (
                <button
                  key={tag.label}
                  onClick={() => setSelectedOccasion(tag.label === selectedOccasion ? null : tag.label)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all"
                  style={selectedOccasion === tag.label
                    ? { background: '#C8F135', color: '#1A1A2E' }
                    : { background: '#252540', color: 'rgba(255,255,255,0.6)' }
                  }
                >
                  {tag.emoji} {tag.label}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">Message (optional)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Add a personal note..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl text-sm border border-white/10 focus:border-lime-revig resize-none"
                style={{ background: '#252540' }}
              />
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="revig-btn-primary w-full py-4 text-base"
            >
              Preview Revig
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div>
            <h2 className="text-xl font-black text-white mb-5 text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Confirm your Revig ✨
            </h2>

            {/* Preview card */}
            <div className="rounded-3xl p-6 mb-5 relative overflow-hidden text-center" style={{ background: 'linear-gradient(135deg, #252540, #2E2E50)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{ background: '#C8F135' }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-15 blur-2xl" style={{ background: '#FF5F57' }} />

              <div className="text-5xl mb-3 animate-float">🧋</div>

              <p className="text-sm text-white/50 mb-1">You&apos;re sending</p>
              <p className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                ${finalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-white/50 mb-3">to <span className="font-bold text-white">{recipient?.firstName} {recipient?.lastName}</span></p>

              {venue && (
                <div className="px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 mb-3" style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}>
                  <span className="text-xs font-bold">📍 {venue.name}</span>
                </div>
              )}

              {selectedOccasion && (
                <div className="px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 mb-2" style={{ background: 'rgba(200,241,53,0.15)', color: '#C8F135' }}>
                  <Sparkles className="w-3 h-3" />
                  <span className="text-xs font-bold">{selectedOccasion}</span>
                </div>
              )}

              {message && (
                <p className="text-sm text-white/50 mt-3 italic">&ldquo;{message}&rdquo;</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
                <X className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={loading}
              className="revig-btn-primary w-full py-4 text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : <>
                <Sparkles className="w-4 h-4" />
                Send the Revig!
              </>}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
