'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'
import axios from 'axios'
import { Gift, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Checkin {
  _id: string
  user?: { firstName?: string; lastName?: string; username?: string }
  amount?: number
  createdAt?: string
  note?: string
  venue?: { name?: string }
}

export default function RedemptionsTab() {
  const { venue, token } = useAuth()
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchCheckins = useCallback(async () => {
    if (!token || !venue?.id) return
    setLoading(true)
    try {
      const res = await axios.get(`${getApiUrl()}/checkins?venueId=${venue.id}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const list: Checkin[] = res.data.checkins || res.data || []
      setCheckins(list)
      setTotal(list.reduce((sum, c) => sum + (c.amount || 0), 0))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [token, venue?.id])

  useEffect(() => { fetchCheckins() }, [fetchCheckins])

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-5" style={{ background: '#0F0F1E' }}>
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Redemptions</h1>
        <p className="text-xs text-white/40 mt-0.5">All Fizz gifts redeemed at your venue</p>
      </div>

      {/* Summary */}
      {!loading && checkins.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="fv-card p-4 text-center">
            <p className="text-2xl font-black" style={{ color: '#C8F135' }}>{checkins.length}</p>
            <p className="text-xs text-white/35 mt-0.5">Total Redemptions</p>
          </div>
          <div className="fv-card p-4 text-center">
            <p className="text-2xl font-black" style={{ color: '#00D4FF' }}>${total.toFixed(2)}</p>
            <p className="text-xs text-white/35 mt-0.5">Total Value</p>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="rounded-2xl h-16 animate-pulse" style={{ background: '#1C1C32' }} />
          ))}
        </div>
      ) : checkins.length === 0 ? (
        <div className="fv-card py-16 text-center">
          <Gift className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 font-semibold">No redemptions yet</p>
          <p className="text-white/25 text-sm mt-1">When customers redeem Fizz gifts here, they'll show up.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {checkins.map(c => {
            const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'Anonymous'
            const initials = (c.user?.firstName?.[0] || '') + (c.user?.lastName?.[0] || '') || '?'
            const dateStr = c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy · h:mm a') : ''

            return (
              <div key={c._id} className="fv-card p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
                  style={{ background: 'rgba(200,241,53,0.12)', color: '#C8F135' }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-white/30" />
                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                  </div>
                  {dateStr && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-white/20" />
                      <p className="text-xs text-white/30">{dateStr}</p>
                    </div>
                  )}
                  {c.note && <p className="text-xs text-white/25 mt-0.5 truncate">{c.note}</p>}
                </div>
                {c.amount != null && (
                  <p className="font-black text-base flex-shrink-0" style={{ color: '#C8F135' }}>
                    +${c.amount.toFixed(2)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
