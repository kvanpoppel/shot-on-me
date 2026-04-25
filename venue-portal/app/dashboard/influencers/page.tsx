'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useVenue } from '../../contexts/VenueContext'
import { useToast } from '../../components/ToastContainer'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardPageShell from '../../components/DashboardPageShell'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { Users, Star, X, CheckCircle2, Clock, DollarSign } from 'lucide-react'

interface EligibleInfluencer {
  _id: string
  firstName?: string
  lastName?: string
  username?: string
  email?: string
  checkInCount: number
  postCount: number
  engagementScore: number
}

interface InfluencerOffer {
  _id: string
  influencerId: string | { _id: string; firstName?: string; lastName?: string; username?: string }
  title: string
  description?: string
  payout: number
  requirements?: string
  deadline?: string
  status: 'pending' | 'accepted' | 'completed' | 'paid'
  createdAt: string
}

interface OfferFormData {
  title: string
  description: string
  payout: string
  requirements: string
  deadline: string
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'Pending',   classes: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
  accepted:  { label: 'Accepted',  classes: 'bg-blue-400/15 text-blue-300 border-blue-400/30' },
  completed: { label: 'Completed', classes: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' },
  paid:      { label: 'Paid',      classes: 'bg-primary-400/10 text-primary-400/70 border-primary-500/20' }
}

export default function InfluencersPage() {
  const { user, loading, token } = useAuth()
  const { venueId } = useVenue()
  const { showSuccess, showError } = useToast()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'find' | 'offers'>('find')
  const [eligible, setEligible] = useState<EligibleInfluencer[]>([])
  const [offers, setOffers] = useState<InfluencerOffer[]>([])
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedInfluencer, setSelectedInfluencer] = useState<EligibleInfluencer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<OfferFormData>({
    title: '',
    description: '',
    payout: '',
    requirements: '',
    deadline: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (venueId && token) {
      fetchEligible()
      fetchOffers()
    }
  }, [venueId, token])

