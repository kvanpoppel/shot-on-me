'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import CollapsibleSection from '../../components/CollapsibleSection'
import AIAnalyticsSummary from '../../components/AIAnalyticsSummary'
import axios from 'axios'
import { getApiUrl } from '../../utils/api'
import { Sparkles, TrendingUp } from 'lucide-react'

export default function RedemptionsPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [loadingRedemptions, setLoadingRedemptions] = useState(true)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [myVenueId, setMyVenueId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token && user) {
      fetchRedemptions()
    }
  }, [token, user])

  const fetchRedemptions = async () => {
    if (!token) return
    setLoadingRedemptions(true)
    try {
      // Get venue ID first
      const apiUrl = getApiUrl()
      const venuesResponse = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Handle both response formats: { venues: [...] } or direct array
      let venues: any[] = []
      if (Array.isArray(venuesResponse.data)) {
        venues = venuesResponse.data
      } else if (venuesResponse.data?.venues) {
        venues = venuesResponse.data.venues
      }
      
      // Improved venue matching: handle both populated owner object and owner ID string
      const myVenue = venues.find((v: any) => {
        if (!user) return false
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        const userId = user.id?.toString()
        return ownerId === userId
      })
      
      if (!myVenue) {
        setRedemptions([])
        return
      }

      setMyVenueId(myVenue._id.toString())

      // Get payments redeemed at this venue (type: shot_redeemed or transfer, with venueId)
      const response = await axios.get(`${apiUrl}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const allPayments = response.data.payments || []
      const venueRedemptions = allPayments.filter((p: any) => 
        (p.venueId?.toString() === myVenue._id.toString() || 
         p.venue?._id?.toString() === myVenue._id.toString() ||
         p.venue?.toString() === myVenue._id.toString()) &&
        (p.type === 'shot_redeemed' || p.type === 'transfer' || p.type === 'tap_and_pay')
      )
      
      setRedemptions(venueRedemptions)
    } catch (error: any) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development') {
        console.debug('Failed to fetch redemptions:', error.message || error)
      }
    } finally {
      setLoadingRedemptions(false)
    }
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
      <div className="space-y-4 md:space-y-5 w-full max-w-full">
        {/* Clean Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-400 mb-1">Redemptions</h1>
          <p className="text-sm text-primary-500/70">Redeem payment codes and track redemption history</p>
        </div>

        {/* Redeem Code Interface - Prominent */}
        <div className="bg-gradient-to-br from-black/50 via-black/40 to-black/50 border-2 border-primary-500/30 rounded-xl shadow-xl p-4 md:p-6 overflow-x-hidden">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <span className="text-xl">🎫</span>
            </div>
            <h2 className="text-lg font-semibold text-primary-500">Redeem Payment Code</h2>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!redemptionCode || !myVenueId || !token) return

              try {
                setRedeeming(true)
                const apiUrl = getApiUrl()
                const response = await axios.post(
                  `${apiUrl}/payments/redeem`,
                  {
                    code: redemptionCode.toUpperCase(),
                    venueId: myVenueId
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                )

                alert(`✅ Payment redeemed successfully! Amount: $${response.data.amount.toFixed(2)}`)
                setRedemptionCode('')
                await fetchRedemptions()
              } catch (error: any) {
                alert(`❌ ${error.response?.data?.message || 'Failed to redeem code'}`)
              } finally {
                setRedeeming(false)
              }
            }}
            className="space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character code"
                className="flex-1 px-4 md:px-5 py-3 md:py-4 bg-black/60 border-2 border-primary-500/30 rounded-xl text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-lg md:text-xl text-center tracking-widest min-w-0"
                maxLength={8}
                style={{ letterSpacing: '0.2em' }}
              />
              <button
                type="submit"
                disabled={!redemptionCode || redeeming || redemptionCode.length < 4}
                className="px-6 md:px-8 py-3 md:py-4 bg-primary-500 text-black rounded-xl font-bold hover:bg-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                {redeeming ? 'Processing...' : 'Redeem'}
              </button>
            </div>
            <p className="text-xs text-primary-500/70 text-center">
              Enter the code provided by the customer to process their payment
            </p>
          </form>
        </div>

        {/* AI Insights - Redemption Patterns */}
        <CollapsibleSection
          title="AI Redemption Insights"
          subtitle="AI-powered analysis of your redemption patterns"
          defaultOpen={false}
          icon={<Sparkles className="w-4 h-4" />}
        >
          <div className="pt-2">
            <AIAnalyticsSummary />
          </div>
        </CollapsibleSection>

        {/* Redemptions List - Organized */}
        <div className="bg-black/40 border border-primary-500/20 rounded-xl p-4 md:p-6 overflow-x-hidden">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-primary-500">Redemption History</h2>
              <p className="text-xs text-primary-500/70 mt-1">{redemptions.length} total redemptions</p>
            </div>
            <button
              onClick={fetchRedemptions}
              className="text-xs text-primary-500/70 hover:text-primary-500 transition-colors px-3 py-1.5 bg-black/40 rounded-lg hover:bg-black/60"
            >
              🔄 Refresh
            </button>
          </div>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {loadingRedemptions ? (
              <div className="text-center py-12 text-primary-400 text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-3"></div>
                Loading redemptions...
              </div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-12 bg-black/20 rounded-lg border border-primary-500/10">
                <span className="text-4xl mb-3 block">🎫</span>
                <p className="text-primary-400 text-sm font-medium">No redemptions yet</p>
                <p className="text-primary-400/70 text-xs mt-1">Redemptions will appear here as customers use their shots</p>
              </div>
            ) : (
              redemptions.map((redemption, idx) => (
                <div 
                  key={redemption._id || idx} 
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/40 hover:bg-black/60 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-500 font-semibold text-xs md:text-sm">
                            {redemption.senderId?.firstName?.charAt(0) || 'C'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary-500 truncate">
                            {redemption.senderId?.firstName && redemption.senderId?.lastName
                              ? `${redemption.senderId.firstName} ${redemption.senderId.lastName}`
                              : redemption.senderId?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-primary-400/70">
                            {new Date(redemption.createdAt || redemption.updatedAt || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                          redemption.type === 'tap_and_pay' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        }`}>
                          {redemption.type === 'tap_and_pay' ? 'Tap & Pay' : 
                           redemption.type === 'shot_redeemed' ? 'Shot Redeemed' : 
                           redemption.type === 'transfer' ? 'Transfer' : 
                           redemption.type || 'Payment'}
                        </span>
                        {redemption.redemptionCode && (
                          <span className="text-xs text-primary-500/60 font-mono bg-black/40 px-2 py-1 rounded whitespace-nowrap">
                            {redemption.redemptionCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right sm:text-right ml-0 sm:ml-4 flex-shrink-0">
                      <p className="text-lg md:text-xl font-bold text-primary-500 mb-1">${redemption.amount?.toFixed(2) || '0.00'}</p>
                      {redemption.metadata?.venueReceives && (
                        <p className="text-xs text-primary-400/80 mb-2">
                          Net: ${parseFloat(redemption.metadata.venueReceives).toFixed(2)}
                        </p>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                        redemption.status === 'succeeded' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        redemption.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {redemption.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
