'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { Plus, Edit, Trash2, X, Calendar } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Promotion {
  _id: string
  title: string
  description?: string
  type: string
  startTime: string
  endTime: string
  isActive?: boolean
}

export default function PromotionsManager() {
  const { token, user } = useAuth()
  const { socket } = useSocket()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'happy-hour',
    startTime: '',
    endTime: '',
    daysOfWeek: [] as number[]
  })

  useEffect(() => {
    fetchVenue()
  }, [user, token])

  // Listen for real-time promotion updates
  useEffect(() => {
    if (!socket || !venueId) return

    const handlePromotionUpdate = (data: { venueId: string; promotion: any }) => {
      if (data.venueId === venueId) {
        fetchPromotions()
      }
    }

    const handleNewPromotion = (data: { venueId: string; promotion: any }) => {
      if (data.venueId === venueId) {
        fetchPromotions()
      }
    }

    const handlePromotionDeleted = (data: { venueId: string; promotionId: string }) => {
      if (data.venueId === venueId) {
        fetchPromotions()
      }
    }

    socket.on('promotion-updated', handlePromotionUpdate)
    socket.on('new-promotion', handleNewPromotion)
    socket.on('promotion-deleted', handlePromotionDeleted)

    return () => {
      socket.off('promotion-updated', handlePromotionUpdate)
      socket.off('new-promotion', handleNewPromotion)
      socket.off('promotion-deleted', handlePromotionDeleted)
    }
  }, [socket, venueId])

  const fetchVenue = async () => {
    if (!token || !user) return
    try {
      // Get user's venue (owned or staff)
      const venuesResponse = await axios.get(`${API_URL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venues = venuesResponse.data.venues || []
      
      // The authenticated endpoint returns venues in format: { venue: {...}, userRole: 'owner' }
      // OR just the venue object directly
      let myVenue = null
      
      // Check if venues are in the wrapped format
      if (venues.length > 0 && venues[0].venue) {
        // Format: [{ venue: {...}, userRole: 'owner' }]
        myVenue = venues[0].venue
      } else {
        // Format: [{ _id: ..., owner: ..., ... }]
        // Find venue owned by current user OR where user is staff
        myVenue = venues.find((v: any) => {
          // Normalize IDs for comparison
          const venueOwnerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
          const userId = user.id?.toString() || user._id?.toString()
          
          const isOwner = venueOwnerId === userId
          
          // Check if user is staff
          const isStaff = v.staff?.some((s: any) => {
            const staffUserId = s.user?._id?.toString() || s.user?.toString() || s.user
            return staffUserId === userId
          })
          
          return isOwner || isStaff
        })
      }
      
      // If no venue exists, auto-create one with basic info
      if (!myVenue && user.userType === 'venue') {
        try {
          const createResponse = await axios.post(
            `${API_URL}/venues`,
            {
              name: `${user.firstName}'s Venue`,
              location: { latitude: 0, longitude: 0 } // Will need to update with actual location
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          myVenue = createResponse.data.venue
        } catch (createError) {
          console.error('Failed to auto-create venue:', createError)
          // Continue without venue - user can create one later
        }
      }
      
      if (myVenue) {
        const venueIdToUse = myVenue._id?.toString() || myVenue.id?.toString() || myVenue._id || myVenue.id
        if (!venueIdToUse) {
          console.error('Venue found but no ID available:', myVenue)
          setLoading(false)
          return
        }
        console.log('✅ Found venue:', venueIdToUse, 'for user:', user.id)
        setVenueId(venueIdToUse)
        fetchPromotions(venueIdToUse)
      } else {
        console.warn('⚠️ No venue found for user:', user.id, 'Available venues:', venues.length)
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch venue:', error)
      setLoading(false)
    }
  }

  const fetchPromotions = async (vid?: string) => {
    if (!vid && !venueId) return
    const vId = vid || venueId
    if (!vId) return
    
    try {
      const response = await axios.get(`${API_URL}/venues/${vId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPromotions(response.data.venue?.promotions || [])
    } catch (error) {
      console.error('Failed to fetch promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueId || !token) {
      alert('No venue found. Please create a venue first.')
      return
    }

    setSaving(true)
    try {
      const promotionData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      }

      if (editingPromo) {
        // Update existing promotion
        await axios.put(
          `${API_URL}/venues/${venueId}/promotions/${editingPromo._id}`,
          promotionData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        alert('Promotion updated successfully!')
      } else {
        // Create new promotion
        await axios.post(
          `${API_URL}/venues/${venueId}/promotions`,
          promotionData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        alert('Promotion created successfully!')
      }

      setShowForm(false)
      setEditingPromo(null)
      setFormData({
        title: '',
        description: '',
        type: 'happy-hour',
        startTime: '',
        endTime: '',
        daysOfWeek: []
      })
      fetchPromotions()
    } catch (error: any) {
      console.error('❌ Failed to save promotion:', error)
      console.error('Venue ID used:', venueId)
      console.error('Error details:', error.response?.data)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save promotion'
      alert(`Error: ${errorMessage}\n\nVenue ID: ${venueId}\nPlease check the console for details.`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo)
    setFormData({
      title: promo.title,
      description: promo.description || '',
      type: promo.type,
      startTime: new Date(promo.startTime).toISOString().slice(0, 16),
      endTime: new Date(promo.endTime).toISOString().slice(0, 16),
      daysOfWeek: []
    })
    setShowForm(true)
  }

  const handleDelete = async (promoId: string) => {
    if (!venueId || !token) return
    if (!confirm('Are you sure you want to delete this promotion?')) return

    try {
      await axios.delete(
        `${API_URL}/venues/${venueId}/promotions/${promoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Promotion deleted successfully!')
      fetchPromotions()
    } catch (error: any) {
      console.error('Failed to delete promotion:', error)
      alert(error.response?.data?.error || 'Failed to delete promotion')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingPromo(null)
    setFormData({
      title: '',
      description: '',
      type: 'happy-hour',
      startTime: '',
      endTime: '',
      daysOfWeek: []
    })
  }

  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
            <Calendar className="w-4 h-4 text-primary-500" />
          </div>
          <h2 className="text-base font-semibold text-primary-500 tracking-tight">Promotions</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-1 bg-primary-500 text-black px-2.5 py-1.5 rounded hover:bg-primary-600 transition-all font-medium text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-3 p-3 bg-black/40 border border-primary-500/15 rounded-lg space-y-2 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-primary-500">
              {editingPromo ? 'Edit Promotion' : 'New Promotion'}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-primary-400 hover:text-primary-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-0.5 tracking-tight">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-500 placeholder-primary-500/40 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 text-xs font-light backdrop-blur-sm"
              placeholder="Enter promotion title"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-0.5 tracking-tight">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-500 placeholder-primary-500/40 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 text-xs font-light backdrop-blur-sm"
              placeholder="Enter promotion description (optional)"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-0.5 tracking-tight">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-500 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 text-xs font-light backdrop-blur-sm"
            >
              <option value="happy-hour" className="bg-black text-primary-500">Happy Hour</option>
              <option value="event" className="bg-black text-primary-500">Event</option>
              <option value="special" className="bg-black text-primary-500">Special</option>
              <option value="birthday" className="bg-black text-primary-500">Birthday</option>
              <option value="anniversary" className="bg-black text-primary-500">Anniversary</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-primary-500 mb-0.5 tracking-tight">Start Time</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-500 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 text-xs font-light backdrop-blur-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary-500 mb-0.5">End Time</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-black/40 border border-primary-500/20 rounded text-primary-500 focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 text-xs font-light backdrop-blur-sm"
                required
              />
            </div>
          </div>
          <div className="flex space-x-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary-500 text-black py-1.5 rounded font-medium hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              {saving ? 'Saving...' : editingPromo ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-1.5 rounded font-medium hover:bg-primary-500/10 hover:border-primary-500/30 transition-all text-xs backdrop-blur-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-4 text-primary-400/70 text-sm font-light">Loading promotions...</div>
      ) : !venueId ? (
        <div className="text-center py-4 text-primary-400/80 text-sm">
          <p className="mb-2 font-light">No venue found. Please create a venue first.</p>
          <button
            onClick={() => window.location.href = '/dashboard/settings'}
            className="bg-primary-500 text-black px-4 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-sm"
          >
            Go to Settings
          </button>
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-4 text-primary-400/80 text-sm">
          <p className="mb-2 font-light">No promotions yet. Create your first promotion!</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 bg-primary-500 text-black px-4 py-1.5 rounded-lg font-medium hover:bg-primary-600 transition-all text-sm"
          >
            + Create Promotion
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {promotions.map((promo) => (
            <div key={promo._id} className="bg-black/40 border border-primary-500/15 rounded p-2 hover:border-primary-500/25 hover:bg-black/50 transition-all backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-primary-500 text-xs truncate tracking-tight">{promo.title}</h3>
                  {promo.description && (
                    <p className="text-xs text-primary-400/80 mt-0.5 line-clamp-1 font-light">{promo.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1.5 text-xs text-primary-400/70">
                    <span className="capitalize bg-primary-500/10 border border-primary-500/20 text-primary-500 px-1.5 py-0.5 rounded text-xs font-medium">
                      {promo.type.replace('-', ' ')}
                    </span>
                    <span className="truncate text-xs font-light">{new Date(promo.startTime).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex space-x-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="p-1 text-primary-400 hover:text-primary-500 hover:bg-primary-500/10 rounded transition-colors"
                    title="Edit promotion"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo._id)}
                    className="p-1 text-primary-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete promotion"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

