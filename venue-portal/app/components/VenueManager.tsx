'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Edit, MapPin, Clock, Share2, Globe, Phone, Mail, X, Save, Star, Crown, Wine, Tag, CalendarDays, TrendingUp, Moon, Plus, Trash2, Camera, Sparkles } from 'lucide-react'
import VenueMap from './VenueMap'

import { getApiUrl } from '../utils/api'
import { useToast } from './ToastContainer'

interface Venue {
  _id: string
  name: string
  coverPhoto?: string
  category?: string
  platform?: string
  address: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  phone?: string
  email?: string
  website?: string
  description?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  schedule?: {
    [key: string]: { open?: string; close?: string; isOpen?: boolean }
  }
}

export default function VenueManager() {
  const { token, user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [allVenues, setAllVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    category: 'other',
    platform: 'som' as 'som' | 'revig' | 'both',
    subscriptionTier: 'free' as 'free' | 'basic' | 'premium' | 'enterprise',
    isFeatured: false,
    featuredUntil: '',
    subscriptionExpiresAt: ''
  })
  const [activeSection, setActiveSection] = useState<'info' | 'wine' | 'happyhour' | 'special' | 'weekend' | 'trending' | 'tonight'>('info')
  const [amenities, setAmenities] = useState({
    kidsFriendly: false, dogFriendly: false, hasFood: false, byob: false,
    trivia: false, liveMusic: false, outdoorSeating: false, happyHour: false,
    poolTables: false, danceFloor: false, sportsTv: false, karaoke: false, arcade: false,
  })
  const [amenitiesSaving, setAmenitiesSaving] = useState(false)
  const [amenitiesOpen, setAmenitiesOpen] = useState(false)
  const amenitiesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAmenityToggle = (key: string, value: boolean) => {
    const updated = { ...amenities, [key]: value }
    setAmenities(updated as typeof amenities)
    // Debounced auto-save — fires 600ms after last toggle
    if (amenitiesSaveTimer.current) clearTimeout(amenitiesSaveTimer.current)
    amenitiesSaveTimer.current = setTimeout(async () => {
      if (!token || !venue) return
      setAmenitiesSaving(true)
      try {
        await axios.put(
          `${getApiUrl()}/venues/${venue._id}`,
          { amenities: updated },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        showSuccess('Amenities saved!')
      } catch {
        showError('Failed to save amenities.')
      } finally {
        setAmenitiesSaving(false)
      }
    }, 600)
  }
  const [menuSaving, setMenuSaving] = useState(false)
  const [wineMenu, setWineMenu] = useState<Array<{ name: string; description: string; price: string; varietal: string }>>([])
  const [happyHour, setHappyHour] = useState({ times: '', description: '' })
  const [currentSpecial, setCurrentSpecial] = useState('')
  const [weekendSpecials, setWeekendSpecials] = useState<Array<{ name: string; description: string; price: string }>>([])
  const [trending, setTrending] = useState<Array<{ name: string; description: string }>>([])
  const [tonight, setTonight] = useState('')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('')
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [schedule, setSchedule] = useState<{ [key: string]: { open: string; close: string; isOpen: boolean } }>({
    monday: { open: '11:00', close: '22:00', isOpen: true },
    tuesday: { open: '11:00', close: '22:00', isOpen: true },
    wednesday: { open: '11:00', close: '22:00', isOpen: true },
    thursday: { open: '11:00', close: '22:00', isOpen: true },
    friday: { open: '11:00', close: '23:00', isOpen: true },
    saturday: { open: '11:00', close: '23:00', isOpen: true },
    sunday: { open: '12:00', close: '21:00', isOpen: true }
  })

  useEffect(() => {
    fetchVenue()
  }, [token, user])

  const fetchVenue = async () => {
    if (!token || !user) return
    
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Handle both response formats: { venues: [...] } or direct array
      let venues: any[] = []
      if (Array.isArray(response.data)) {
        venues = response.data
      } else if (response.data?.venues) {
        venues = response.data.venues
      } else if (response.data && typeof response.data === 'object') {
        // If response.data is an object but not an array, try to extract venues
        venues = Object.values(response.data).filter(Array.isArray).flat() as any[]
      }
      
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Fetched venues:', venues.length, 'venues for user:', user.id)
      }
      
      // Store all venues for potential multi-venue selection
      setAllVenues(venues)
      
      // Improved venue matching: handle both populated owner object and owner ID string
      const myVenues = venues.filter((v: any) => {
        const ownerId = v.owner?._id?.toString() || v.owner?.toString() || v.owner
        const userId = user.id?.toString()
        return ownerId === userId
      })
      
      // If user has multiple venues, select the first one by default
      // TODO: Add venue selector dropdown if multiple venues exist
      const myVenue = myVenues.length > 0 ? myVenues[0] : null
      
      if (myVenue) {
        if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
          console.debug('Selected venue:', myVenue.name, 'ID:', myVenue._id)
        }
        if (myVenues.length > 1 && process.env.NODE_ENV === 'development') {
          console.debug(`User has ${myVenues.length} venues. Currently showing: ${myVenue.name}.`)
        }
        setVenue(myVenue)
        setFormData({
          name: myVenue.name || '',
          street: myVenue.address?.street || '',
          city: myVenue.address?.city || '',
          state: myVenue.address?.state || '',
          zipCode: myVenue.address?.zipCode || '',
          phone: myVenue.phone || '',
          email: myVenue.email || '',
          website: myVenue.website || '',
          description: myVenue.description || '',
          category: myVenue.category || 'other',
          platform: (myVenue.platform as 'som' | 'revig' | 'both') || 'som',
          subscriptionTier: myVenue.subscriptionTier || 'free',
          isFeatured: myVenue.isFeatured || false,
          featuredUntil: myVenue.featuredUntil ? new Date(myVenue.featuredUntil).toISOString().slice(0, 16) : '',
          subscriptionExpiresAt: myVenue.subscriptionExpiresAt ? new Date(myVenue.subscriptionExpiresAt).toISOString().slice(0, 16) : ''
        })
        if (myVenue.schedule) {
          setSchedule({ ...schedule, ...myVenue.schedule })
        }
        if (myVenue.wineMenu) setWineMenu(myVenue.wineMenu)
        if (myVenue.happyHour) setHappyHour({ times: myVenue.happyHour.times || '', description: myVenue.happyHour.description || '' })
        if (myVenue.currentSpecial) setCurrentSpecial(myVenue.currentSpecial)
        if (myVenue.weekendSpecials) setWeekendSpecials(myVenue.weekendSpecials)
        if (myVenue.trending) setTrending(myVenue.trending)
        if (myVenue.tonight) setTonight(myVenue.tonight)
        if (myVenue.coverPhoto) setCoverPhotoUrl(myVenue.coverPhoto)
        if (myVenue.amenities) setAmenities({ ...amenities, ...myVenue.amenities })
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.debug('No venue found for user:', user.id)
        }
      }
    } catch (error: any) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Failed to fetch venue:', error.message || error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!token || !venue) return
    
    setSaving(true)
    try {
      const address = {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: 'US'
      }

      await axios.put(
        `${getApiUrl()}/venues/${venue._id}`,
        {
          name: formData.name,
          address,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          description: formData.description,
          category: formData.category,
          platform: formData.platform,
          schedule,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Update venue in local state
      setVenue({
        ...venue,
        name: formData.name,
        address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        description: formData.description,
        schedule
      })

      setEditing(false)
      showSuccess('Venue updated successfully!')
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Failed to update venue:', error.message || error)
      }
      showError(error.response?.data?.error || 'Failed to update venue')
    } finally {
      setSaving(false)
    }
  }

  const [notifying, setNotifying] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !venue) return
    setCoverPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await axios.post(
        `${getApiUrl()}/venues/${venue._id}/cover-photo`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      )
      setCoverPhotoUrl(res.data.coverPhotoUrl)
    } catch {
      // upload silently
    } finally {
      setCoverPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handlePostTonight = async () => {
    if (!token || !venue || !tonight.trim()) return
    setPosting(true)
    setPostSuccess(false)
    try {
      // Save tonight text first
      await axios.put(
        `${getApiUrl()}/venues/${venue._id}`,
        { tonight },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Post to feed + notify followers in one shot
      const res = await axios.post(
        `${getApiUrl()}/venues/${venue._id}/notify-followers`,
        { message: tonight, type: 'venue_tonight' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPostSuccess(true)
      setTimeout(() => setPostSuccess(false), 3000)
      if (res.data.sent === 0) return // no followers yet, still success
    } catch {
      showError('Failed to post. Try again.')
    } finally {
      setPosting(false)
    }
  }

  const handleNotifyFollowers = async (message: string, type: string = 'venue_update') => {
    if (!token || !venue || !message.trim()) return
    setNotifying(true)
    try {
      const res = await axios.post(
        `${getApiUrl()}/venues/${venue._id}/notify-followers`,
        { message, type },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess(`Notified ${res.data.sent} followers!`)
    } catch {
      showError('Failed to send notifications. Try again.')
    } finally {
      setNotifying(false)
    }
  }

  const handleMenuSave = async () => {
    if (!token || !venue) return
    setMenuSaving(true)
    try {
      await axios.put(
        `${getApiUrl()}/venues/${venue._id}`,
        { wineMenu, happyHour, currentSpecial, weekendSpecials, trending, tonight },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showSuccess('Saved!')
    } catch {
      showError('Failed to save. Try again.')
    } finally {
      setMenuSaving(false)
    }
  }

  const handleShare = () => {
    if (!venue) return
    
    const venueAddress = [
      formData.street,
      formData.city,
      formData.state,
      formData.zipCode
    ].filter(Boolean).join(', ')
    
    const shareText = `Check out ${venue.name}${venueAddress ? ` at ${venueAddress}` : ''}!`
    const shareUrl = `${window.location.origin}/venues/${venue._id}`
    
    if (navigator.share) {
      navigator.share({
        title: venue.name,
        text: shareText,
        url: shareUrl
      }).catch(() => {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        showSuccess('Venue link copied to clipboard!')
      })
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      showSuccess('Venue link copied to clipboard!')
    }
  }

  const getGoogleMapsUrl = () => {
    if (!venue) {
      return null
    }
    
    // Prefer coordinates if available (most reliable)
    if (venue.location?.latitude && venue.location?.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`
    }
    
    // Fall back to address from form data
    const address = [
      formData.street,
      formData.city,
      formData.state,
      formData.zipCode
    ].filter(Boolean).join(', ')
    
    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    }
    
    // Try venue address object if form data is empty
    if (venue.address) {
      const venueAddress = [
        venue.address.street,
        venue.address.city,
        venue.address.state,
        venue.address.zipCode
      ].filter(Boolean).join(', ')
      
      if (venueAddress) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
      }
    }
    
    // Last resort: use venue name if nothing else is available
    if (venue.name) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`
    }
    
    return null
  }

  const getAppleMapsUrl = () => {
    if (!venue) return null
    
    // Prefer coordinates if available
    if (venue.location?.latitude && venue.location?.longitude) {
      return `http://maps.apple.com/?ll=${venue.location.latitude},${venue.location.longitude}`
    }
    
    // Fall back to address from form data
    const address = [
      formData.street,
      formData.city,
      formData.state,
      formData.zipCode
    ].filter(Boolean).join(', ')
    
    if (address) {
      return `http://maps.apple.com/?q=${encodeURIComponent(address)}`
    }
    
    // Try venue address object if form data is empty
    if (venue.address) {
      const venueAddress = [
        venue.address.street,
        venue.address.city,
        venue.address.state,
        venue.address.zipCode
      ].filter(Boolean).join(', ')
      
      if (venueAddress) {
        return `http://maps.apple.com/?q=${encodeURIComponent(venueAddress)}`
      }
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-4">
        <div className="animate-pulse text-primary-400 text-sm">Loading venue information...</div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-4">
        <p className="text-primary-400 text-sm">No venue found. Please create a venue first.</p>
      </div>
    )
  }

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  return (
    <div className="bg-black border-2 border-primary-500/30 rounded-lg shadow-xl p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-primary-500">Venue Management</h2>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center space-x-2 bg-primary-500 text-black px-3 py-1.5 rounded-lg font-semibold hover:bg-primary-600 transition-colors text-sm"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-primary-500 text-black px-3 py-1.5 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={() => {
                setEditing(false)
                fetchVenue() // Reset form
              }}
              className="flex items-center space-x-2 bg-black border border-primary-500/30 text-primary-500 px-3 py-1.5 rounded-lg font-semibold hover:bg-primary-500/10 transition-colors text-sm"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide">Venue Name *</label>
          {editing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 text-sm"
              placeholder="Kates Pub"
            />
          ) : (
            <p className="text-primary-500 font-semibold text-sm">{venue.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide">Street Address</label>
            {editing ? (
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm"
                placeholder="123 Main St"
              />
            ) : (
              <p className="text-primary-400 text-sm">{formData.street || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide">City</label>
            {editing ? (
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm"
                placeholder="Austin"
              />
            ) : (
              <p className="text-primary-400 text-sm">{formData.city || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide">State</label>
            {editing ? (
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm"
                placeholder="TX"
              />
            ) : (
              <p className="text-primary-400 text-sm">{formData.state || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide">ZIP Code</label>
            {editing ? (
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm"
                placeholder="78701"
              />
            ) : (
              <p className="text-primary-400 text-sm">{formData.zipCode || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5" />
              <span>Phone</span>
            </label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm"
                placeholder="(555) 123-4567"
              />
            ) : (
              <p className="text-primary-400 text-sm">{formData.phone || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </label>
            {editing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm"
                placeholder="venue@example.com"
              />
            ) : (
              <p className="text-primary-400 text-sm">{formData.email || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Website</span>
            </label>
            {editing ? (
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm"
                placeholder="https://example.com"
              />
            ) : (
              <p className="text-primary-400 text-sm">
                {formData.website ? (
                  <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                    {formData.website}
                  </a>
                ) : (
                  'Not set'
                )}
              </p>
            )}
          </div>

          {/* Platform — which app(s) this venue appears in */}
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide">App Platform</label>
            {editing ? (
              <div className="flex gap-2">
                {([
                  { value: 'som', label: 'Shot On Me', sub: 'Bars & restaurants' },
                  { value: 'revig', label: 'Revig', sub: 'Coffee, soda & treats' },
                  { value: 'both', label: 'Both Apps', sub: 'All audiences' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, platform: opt.value })}
                    className={`flex-1 rounded-xl p-2.5 text-left border transition-all ${
                      formData.platform === opt.value
                        ? 'border-primary-500/60 bg-primary-500/10'
                        : 'border-primary-500/15 bg-black/40'
                    }`}
                  >
                    <p className={`text-xs font-bold ${formData.platform === opt.value ? 'text-primary-500' : 'text-white/50'}`}>{opt.label}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-primary-400 text-sm capitalize">
                {formData.platform === 'both' ? 'Both Apps (SOM + Revig)' : formData.platform === 'revig' ? 'Revig only' : 'Shot On Me only'}
              </p>
            )}
          </div>

          {/* Home Page Description */}
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide flex items-center space-x-1">
              <span>Home Page</span>
            </label>
            {editing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-primary-500/30 rounded-lg text-primary-500 placeholder-primary-600 text-sm min-h-[120px]"
                placeholder="Describe your venue, special features, atmosphere, etc. This will appear on your venue's home page."
              />
            ) : (
              <p className="text-primary-400 text-sm whitespace-pre-wrap">
                {formData.description || 'No description set. Click Edit to add a home page description.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Amenities collapsible dropdown ── */}
      <div className="border-t border-primary-500/20 pt-4">
        <button
          type="button"
          onClick={() => setAmenitiesOpen(o => !o)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wide">Amenities</h3>
            {amenitiesSaving && <span className="text-[10px] text-primary-400/50 animate-pulse">Saving…</span>}
            {!amenitiesSaving && Object.values(amenities).filter(Boolean).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/25">
                {Object.values(amenities).filter(Boolean).length} selected
              </span>
            )}
          </div>
          <span className="text-primary-400/40 text-xs transition-transform duration-200" style={{ transform: amenitiesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </button>

        {amenitiesOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              { key: 'kidsFriendly',   label: '👶 Kids Friendly' },
              { key: 'dogFriendly',    label: '🐕 Dog Friendly' },
              { key: 'hasFood',        label: '🍕 Food Served' },
              { key: 'byob',           label: '🥂 BYOB' },
              { key: 'trivia',         label: '🎯 Trivia Night' },
              { key: 'liveMusic',      label: '🎵 Live Music' },
              { key: 'outdoorSeating', label: '🌿 Outdoor Seating' },
              { key: 'happyHour',      label: '🍺 Happy Hour' },
              { key: 'poolTables',     label: '🎱 Pool Tables' },
              { key: 'danceFloor',     label: '🕺 Dance Floor' },
              { key: 'sportsTv',       label: '📺 Sports TV' },
              { key: 'karaoke',        label: '🎤 Karaoke' },
              { key: 'arcade',         label: '🎮 Arcade' },
            ] as const).map(({ key, label }) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none min-h-[44px] ${
                  amenities[key]
                    ? 'bg-primary-500/15 border-primary-500/60 text-primary-400'
                    : 'bg-black/30 border-primary-500/15 text-primary-400/50 hover:border-primary-500/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={amenities[key]}
                  onChange={e => handleAmenityToggle(key, e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  amenities[key] ? 'bg-primary-500 border-primary-500' : 'border-primary-500/30'
                }`}>
                  {amenities[key] && <span className="text-black text-xs font-bold leading-none">✓</span>}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Hours of Operation */}
      <div className="border-t border-primary-500/20 pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Clock className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wide">Hours of Operation</h3>
        </div>
        <div className="space-y-3">
          {daysOfWeek.map((day) => (
            <div key={day.key} className="flex items-center space-x-4">
              <div className="w-24 text-primary-400 text-sm font-medium">{day.label}</div>
              {editing ? (
                <>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={schedule[day.key]?.isOpen ?? true}
                      onChange={(e) => {
                        setSchedule({
                          ...schedule,
                          [day.key]: {
                            ...schedule[day.key],
                            isOpen: e.target.checked
                          }
                        })
                      }}
                      className="border-primary-500 text-primary-500 focus:ring-primary-500 bg-black"
                    />
                    <span className="text-primary-400 text-sm">Open</span>
                  </label>
                  {schedule[day.key]?.isOpen && (
                    <>
                      <input
                        type="time"
                        value={schedule[day.key]?.open || '11:00'}
                        onChange={(e) => {
                          setSchedule({
                            ...schedule,
                            [day.key]: {
                              ...schedule[day.key],
                              open: e.target.value
                            }
                          })
                        }}
                        className="px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500"
                      />
                      <span className="text-primary-400">to</span>
                      <input
                        type="time"
                        value={schedule[day.key]?.close || '22:00'}
                        onChange={(e) => {
                          setSchedule({
                            ...schedule,
                            [day.key]: {
                              ...schedule[day.key],
                              close: e.target.value
                            }
                          })
                        }}
                        className="px-3 py-2 bg-black border border-primary-500 rounded-lg text-primary-500"
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="text-primary-400">
                  {schedule[day.key]?.isOpen ? (
                    `${schedule[day.key]?.open || '11:00'} - ${schedule[day.key]?.close || '22:00'}`
                  ) : (
                    'Closed'
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Google Map */}
      {(venue.location?.latitude && venue.location?.longitude) && (
        <div className="border-t border-primary-500/20 pt-4">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-primary-500">Venue Location</h3>
          </div>
          <VenueMap
            location={venue.location?.latitude && venue.location?.longitude ? {
              latitude: venue.location.latitude,
              longitude: venue.location.longitude
            } : undefined}
            address={`${formData.street} ${formData.city}, ${formData.state}`}
            venueName={venue.name}
            height="300px"
          />
        </div>
      )}

      {/* Subscription & Featured Status (read-only — managed by admin) */}
      <div className="border-t border-primary-500/20 pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Crown className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wide">Subscription & Featured Status</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-primary-500 mb-1 uppercase tracking-wide">Subscription Tier</label>
            <p className="text-primary-400 text-sm capitalize">{formData.subscriptionTier}</p>
          </div>
          <div>
            <span className="text-primary-400 text-sm">
              {formData.isFeatured ? (
                <span className="flex items-center space-x-1 text-yellow-400">
                  <Star className="w-4 h-4" />
                  <span>Featured</span>
                </span>
              ) : (
                'Not Featured'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Maps Links & Share */}
      <div className="border-t border-primary-500/20 pt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Share2 className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-primary-500">Share & Maps</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const url = getGoogleMapsUrl()
              if (url) {
                window.open(url, '_blank', 'noopener,noreferrer')
              } else {
                showError('Venue location not available. Please add an address or location coordinates.')
              }
            }}
            className="flex items-center space-x-2 bg-black border border-primary-500 text-primary-500 px-4 py-2 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Google Maps</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const url = getAppleMapsUrl()
              if (url) {
                window.open(url, '_blank', 'noopener,noreferrer')
              } else {
                showError('Venue location not available. Please add an address or location coordinates.')
              }
            }}
            className="flex items-center space-x-2 bg-black border border-primary-500 text-primary-500 px-4 py-2 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Apple Maps</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Venue</span>
          </button>
        </div>
      </div>

      {/* ─── Menu & Specials Tabs ─── */}
      <div className="glass-elevated rounded-2xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex overflow-x-auto scrollbar-hide border-b border-white/5 px-2 pt-2">
          {([
            { id: 'info',      label: 'Info',         icon: MapPin },
            { id: 'wine',      label: 'Wine',         icon: Wine },
            { id: 'happyhour', label: 'Happy Hour',   icon: Clock },
            { id: 'special',   label: 'Special',      icon: Tag },
            { id: 'weekend',   label: 'Weekend',      icon: CalendarDays },
            { id: 'trending',  label: 'Trending',     icon: TrendingUp },
            { id: 'tonight',   label: 'Tonight',      icon: Moon },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap rounded-xl mb-2 transition-all relative ${
                activeSection === tab.id
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
              }`}
            >
              {activeSection === tab.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D4A84B, transparent)', boxShadow: '0 0 6px rgba(212,168,75,0.5)' }} />
              )}
              <tab.icon className={`w-4 h-4 ${activeSection === tab.id ? 'text-primary-500' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">

          {/* Info — placeholder pointing to edit above */}
          {activeSection === 'info' && (
            <div className="space-y-4">
              <p className="text-primary-400/60 text-xs">Edit venue info, hours, and address using the Edit button above.</p>

              {/* Cover Photo Upload */}
              <div>
                <p className="text-primary-400/80 text-xs font-semibold uppercase tracking-wider mb-2">Cover Photo</p>
                <p className="text-primary-400/45 text-xs mb-3">This photo appears in the Shot On Me app when users discover your venue.</p>

                {/* Current photo preview */}
                {coverPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-primary-500/20 mb-3 aspect-video">
                    <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-primary-500/25 bg-primary-500/5 aspect-video flex flex-col items-center justify-center mb-3 gap-2">
                    <Camera className="w-8 h-8 text-primary-500/30" />
                    <p className="text-primary-400/40 text-xs">No cover photo yet</p>
                  </div>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverPhotoUpload}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={coverPhotoUploading}
                  className="flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-primary-500/20 hover:border-primary-500/50 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {coverPhotoUploading ? (
                    <><span className="w-3.5 h-3.5 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />Uploading...</>
                  ) : (
                    <><Camera className="w-3.5 h-3.5" />{coverPhotoUrl ? 'Change Photo' : 'Upload Photo'}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Amenities */}

          {/* Wine Menu */}
          {activeSection === 'wine' && (
            <div className="space-y-3">
              <p className="text-xs text-primary-400/60 mb-3">Add wines that appear on your venue's Wine tab in the app.</p>
              {wineMenu.map((item, i) => (
                <div key={i} className="bg-black/40 border border-primary-500/15 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={item.name} onChange={e => { const w=[...wineMenu]; w[i]={...w[i],name:e.target.value}; setWineMenu(w) }} placeholder="Wine name" className="bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                    <input value={item.price} onChange={e => { const w=[...wineMenu]; w[i]={...w[i],price:e.target.value}; setWineMenu(w) }} placeholder="Price (e.g. 12)" className="bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                  </div>
                  <input value={item.varietal} onChange={e => { const w=[...wineMenu]; w[i]={...w[i],varietal:e.target.value}; setWineMenu(w) }} placeholder="Varietal (e.g. Cabernet Sauvignon)" className="w-full bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                  <div className="flex gap-2">
                    <input value={item.description} onChange={e => { const w=[...wineMenu]; w[i]={...w[i],description:e.target.value}; setWineMenu(w) }} placeholder="Description" className="flex-1 bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                    <button onClick={() => setWineMenu(wineMenu.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-300 p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => setWineMenu([...wineMenu, { name:'', description:'', price:'', varietal:'' }])} className="flex items-center gap-2 text-primary-500 text-sm hover:text-primary-400 transition-colors">
                <Plus className="w-4 h-4" /> Add wine
              </button>
            </div>
          )}

          {/* Happy Hour */}
          {activeSection === 'happyhour' && (
            <div className="space-y-3">
              <input value={happyHour.times} onChange={e => setHappyHour({...happyHour, times: e.target.value})} placeholder="Times (e.g. Mon–Fri 4–7 PM)" className="w-full bg-black border border-primary-500/30 rounded px-3 py-2 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
              <textarea value={happyHour.description} onChange={e => setHappyHour({...happyHour, description: e.target.value})} placeholder="Details (e.g. $2 off all drafts, half-price appetizers)" rows={3} className="w-full bg-black border border-primary-500/30 rounded px-3 py-2 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500 resize-none" />
            </div>
          )}

          {/* Current Special */}
          {activeSection === 'special' && (
            <textarea value={currentSpecial} onChange={e => setCurrentSpecial(e.target.value)} placeholder="Describe your current special (e.g. $5 margaritas all week)" rows={4} className="w-full bg-black border border-primary-500/30 rounded px-3 py-2 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500 resize-none" />
          )}

          {/* Weekend Specials */}
          {activeSection === 'weekend' && (
            <div className="space-y-3">
              {weekendSpecials.map((item, i) => (
                <div key={i} className="bg-black/40 border border-primary-500/15 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={item.name} onChange={e => { const w=[...weekendSpecials]; w[i]={...w[i],name:e.target.value}; setWeekendSpecials(w) }} placeholder="Name" className="flex-1 bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                    <input value={item.price} onChange={e => { const w=[...weekendSpecials]; w[i]={...w[i],price:e.target.value}; setWeekendSpecials(w) }} placeholder="Price" className="w-20 bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                    <button onClick={() => setWeekendSpecials(weekendSpecials.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-300 p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <input value={item.description} onChange={e => { const w=[...weekendSpecials]; w[i]={...w[i],description:e.target.value}; setWeekendSpecials(w) }} placeholder="Description" className="w-full bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                </div>
              ))}
              <button onClick={() => setWeekendSpecials([...weekendSpecials, {name:'',description:'',price:''}])} className="flex items-center gap-2 text-primary-500 text-sm hover:text-primary-400 transition-colors">
                <Plus className="w-4 h-4" /> Add weekend special
              </button>
            </div>
          )}

          {/* Trending */}
          {activeSection === 'trending' && (
            <div className="space-y-3">
              <p className="text-xs text-primary-400/60 mb-2">Pin your most popular items so guests know what to order.</p>
              {trending.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={item.name} onChange={e => { const t=[...trending]; t[i]={...t[i],name:e.target.value}; setTrending(t) }} placeholder="Item name (e.g. Spicy Marg)" className="flex-1 bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                  <input value={item.description} onChange={e => { const t=[...trending]; t[i]={...t[i],description:e.target.value}; setTrending(t) }} placeholder="Short note" className="flex-1 bg-black border border-primary-500/30 rounded px-3 py-1.5 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500" />
                  <button onClick={() => setTrending(trending.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-300 p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setTrending([...trending, {name:'',description:''}])} className="flex items-center gap-2 text-primary-500 text-sm hover:text-primary-400 transition-colors">
                <Plus className="w-4 h-4" /> Add item
              </button>
            </div>
          )}

          {/* Tonight */}
          {activeSection === 'tonight' && (
            <div className="space-y-3">
              <textarea value={tonight} onChange={e => setTonight(e.target.value)} placeholder="What's happening tonight? (e.g. Live DJ 9 PM, $3 shot specials)" rows={4} className="w-full bg-black border border-primary-500/30 rounded px-3 py-2 text-sm text-primary-300 placeholder-primary-500/30 focus:outline-none focus:border-primary-500 resize-none" />

              {/* One-tap Post Tonight button */}
              <button
                onClick={handlePostTonight}
                disabled={posting || !tonight.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary-500 text-black px-4 py-3 rounded-xl font-bold text-sm hover:bg-primary-400 disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20"
              >
                {postSuccess ? '✅ Posted!' : posting ? 'Posting...' : '🌙 Post Tonight'}
              </button>
              {postSuccess && (
                <p className="text-xs text-primary-400/60 text-center">Saved and posted to your followers' feeds.</p>
              )}
              <p className="text-xs text-primary-400/30 text-center">One tap saves + posts to all followers</p>
            </div>
          )}

          {activeSection !== 'info' && (
            <button
              onClick={handleMenuSave}
              disabled={menuSaving}
              className="mt-4 flex items-center gap-2 bg-primary-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 transition-all text-sm"
            >
              <Save className="w-4 h-4" />
              {menuSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

