'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import axios from 'axios'
import { useApiUrl } from '../../utils/api'
import { CheckCircle2, XCircle, Clock, MapPin, Phone, Mail, Globe, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

const STATUS_TABS = ['pending', 'approved', 'denied', 'all'] as const
type StatusTab = typeof STATUS_TABS[number]

interface VenueRequest {
  _id: string
  venueName: string
  venueType: string
  address: string
  city: string
  state: string
  ownerName: string
  email: string
  phone: string
  website?: string
  photoUrl?: string
  description?: string
  status: 'pending' | 'approved' | 'denied'
  adminNote?: string
  createdAt: string
}

export default function PendingVenuesPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const API_URL = useApiUrl()
  const [requests, setRequests] = useState<VenueRequest[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [statusTab, setStatusTab] = useState<StatusTab>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [denyNote, setDenyNote] = useState<{ [id: string]: string }>({})
  const [expandedDeny, setExpandedDeny] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  const fetchRequests = useCallback(async () => {
    if (!token) return
    setLoadingData(true)
    try {
      const res = await axios.get(`${API_URL}/venue-requests?status=${statusTab}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRequests(res.data.requests || [])
    } catch (e) {
      console.error('Failed to fetch venue requests:', e)
    } finally {
      setLoadingData(false)
    }
  }, [token, API_URL, statusTab])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this venue? This will create their account and send them access credentials.')) return
    setProcessingId(id)
    try {
      await axios.put(`${API_URL}/venue-requests/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      showToast('Venue approved and owner notified!', 'success')
      fetchRequests()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to approve venue.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeny = async (id: string) => {
    setProcessingId(id)
    try {
      await axios.put(`${API_URL}/venue-requests/${id}/deny`, { note: denyNote[id] || '' }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      showToast('Venue request denied and owner notified.', 'success')
      setExpandedDeny(null)
      fetchRequests()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to deny venue.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-500 mb-1">Venue Requests</h1>
          <p className="text-primary-400/60 text-sm">Review and approve venue partner applications.</p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-6 border-b border-primary-500/10 pb-4">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                statusTab === tab
                  ? 'bg-primary-500 text-black'
                  : 'text-primary-400/70 hover:text-primary-400 border border-primary-500/20 hover:border-primary-500/40'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl transition-all ${
            toast.type === 'success' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Content */}
        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500 mr-2" />
            <span className="text-primary-400">Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-primary-400/50">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No {statusTab === 'all' ? '' : statusTab} venue requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req._id} className="bg-black/40 border border-primary-500/15 rounded-2xl overflow-hidden hover:border-primary-500/30 transition-all">
                <div className="flex flex-col lg:flex-row">
                  {/* Photo */}
                  {req.photoUrl && (
                    <div className="lg:w-48 flex-shrink-0">
                      <img
                        src={req.photoUrl}
                        alt={req.venueName}
                        className="w-full h-48 lg:h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-bold text-lg">{req.venueName}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full border border-primary-500/30 text-primary-400/70 bg-primary-500/5">
                            {req.venueType}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            req.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                            req.status === 'approved' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                            'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-primary-400/60 text-xs mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{req.address}, {req.city}, {req.state}</span>
                        </div>
                      </div>
                      <span className="text-primary-400/40 text-xs flex-shrink-0">{formatDate(req.createdAt)}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-primary-400/70">
                        <span className="text-primary-400/40">Owner</span>
                        <span className="text-white font-medium">{req.ownerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary-400/70">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${req.email}`} className="text-primary-400 hover:text-primary-300">{req.email}</a>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary-400/70">
                        <Phone className="w-3 h-3" />
                        <span>{req.phone}</span>
                      </div>
                      {req.website && (
                        <div className="flex items-center gap-1.5 text-primary-400/70">
                          <Globe className="w-3 h-3" />
                          <a href={req.website} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 truncate">{req.website}</a>
                        </div>
                      )}
                    </div>

                    {req.description && (
                      <p className="text-primary-400/60 text-xs italic mb-3 line-clamp-2">"{req.description}"</p>
                    )}

                    {req.adminNote && (
                      <p className="text-amber-400/70 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-1.5 mb-3">
                        Note: {req.adminNote}
                      </p>
                    )}

                    {/* Actions — only for pending */}
                    {req.status === 'pending' && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => handleApprove(req._id)}
                          disabled={processingId === req._id}
                          className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 font-semibold text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                        >
                          {processingId === req._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Approve
                        </button>

                        <button
                          onClick={() => setExpandedDeny(expandedDeny === req._id ? null : req._id)}
                          disabled={processingId === req._id}
                          className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-semibold text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                          Deny
                          {expandedDeny === req._id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {/* Deny note expansion */}
                    {expandedDeny === req._id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={denyNote[req._id] || ''}
                          onChange={e => setDenyNote(prev => ({ ...prev, [req._id]: e.target.value }))}
                          placeholder="Optional: add a note explaining why (sent to the venue owner)..."
                          rows={2}
                          className="w-full bg-black/40 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-red-400/30 focus:outline-none focus:border-red-500/40 resize-none"
                        />
                        <button
                          onClick={() => handleDeny(req._id)}
                          disabled={processingId === req._id}
                          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                        >
                          {processingId === req._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Confirm Denial
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
