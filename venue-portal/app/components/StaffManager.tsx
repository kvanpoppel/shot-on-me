'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useVenue } from '../contexts/VenueContext'
import axios from 'axios'
import { UserPlus, Trash2, Crown, User, Key, Copy, Check, X } from 'lucide-react'
import { getApiUrl } from '../utils/api'
import { useToast } from './ToastContainer'

interface StaffMember {
  _id: string
  user: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  role: 'owner' | 'manager' | 'staff'
  addedAt: string
}

export default function StaffManager() {
  const { token } = useAuth()
  const { venueId, isOwner } = useVenue()
  const { showSuccess, showError } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [staffCode, setStaffCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [editingCode, setEditingCode] = useState(false)
  const [savingCode, setSavingCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  useEffect(() => {
    if (venueId && token) fetchStaff()
  }, [venueId, token])

  const fetchStaff = async () => {
    if (!venueId || !token) return
    setLoading(true)
    try {
      const res = await axios.get(`${getApiUrl()}/venues/${venueId}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStaff(res.data.staff || [])
      setStaffCode(res.data.staffCode || null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleSetCode = async () => {
    if (!venueId || !token || !newCode.trim()) return
    setSavingCode(true)
    try {
      const res = await axios.put(
        `${getApiUrl()}/venues/${venueId}/staff-code`,
        { code: newCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setStaffCode(res.data.code)
      setEditingCode(false)
      setNewCode('')
      showSuccess('Access code set!')
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to set code')
    } finally {
      setSavingCode(false)
    }
  }

  const handleRemoveCode = async () => {
    if (!venueId || !token) return
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/staff-code`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStaffCode(null)
      showSuccess('Access code removed')
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to remove code')
    }
  }

  const handleCopyCode = () => {
    if (!staffCode) return
    navigator.clipboard.writeText(staffCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRemoveStaff = async (staffId: string) => {
    if (!venueId || !token) return
    try {
      await axios.delete(`${getApiUrl()}/venues/${venueId}/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConfirmRemoveId(null)
      fetchStaff()
      showSuccess('Staff member removed')
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to remove staff')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-primary-400 text-xs">Loading team...</div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Access Code Section — owner only */}
      {isOwner && (
        <div className="p-4 rounded-xl border border-primary-500/15 bg-[#1a1510]/60">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-bold text-white">Staff Access Code</h3>
          </div>
          <p className="text-xs text-primary-400/60 mb-3">
            Give this code to your staff. They log into the venue portal with their SOM account and enter the code to join.
          </p>

          {staffCode && !editingCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-primary-500/20">
                <span className="text-sm font-mono font-bold text-primary-500 tracking-wider">{staffCode}</span>
              </div>
              <button onClick={handleCopyCode} className="p-2 rounded-lg border border-primary-500/20 hover:bg-primary-500/10 transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-primary-400" />}
              </button>
              <button onClick={() => { setEditingCode(true); setNewCode(staffCode || '') }} className="px-2 py-1.5 text-xs text-primary-400 hover:text-primary-500 border border-primary-500/20 rounded-lg hover:bg-primary-500/10 transition-colors">
                Change
              </button>
              <button onClick={handleRemoveCode} className="px-2 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="e.g. KATES-STAFF-2026"
                className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-primary-500/20 text-sm text-white placeholder-primary-400/30 focus:border-primary-500/40 focus:outline-none"
                maxLength={32}
              />
              <button
                onClick={handleSetCode}
                disabled={savingCode || newCode.trim().length < 4}
                className="px-3 py-2 rounded-lg bg-primary-500 text-black text-xs font-bold hover:bg-primary-400 disabled:opacity-30 transition-all"
              >
                {savingCode ? '...' : 'Save'}
              </button>
              {editingCode && (
                <button onClick={() => { setEditingCode(false); setNewCode('') }} className="p-2 text-primary-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Staff List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <UserPlus className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-bold text-white">Team ({staff.length})</h3>
        </div>

        {staff.length === 0 ? (
          <p className="text-xs text-primary-400/50 px-1">No team members yet. Set an access code above and share it with your staff.</p>
        ) : (
          <div className="space-y-1.5">
            {staff.map(member => (
              <div key={member._id} className="flex items-center justify-between p-3 rounded-xl border border-primary-500/10 bg-[#1a1510]/40">
                <div className="flex items-center gap-2.5">
                  {member.role === 'owner' ? (
                    <Crown className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  ) : (
                    <User className="w-4 h-4 text-primary-400/60 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-[10px] text-primary-400/50">{member.user.email}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-primary-400/40 bg-primary-500/10 px-1.5 py-0.5 rounded">
                    {member.role}
                  </span>
                </div>

                {isOwner && member.role !== 'owner' && (
                  <>
                    {confirmRemoveId === member._id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleRemoveStaff(member._id)} className="px-2 py-1 text-[10px] bg-red-500 text-white rounded font-bold">
                          Remove
                        </button>
                        <button onClick={() => setConfirmRemoveId(null)} className="px-2 py-1 text-[10px] border border-primary-500/20 text-primary-400 rounded">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRemoveId(member._id)} className="p-1.5 text-primary-400/40 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
