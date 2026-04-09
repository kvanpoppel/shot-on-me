'use client'

import { useState } from 'react'
import axios from 'axios'
import { getApiUrl } from '../utils/api'
import { Coffee, CheckCircle, ArrowLeft, MapPin, Phone, Mail, Building2, X } from 'lucide-react'
import Link from 'next/link'

const VENUE_TYPES = [
  { value: 'Coffee Shop', icon: '☕', description: 'Espresso, drip coffee, specialty drinks' },
  { value: 'Juice Bar', icon: '🥤', description: 'Fresh-pressed juices, wellness shots' },
  { value: 'Soda Shop', icon: '🫧', description: 'Craft sodas, specialty drinks' },
  { value: 'Tea House', icon: '🍵', description: 'Tea, matcha, boba' },
  { value: 'Smoothie Bar', icon: '🥝', description: 'Smoothies, protein shakes, acai bowls' },
  { value: 'Bakery', icon: '🥐', description: 'Baked goods, pastries, desserts' },
  { value: 'Cafe', icon: '🫶', description: 'Multi-concept cafe' },
]

const CITIES = [
  'Indianapolis', 'Chicago', 'Louisville', 'Nashville',
  'Detroit', 'Columbus', 'Salt Lake City', 'Other',
]

export default function VenueSignupPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    venueName: '',
    venueType: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    instagram: '',
  })

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const API_URL = getApiUrl()
      // Map city → state abbreviation for the venue-requests endpoint
      const STATE_MAP: Record<string, string> = {
        'Indianapolis': 'IN',
        'Chicago': 'IL',
        'Louisville': 'KY',
        'Nashville': 'TN',
        'Detroit': 'MI',
        'Columbus': 'OH',
        'Salt Lake City': 'UT',
        'Other': 'IN',
      }
      await axios.post(`${API_URL}/venue-requests`, {
        venueName: form.venueName,
        venueType: form.venueType,
        address: form.address || '(not provided)',
        city: form.city,
        state: STATE_MAP[form.city] || 'IN',
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        website: form.instagram ? `instagram.com/${form.instagram.replace('@', '')}` : '',
        description: form.description,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#1A1A2E' }}>
        <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
          <CheckCircle className="w-10 h-10 text-charcoal" style={{ color: '#1A1A2E' }} />
        </div>
        <h1 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Application Received!
        </h1>
        <p className="text-white/50 max-w-xs leading-relaxed mb-6">
          Thanks for applying to join Fizz, {form.ownerName.split(' ')[0]}! We&apos;ll review <strong className="text-white">{form.venueName}</strong> and reach out within 2–3 business days.
        </p>
        <div className="fizz-card p-4 w-full max-w-xs text-left mb-6">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">What happens next?</p>
          {['We review your venue', 'Admin approves access', 'You get login credentials', 'Start accepting Fizz gifts'].map((step, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(200,241,53,0.2)', color: '#C8F135' }}>
                {i + 1}
              </div>
              <p className="text-sm text-white/60">{step}</p>
            </div>
          ))}
        </div>
        <Link href="/" className="fizz-btn-primary px-8 py-3 text-sm">
          Back to Fizz
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#1A1A2E' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-5 py-4 border-b border-white/5 safe-top" style={{ background: '#1A1A2E' }}>
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <div>
          <h1 className="font-black text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
            List Your Venue on Fizz
          </h1>
          <p className="text-xs text-white/40">Free to join — no monthly fees</p>
        </div>
      </div>

      {/* Hero */}
      <div className="px-5 py-6">
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #252540, #2E2E50)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-15 blur-2xl rounded-full" style={{ background: '#C8F135' }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 opacity-10 blur-2xl rounded-full" style={{ background: '#FF5F57' }} />
          <div className="relative z-10">
            <p className="text-3xl mb-3">🫧</p>
            <h2 className="text-xl font-black text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Reach more customers
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Join Fizz and let customers send each other gifts redeemable at your venue. 100% commission-free.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {['$0 fees', 'Instant payouts', '7 cities'].map(benefit => (
                <div key={benefit} className="text-center py-2 px-1 rounded-xl" style={{ background: 'rgba(200,241,53,0.1)' }}>
                  <p className="text-xs font-bold" style={{ color: '#C8F135' }}>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 flex flex-col gap-5">
        {/* Venue type */}
        <div>
          <label className="text-sm font-bold text-white mb-3 block">Venue Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {VENUE_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => update('venueType', type.value)}
                className="p-3 rounded-2xl text-left transition-all border"
                style={form.venueType === type.value
                  ? { background: 'rgba(200,241,53,0.1)', borderColor: 'rgba(200,241,53,0.4)' }
                  : { background: '#252540', borderColor: 'transparent' }
                }
              >
                <p className="text-xl mb-1">{type.icon}</p>
                <p className="text-sm font-bold text-white">{type.value}</p>
                <p className="text-xs text-white/40 leading-tight">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Venue details */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Venue Name *</label>
            <input
              type="text"
              value={form.venueName}
              onChange={e => update('venueName', e.target.value)}
              placeholder="The Coffee Spot"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">City *</label>
            <select
              value={form.city}
              onChange={e => update('city', e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540', color: form.city ? 'white' : 'rgba(255,255,255,0.4)' }}
            >
              <option value="" disabled>Select your city</option>
              {CITIES.map(c => <option key={c} value={c} style={{ color: 'white', background: '#252540' }}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Street Address</label>
            <input
              type="text"
              value={form.address}
              onChange={e => update('address', e.target.value)}
              placeholder="123 Main St"
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540' }}
            />
          </div>
        </div>

        {/* Owner info */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-white text-sm">Your Contact Info</h3>

          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Your Name *</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={e => update('ownerName', e.target.value)}
              placeholder="Alex Johnson"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="owner@venuename.com"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Instagram (optional)</label>
            <input
              type="text"
              value={form.instagram}
              onChange={e => update('instagram', e.target.value)}
              placeholder="@yourcoffeeshop"
              className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz"
              style={{ background: '#252540' }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Tell us about your venue</label>
          <textarea
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="What makes your spot special? What do you serve?"
            rows={3}
            className="w-full px-4 py-3.5 rounded-2xl text-sm border border-white/10 focus:border-lime-fizz resize-none"
            style={{ background: '#252540' }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
            <X className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !form.venueName || !form.venueType || !form.email || !form.phone || !form.ownerName || !form.city}
          className="fizz-btn-primary w-full py-4 text-base disabled:opacity-30"
        >
          {loading ? 'Submitting...' : 'Apply to Join Fizz'}
        </button>

        <p className="text-xs text-white/30 text-center pb-4">
          By submitting, you agree to our{' '}
          <a href="/terms" className="underline" style={{ color: '#C8F135' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="underline" style={{ color: '#C8F135' }}>Privacy Policy</a>.
          Our team will reach out within 2–3 business days.
        </p>
      </form>
    </div>
  )
}
