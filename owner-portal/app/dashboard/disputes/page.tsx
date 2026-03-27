'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, Loader,
  DollarSign, Search, RefreshCw, ChevronDown, X
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  open: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  under_review: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  resolved_refund: 'text-green-400 bg-green-500/10 border-green-500/30',
  resolved_no_action: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  closed: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved_refund: 'Refunded',
  resolved_no_action: 'No Action',
  closed: 'Closed',
}

const REASON_LABELS: Record<string, string> = {
  unauthorized: 'Unauthorized charge',
  not_received: 'Shot not received',
  duplicate: 'Duplicate transaction',
  wrong_amount: 'Wrong amount',
  other: 'Other',
}

export default function DisputesPage() {
  const { token } = useAuth()
  const API_URL = useApiUrl()
  const [disputes, setDisputes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [resolving, setResolving] = useState<string | null>(null)
  const [selectedDispute, setSelectedDispute] = useState<any>(null)
  const [resolveAction, setResolveAction] = useState<'refund' | 'no_action' | ''>('')
  const [resolveNote, setResolveNote] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [resolveError, setResolveError] = useState('')

  const fetchDisputes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: '100' })
      const res = await axios.get(`${API_URL}/disputes/admin/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDisputes(res.data.disputes || [])
      setTotal(res.data.total || 0)
    } catch (err: any) {
      console.error('Failed to fetch disputes:', err)
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter, API_URL])

  useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

  const handleMarkReview = async (disputeId: string) => {
    try {
      await axios.put(`${API_URL}/disputes/${disputeId}/status`,
        { status: 'under_review' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchDisputes()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleResolve = async () => {
    if (!selectedDispute || !resolveAction) return
    setResolving(selectedDispute._id)
    setResolveError('')
    try {
      const body: any = { action: resolveAction, resolution: resolveNote }
      if (resolveAction === 'refund' && refundAmount) {
        body.refundAmount = parseFloat(refundAmount)
      }
      await axios.post(`${API_URL}/disputes/${selectedDispute._id}/resolve`, body, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedDispute(null)
      setResolveAction('')
      setResolveNote('')
      setRefundAmount('')
      fetchDisputes()
    } catch (err: any) {
      setResolveError(err.response?.data?.message || 'Failed to resolve dispute')
    } finally {
      setResolving(null)
    }
  }

  const filtered = disputes.filter(d => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      d.userId?.name?.toLowerCase().includes(s) ||
      d.userId?.email?.toLowerCase().includes(s) ||
      d.reason?.includes(s)
    )
  })

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-500 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Dispute Management
            </h1>
            <p className="text-primary-400/60 text-sm mt-1">{total} total in current filter</p>
          </div>
          <button
            onClick={fetchDisputes}
            className="p-2 text-primary-400 hover:text-primary-500 border border-primary-500/30 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {['open', 'under_review', 'resolved_refund', 'resolved_no_action', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                statusFilter === s
                  ? 'bg-primary-500 text-black border-primary-500'
                  : 'bg-black/40 text-primary-400 border-primary-500/20 hover:border-primary-500/50'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          <div className="flex-1 min-w-48">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by user or reason..."
                className="w-full bg-black/40 border border-primary-500/20 text-primary-400 placeholder-primary-400/30 rounded-lg pl-9 pr-4 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-primary-400/40">
            No disputes found
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(dispute => (
              <div
                key={dispute._id}
                className="bg-black/40 border border-primary-500/20 rounded-xl p-4 hover:border-primary-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${STATUS_COLORS[dispute.status] || ''}`}>
                        {STATUS_LABELS[dispute.status] || dispute.status}
                      </span>
                      <span className="text-primary-400/60 text-xs">{REASON_LABELS[dispute.reason] || dispute.reason}</span>
                      <span className="text-primary-400/40 text-xs">
                        {new Date(dispute.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <p className="text-primary-500 font-semibold text-sm">
                        {dispute.userId?.name || 'Unknown User'}
                      </p>
                      <p className="text-primary-400/60 text-xs">{dispute.userId?.email}</p>
                      {dispute.paymentId?.amount && (
                        <span className="flex items-center gap-1 text-green-400 text-sm font-bold">
                          <DollarSign className="w-3.5 h-3.5" />
                          {dispute.paymentId.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {dispute.description && (
                      <p className="text-primary-400/50 text-xs italic line-clamp-2">"{dispute.description}"</p>
                    )}
                    {dispute.resolution && (
                      <p className="text-primary-400/60 text-xs">Resolution: {dispute.resolution}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {['open', 'under_review'].includes(dispute.status) && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {dispute.status === 'open' && (
                        <button
                          onClick={() => handleMarkReview(dispute._id)}
                          className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-all"
                        >
                          <Clock className="w-3.5 h-3.5 inline mr-1" />
                          Review
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute)
                          setResolveAction('')
                          setResolveNote('')
                          setRefundAmount(dispute.paymentId?.amount?.toFixed(2) || '')
                          setResolveError('')
                        }}
                        className="text-xs px-3 py-1.5 bg-primary-500/10 text-primary-500 border border-primary-500/30 rounded-lg hover:bg-primary-500/20 transition-all font-semibold"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-primary-500/40 rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-primary-500">Resolve Dispute</h2>
              <button onClick={() => setSelectedDispute(null)} className="text-primary-400 hover:text-primary-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black/40 border border-primary-500/20 rounded-xl p-3 mb-5 space-y-1">
              <p className="text-primary-400/60 text-xs">User</p>
              <p className="text-primary-500 font-semibold">{selectedDispute.userId?.name} — {selectedDispute.userId?.email}</p>
              <p className="text-primary-400/60 text-xs mt-2">Reason</p>
              <p className="text-primary-400">{REASON_LABELS[selectedDispute.reason]}</p>
              {selectedDispute.paymentId?.amount && (
                <>
                  <p className="text-primary-400/60 text-xs mt-2">Payment amount</p>
                  <p className="text-green-400 font-bold">${selectedDispute.paymentId.amount.toFixed(2)}</p>
                </>
              )}
              {selectedDispute.description && (
                <>
                  <p className="text-primary-400/60 text-xs mt-2">User's note</p>
                  <p className="text-primary-400/80 text-sm italic">"{selectedDispute.description}"</p>
                </>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-primary-400 text-sm font-semibold mb-2">Action *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setResolveAction('refund')}
                  className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    resolveAction === 'refund'
                      ? 'bg-green-500/20 border-green-500/60 text-green-400'
                      : 'bg-black/40 border-primary-500/20 text-primary-400 hover:border-primary-500/40'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Issue Refund
                </button>
                <button
                  onClick={() => setResolveAction('no_action')}
                  className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    resolveAction === 'no_action'
                      ? 'bg-gray-500/20 border-gray-500/60 text-gray-300'
                      : 'bg-black/40 border-primary-500/20 text-primary-400 hover:border-primary-500/40'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  No Refund
                </button>
              </div>
            </div>

            {resolveAction === 'refund' && (
              <div className="mb-4">
                <label className="block text-primary-400 text-sm font-semibold mb-2">Refund amount (leave blank for full amount)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400/40" />
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    placeholder={selectedDispute.paymentId?.amount?.toFixed(2)}
                    className="w-full bg-black/60 border border-primary-500/30 text-primary-400 rounded-xl pl-9 pr-4 py-2.5 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-primary-400 text-sm font-semibold mb-2">Internal note (optional)</label>
              <textarea
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                placeholder="Add resolution notes..."
                rows={2}
                className="w-full bg-black/60 border border-primary-500/30 text-primary-400 placeholder-primary-400/30 rounded-xl p-3 text-sm resize-none"
              />
            </div>

            {resolveError && (
              <p className="text-red-400 text-sm mb-4">{resolveError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDispute(null)}
                className="flex-1 bg-black/40 border border-primary-500/30 text-primary-400 py-3 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveAction || !!resolving}
                className="flex-1 bg-primary-500 text-black font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resolving ? <Loader className="w-4 h-4 animate-spin" /> : null}
                {resolving ? 'Processing...' : resolveAction === 'refund' ? 'Issue Refund' : 'Confirm No Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
