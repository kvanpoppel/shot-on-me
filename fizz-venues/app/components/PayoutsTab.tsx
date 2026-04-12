'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { Wallet, ArrowDownCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Payout {
  id: string
  amount: number
  status: string
  arrival_date?: number
  created?: number
}

interface StripeBalance {
  available: number
  pending: number
}

export default function PayoutsTab() {
  const { token, venue, refreshVenue } = useAuth()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [balance, setBalance] = useState<StripeBalance | null>(null)
  const [totalEarned, setTotalEarned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [toast, setToast] = useState('')

  const fetchEarnings = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${getApiUrl()}/payouts/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = res.data
      setPayouts(d.payouts || d.payoutHistory || [])
      setTotalEarned(d.totalEarnings ?? d.totalRevenue ?? 0)
      if (d.stripeBalance || d.balance) {
        const b = d.stripeBalance || d.balance
        setBalance({
          available: (b.available?.[0]?.amount ?? b.available ?? 0) / 100,
          pending:   (b.pending?.[0]?.amount   ?? b.pending   ?? 0) / 100,
        })
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchEarnings() }, [fetchEarnings])

  const handleRequestPayout = async () => {
    setRequesting(true)
    try {
      await axios.post(`${getApiUrl()}/payouts/request`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setToast('Payout requested! Funds arrive in 1–3 business days.')
      await fetchEarnings()
      refreshVenue()
    } catch (err: any) {
      setToast(err.response?.data?.message || 'Payout request failed. Contact support.')
    } finally {
      setRequesting(false)
      setTimeout(() => setToast(''), 4000)
    }
  }

  const venueBalance = venue?.wallet?.balance ?? 0

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-5" style={{ background: '#0F0F1E' }}>
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Payouts</h1>
        <p className="text-xs text-white/40 mt-0.5">Your earnings from Fizz gifts</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="fv-card p-4">
          <p className="text-xs text-white/40 mb-1">Available</p>
          <p className="text-2xl font-black" style={{ color: '#C8F135' }}>
            ${loading ? '—' : (balance?.available ?? venueBalance).toFixed(2)}
          </p>
          <p className="text-xs text-white/25 mt-0.5">Ready to pay out</p>
        </div>
        <div className="fv-card p-4">
          <p className="text-xs text-white/40 mb-1">Pending</p>
          <p className="text-2xl font-black" style={{ color: '#FF9A57' }}>
            ${loading ? '—' : (balance?.pending ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-white/25 mt-0.5">Processing</p>
        </div>
      </div>

      {/* Total earned */}
      <div className="fv-card p-4 mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.12)' }}>
          <Wallet className="w-5 h-5" style={{ color: '#00D4FF' }} />
        </div>
        <div>
          <p className="text-xs text-white/40">Lifetime Earnings</p>
          <p className="text-xl font-black text-white">${loading ? '—' : totalEarned.toFixed(2)}</p>
        </div>
      </div>

      {/* Request payout */}
      <button
        onClick={handleRequestPayout}
        disabled={requesting || loading || (balance?.available ?? venueBalance) <= 0}
        className="fv-btn-primary w-full py-4 text-base mb-6 disabled:opacity-30"
      >
        <ArrowDownCircle className="w-5 h-5" />
        {requesting ? 'Requesting…' : 'Request Payout'}
      </button>

      {/* Toast */}
      {toast && (
        <div className="mb-4 px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
          style={{ background: toast.includes('failed') || toast.includes('Contact') ? 'rgba(255,95,87,0.12)' : 'rgba(200,241,53,0.12)',
                   color: toast.includes('failed') || toast.includes('Contact') ? '#FF5F57' : '#C8F135' }}>
          {toast.includes('failed') ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          {toast}
        </div>
      )}

      {/* Payout history */}
      <h2 className="text-sm font-bold text-white mb-3">Payout History</h2>
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3].map(i => <div key={i} className="rounded-2xl h-14 animate-pulse" style={{ background: '#1C1C32' }} />)}
        </div>
      ) : payouts.length === 0 ? (
        <div className="fv-card py-10 text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-white/20" />
          <p className="text-white/40 text-sm">No payouts yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {payouts.map(p => {
            const date = p.arrival_date
              ? format(new Date(p.arrival_date * 1000), 'MMM d, yyyy')
              : p.created
                ? format(new Date(p.created * 1000), 'MMM d, yyyy')
                : ''
            const isPaid = p.status === 'paid' || p.status === 'completed'
            return (
              <div key={p.id} className="fv-card px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isPaid ? 'rgba(200,241,53,0.12)' : 'rgba(255,154,87,0.12)' }}>
                  {isPaid
                    ? <CheckCircle className="w-4 h-4" style={{ color: '#C8F135' }} />
                    : <Clock className="w-4 h-4" style={{ color: '#FF9A57' }} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white capitalize">{p.status}</p>
                  {date && <p className="text-xs text-white/30">{date}</p>}
                </div>
                <p className="font-black text-base" style={{ color: isPaid ? '#C8F135' : '#FF9A57' }}>
                  ${(p.amount / 100).toFixed(2)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
