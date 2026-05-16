'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  ArrowUpRight, ArrowDownLeft, Plus, Zap, Sparkles, Clock,
  MapPin, QrCode, CreditCard, ChevronRight, X, Check, Loader,
} from 'lucide-react'
import AddFundsModal from './AddFundsModal'
import TapAndPayModal from './TapAndPayModal'
import { formatDistanceToNow } from 'date-fns'

type HistoryFilter = 'all' | 'sent' | 'received'

export default function WalletTab() {
  const { user, token, updateUser } = useAuth()
  const API_URL = useApiUrl()

  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [points, setPoints] = useState(0)
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [showTapPay, setShowTapPay] = useState(false)
  const [redeemingCode, setRedeemingCode] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [showRedeem, setShowRedeem] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const balance = user?.revigWallet?.balance ?? user?.wallet?.balance ?? 0
  const pending = user?.revigWallet?.pendingBalance ?? user?.wallet?.pendingBalance ?? 0

  const fetchHistory = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [histRes, pointsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/payments/history`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value.data.payments || histRes.value.data.shots || histRes.value.data || [])
      }
      if (pointsRes.status === 'fulfilled') {
        setPoints(pointsRes.value.data.user?.points || pointsRes.value.data.points || 0)
      }
    } catch {
      setError('Could not load wallet history. Pull down to retry.')
    } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const userId = user?.id || (user as any)?._id

  const filtered = history.filter(s => {
    if (filter === 'sent') return s.sender?.id === userId || s.sender?._id === userId
    if (filter === 'received') return s.recipient?.id === userId || s.recipient?._id === userId
    return true
  })

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return
    setRedeemingCode(true)
    setRedeemMsg(null)
    try {
      const res = await axios.post(`${API_URL}/payments/redeem-code`,
        { code: redeemCode.trim().toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setRedeemMsg({ ok: true, text: res.data.message || 'Code redeemed!' })
      setRedeemCode('')
      updateUser({})
      fetchHistory()
    } catch (err: any) {
      setRedeemMsg({ ok: false, text: err.response?.data?.error || 'Invalid or expired code' })
    } finally {
      setRedeemingCode(false)
    }
  }

  return (
    <div style={{ background: '#0F0F1E', minHeight: '100%' }}>
      <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} onSuccess={() => { updateUser({}); fetchHistory() }} />
      <TapAndPayModal isOpen={showTapPay} onClose={() => setShowTapPay(false)} />
      <div className="max-w-2xl mx-auto">

      {/* Balance hero */}
      <div className="px-4 pt-5 pb-4">
        <div
          className="glass-glow rounded-3xl p-6 relative overflow-hidden"
        >
          {/* Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: '#C8F135', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#00D4FF', transform: 'translate(-30%, 30%)' }} />

          <p className="text-xs font-semibold uppercase tracking-widest mb-1 relative z-10" style={{ color: 'rgba(255,255,255,0.35)' }}>Available Balance</p>
          <h2 className="text-5xl font-black text-white mb-1 relative z-10" style={{ fontFamily: 'Poppins, sans-serif' }}>
            ${balance.toFixed(2)}
          </h2>
          {pending > 0 && (
            <p className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
              + ${pending.toFixed(2)} pending
            </p>
          )}

          {/* Points badge */}
          <div className="flex items-center gap-1.5 mt-3 relative z-10">
            <Sparkles className="w-4 h-4" style={{ color: '#C8F135' }} />
            <span className="text-sm font-bold" style={{ color: '#C8F135' }}>{points} pts</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>· 100 pts = $5</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowAddFunds(true)}
            className="revig-card p-4 flex flex-col items-center gap-2 hover:border-lime-revig/30 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,241,53,0.15)' }}>
              <Plus className="w-5 h-5" style={{ color: '#C8F135' }} />
            </div>
            <span className="text-xs font-bold text-white">Add Funds</span>
          </button>

          <button
            onClick={() => setShowTapPay(true)}
            className="revig-card p-4 flex flex-col items-center gap-2 hover:border-cyan-revig/30 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.15)' }}>
              <QrCode className="w-5 h-5" style={{ color: '#00D4FF' }} />
            </div>
            <span className="text-xs font-bold text-white">Tap & Pay</span>
          </button>

          <button
            onClick={() => setShowRedeem(!showRedeem)}
            className="revig-card p-4 flex flex-col items-center gap-2 hover:border-coral-revig/30 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,95,87,0.15)' }}>
              <Zap className="w-5 h-5" style={{ color: '#FF5F57' }} />
            </div>
            <span className="text-xs font-bold text-white">Redeem</span>
          </button>
        </div>
      </div>

      {/* Redeem code panel */}
      {showRedeem && (
        <div className="mx-4 mb-4 revig-card p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">Enter promo code</p>
            <button onClick={() => { setShowRedeem(false); setRedeemMsg(null) }}>
              <X className="w-4 h-4 text-white/30" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={redeemCode}
              onChange={e => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="e.g. REVIG2026"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-white/10 focus:border-lime-revig"
              style={{ background: '#252540' }}
              onKeyDown={e => e.key === 'Enter' && handleRedeem()}
            />
            <button
              onClick={handleRedeem}
              disabled={redeemingCode || !redeemCode.trim()}
              className="revig-btn-primary px-4 py-2.5 text-sm disabled:opacity-40"
            >
              {redeemingCode ? <Loader className="w-4 h-4 animate-spin" /> : 'Apply'}
            </button>
          </div>
          {redeemMsg && (
            <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: redeemMsg.ok ? '#C8F135' : '#FF5F57' }}>
              {redeemMsg.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {redeemMsg.text}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white text-base">Transaction History</h2>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
            <X className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'sent', 'received'] as HistoryFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={filter === f
                ? { background: '#C8F135', color: '#1A1A2E' }
                : { background: '#252540', color: 'rgba(255,255,255,0.5)' }
              }
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#252540' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="revig-card py-12 text-center">
            <p className="text-3xl mb-2">🫧</p>
            <p className="text-white/40 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.slice(0, 40).map((shot: any, idx) => {
              const isSent = shot.sender?.id === userId || shot.sender?._id === userId
              const other = isSent ? shot.recipient : shot.sender
              const otherName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim() || 'Someone'
              const timeAgo = shot.createdAt ? formatDistanceToNow(new Date(shot.createdAt), { addSuffix: true }) : ''

              return (
                <div key={shot._id || idx} className="revig-card p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: isSent ? 'rgba(255,95,87,0.15)' : 'rgba(200,241,53,0.15)',
                    }}
                  >
                    {isSent
                      ? <ArrowUpRight className="w-5 h-5" style={{ color: '#FF5F57' }} />
                      : <ArrowDownLeft className="w-5 h-5" style={{ color: '#C8F135' }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {isSent ? `Sent to ${otherName}` : `Received from ${otherName}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {shot.venue?.name && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          <MapPin className="w-3 h-3" /> {shot.venue.name}
                        </span>
                      )}
                      {timeAgo && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          <Clock className="w-3 h-3" /> {timeAgo}
                        </span>
                      )}
                    </div>
                  </div>

                  <p
                    className="text-base font-black flex-shrink-0"
                    style={{ color: isSent ? '#FF5F57' : '#C8F135' }}
                  >
                    {isSent ? '-' : '+'}${shot.amount?.toFixed(2)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
