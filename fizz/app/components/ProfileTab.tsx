'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Gift, MapPin, Settings, LogOut, PlusCircle } from 'lucide-react'
import AddFundsModal from './AddFundsModal'

export default function ProfileTab() {
  const { user, token, logout, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddFunds, setShowAddFunds] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/shots/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHistory((res.data.shots || res.data || []).slice(0, 20))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const totalSent = history.filter(s => s.sender?.id === user?.id || s.sender?._id === user?.id).length
  const totalReceived = history.filter(s => s.recipient?.id === user?.id || s.recipient?._id === user?.id).length

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#1A1A2E' }}>
      <AddFundsModal
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        onSuccess={() => updateUser({})}
      />
      {/* Profile header */}
      <div className="px-5 py-6">
        <div className="fizz-card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-3xl" style={{ background: '#C8F135', transform: 'translate(20%, -20%)' }} />

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden border-2" style={{ borderColor: 'rgba(200,241,53,0.3)' }}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)', color: '#1A1A2E' }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 relative z-10">
              <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user?.firstName} {user?.lastName}
              </h2>
              {user?.username && (
                <p className="text-sm text-white/40">@{user.username}</p>
              )}
              <p className="text-xs text-white/30 mt-1">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center py-3 rounded-xl" style={{ background: 'rgba(200,241,53,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#C8F135' }}>${(user?.wallet?.balance ?? 0).toFixed(2)}</p>
              <p className="text-xs text-white/40 mt-0.5">Balance</p>
            </div>
            <div className="text-center py-3 rounded-xl" style={{ background: 'rgba(0,212,255,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#00D4FF' }}>{totalSent}</p>
              <p className="text-xs text-white/40 mt-0.5">Sent</p>
            </div>
            <div className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,95,87,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#FF5F57' }}>{totalReceived}</p>
              <p className="text-xs text-white/40 mt-0.5">Received</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAddFunds(true)}
            className="fizz-card p-4 flex flex-col gap-2 text-left border hover:border-lime-fizz/40 transition-all"
            style={{ borderColor: 'rgba(200,241,53,0.2)' }}
          >
            <PlusCircle className="w-5 h-5" style={{ color: '#C8F135' }} />
            <span className="text-sm font-semibold text-white">Add Funds</span>
          </button>
          <button
            className="fizz-card p-4 flex flex-col gap-2 text-left"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 text-white/40" />
            <span className="text-sm font-semibold text-white/60">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Fizz History */}
      <div className="px-5">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-4 h-4" style={{ color: '#C8F135' }} />
          <h2 className="font-bold text-white text-base">Fizz History</h2>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl animate-pulse h-16" style={{ background: '#252540' }} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="fizz-card py-12 text-center">
            <p className="text-3xl mb-3">🫧</p>
            <p className="text-white/40 font-medium">No Fizz history yet</p>
            <p className="text-white/25 text-sm mt-1">Send your first Fizz!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((shot: any, idx) => {
              const isSent = shot.sender?.id === user?.id || shot.sender?._id === user?.id
              const other = isSent ? shot.recipient : shot.sender
              const otherName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim() || 'Someone'
              const dateStr = shot.createdAt ? new Date(shot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

              return (
                <div key={shot._id || idx} className="fizz-card p-4 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm" style={{ background: isSent ? 'rgba(200,241,53,0.15)' : 'rgba(0,212,255,0.15)', color: isSent ? '#C8F135' : '#00D4FF' }}>
                    {other?.firstName?.[0]}{other?.lastName?.[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {isSent ? `Sent to ${otherName}` : `Received from ${otherName}`}
                    </p>
                    {shot.venue?.name && (
                      <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {shot.venue.name}
                      </p>
                    )}
                    {dateStr && <p className="text-xs text-white/25 mt-0.5">{dateStr}</p>}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-base" style={{ color: isSent ? '#FF5F57' : '#C8F135' }}>
                      {isSent ? '-' : '+'}${shot.amount?.toFixed(2)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