  const fetchEligible = async () => {
    if (!token) return
    setLoadingEligible(true)
    try {
      const apiUrl = getApiUrl()
      const res = await axios.get(`${apiUrl}/influencer/eligible`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEligible(Array.isArray(res.data) ? res.data : res.data?.influencers || [])
    } catch {
      setEligible([])
    } finally {
      setLoadingEligible(false)
    }
  }

  const fetchOffers = async () => {
    if (!token) return
    setLoadingOffers(true)
    try {
      const apiUrl = getApiUrl()
      const res = await axios.get(`${apiUrl}/influencer/venue-offers`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setOffers(Array.isArray(res.data) ? res.data : res.data?.offers || [])
    } catch {
      setOffers([])
    } finally {
      setLoadingOffers(false)
    }
  }

  const openOfferModal = (influencer: EligibleInfluencer) => {
    setSelectedInfluencer(influencer)
    setForm({ title: '', description: '', payout: '', requirements: '', deadline: '' })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedInfluencer(null)
  }

  const handleSubmitOffer = async () => {
    if (!token || !venueId || !selectedInfluencer) return
    if (!form.title.trim() || !form.payout) {
      showError('Title and payout are required.')
      return
    }
    const payoutNum = parseFloat(form.payout)
    if (isNaN(payoutNum) || payoutNum < 5 || payoutNum > 500) {
      showError('Payout must be between $5 and $500.')
      return
    }

    setSubmitting(true)
    try {
      const apiUrl = getApiUrl()
      await axios.post(
        `${apiUrl}/influencer/offer`,
        {
          influencerId: selectedInfluencer._id,
          venueId,
          title: form.title.trim(),
          description: form.description.trim(),
          payout: payoutNum,
          requirements: form.requirements.trim(),
          deadline: form.deadline || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Offer sent successfully.')
      closeModal()
      fetchOffers()
    } catch (err: any) {
      showError(err?.response?.data?.error || 'Failed to send offer.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (offerId: string) => {
    if (!token || approvingId) return
    setApprovingId(offerId)
    try {
      const apiUrl = getApiUrl()
      await axios.put(
        `${apiUrl}/influencer/${offerId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Offer approved and payout triggered.')
      fetchOffers()
    } catch (err: any) {
      showError(err?.response?.data?.error || 'Failed to approve offer.')
    } finally {
      setApprovingId(null)
    }
  }

  const getInfluencerName = (influencer: EligibleInfluencer) => {
    if (influencer.firstName || influencer.lastName) {
      return `${influencer.firstName || ''} ${influencer.lastName || ''}`.trim()
    }
    return influencer.username || influencer.email || 'Unknown'
  }

  const getInfluencerInitial = (influencer: EligibleInfluencer) => {
    const name = getInfluencerName(influencer)
    return name.charAt(0).toUpperCase()
  }

  const getOfferInfluencerName = (offer: InfluencerOffer) => {
    if (typeof offer.influencerId === 'object' && offer.influencerId !== null) {
      const inf = offer.influencerId
      if (inf.firstName || inf.lastName) {
        return `${inf.firstName || ''} ${inf.lastName || ''}`.trim()
      }
      return inf.username || 'Unknown'
    }
    return 'Influencer'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <DashboardPageShell
        icon={<Star className="w-5 h-5 text-primary-500" />}
        title="Influencer Marketplace"
        subtitle="Partner with engaged guests to amplify your venue's reach through sponsored posts."
        metrics={[
          {
            label: 'Eligible Influencers',
            value: loadingEligible ? '...' : `${eligible.length}`,
            detail: 'Guests with strong engagement'
          },
          {
            label: 'Active Offers',
            value: loadingOffers ? '...' : `${offers.filter(o => o.status === 'pending' || o.status === 'accepted').length}`,
            detail: 'Pending or accepted'
          },
          {
            label: 'Completed Deals',
            value: loadingOffers ? '...' : `${offers.filter(o => o.status === 'completed' || o.status === 'paid').length}`,
            detail: 'Finished partnerships',
            tone: 'success'
          }
        ]}
      >
        {/* Tab Toggle */}
        <div className="flex gap-1 rounded-xl border border-primary-500/20 bg-black/35 p-1 w-fit">
          <button
            onClick={() => setActiveTab('find')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'find'
                ? 'bg-primary-500 text-black'
                : 'text-primary-400/80 hover:text-primary-500'
            }`}
          >
            Find Influencers
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'offers'
                ? 'bg-primary-500 text-black'
                : 'text-primary-400/80 hover:text-primary-500'
            }`}
          >
            My Offers
            {offers.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-500/20 px-1.5 py-0.5 text-[10px] text-primary-400">
                {offers.length}
              </span>
            )}
          </button>
        </div>

        {/* Find Influencers Tab */}
        {activeTab === 'find' && (
          <div className="rounded-xl border border-primary-500/20 bg-black/35 p-4">
            {!venueId ? (
              <p className="text-sm text-primary-400/60 text-center py-8">Loading venue data...</p>
            ) : loadingEligible ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-primary-500/15 bg-black/30 p-4 h-28" />
                ))}
              </div>
            ) : eligible.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-10 w-10 text-primary-500/30 mb-3" />
                <p className="text-sm text-primary-400/60">No eligible influencers found yet.</p>
                <p className="text-xs text-primary-400/40 mt-1">Influencers appear once guests build engagement at your venue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {eligible.map((influencer) => (
                  <div
                    key={influencer._id}
                    className="rounded-xl border border-primary-500/20 bg-black/40 p-4 flex flex-col gap-3 transition hover:border-primary-500/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary-500/30 bg-primary-500/10 text-sm font-semibold text-primary-400">
                        {getInfluencerInitial(influencer)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-primary-400">
                          {getInfluencerName(influencer)}
                        </p>
                        <p className="text-[11px] text-primary-400/50">
                          Score: <span className="text-primary-400/80">{influencer.engagementScore?.toFixed(1) ?? '—'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-center">
                      <div className="rounded-lg border border-primary-500/15 bg-black/30 px-2 py-1.5">
                        <p className="text-[11px] text-primary-400/50">Check-ins</p>
                        <p className="text-sm font-semibold text-primary-400">{influencer.checkInCount ?? 0}</p>
                      </div>
                      <div className="rounded-lg border border-primary-500/15 bg-black/30 px-2 py-1.5">
                        <p className="text-[11px] text-primary-400/50">Posts</p>
                        <p className="text-sm font-semibold text-primary-400">{influencer.postCount ?? 0}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openOfferModal(influencer)}
                      className="w-full rounded-lg bg-primary-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-primary-400"
                    >
                      Make Offer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Offers Tab */}
        {activeTab === 'offers' && (
          <div className="rounded-xl border border-primary-500/20 bg-black/35 p-4">
            {loadingOffers ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-primary-500/15 bg-black/30 h-14" />
                ))}
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-10 w-10 text-primary-500/30 mb-3" />
                <p className="text-sm text-primary-400/60">No offers sent yet.</p>
                <p className="text-xs text-primary-400/40 mt-1">Switch to "Find Influencers" to send your first offer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {offers.map((offer) => {
                  const statusCfg = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.pending
                  return (
                    <div
                      key={offer._id}
                      className="flex flex-col gap-2 rounded-xl border border-primary-500/20 bg-black/40 p-3 transition hover:border-primary-500/35 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary-500/25 bg-primary-500/10 text-xs font-semibold text-primary-400">
                          {getOfferInfluencerName(offer).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-primary-400">{offer.title}</p>
                          <p className="text-[11px] text-primary-400/50">
                            {getOfferInfluencerName(offer)}
                            {' · '}
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                        <span className="text-sm font-semibold text-emerald-300">${offer.payout}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCfg.classes}`}>
                          {statusCfg.label}
                        </span>
                        {offer.status === 'completed' && (
                          <button
                            onClick={() => handleApprove(offer._id)}
                            disabled={approvingId === offer._id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {approvingId === offer._id ? 'Approving...' : 'Approve & Pay'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </DashboardPageShell>

      {/* Make Offer Modal */}
      {showModal && selectedInfluencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary-500/30 bg-black/95 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary-500">Make Offer</h3>
                <p className="text-xs text-primary-400/70">
                  Sending to <span className="text-primary-400">{getInfluencerName(selectedInfluencer)}</span>
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg border border-primary-500/25 p-2 text-primary-400 hover:text-primary-500"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-xs font-semibold text-primary-400/80">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Friday night Instagram post"
                  className="w-full rounded-lg border border-primary-500/25 bg-black/50 px-3 py-2 text-sm text-primary-300 placeholder-primary-400/35 outline-none focus:border-primary-500/55"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-primary-400/80">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what you are looking for..."
                  className="w-full rounded-lg border border-primary-500/25 bg-black/50 px-3 py-2 text-sm text-primary-300 placeholder-primary-400/35 outline-none focus:border-primary-500/55 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-primary-400/80">Payout ($5–$500) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary-400/60">$</span>
                    <input
                      type="number"
                      min={5}
                      max={500}
                      value={form.payout}
                      onChange={(e) => setForm((f) => ({ ...f, payout: e.target.value }))}
                      placeholder="50"
                      className="w-full rounded-lg border border-primary-500/25 bg-black/50 pl-6 pr-3 py-2 text-sm text-primary-300 placeholder-primary-400/35 outline-none focus:border-primary-500/55"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-primary-400/80">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full rounded-lg border border-primary-500/25 bg-black/50 px-3 py-2 text-sm text-primary-300 outline-none focus:border-primary-500/55"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-primary-400/80">Requirements</label>
                <textarea
                  rows={2}
                  value={form.requirements}
                  onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                  placeholder="e.g. Must tag @shotonme and include venue hashtag"
                  className="w-full rounded-lg border border-primary-500/25 bg-black/50 px-3 py-2 text-sm text-primary-300 placeholder-primary-400/35 outline-none focus:border-primary-500/55 resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 rounded-lg border border-primary-500/25 bg-black/40 px-4 py-2.5 text-sm font-semibold text-primary-400 transition hover:border-primary-500/45 hover:text-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOffer}
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-primary-400 disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
