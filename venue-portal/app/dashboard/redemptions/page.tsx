'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function RedemptionsPage() {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [loadingRedemptions, setLoadingRedemptions] = useState(true)

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
      // Get payments that have been redeemed at this venue
      const response = await axios.get(`${API_URL}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Filter for redeemed payments and get venue's payments
      const allPayments = response.data.payments || []
      const redeemedPayments = allPayments.filter((p: any) => 
        p.status === 'redeemed' && p.venue
      )
      
      // Get venue ID first
      const venuesResponse = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venues = venuesResponse.data.venues || []
      const myVenue = venues.find((v: any) => {
        if (!user) return false
        return v.owner?._id === user.id || v.owner === user.id
      })
      
      if (myVenue) {
        const venueRedemptions = redeemedPayments.filter((p: any) => 
          p.venue?.toString() === myVenue._id.toString() || 
          p.venueId?.toString() === myVenue._id.toString()
        )
        setRedemptions(venueRedemptions)
      } else {
        setRedemptions([])
      }
    } catch (error) {
      console.error('Failed to fetch redemptions:', error)
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
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl logo-script text-primary-500 mb-2">Redemptions</h1>
          <p className="text-primary-400 text-sm">View and manage payment redemptions</p>
        </div>
        
        {/* Redemptions Over Time Chart */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-primary-500">Redemptions Over Time</h2>
            <button className="text-primary-400 hover:text-primary-500 text-sm">🔄</button>
          </div>
          <div className="h-48 flex items-center justify-center border border-primary-500/20 rounded-lg">
            <p className="text-primary-400 text-sm">Chart visualization coming soon...</p>
          </div>
        </div>

        {/* Recent Redemptions */}
        <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-primary-500">Recent Redemptions</h2>
            <button className="text-primary-400 hover:text-primary-500 text-sm">🗑️</button>
          </div>
          <div className="space-y-2">
            {loadingRedemptions ? (
              <div className="text-center py-6 text-primary-400 text-sm">Loading redemptions...</div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-6 text-primary-400 text-sm">
                <p>No redemptions yet</p>
                <p className="text-xs mt-2">Redemptions will appear here as customers use their shots</p>
              </div>
            ) : (
              redemptions.map((redemption, idx) => (
                <div key={redemption._id || idx} className="border-b border-primary-500/10 pb-2 last:border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-primary-500 font-semibold text-sm">
                        {redemption.recipient?.firstName && redemption.recipient?.lastName
                          ? `${redemption.recipient.firstName} ${redemption.recipient.lastName}`
                          : redemption.recipient?.phoneNumber || 'Customer'}
                      </p>
                      <p className="text-primary-400 text-xs">
                        {redemption.venueName || redemption.venue?.name || 'General Redemption'}
                      </p>
                      {redemption.redemptionCode && (
                        <p className="text-primary-500/60 text-xs font-mono mt-0.5">Code: {redemption.redemptionCode}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-primary-500 font-semibold text-sm">${redemption.amount?.toFixed(2) || '0.00'}</p>
                      <p className="text-primary-400 text-xs">{new Date(redemption.redeemedAt || redemption.updatedAt || Date.now()).toLocaleString()}</p>
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

