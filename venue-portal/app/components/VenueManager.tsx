'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Edit, MapPin, Clock, Share2, Globe, Phone, Mail, X, Save } from 'lucide-react'
import VenueMap from './VenueMap'

import { getApiUrl } from '../utils/api'

interface Venue {
  _id: string
  name: string
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
    description: ''
  })
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
          description: myVenue.description || ''
        })
        if (myVenue.schedule) {
          setSchedule({ ...schedule, ...myVenue.schedule })
        }
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
          schedule
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
      alert('Venue updated successfully!')
    } catch (error: any) {
      // Log error for debugging but show user-friendly message
      if (process.env.NODE_ENV === 'development') {
        console.debug('Failed to update venue:', error.message || error)
      }
      alert(error.response?.data?.error || 'Failed to update venue')
    } finally {
      setSaving(false)
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
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        alert('Venue link copied to clipboard!')
      })
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      alert('Venue link copied to clipboard!')
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
                alert('Venue location not available. Please add an address or location coordinates.')
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
                alert('Venue location not available. Please add an address or location coordinates.')
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
    </div>
  )
}

